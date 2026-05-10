import { google } from 'googleapis';
import { getOAuth2Client } from './google-auth.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { escapeHtml } from '../utils/html-escape.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SendEmailOptions {
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
}

export interface BookingIntake {
  contact: { email: string; name: string; company?: string };
  selectedSlot: { label: string };
  selectedService: string;
  budget: string;
  requirements: string;
}

export interface CalendarResult {
  meetLink: string;
  calendarLink: string;
}

// ---------------------------------------------------------------------------
// Topic → email subject map (single source of truth — SRP)
// ---------------------------------------------------------------------------

const TOPIC_SUBJECTS: Record<string, string> = {
  'web-dev': 'Web Development at Octio — What We Build',
  'custom-software': 'Custom Software Solutions — Octio Case Studies',
  'ai-agents': 'AI Agents & Automation — How We Build Intelligence',
  'modernisation': 'Legacy Modernisation — Our Approach',
  'mobile-app': 'Mobile App Development at Octio',
};

const DEFAULT_SUBJECT = 'Learn More About Octio';

const MAX_REQUIREMENTS_LENGTH = 200;

// ---------------------------------------------------------------------------
// Private RFC 2822 builder (SRP — knows nothing about business logic)
// ---------------------------------------------------------------------------

/**
 * RFC 2047 encoded-word for non-ASCII header values.
 * Returns the string unchanged if it's pure ASCII; otherwise wraps it in
 * `=?UTF-8?B?<base64>?=` so email clients decode it correctly.
 * Without this, em dashes and other non-ASCII characters in headers render
 * as mojibake (e.g. `Ã¢Â€Â"` instead of `—`).
 */
export function encodeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) {
    return value;
  }
  const base64 = Buffer.from(value, 'utf-8').toString('base64');
  return `=?UTF-8?B?${base64}?=`;
}

/**
 * Encodes the `From` display name portion only, preserving the `<email>` syntax.
 * Example: `Octio` → `Octio` (ASCII unchanged); `Octo 🔥` → `=?UTF-8?B?...?= <email>`.
 */
function encodeFromHeader(displayName: string, email: string): string {
  return `${encodeHeaderValue(displayName)} <${email}>`;
}

