import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { sendInternalAlert } from '../../services/gmail.js';
import { escapeHtml } from '../../utils/html-escape.js';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const inputSchema = z.object({
  contactEmail: z.string().email(),
  contactName: z.string(),
  company: z.string().optional(),
  serviceInterest: z.string(),
  budget: z.string(),
  requirementsSummary: z
    .string()
    .describe('1–2 sentence summary of what the user needs'),
  keyPainPoints: z
    .array(z.string())
    .describe('Main problems they mentioned during the conversation'),
  teamSize: z.string().optional(),
  timelineUrgency: z.string().optional(),
  decisionMakers: z.string().optional(),
  competitorMentions: z.array(z.string()).optional(),
  recommendedCallAgenda: z
    .array(z.string())
    .describe('2–4 bullet points for what the discovery call should cover'),
  additionalNotes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// HTML brief builder (SRP: owns email content construction only)
// ---------------------------------------------------------------------------

function buildBriefHtml(input: z.infer<typeof inputSchema>): string {
  const safeName = escapeHtml(input.contactName);
  const safeEmail = escapeHtml(input.contactEmail);
  const safeCompany = input.company ? escapeHtml(input.company) : 'Not provided';
  const safeService = escapeHtml(input.serviceInterest);
  const safeBudget = escapeHtml(input.budget);
  const safeSummary = escapeHtml(input.requirementsSummary);
  const safeTeamSize = input.teamSize ? escapeHtml(input.teamSize) : 'Not captured';
  const safeTimeline = input.timelineUrgency ? escapeHtml(input.timelineUrgency) : 'Not captured';
  const safeDecisionMakers = input.decisionMakers ? escapeHtml(input.decisionMakers) : 'Not captured';
  const safeNotes = input.additionalNotes ? escapeHtml(input.additionalNotes) : '';

  const painPointsHtml = input.keyPainPoints
    .map((p) => `<li style="margin:0 0 6px;font-size:15px;color:#F0EDE8;line-height:1.5;">${escapeHtml(p)}</li>`)
    .join('');

  const agendaHtml = input.recommendedCallAgenda
    .map(
      (item, i) =>
        `<tr>
          <td style="padding:0 0 10px;padding-left:12px;border-left:2px solid #E8862A;">
            <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.5;"><strong style="color:#E8862A;">${i + 1}.</strong> ${escapeHtml(item)}</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>`,
    )
    .join('');

  const competitorsHtml =
    input.competitorMentions && input.competitorMentions.length > 0
      ? input.competitorMentions.map((c) => escapeHtml(c)).join(', ')
      : 'None mentioned';

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
              <span style="margin-left:12px;font-size:13px;color:#9B96A0;text-transform:uppercase;letter-spacing:1px;">Discovery Call Brief</span>
            </td>
          </tr>

          <!-- Contact summary -->
          <tr>
            <td style="padding:32px 40px 0;">
              <h2 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">Contact</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 8px;">
                    <p style="margin:0;font-size:20px;font-weight:700;color:#F0EDE8;">${safeName}</p>
                    <p style="margin:4px 0 0;font-size:15px;color:#9B96A0;">${safeCompany} &middot; <a href="mailto:${safeEmail}" style="color:#E8862A;text-decoration:none;">${safeEmail}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Service + budget -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" style="padding-right:12px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#9B96A0;">Service Interest</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#F0EDE8;">${safeService}</p>
                  </td>
                  <td width="50%">
                    <p style="margin:0 0 4px;font-size:12px;color:#9B96A0;">Budget Range</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#F0EDE8;">${safeBudget}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Requirements summary -->
          <tr>
            <td style="padding:24px 40px 0;">
              <h2 style="margin:0 0 10px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">Requirements Summary</h2>
              <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.6;">${safeSummary}</p>
            </td>
          </tr>

          <!-- Key pain points -->
          <tr>
            <td style="padding:24px 40px 0;">
              <h2 style="margin:0 0 10px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">Key Pain Points</h2>
              <ul style="margin:0;padding-left:20px;">
                ${painPointsHtml}
              </ul>
            </td>
          </tr>

          <!-- BANT enrichment -->
          <tr>
            <td style="padding:24px 40px 0;">
              <h2 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">Qualifying Context</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 10px;">
                    <p style="margin:0 0 2px;font-size:12px;color:#9B96A0;">Team Size</p>
                    <p style="margin:0;font-size:15px;color:#F0EDE8;">${safeTeamSize}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;">
                    <p style="margin:0 0 2px;font-size:12px;color:#9B96A0;">Timeline Urgency</p>
                    <p style="margin:0;font-size:15px;color:#F0EDE8;">${safeTimeline}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;">
                    <p style="margin:0 0 2px;font-size:12px;color:#9B96A0;">Decision Makers</p>
                    <p style="margin:0;font-size:15px;color:#F0EDE8;">${safeDecisionMakers}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 2px;font-size:12px;color:#9B96A0;">Competitors Mentioned</p>
                    <p style="margin:0;font-size:15px;color:#F0EDE8;">${competitorsHtml}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Recommended agenda -->
          <tr>
            <td style="padding:24px 40px 0;">
              <h2 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">Recommended Call Agenda</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${agendaHtml}
              </table>
            </td>
          </tr>

          ${safeNotes ? `
          <!-- Additional notes -->
          <tr>
            <td style="padding:24px 40px 0;">
              <h2 style="margin:0 0 10px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">Additional Notes</h2>
              <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.6;">${safeNotes}</p>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;margin-top:24px;background-color:#080814;border-top:1px solid #1E1E3A;">
              <p style="margin:0;font-size:13px;color:#9B96A0;line-height:1.6;">
                Generated by Octo — Octio's pre-call AI assistant. This brief was compiled from the booking wizard intake and the pre-call conversation.
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
// Tool definition (SRP: compiles and dispatches the call brief only)
// ---------------------------------------------------------------------------

export const prepareCallBriefTool = createTool({
  id: 'prepare_call_brief',
  description:
    'Prepare and send a discovery call brief to the Octio team. Call this when the conversation is naturally ending — the user says goodbye, has no more questions, or you have completed the qualifying phases. The brief helps the team arrive at the call fully informed.',
  inputSchema,
  execute: async (input): Promise<{ ok: boolean; message?: string; error?: string }> => {
    const company = input.company ?? 'Unknown Company';
    const subject = `[CALL BRIEF] Discovery Call — ${input.contactName} from ${company}`;

    try {
      const htmlBody = buildBriefHtml(input);
      await sendInternalAlert(subject, htmlBody);
      return { ok: true, message: 'Brief sent to the team' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  },
});
