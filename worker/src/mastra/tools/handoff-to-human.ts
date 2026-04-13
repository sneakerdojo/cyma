import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { sendInternalAlert } from '../../services/gmail.js';

// ---------------------------------------------------------------------------
// Tool definition (SRP: owns the escalation contract only — email delivery
// is delegated to the gmail service)
// ---------------------------------------------------------------------------

export const handoffToHumanTool = createTool({
  id: 'handoff_to_human',
  description:
    'Escalate the conversation to a human team member. Use this when: the user explicitly asks to speak to a person, the user has a complaint, you cannot answer their question confidently, or the conversation has become unproductive. Sends an internal alert to the Octio team with a summary.',
  inputSchema: z.object({
    reason: z.string().describe('Why the handoff is needed.'),
    urgency: z
      .enum(['normal', 'urgent'])
      .describe('Urgency level — "normal" for routine escalations, "urgent" for complaints or time-sensitive issues.'),
    conversationSummary: z
      .string()
      .describe('Brief summary of what was discussed so the team has context before they respond.'),
  }),
  execute: async (inputData): Promise<{ ok: boolean; message?: string; error?: string }> => {
    const { reason, urgency, conversationSummary } = inputData;

    const subject = `[${urgency.toUpperCase()}] Freechat handoff: ${reason}`;
    const body = conversationSummary;

    try {
      await sendInternalAlert(subject, body);
      return {
        ok: true,
        message: 'Your message has been flagged for our team. You will hear back within 1 business day.',
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  },
});
