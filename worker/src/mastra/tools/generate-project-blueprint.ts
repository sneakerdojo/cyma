import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../../config.js';
import { escapeHtml } from '../../utils/html-escape.js';
import { encodeHeaderValue } from '../../services/gmail.js';
import { google } from 'googleapis';
import { getOAuth2Client } from '../../services/google-auth.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceEntry {
  title: string;
  typical_timeline: string;
  technologies: string[];
}

interface ServicesMap {
  [key: string]: ServiceEntry;
}

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const inputSchema = z.object({
  contactEmail: z.string().email().describe('Lead email to send the blueprint to'),
  contactName: z.string().describe('Lead first name for personalization'),
  company: z.string().optional().describe('Company name if known'),
  serviceInterest: z.string().describe('Primary service: web-dev, custom-software, ai-agents, mobile-app, modernisation'),
  projectSummary: z.string().describe('2-3 sentence summary of what they need, in your own words based on the conversation'),
  painPoints: z.array(z.string()).describe('Key problems they mentioned'),
  budgetRange: z.string().describe('Budget range from wizard intake'),
  teamSize: z.string().optional().describe('How many people on their side'),
  timelineNotes: z.string().optional().describe('Any deadline or urgency mentioned'),
  technicalContext: z.string().optional().describe('Any existing systems, tech stack, or constraints mentioned'),
});

// ---------------------------------------------------------------------------
// Service loader (SRP: only responsible for reading service data)
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadServiceEntry(serviceInterest: string): ServiceEntry {
  const raw = readFileSync(
    resolve(__dirname, '../../knowledge/services.json'),
    'utf-8',
  );
  const services = JSON.parse(raw) as ServicesMap;
  return services[serviceInterest] ?? services['general']!;
}

// ---------------------------------------------------------------------------
// LLM blueprint generator (SRP: only responsible for generating blueprint text)
// ---------------------------------------------------------------------------

async function generateBlueprintMarkdown(
  input: z.infer<typeof inputSchema>,
  serviceEntry: ServiceEntry,
): Promise<string> {
  const kimi = createOpenAICompatible({
    name: 'kimi',
    baseURL: config.kimiBaseUrl ?? 'https://api.moonshot.ai/v1',
    apiKey: config.kimiApiKey ?? '',
  });

  const { text } = await generateText({
    model: kimi.chatModel(config.kimiModel ?? 'kimi-k2-0905-preview'),
    system:
      'You are a senior technical consultant at Octio, a South Africa-based software and AI agency. Generate a concise project blueprint based on the inputs provided. Be specific, practical, and confident — this document represents Octio\'s expertise.',
    prompt: `Generate a project blueprint for this lead:

Project: ${input.projectSummary}
Service: ${serviceEntry.title}
Pain points: ${input.painPoints.join(', ')}
Budget: ${input.budgetRange}
Team: ${input.teamSize ?? 'Unknown'}
Timeline: ${input.timelineNotes ?? 'Flexible'}
Technical context: ${input.technicalContext ?? 'None specified'}

Typical timeline for this service: ${serviceEntry.typical_timeline}
Technologies we use: ${serviceEntry.technologies.join(', ')}

Generate the following sections in markdown:

## Recommended Approach
2-3 paragraphs explaining how Octio would tackle this project. Be specific about methodology.

## Proposed Phases
3-4 phases with:
- Phase name
- Duration estimate (weeks)
- Key deliverables (3-4 bullets each)
- Dependencies or decisions needed

## Key Technical Decisions
3-5 technical choices the team will need to make early, with Octio's recommended direction for each.

## Risks & Mitigations
3-4 risks specific to THIS project (not generic risks), with how Octio handles each.

## Recommended Call Agenda
4-5 bullet points for what to cover on the discovery call, based on what we know and what we still need to learn.

Keep the total output under 800 words. Write confidently — this is a document from experts, not a hedge-filled proposal.`,
  });

  return text;
}

// ---------------------------------------------------------------------------
// Markdown → HTML converter (SRP: only responsible for safe markup conversion)
// ---------------------------------------------------------------------------

function convertMarkdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      continue;
    }

    // ## Heading
    if (trimmed.startsWith('## ')) {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      const heading = escapeHtml(trimmed.slice(3));
      htmlParts.push(
        `<h2 style="margin:24px 0 10px;font-size:14px;font-weight:600;color:#E8862A;text-transform:uppercase;letter-spacing:1px;">${heading}</h2>`,
      );
      continue;
    }

    // ### Sub-heading
    if (trimmed.startsWith('### ')) {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      const heading = applyInlineMarkdown(escapeHtml(trimmed.slice(4)));
      htmlParts.push(
        `<h3 style="margin:16px 0 6px;font-size:13px;font-weight:600;color:#C8702A;">${heading}</h3>`,
      );
      continue;
    }

    // - bullet
    if (trimmed.startsWith('- ')) {
      if (!inList) {
        htmlParts.push('<ul style="margin:0 0 12px;padding-left:20px;">');
        inList = true;
      }
      const content = applyInlineMarkdown(escapeHtml(trimmed.slice(2)));
      htmlParts.push(
        `<li style="margin:0 0 6px;font-size:15px;color:#F0EDE8;line-height:1.5;">${content}</li>`,
      );
      continue;
    }

    // numbered list: 1. 2. 3.
    if (/^\d+\.\s/.test(trimmed)) {
      if (!inList) {
        htmlParts.push('<ul style="margin:0 0 12px;padding-left:20px;list-style:decimal;">');
        inList = true;
      }
      const content = applyInlineMarkdown(escapeHtml(trimmed.replace(/^\d+\.\s/, '')));
      htmlParts.push(
        `<li style="margin:0 0 6px;font-size:15px;color:#F0EDE8;line-height:1.5;">${content}</li>`,
      );
      continue;
    }

    // Regular paragraph
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
    const paragraph = applyInlineMarkdown(escapeHtml(trimmed));
    htmlParts.push(
      `<p style="margin:0 0 12px;font-size:15px;color:#F0EDE8;line-height:1.6;">${paragraph}</p>`,
    );
  }

  if (inList) {
    htmlParts.push('</ul>');
  }

  return htmlParts.join('\n');
}