function buildRawMessage(options: SendEmailOptions): string {
  const lines: string[] = [
    `From: ${encodeFromHeader('Octio', config.googleSenderEmail ?? '')}`,
    `To: ${options.to}`,
  ];

  if (options.cc) {
    lines.push(`Cc: ${options.cc}`);
  }

  // Base64-encode the HTML body for rock-solid UTF-8 handling across SMTP.
  // Avoids any 7bit/8bit transfer-encoding ambiguity for non-ASCII content
  // (em dashes, middle dots, smart quotes, etc.) inside the body.
  const encodedBody = Buffer.from(options.htmlBody, 'utf-8').toString('base64');

  lines.push(
    `Subject: ${encodeHeaderValue(options.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    // RFC 2045 recommends folding base64 at 76 chars per line for maximum
    // SMTP compatibility, though most modern servers accept long lines.
    encodedBody.replace(/(.{76})/g, '$1\r\n'),
  );

  // RFC 2822 mandates CRLF line endings
  return lines.join('\r\n');
}

export function base64url(message: string): string {
  return Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// Private send helper (single responsibility: talk to Gmail API)
// ---------------------------------------------------------------------------

export async function sendEmail(options: SendEmailOptions): Promise<string> {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = base64url(buildRawMessage(options));

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  logger.info({ to: options.to, subject: options.subject }, 'email sent');

  return response.data.id ?? '';
}

// ---------------------------------------------------------------------------
// HTML template builders (SRP — each knows its own content)
// ---------------------------------------------------------------------------

function buildBookingConfirmationHtml(
  intake: BookingIntake,
  calendarResult: CalendarResult,
): string {
  const requirementsPreview =
    intake.requirements.length > MAX_REQUIREMENTS_LENGTH
      ? `${intake.requirements.slice(0, MAX_REQUIREMENTS_LENGTH)}...`
      : intake.requirements;

  // Escape all user-controlled values before HTML interpolation (XSS prevention).
  // URLs (meetLink, calendarLink) are Google-generated and intentionally not escaped.
  const safeName = escapeHtml(intake.contact.name);
  const safeSlotLabel = escapeHtml(intake.selectedSlot.label);
  const safeService = escapeHtml(intake.selectedService);
  const safeBudget = escapeHtml(intake.budget);
  const safeRequirementsPreview = escapeHtml(requirementsPreview);

  // Table-based layout for Outlook compat; inline CSS only (Gmail strips <style>)
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

          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#F0EDE8;line-height:1.2;">
                Your discovery call is confirmed
              </h1>
              <p style="margin:0;font-size:16px;color:#9B96A0;line-height:1.5;">
                We're looking forward to speaking with you, ${safeName}.
              </p>
            </td>
          </tr>

          <!-- Slot highlight -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:20px 24px;background-color:#141428;border-left:3px solid #E8862A;border-radius:4px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">Scheduled for</p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#F0EDE8;">${safeSlotLabel}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA buttons -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#E8862A;">
                    <a href="${calendarResult.meetLink}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#06060C;text-decoration:none;border-radius:8px;">
                      Join via Google Meet
                    </a>
                  </td>
                  <td style="width:16px;"></td>
                  <td>
                    <a href="${calendarResult.calendarLink}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#E8862A;text-decoration:none;border:1px solid #E8862A;border-radius:8px;">
                      Add to calendar
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px 32px;">
              <hr style="border:none;border-top:1px solid #1E1E3A;margin:0;">
            </td>
          </tr>

          <!-- Brief recap -->
          <tr>
            <td style="padding:0 40px 32px;">
              <h2 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">Your booking recap</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 12px;">
                    <p style="margin:0 0 2px;font-size:12px;color:#9B96A0;">Service of interest</p>
                    <p style="margin:0;font-size:15px;color:#F0EDE8;font-weight:500;">${safeService}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px;">
                    <p style="margin:0 0 2px;font-size:12px;color:#9B96A0;">Budget range</p>
                    <p style="margin:0;font-size:15px;color:#F0EDE8;font-weight:500;">${safeBudget}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 2px;font-size:12px;color:#9B96A0;">What you told us</p>
                    <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.6;">${safeRequirementsPreview}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px 32px;">
              <hr style="border:none;border-top:1px solid #1E1E3A;margin:0;">
            </td>
          </tr>

          <!-- What to expect -->
          <tr>
            <td style="padding:0 40px 32px;">
              <h2 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">What to expect on the call</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 10px;padding-left:12px;border-left:2px solid #E8862A;">
                    <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.5;">We'll discuss your project in detail</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:0 0 10px;padding-left:12px;border-left:2px solid #E8862A;">
                    <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.5;">We'll explore the best approach for your needs</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding-left:12px;border-left:2px solid #E8862A;">
                    <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.5;">No commitment — just a conversation</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#080814;border-top:1px solid #1E1E3A;">
              <p style="margin:0;font-size:13px;color:#9B96A0;line-height:1.6;">
                Questions? Reply to this email or reach us at
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

function buildInternalAlertHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#ffffff;color:#111111;">
  <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(body)}</p>
</body>
</html>`;
}

function buildResourceEmailHtml(toEmail: string, topic: string): string {
  const topicLabel = topic
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

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

          <!-- Intro -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <p style="margin:0 0 16px;font-size:16px;color:#F0EDE8;line-height:1.6;">
                Thanks for your interest in <strong style="color:#E8862A;">${topicLabel}</strong>.
              </p>
              <p style="margin:0;font-size:15px;color:#9B96A0;line-height:1.6;">
                We've put together some resources that show how we approach this at Octio — real work, real outcomes.
              </p>
            </td>
          </tr>

          <!-- Case study content placeholder -->
          <tr>
            <td style="padding:0 40px 32px;">
              <!-- CASE_STUDY_CONTENT -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:24px;background-color:#141428;border-radius:8px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">Coming Soon</p>
                    <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.6;">
                      In-depth case studies for ${topicLabel} are being prepared. We'll follow up with detailed examples of how we've solved similar challenges.
                    </p>
                  </td>
                </tr>
              </table>
              <!-- /CASE_STUDY_CONTENT -->
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#E8862A;">
                    <a href="https://octio.co.za" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#06060C;text-decoration:none;border-radius:8px;">
                      Book a call
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
                Questions? Reply to this email or reach us at
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
// Public API
// ---------------------------------------------------------------------------

/**
 * Sends an HTML confirmation email to the client after a wizard booking.
 * CC's the Octio team email so the team has a record of the booking.
 */
export async function sendBookingConfirmation(
  intake: BookingIntake,
  calendarResult: CalendarResult,
): Promise<string> {
  return sendEmail({
    to: intake.contact.email,
    cc: config.octioTeamEmail,
    subject: `Your Octio discovery call is locked in — ${intake.selectedSlot.label}`,
    htmlBody: buildBookingConfirmationHtml(intake, calendarResult),
  });
}

/**
 * Sends a plain internal alert to the Octio team (hot leads, handoff notifications).
 * The caller controls the subject line (e.g. "HOT LEAD: Jane from Acme Corp").
 */
export async function sendInternalAlert(
  subject: string,
  body: string,
): Promise<string> {
  return sendEmail({
    to: config.octioTeamEmail ?? '',
    subject,
    htmlBody: buildInternalAlertHtml(body),
  });
}

/**
 * Sends an abandonment recovery email to a lead who started but didn't
 * complete the discovery wizard. "Pick up where you left off" CTA.
 */
export async function sendAbandonmentRecoveryEmail(
  toEmail: string,
  name: string,
): Promise<string> {
  const safeName = escapeHtml(name);
  const siteUrl = config.nodeEnv === 'production'
    ? 'https://octio.co.za'
    : 'http://localhost:5173';

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#06060C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#06060C;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0D0D1A;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1E1E3A;">
              <span style="font-size:24px;font-weight:700;color:#E8862A;letter-spacing:-0.5px;">Octio</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F0EDE8;line-height:1.2;">
                Hey ${safeName}, you didn't finish
              </h1>
              <p style="margin:0;font-size:16px;color:#9B96A0;line-height:1.6;">
                You started a discovery conversation with us but didn't get to book your call.
                No worries — your progress is waiting for you.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 24px;font-size:15px;color:#9B96A0;line-height:1.6;">
                It only takes a minute to finish and lock in your free discovery call with our team.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#E8862A;">
                    <a href="${siteUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#06060C;text-decoration:none;border-radius:8px;">
                      Pick up where you left off
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#080814;border-top:1px solid #1E1E3A;">
              <p style="margin:0;font-size:13px;color:#9B96A0;line-height:1.6;">
                Questions? Reply to this email or reach us at
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

  return sendEmail({
    to: toEmail,
    subject: `${name}, pick up where you left off`,
    htmlBody,
  });
}

/**
 * Sends a "What to prepare for your call" email 1 hour after booking.
 */
export async function sendPrepEmail(
  toEmail: string,
  name: string,
  meetLink: string,
  slotStartAt: string,
): Promise<string> {
  const safeName = escapeHtml(name);
  const slotDate = new Date(slotStartAt);
  const safeSlotLabel = escapeHtml(
    slotDate.toLocaleDateString('en-ZA', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }),
  );

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#06060C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#06060C;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0D0D1A;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #1E1E3A;"><span style="font-size:24px;font-weight:700;color:#E8862A;">Octio</span></td></tr>
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F0EDE8;">What to prepare for your call</h1>
              <p style="margin:0;font-size:16px;color:#9B96A0;line-height:1.6;">Hey ${safeName}, your discovery call is on <strong style="color:#F0EDE8;">${safeSlotLabel}</strong>. Here's how to make the most of it.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:12px 16px;border-left:3px solid #E8862A;background-color:#141428;border-radius:4px;margin-bottom:8px;">
                  <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.6;">1. Have your current process documented (even rough notes)</p>
                </td></tr>
                <tr><td style="height:8px;"></td></tr>
                <tr><td style="padding:12px 16px;border-left:3px solid #E8862A;background-color:#141428;border-radius:4px;">
                  <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.6;">2. Bring examples of what's not working</p>
                </td></tr>
                <tr><td style="height:8px;"></td></tr>
                <tr><td style="padding:12px 16px;border-left:3px solid #E8862A;background-color:#141428;border-radius:4px;">
                  <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.6;">3. Know your budget range and timeline</p>
                </td></tr>
              </table>
            </td>
          </tr>
          ${meetLink ? `<tr><td style="padding:0 40px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:8px;background-color:#E8862A;"><a href="${meetLink}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#06060C;text-decoration:none;border-radius:8px;">Join via Google Meet</a></td></tr></table></td></tr>` : ''}
          <tr><td style="padding:24px 40px;background-color:#080814;border-top:1px solid #1E1E3A;"><p style="margin:0;font-size:13px;color:#9B96A0;">Questions? Reply to this email.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: toEmail,
    subject: `Your call prep checklist — ${safeSlotLabel}`,
    htmlBody,
  });
}

