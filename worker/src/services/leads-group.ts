import { google } from 'googleapis';
import { getOAuth2Client } from './google-auth.js';
import { encodeHeaderValue, base64url } from './gmail.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { escapeHtml } from '../utils/html-escape.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadsGroupNotificationInput {
  contact: { name: string; email: string; company?: string };
  selectedService: string;
  budget: string;
  requirements: string;
  olsScore: number;
  scoreBand: 'hot' | 'warm' | 'cold';
  meetLink: string;
  slotLabel: string;
}

// ---------------------------------------------------------------------------
// Private: HTML builder for internal team notification (light theme, scannable)
// ---------------------------------------------------------------------------

function buildLeadsNotificationHtml(input: LeadsGroupNotificationInput): string {
  const {
    contact,
    selectedService,
    budget,
    requirements,
    olsScore,
    scoreBand,
    meetLink,
    slotLabel,
  } = input;

  const requirementsPreview =
    requirements.length > 300 ? `${requirements.slice(0, 300)}...` : requirements;

  const safeName = escapeHtml(contact.name);
  const safeEmail = escapeHtml(contact.email);
  const safeCompany = contact.company ? escapeHtml(contact.company) : '—';
  const safeService = escapeHtml(selectedService);
  const safeBudget = escapeHtml(budget);
  const safeRequirements = escapeHtml(requirementsPreview);
  const safeSlot = escapeHtml(slotLabel);
  const safeBand = scoreBand.toUpperCase();

  const bandColour = scoreBand === 'hot' ? '#dc2626' : scoreBand === 'warm' ? '#d97706' : '#2563eb';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:20px 32px;background-color:#111827;border-bottom:1px solid #374151;">
              <span style="font-size:18px;font-weight:700;color:#ffffff;">Octio — New Lead</span>
              <span style="margin-left:12px;padding:3px 10px;font-size:12px;font-weight:700;color:#ffffff;background-color:${bandColour};border-radius:4px;text-transform:uppercase;">${safeBand}</span>
            </td>
          </tr>

          <!-- OLS Score banner -->
          <tr>
            <td style="padding:16px 32px;background-color:#f3f4f6;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0;font-size:14px;color:#6b7280;">OLS Score</p>
              <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${bandColour};">${olsScore}/20 — ${safeBand}</p>
            </td>
          </tr>

          <!-- Lead details -->
          <tr>
            <td style="padding:24px 32px 0;">
              <h2 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">Lead Details</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;width:120px;vertical-align:top;">
                    <span style="font-size:13px;color:#9ca3af;">Name</span>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:14px;font-weight:600;color:#111827;">${safeName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:13px;color:#9ca3af;">Email</span>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <a href="mailto:${safeEmail}" style="font-size:14px;color:#2563eb;text-decoration:none;">${safeEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:13px;color:#9ca3af;">Company</span>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:14px;color:#111827;">${safeCompany}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:13px;color:#9ca3af;">Service</span>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:14px;color:#111827;">${safeService}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:13px;color:#9ca3af;">Budget</span>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:14px;color:#111827;">${safeBudget}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:13px;color:#9ca3af;">Slot</span>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                    <span style="font-size:14px;color:#111827;">${safeSlot}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Requirements -->
          <tr>
            <td style="padding:24px 32px 0;">
              <h2 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">Requirements</h2>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;background-color:#f9fafb;padding:12px;border-radius:6px;border-left:3px solid #d1d5db;">${safeRequirements}</p>
            </td>
          </tr>

          <!-- Meet link -->
          <tr>
            <td style="padding:24px 32px;">
              <a href="${meetLink}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;background-color:#2563eb;border-radius:6px;text-decoration:none;">
                Join Google Meet
              </a>
              <p style="margin:12px 0 0;font-size:13px;color:#9ca3af;">Reply to this email to discuss internally.</p>
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
// Private: Build RFC 2822 raw message for the leads notification
// ---------------------------------------------------------------------------

function buildLeadsNotificationRaw(input: LeadsGroupNotificationInput): string {
  const { contact, selectedService, scoreBand } = input;
  const from = config.googleSenderEmail ?? 'hello@octio.co.za';
  const to = config.leadsGroupEmail ?? 'leads@octio.co.za';
  const subject = `[${scoreBand.toUpperCase()}] New Lead: ${contact.name} — ${selectedService}`;
  const htmlBody = buildLeadsNotificationHtml(input);

  const encodedBody = Buffer.from(htmlBody, 'utf-8').toString('base64');

  const lines = [
    `From: Octio <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeHeaderValue(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody.replace(/(.{76})/g, '$1\r\n'),
  ];

  return lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a "New Lead" notification to leads@octio.co.za.
 * Team members subscribed to the group see this in their inbox.
 * The lead is NOT added as a member — this is an internal notification.
 * Non-fatal: logs errors but never throws.
 */
export async function notifyLeadsGroup(
  input: LeadsGroupNotificationInput,
): Promise<void> {
  try {
    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: 'v1', auth });
    const raw = base64url(buildLeadsNotificationRaw(input));

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    logger.info(
      { to: config.leadsGroupEmail, email: input.contact.email },
      'leads-group: notification sent',
    );
  } catch (err) {
    logger.error(
      { err, email: input.contact.email },
      'leads-group: notifyLeadsGroup failed — non-fatal',
    );
  }
}

/**
 * Add a lead's email as an external member of outreach@octio.co.za.
 * Used for future outbound campaigns/newsletters.
 * Non-fatal: logs errors but never throws.
 * 409 Conflict (already a member) is logged as info, not error.
 */
export async function addToOutreachList(
  email: string,
  displayName?: string,
): Promise<void> {
  try {
    const auth = getOAuth2Client();
    const admin = google.admin({ version: 'directory_v1', auth });

    await admin.members.insert({
      groupKey: config.outreachGroupEmail ?? 'outreach@octio.co.za',
      requestBody: {
        email,
        role: 'MEMBER',
        delivery_settings: 'ALL_MAIL',
      },
    });

    logger.info(
      { email, displayName },
      'leads-group: added to outreach list',
    );
  } catch (err: unknown) {
    // 409 means the lead is already a member — expected on repeat bookings
    const status = (err as { code?: number; status?: number }).code ??
      (err as { code?: number; status?: number }).status;

    if (status === 409) {
      logger.info(
        { email },
        'leads-group: email already in outreach list — skipping (409)',
      );
      return;
    }

    logger.warn(
      { err, email },
      'leads-group: addToOutreachList failed — non-fatal',
    );
  }
}
