/**
 * Post-booking follow-up sequence.
 *
 * Runs every 15 minutes. Sends three communications per booking:
 *   1. Prep — 1 hour after booking ("What to prepare for your call")
 *   2. Reminder — 24 hours before the call ("Your call is tomorrow")
 *   3. Feedback — 1 hour after the call ("How was it?")
 *
 * Primary channel: WhatsApp (if Twilio configured + phone on file).
 * Fallback channel: email (always sent if no phone OR WhatsApp failed).
 *
 * Each communication is sent at most once per booking (tracked in emails_sent).
 *
 * SOLID notes:
 *   - Single responsibility: only handles the follow-up drip sequence.
 *   - Open/closed: add new comms by adding a new query + send block.
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { emailsSent } from '../db/schema.js';
import {
  sendPrepEmail,
  sendReminderEmail,
  sendFeedbackEmail,
} from '../services/gmail.js';
import { whatsapp } from '../services/whatsapp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function runFollowUpSequence(): Promise<void> {
  try {
    await runPrepMessages();
    await runReminderMessages();
    await runFeedbackMessages();
  } catch (err) {
    logger.error({ err }, 'follow-up sequence cron failed');
  }
}

// ---------------------------------------------------------------------------
// Shared helper — try WhatsApp, fall back to email, record result
// ---------------------------------------------------------------------------

interface FollowUpRow {
  bookingId: string;
  email: string;
  name: string;
  phone: string | null;
  meetLink: string;
  slotStartAt: string;
}

async function tryWhatsApp(
  phone: string | null,
  templateSid: string | undefined,
  freeformBody: string,
  templateVars: Record<string, string>,
): Promise<boolean> {
  if (!phone || !whatsapp.isEnabled()) return false;

  const result = await whatsapp.send({
    to: phone,
    contentSid: templateSid,
    contentVariables: templateSid ? templateVars : undefined,
    body: templateSid ? undefined : freeformBody,
  });
  return result.success;
}

async function recordSent(
  emailType: 'prep' | 'reminder' | 'feedback',
  bookingId: string,
  contactIdentifier: string,
): Promise<void> {
  await db.insert(emailsSent).values({
    contactEmail: contactIdentifier,
    emailType,
    bookingId,
  });
}

// ---------------------------------------------------------------------------
// 1. Prep — 1 hour after booking
// ---------------------------------------------------------------------------

async function runPrepMessages(): Promise<void> {
  const results = await db.execute(sql`
    SELECT
      b.id AS booking_id,
      c.email AS contact_email,
      c.name AS contact_name,
      c.phone AS contact_phone,
      b.google_meet_link,
      b.slot_start_at
    FROM bookings b
    JOIN contacts c ON c.id = b.contact_id
    WHERE b.status = 'confirmed'
      AND b.created_at < NOW() - INTERVAL '1 hour'
      AND c.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM emails_sent es
        WHERE es.booking_id = b.id AND es.email_type = 'prep'
      )
    ORDER BY b.created_at ASC
    LIMIT 10
  `);

  for (const row of results) {
    const r: FollowUpRow = {
      bookingId: row.booking_id as string,
      email: row.contact_email as string,
      name: (row.contact_name as string) ?? 'there',
      phone: (row.contact_phone as string) ?? null,
      meetLink: (row.google_meet_link as string) ?? '',
      slotStartAt: String(row.slot_start_at),
    };

    try {
      const slotLabel = new Date(r.slotStartAt).toLocaleDateString('en-ZA', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      });

      const whatsappSent = await tryWhatsApp(
        r.phone,
        config.twilioTemplatePrep,
        `Hey ${r.name}, your Octio discovery call is on ${slotLabel}. Have your current process documented, examples of what's not working, and your budget range ready. Meet link: ${r.meetLink}`,
        { '1': r.name, '2': slotLabel, '3': r.meetLink },
      );

      if (!whatsappSent) {
        await sendPrepEmail(r.email, r.name, r.meetLink, r.slotStartAt);
      }

      await recordSent('prep', r.bookingId, r.email);
      logger.info(
        { bookingId: r.bookingId, channel: whatsappSent ? 'whatsapp' : 'email' },
        'prep message sent',
      );
    } catch (err) {
      logger.error({ err, bookingId: r.bookingId }, 'failed to send prep message');
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Reminder — 24 hours before call
// ---------------------------------------------------------------------------

async function runReminderMessages(): Promise<void> {
  const results = await db.execute(sql`
    SELECT
      b.id AS booking_id,
      c.email AS contact_email,
      c.name AS contact_name,
      c.phone AS contact_phone,
      b.google_meet_link,
      b.slot_start_at
    FROM bookings b
    JOIN contacts c ON c.id = b.contact_id
    WHERE b.status = 'confirmed'
      AND b.slot_start_at BETWEEN NOW() AND NOW() + INTERVAL '25 hours'
      AND c.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM emails_sent es
        WHERE es.booking_id = b.id AND es.email_type = 'reminder'
      )
    ORDER BY b.slot_start_at ASC
    LIMIT 10
  `);

  for (const row of results) {
    const r: FollowUpRow = {
      bookingId: row.booking_id as string,
      email: row.contact_email as string,
      name: (row.contact_name as string) ?? 'there',
      phone: (row.contact_phone as string) ?? null,
      meetLink: (row.google_meet_link as string) ?? '',
      slotStartAt: String(row.slot_start_at),
    };

    try {
      const slotLabel = new Date(r.slotStartAt).toLocaleDateString('en-ZA', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      });

      const whatsappSent = await tryWhatsApp(
        r.phone,
        config.twilioTemplateReminder,
        `Reminder: your Octio discovery call is tomorrow at ${slotLabel}. Meet link: ${r.meetLink}`,
        { '1': r.name, '2': slotLabel, '3': r.meetLink },
      );

      if (!whatsappSent) {
        await sendReminderEmail(r.email, r.name, r.meetLink, r.slotStartAt);
      }

      await recordSent('reminder', r.bookingId, r.email);
      logger.info(
        { bookingId: r.bookingId, channel: whatsappSent ? 'whatsapp' : 'email' },
        'reminder message sent',
      );
    } catch (err) {
      logger.error({ err, bookingId: r.bookingId }, 'failed to send reminder message');
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Feedback — 1 hour after call
// ---------------------------------------------------------------------------

async function runFeedbackMessages(): Promise<void> {
  const results = await db.execute(sql`
    SELECT
      b.id AS booking_id,
      c.email AS contact_email,
      c.name AS contact_name,
      c.phone AS contact_phone
    FROM bookings b
    JOIN contacts c ON c.id = b.contact_id
    WHERE b.status = 'confirmed'
      AND b.slot_start_at < NOW() - INTERVAL '1 hour'
      AND b.slot_start_at > NOW() - INTERVAL '2 hours'
      AND c.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM emails_sent es
        WHERE es.booking_id = b.id AND es.email_type = 'feedback'
      )
    ORDER BY b.slot_start_at ASC
    LIMIT 10
  `);

  for (const row of results) {
    const bookingId = row.booking_id as string;
    const email = row.contact_email as string;
    const name = (row.contact_name as string) ?? 'there';
    const phone = (row.contact_phone as string) ?? null;

    try {
      // Feedback has no template — always freeform (either WhatsApp freeform
      // within 24h session, or email). We just don't specify contentSid.
      const whatsappSent = await tryWhatsApp(
        phone,
        undefined,
        `Hey ${name}, thanks for the call with Octio. How did it go? Anything we missed? Just reply here.`,
        {},
      );

      if (!whatsappSent) {
        await sendFeedbackEmail(email, name);
      }

      await recordSent('feedback', bookingId, email);
      logger.info(
        { bookingId, channel: whatsappSent ? 'whatsapp' : 'email' },
        'feedback message sent',
      );
    } catch (err) {
      logger.error({ err, bookingId }, 'failed to send feedback message');
    }
  }
}