/**
 * Sends a reminder email 24 hours before the discovery call.
 */
export async function sendReminderEmail(
  toEmail: string,
  name: string,
  meetLink: string,
  slotStartAt: string,
): Promise<string> {
  const safeName = escapeHtml(name);
  const slotDate = new Date(slotStartAt);
  const safeSlotLabel = escapeHtml(
    slotDate.toLocaleDateString('en-ZA', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }),
  );

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#06060C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#06060C;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0D0D1A;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #1E1E3A;"><span style="font-size:24px;font-weight:700;color:#E8862A;">Octio</span></td></tr>
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F0EDE8;">Your call is tomorrow</h1>
              <p style="margin:0;font-size:16px;color:#9B96A0;line-height:1.6;">Hey ${safeName}, just a reminder — your discovery call is on <strong style="color:#F0EDE8;">${safeSlotLabel}</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#9B96A0;line-height:1.6;">We've reviewed your intake and prepared a tailored agenda. The team is ready to discuss your project in detail.</p>
              ${meetLink ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:8px;background-color:#E8862A;"><a href="${meetLink}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#06060C;text-decoration:none;border-radius:8px;">Join via Google Meet</a></td></tr></table>` : ''}
            </td>
          </tr>
          <tr><td style="padding:24px 40px;background-color:#080814;border-top:1px solid #1E1E3A;"><p style="margin:0;font-size:13px;color:#9B96A0;">Need to reschedule? Reply to this email and we'll sort it out.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: toEmail,
    subject: `Reminder: your discovery call is tomorrow — ${safeSlotLabel}`,
    htmlBody,
  });
}