/**
 * Applies inline markdown transforms (**bold**, *italic*) to already-HTML-escaped text.
 * Note: escapeHtml must run FIRST so we don't double-escape the <strong> tags.
 */
function applyInlineMarkdown(escaped: string): string {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#F0EDE8;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// ---------------------------------------------------------------------------
// Email HTML builder (SRP: owns blueprint email content only)
// ---------------------------------------------------------------------------

function buildBlueprintHtml(
  input: z.infer<typeof inputSchema>,
  serviceEntry: ServiceEntry,
  blueprintHtml: string,
): string {
  const safeName = escapeHtml(input.contactName);
  const safeServiceTitle = escapeHtml(serviceEntry.title);

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
              <span style="margin-left:12px;font-size:13px;color:#9B96A0;text-transform:uppercase;letter-spacing:1px;">Project Blueprint</span>
            </td>
          </tr>

          <!-- Title + subtitle -->
          <tr>
            <td style="padding:32px 40px 0;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#F0EDE8;line-height:1.2;">Your Project Blueprint</h1>
              <p style="margin:0;font-size:15px;color:#9B96A0;line-height:1.5;">
                ${safeName}, here's a preliminary plan for your <strong style="color:#E8862A;">${safeServiceTitle}</strong> project.
              </p>
            </td>
          </tr>

          <!-- Blueprint content -->
          <tr>
            <td style="padding:24px 40px 0;">
              ${blueprintHtml}
            </td>
          </tr>

          <!-- Footer CTA -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:20px 24px;background-color:#141428;border-left:3px solid #E8862A;border-radius:4px;">
                    <p style="margin:0;font-size:15px;color:#F0EDE8;line-height:1.6;">
                      This is a starting point — your discovery call will refine the scope, lock in the timeline, and produce a fixed-price proposal.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;margin-top:24px;background-color:#080814;border-top:1px solid #1E1E3A;">
              <p style="margin:0;font-size:13px;color:#9B96A0;line-height:1.6;">
                Questions? Reply to this email or reach us at
                <a href="mailto:hello@octio.co.za" style="color:#E8862A;text-decoration:none;">hello@octio.co.za</a>
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
// Gmail send helper (SRP: knows only how to dispatch via Gmail API)
// ---------------------------------------------------------------------------

function buildRawMessage(options: {
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
}): string {
  const senderEmail = config.googleSenderEmail ?? '';
  const encodedBody = Buffer.from(options.htmlBody, 'utf-8').toString('base64');

  const lines: string[] = [
    `From: Octio <${senderEmail}>`,
    `To: ${options.to}`,
  ];

  if (options.cc) {
    lines.push(`Cc: ${options.cc}`);
  }

  lines.push(
    `Subject: ${encodeHeaderValue(options.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody.replace(/(.{76})/g, '$1\r\n'),
  );

  return lines.join('\r\n');
}

function base64url(message: string): string {
  return Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendBlueprintEmail(options: {
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
}): Promise<void> {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = base64url(buildRawMessage(options));
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const generateProjectBlueprintTool = createTool({
  id: 'generate_project_blueprint',
  description:
    'Generate a personalized project blueprint and email it to the lead. Call this during the close phase of the conversation when you have enough context about their project. The blueprint demonstrates Octio expertise and gives the lead a concrete plan to anchor the discovery call.',
  inputSchema,
  execute: async (
    input: z.infer<typeof inputSchema>,
  ): Promise<{ ok: boolean; message?: string; error?: string }> => {
    try {
      // 1. Load service entry (falls back to 'general' for unknown service keys)
      const serviceEntry = loadServiceEntry(input.serviceInterest);

      // 2. Generate blueprint content via LLM
      const blueprintMarkdown = await generateBlueprintMarkdown(input, serviceEntry);

      // 3. Convert markdown → HTML
      const blueprintHtml = convertMarkdownToHtml(blueprintMarkdown);

      // 4. Build full branded email
      const htmlBody = buildBlueprintHtml(input, serviceEntry, blueprintHtml);

      // 5. Send email to lead, CC the team
      const subject = `Your Octio Project Blueprint \u2014 ${serviceEntry.title}`;
      await sendBlueprintEmail({
        to: input.contactEmail,
        cc: config.octioTeamEmail,
        subject,
        htmlBody,
      });

      return {
        ok: true,
        message: `Blueprint sent to ${input.contactEmail}. The team has been CC'd.`,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  },
});
