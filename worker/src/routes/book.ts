import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { parseBookingMultipart, MissingFieldError } from '../middleware/multipart.js';
import { WizardIntakeSchema } from '@octio/shared';
import { saveVoiceNote, saveAttachment } from '../services/storage.js';
import { FileTooLargeError, InvalidFileTypeError } from '../services/storage.errors.js';
import { computeOLS } from '../services/scoring.js';
import { createDiscoveryCallEvent, parseSlotToISO } from '../services/calendar.js';
import { sendBookingConfirmation, sendInternalAlert } from '../services/gmail.js';
import { db } from '../db/client.js';
import {
  contacts,
  bookings,
  leadScores,
  appointments,
  consentEvents,
} from '../db/schema.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

const bookRoutes = new Hono();

bookRoutes.post('/book', async (c) => {
  // ── Step 1: Parse multipart body ────────────────────────────────────────
  let parsed: Awaited<ReturnType<typeof parseBookingMultipart>>;
  try {
    parsed = await parseBookingMultipart(c);
  } catch (err) {
    if (err instanceof MissingFieldError) {
      return c.json({ ok: false, error: err.message }, 400);
    }
    logger.error({ err }, 'book: unexpected multipart parse error');
    return c.json({ ok: false, error: 'Invalid request body' }, 400);
  }

  // ── Step 2: Validate intake JSON via Zod ────────────────────────────────
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(parsed.intake);
  } catch {
    return c.json({ ok: false, error: 'Invalid intake data: intake field is not valid JSON' }, 400);
  }

  const parseResult = WizardIntakeSchema.safeParse(rawJson);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    const detail = firstIssue
      ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
      : 'schema validation failed';
    return c.json({ ok: false, error: `Invalid intake data: ${detail}` }, 400);
  }

  const intake = parseResult.data;

  // ── Steps 3–4: Save optional files ──────────────────────────────────────
  let voiceNoteUrl: string | undefined;
  let attachmentUrl: string | undefined;

  if (parsed.voiceNote) {
    try {
      const saved = await saveVoiceNote({
        buffer: await parsed.voiceNote.arrayBuffer(),
        contentType: parsed.voiceNote.type || 'audio/webm',
      });
      voiceNoteUrl = saved.url;
    } catch (err) {
      if (err instanceof FileTooLargeError) {
        return c.json({ ok: false, error: 'Voice note is too large — maximum 10 MB' }, 413);
      }
      if (err instanceof InvalidFileTypeError) {
        return c.json({ ok: false, error: `Voice note has an unsupported format — ${(err as InvalidFileTypeError).actualType}` }, 415);
      }
      logger.error({ err }, 'book: voice note save failed — continuing without it');
    }
  }

  if (parsed.attachment) {
    try {
      const saved = await saveAttachment({
        buffer: await parsed.attachment.arrayBuffer(),
        originalName: parsed.attachment.name,
        contentType: parsed.attachment.type,
      });
      attachmentUrl = saved.url;
    } catch (err) {
      if (err instanceof FileTooLargeError) {
        return c.json({ ok: false, error: 'Attachment is too large — maximum 10 MB' }, 413);
      }
      if (err instanceof InvalidFileTypeError) {
        return c.json({ ok: false, error: `Attachment has an unsupported format — ${(err as InvalidFileTypeError).actualType}` }, 415);
      }
      logger.error({ err }, 'book: attachment save failed — continuing without it');
    }
  }

  // ── Step 5: Upsert contact ───────────────────────────────────────────────
  let contactId: string;
  try {
    const [upserted] = await db
      .insert(contacts)
      .values({
        email: intake.contact.email,
        name: intake.contact.name,
        company: intake.contact.company ?? null,
        source: 'website-wizard',
        tags: [],
      })
      .onConflictDoUpdate({
        target: contacts.email,
        set: {
          name: intake.contact.name,
          company: intake.contact.company ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: contacts.id });

    if (!upserted) {
      throw new Error('Contact upsert returned no rows');
    }

    contactId = upserted.id;
    logger.info({ contactId, email: intake.contact.email }, 'book: contact upserted');
  } catch (err) {
    logger.error({ err }, 'book: contact upsert failed');
    return c.json({ ok: false, error: 'Internal error — please try again' }, 500);
  }

  // ── Step 6: Compute OLS score + write to lead_scores ────────────────────
  const hasVoiceNote = Boolean(voiceNoteUrl);
  const hasAttachment = Boolean(attachmentUrl);

  const olsResult = computeOLS({
    budget: intake.budget,
    selectedSlot: intake.selectedSlot,
    requirements: intake.requirements,
    selectedService: intake.selectedService,
    contact: intake.contact,
    hasVoiceNote,
    hasAttachment,
  });

  logger.info(
    { total: olsResult.total, band: olsResult.band },
    'book: OLS score computed',
  );

  // ── Step 7: Insert bookings row ──────────────────────────────────────────
  let bookingId: string;
  let slotStartAt: Date;

  try {
    const slotISO = parseSlotToISO(intake.selectedSlot);
    slotStartAt = new Date(slotISO);

    const [inserted] = await db
      .insert(bookings)
      .values({
        contactId,
        intakeJson: intake as unknown as Record<string, unknown>,
        voiceNotePath: voiceNoteUrl ?? null,
        attachmentPath: attachmentUrl ?? null,
        slotStartAt,
        olsScoreAtBooking: olsResult.total,
        status: 'pending',
      })
      .returning({ id: bookings.id });

    if (!inserted) {
      throw new Error('Booking insert returned no rows');
    }

    bookingId = inserted.id;
    logger.info({ bookingId }, 'book: booking row inserted');
  } catch (err) {
    logger.error({ err }, 'book: booking insert failed');
    return c.json({ ok: false, error: 'Internal error — please try again' }, 500);
  }

  // Write lead score dimensions (non-blocking failures logged but not fatal here
  // because they are ancillary to the booking row already inserted)
  try {
    await db.insert(leadScores).values(
      olsResult.dimensions.map((dim) => ({
        contactId,
        bookingId,
        dimension: dim.dimension,
        points: dim.points,
        reason: dim.reason,
        source: 'wizard' as const,
      })),
    );
  } catch (err) {
    logger.error({ err }, 'book: lead_scores insert failed — non-fatal');
  }

  // ── Step 8: Create Google Calendar event ────────────────────────────────
  let calResult: Awaited<ReturnType<typeof createDiscoveryCallEvent>>;
  try {
    calResult = await createDiscoveryCallEvent({
      contact: intake.contact,
      selectedSlot: intake.selectedSlot,
      selectedService: intake.selectedService,
      budget: intake.budget,
      requirements: intake.requirements,
      voiceNoteUrl,
      attachmentUrl,
    });
    logger.info({ eventId: calResult.eventId }, 'book: calendar event created');
  } catch (err) {
    logger.error({ err }, 'book: calendar event creation failed');

    // Mark booking as failed
    try {
      await db
        .update(bookings)
        .set({ status: 'failed' })
        .where(
          // Drizzle eq helper
          eq(bookings.id, bookingId),
        );
    } catch (dbErr) {
      logger.error({ dbErr }, 'book: could not update booking status to failed');
    }

    return c.json(
      {
        ok: false,
        error:
          'Could not create calendar event — please try again or email hello@octio.co.za',
      },
      502,
    );
  }

  // ── Steps 9–11: Non-critical DB updates ─────────────────────────────────
  try {
    await db
      .update(bookings)
      .set({
        googleCalendarEventId: calResult.eventId,
        googleMeetLink: calResult.meetLink,
        googleCalendarLink: calResult.calendarLink,
        status: 'confirmed',
      })
      .where(eq(bookings.id, bookingId));
  } catch (err) {
    logger.error({ err }, 'book: booking update (confirmed status) failed — non-fatal');
  }

  try {
    await db.insert(appointments).values({
      contactId,
      bookingId,
      calBookingId: calResult.eventId,
      scheduledAt: slotStartAt,
      status: 'booked',
    });
  } catch (err) {
    logger.error({ err }, 'book: appointments insert failed — non-fatal');
  }

  try {
    const ipAddress =
      c.req.header('x-real-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';

    const userAgent = c.req.header('user-agent') ?? '';

    await db.insert(consentEvents).values({
      contactId,
      eventType: 'granted',
      ipAddress,
      userAgent,
    });
  } catch (err) {
    logger.error({ err }, 'book: consent_events insert failed — non-fatal');
  }

  // ── Step 12: Send confirmation email ────────────────────────────────────
  let emailWarning: string | undefined;

  try {
    await sendBookingConfirmation(
      {
        contact: intake.contact,
        selectedSlot: intake.selectedSlot,
        selectedService: intake.selectedService,
        budget: intake.budget,
        requirements: intake.requirements,
      },
      {
        meetLink: calResult.meetLink,
        calendarLink: calResult.calendarLink,
      },
    );

    try {
      await db
        .update(bookings)
        .set({ emailSent: true })
        .where(eq(bookings.id, bookingId));
    } catch (dbErr) {
      logger.error({ dbErr }, 'book: emailSent flag update failed — non-fatal');
    }
  } catch (err) {
    logger.error({ err }, 'book: confirmation email failed — non-fatal');
    emailWarning =
      'Booking confirmed but confirmation email could not be sent';
  }

  // ── Step 13: Hot lead internal alert ────────────────────────────────────
  if (olsResult.band === 'hot') {
    try {
      const companyLabel = intake.contact.company
        ? ` from ${intake.contact.company}`
        : '';
      const subject = `HOT LEAD: ${intake.contact.name}${companyLabel}`;

      const dimensionBreakdown = olsResult.dimensions
        .map((d) => `  ${d.dimension}: ${d.points}/4 — ${d.reason}`)
        .join('\n');

      const requirementsPreview =
        intake.requirements.length > 300
          ? `${intake.requirements.slice(0, 300)}...`
          : intake.requirements;

      const body = [
        `HOT LEAD ALERT — OLS Score: ${olsResult.total}/20`,
        '',
        `Name: ${intake.contact.name}`,
        `Email: ${intake.contact.email}`,
        `Company: ${intake.contact.company ?? '(not provided)'}`,
        `Service: ${intake.selectedService}`,
        `Budget: ${intake.budget}`,
        `Slot: ${intake.selectedSlot.label}`,
        '',
        'Score Breakdown:',
        dimensionBreakdown,
        '',
        'Requirements:',
        requirementsPreview,
        '',
        `Meet Link: ${calResult.meetLink}`,
        `Calendar: ${calResult.calendarLink}`,
      ].join('\n');

      await sendInternalAlert(subject, body);
    } catch (err) {
      logger.error({ err }, 'book: internal hot-lead alert failed — non-fatal');
    }
  }

  // ── Response ─────────────────────────────────────────────────────────────
  return c.json({
    ok: true as const,
    meetLink: calResult.meetLink,
    eventId: calResult.eventId,
    calendarLink: calResult.calendarLink,
    scoreBand: olsResult.band,
    ...(emailWarning ? { warning: emailWarning } : {}),
  });
});

export { bookRoutes };