/**
 * Sends a feedback request email 1 hour after the discovery call.
 */
export async function sendFeedbackEmail(
  toEmail: string,
  name: string,
): Promise<string> {
  const safeName = escapeHtml(name);

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#06060C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#06060C;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0D0D1A;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #1E1E3A;"><span style="font-size:24px;font-weight:700;color:#E8862A;">Octio</span></td></tr>
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F0EDE8;">How was your call?</h1>
              <p style="margin:0;font-size:16px;color:#9B96A0;line-height:1.6;">Hey ${safeName}, thanks for taking the time to chat with us. We'd love to know how it went.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#9B96A0;line-height:1.6;">Was there anything we missed? Questions that came up after? Just reply to this email — we read every response.</p>
              <p style="margin:0;font-size:15px;color:#9B96A0;line-height:1.6;"><strong style="color:#F0EDE8;">Next steps:</strong> We'll follow up within 24 hours with a project outline based on what we discussed.</p>
            </td>
          </tr>
          <tr><td style="padding:24px 40px;background-color:#080814;border-top:1px solid #1E1E3A;"><p style="margin:0;font-size:13px;color:#9B96A0;">Reply to this email anytime — we're here to help.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: toEmail,
    subject: `How was your discovery call, ${name}?`,
    htmlBody,
  });
}

/**
 * Sends a topic-specific case study email to a lead.
 * Triggered by the freechat agent's `send_resources` tool.
 */
export async function sendResourceEmail(
  toEmail: string,
  topic: string,
): Promise<string> {
  const subject = TOPIC_SUBJECTS[topic] ?? DEFAULT_SUBJECT;

  return sendEmail({
    to: toEmail,
    subject,
    htmlBody: buildResourceEmailHtml(toEmail, topic),
  });
}
