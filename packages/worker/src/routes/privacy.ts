import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  contacts,
  bookings,
  appointments,
  leadScores,
  conversations,
  consentEvents,
} from '../db/schema.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.js';
import { sendEmail } from '../services/gmail.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeletionRequestBody {
  email?: unknown;
}

// ---------------------------------------------------------------------------
// HMAC token helpers (SRP — one concern: sign / verify tokens)
// ---------------------------------------------------------------------------

/**
 * Signs a deletion token.
 * Token format: `<contactId>.<hexHmac>`
 * The HMAC covers `contactId` only, so the token is stable across requests
 * for the same contact and we never embed time-sensitive data into the DB.
 */
export function signDeletionToken(contactId: string): string {
  const mac = createHmac('sha256', config.deletionSecret)
    .update(contactId)
    .digest('hex');
  return `${contactId}.${mac}`;
}

/**
 * Verifies a deletion token.
 * Returns the contactId if the token is valid, null otherwise.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyDeletionToken(token: string): string | null {
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const contactId = token.slice(0, dotIndex);
  const providedMac = token.slice(dotIndex + 1);

  if (!contactId || !providedMac) return null;

  const expectedMac = createHmac('sha256', config.deletionSecret)
    .update(contactId)
    .digest('hex');

  // Both buffers must be the same length for timingSafeEqual
  const expected = Buffer.from(expectedMac, 'utf-8');
  const provided = Buffer.from(providedMac.padEnd(expectedMac.length, ' '), 'utf-8');

  if (expected.length !== provided.length) return null;

  try {
    const match = timingSafeEqual(expected, provided);
    return match ? contactId : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTML email builder for deletion confirmation (SRP)
// ---------------------------------------------------------------------------

function buildDeletionRequestEmailHtml(confirmationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#06060C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#06060C;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0D0D1A;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1E1E3A;">
              <span style="font-size:24px;font-weight:700;color:#E8862A;letter-spacing:-0.5px;">Octio</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#F0EDE8;line-height:1.2;">
                Confirm your data deletion request
              </h1>
              <p style="margin:0 0 16px;font-size:15px;color:#9B96A0;line-height:1.6;">
                We received a request to permanently delete all personal data Octio holds about you in accordance with POPIA (Protection of Personal Information Act).
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#9B96A0;line-height:1.6;">
                This action is <strong style="color:#F0EDE8;">permanent and cannot be undone</strong>. All records including your contact information, bookings, chat history, and consent events will be removed.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#9B96A0;line-height:1.6;">
                If you made this request, click the button below to confirm. If you did not make this request, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#E8862A;">
                    <a href="${confirmationUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#06060C;text-decoration:none;border-radius:8px;">
                      Confirm deletion
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#080814;border-top:1px solid #1E1E3A;">
              <p style="margin:0;font-size:13px;color:#9B96A0;line-height:1.6;">
                Questions? Contact us at
                <a href="mailto:${config.googleSenderEmail ?? 'hello@octio.co.za'}" style="color:#E8862A;text-decoration:none;">${config.googleSenderEmail ?? 'hello@octio.co.za'}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Cascade deletion (SRP — knows the deletion order, not the HTTP layer)
// ---------------------------------------------------------------------------

/**
 * Deletes all data associated with a contactId in FK-safe order.
 * Logs the deletion to the application log as the audit trail.
 */
