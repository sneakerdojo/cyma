import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { sendResourceEmail } from '../../services/gmail.js';

// ---------------------------------------------------------------------------
// Tool definition (SRP: delegates email delivery to the gmail service only)
// ---------------------------------------------------------------------------

export const sendResourcesTool = createTool({
  id: 'send_resources',
  description:
    'Send case study or resource materials to the user via email. Use this when the user explicitly asks for more information, case studies, or examples to be sent to their email.',
  inputSchema: z.object({
    toEmail: z.string().email().describe('The recipient email address.'),
    topic: z
      .enum([
        'web-dev',
        'custom-software',
        'ai-agents',
        'mobile-app',
        'modernisation',
        'general',
      ])
      .describe('The service topic the resources should cover.'),
  }),
  execute: async (inputData): Promise<{ ok: boolean; message?: string; error?: string }> => {
    const { toEmail, topic } = inputData;

    try {
      await sendResourceEmail(toEmail, topic);
      return { ok: true, message: `Resources sent to ${toEmail}` };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  },
});
