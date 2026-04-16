import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { contacts, bookings } from '../db/schema.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IdentifyRequest {
  email: string;
}

interface IdentifyResponse {
  existing: boolean;
  contact?: { id: string; firstName: string };
  hasPastBooking: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the first name from a full name string.
 * "Simekani Mabambe" → "Simekani"
 * "Simekani" → "Simekani"
 * "" or undefined → ""
 */
function extractFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0] ?? '';
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

const identifyRoutes = new Hono();

identifyRoutes.post('/identify', async (c) => {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: IdentifyRequest;
  try {
    body = await c.req.json<IdentifyRequest>();
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const { email } = body;

  if (typeof email !== 'string' || !email.trim()) {
    return c.json({ ok: false, error: 'email is required' }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Basic format guard — the frontend validates more strictly, but the
  // backend should not trust the client.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return c.json({ ok: false, error: 'Invalid email address' }, 400);
  }

  // ── Contact lookup ─────────────────────────────────────────────────────────
  let existingContact: { id: string; name: string | null } | undefined;
  try {
    const rows = await db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(eq(contacts.email, normalizedEmail))
      .limit(1);

    existingContact = rows[0];
  } catch (err) {
    logger.error({ err, email: normalizedEmail }, 'identify: contact lookup failed');
    return c.json({ ok: false, error: 'Internal error — please try again' }, 500);
  }

  // ── Not found — return early ───────────────────────────────────────────────
  if (!existingContact) {
    const response: IdentifyResponse = {
      existing: false,
      hasPastBooking: false,
    };
    return c.json(response);
  }

  // ── Found — check for a confirmed booking ────────────────────────────────
  // Drizzle's fluent API doesn't allow chaining two .where() calls; instead
  // we fetch the status column and filter in JS. The limit(10) cap is safe
  // because most contacts will have at most one or two bookings.
  let hasPastBooking = false;
  try {
    const statusRows = await db
      .select({ status: bookings.status })
      .from(bookings)
      .where(eq(bookings.contactId, existingContact.id))
      .limit(10);

    hasPastBooking = statusRows.some((b) => b.status === 'confirmed');
  } catch (err) {
    logger.error({ err, contactId: existingContact.id }, 'identify: booking lookup failed');
    // Non-fatal — treat as no past booking but still return the contact
    hasPastBooking = false;
  }

  const firstName = extractFirstName(existingContact.name);

  const response: IdentifyResponse = {
    existing: true,
    contact: {
      id: existingContact.id,
      firstName,
    },
    hasPastBooking,
  };

  logger.info(
    { contactId: existingContact.id, hasPastBooking },
    'identify: contact found',
  );

  return c.json(response);
});

export { identifyRoutes };