async function cascadeDeleteContact(contactId: string): Promise<void> {
  // 1. Delete lead_scores (FK to contacts, FK to bookings — delete before bookings)
  await db.delete(leadScores).where(eq(leadScores.contactId, contactId));

  // 2. Delete appointments (FK to contacts and bookings)
  await db.delete(appointments).where(eq(appointments.contactId, contactId));

  // 3. Delete bookings (lead_scores + appointments referencing bookings are gone)
  await db.delete(bookings).where(eq(bookings.contactId, contactId));

  // 4. Delete conversations (messages cascade automatically via ON DELETE CASCADE)
  await db.delete(conversations).where(eq(conversations.contactId, contactId));

  // 5. Delete consent_events (FK to contacts)
  await db.delete(consentEvents).where(eq(consentEvents.contactId, contactId));

  // 6. Delete the contact record itself
  await db.delete(contacts).where(eq(contacts.id, contactId));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const privacyRoutes = new Hono();

/**
 * POST /privacy/request-deletion
 *
 * Accepts a JSON body with an `email` field. Looks up the contact by email,
 * generates a signed confirmation token, and sends a deletion confirmation
 * email. Always returns 200 even when the email is not found (prevents
 * enumeration of registered addresses).
 *
 * Rate limited: 3 requests per hour per IP.
 */
privacyRoutes.post(
  '/request-deletion',
  rateLimitMiddleware('ip-only', {
    perIpFrequency: { maxRequests: 3, windowMs: 3_600_000 },
  }),
  async (c) => {
    let body: DeletionRequestBody;
    try {
      body = (await c.req.json()) as DeletionRequestBody;
    } catch {
      return c.json({ ok: false, error: 'Request body must be valid JSON' }, 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;

    if (!email) {
      return c.json({ ok: false, error: 'email is required' }, 400);
    }

    // Basic email format check (full RFC 5321 parsing is not needed here)
    if (!email.includes('@') || email.length > 254) {
      return c.json({ ok: false, error: 'email is invalid' }, 400);
    }

    // Look up the contact — but do NOT reveal whether the email exists
    try {
      const [contact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.email, email))
        .limit(1);

      if (contact) {
        const token = signDeletionToken(contact.id);
        const confirmationUrl = `${config.apiBaseUrl}/privacy/confirm-deletion?token=${encodeURIComponent(token)}&contactId=${encodeURIComponent(contact.id)}`;

        await sendEmail({
          to: email,
          subject: 'Confirm your data deletion request — Octio',
          htmlBody: buildDeletionRequestEmailHtml(confirmationUrl),
        });

        logger.info(
          { contactId: contact.id, action: 'popia_deletion_email_sent' },
          'POPIA: deletion confirmation email sent',
        );
      } else {
        // Log at debug level — not an error, expected for unknown emails
        logger.debug({ email: '[redacted]', action: 'popia_deletion_unknown_email' }, 'POPIA: deletion requested for unknown email');
      }
    } catch (err) {
      logger.error({ err }, 'privacy: request-deletion failed');
      return c.json({ ok: false, error: 'Internal error — please try again' }, 500);
    }

    // Always return success to prevent email enumeration
    return c.json({
      ok: true,
      message: 'If that email address is registered with us, you will receive a confirmation email shortly.',
    });
  },
);

/**
 * GET /privacy/confirm-deletion?token=<token>&contactId=<uuid>
 *
 * Called when the user clicks the confirmation link in their email.
 * Browsers follow GET links from anchor tags; DELETE cannot be triggered
 * from email clients.
 *
 * Verifies the HMAC token, performs a cascade delete of all contact data,
 * and returns a plain HTML confirmation page.
 */
privacyRoutes.get('/confirm-deletion', async (c) => {
  const token = c.req.query('token') ?? '';
  const contactId = c.req.query('contactId') ?? '';

  if (!token || !contactId) {
    return c.html(buildErrorPage('Missing required parameters.'), 400);
  }

  const verifiedContactId = verifyDeletionToken(token);

  if (!verifiedContactId || verifiedContactId !== contactId) {
    logger.warn(
      { contactId, action: 'popia_deletion_invalid_token' },
      'POPIA: deletion confirmation failed — invalid token',
    );
    return c.html(buildErrorPage('Invalid or expired deletion link.'), 400);
  }

  // Verify the contact still exists before attempting deletion
  let contactExists: boolean;
  try {
    const [row] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.id, verifiedContactId))
      .limit(1);
    contactExists = Boolean(row);
  } catch (err) {
    logger.error({ err }, 'privacy: confirm-deletion DB lookup failed');
    return c.html(buildErrorPage('Internal error — please try again later.'), 500);
  }

  if (!contactExists) {
    // Already deleted or never existed — treat as success (idempotent)
    logger.info(
      { contactId: verifiedContactId, action: 'popia_deletion_already_gone' },
      'POPIA: deletion confirmed but contact not found (already deleted)',
    );
    return c.html(buildSuccessPage());
  }

  try {
    await cascadeDeleteContact(verifiedContactId);

    logger.info(
      { contactId: verifiedContactId, email: '[redacted]', action: 'popia_deletion_complete' },
      'POPIA: all data deleted',
    );
  } catch (err) {
    logger.error({ err, contactId: verifiedContactId }, 'privacy: cascade delete failed');
    return c.html(buildErrorPage('Deletion failed — please contact us at hello@octio.co.za.'), 500);
  }

  return c.html(buildSuccessPage());
});

// ---------------------------------------------------------------------------
// Response page builders (SRP — each builds one page variant)
// ---------------------------------------------------------------------------

function buildSuccessPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Data Deleted — Octio</title>
  <style>
    body { margin: 0; padding: 0; background: #06060C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { max-width: 480px; width: 100%; margin: 24px; background: #0D0D1A; border-radius: 12px; padding: 48px 40px; text-align: center; }
    h1 { margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #F0EDE8; }
    p { margin: 0; font-size: 15px; color: #9B96A0; line-height: 1.6; }
    .brand { font-size: 20px; font-weight: 700; color: #E8862A; margin-bottom: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Octio</div>
    <h1>Your data has been deleted</h1>
    <p>All personal data Octio held about you has been permanently removed in accordance with POPIA. You will not receive any further communications from us.</p>
  </div>
</body>
</html>`;
}

function buildErrorPage(message: string): string {
  // Inline escaping — no dependency on external utility to keep this pure
  const safeMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Error — Octio</title>
  <style>
    body { margin: 0; padding: 0; background: #06060C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { max-width: 480px; width: 100%; margin: 24px; background: #0D0D1A; border-radius: 12px; padding: 48px 40px; text-align: center; }
    h1 { margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #F0EDE8; }
    p { margin: 0; font-size: 15px; color: #9B96A0; line-height: 1.6; }
    .brand { font-size: 20px; font-weight: 700; color: #E8862A; margin-bottom: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Octio</div>
    <h1>Something went wrong</h1>
    <p>${safeMessage}</p>
  </div>
</body>
</html>`;
}

export { privacyRoutes };
