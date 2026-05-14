import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { sendResourceEmail } from '../../services/gmail.js';

// ---------------------------------------------------------------------------
// Per-recipient cooldown (in-memory).
//
// Defeats prompt-injection mail-bomb scenarios where the user coerces the
// agent into firing send_resources N times in one turn. Within the cooldown
// window, repeated calls for the same recipient return { ok: false } without
// hitting the gmail layer. The agent's text reply still confirms the first
// send happened — the user experience is identical for a real ask.
//
// Test-friendly: cooldown is shorter in non-prod so the intensity harness can
// still verify the smoke path without sleeping. Override via SEND_RESOURCES_COOLDOWN_MS.
// ---------------------------------------------------------------------------

const DEFAULT_COOLDOWN_MS = 60_000;
function cooldownMs(): number {
  const env = process.env.SEND_RESOURCES_COOLDOWN_MS;
  if (env) {
    const n = parseInt(env, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return DEFAULT_COOLDOWN_MS;
}

const lastSendByRecipient = new Map<string, number>();

/** Test-only: clear the cooldown map. Used by the intensity harness. */
export function _clearSendResourcesCooldown(): void {
  lastSendByRecipient.clear();
}

// ---------------------------------------------------------------------------
// Tool definition (SRP: delegates email delivery to the gmail service +
// applies a per-recipient cooldown to refuse mail-bomb scenarios)
// ---------------------------------------------------------------------------

export const sendResourcesTool = createTool({
  id: 'send_resources',
  description:
    'Send case study or resource materials to the user via email. Use this when the user explicitly asks for more information, case studies, or examples to be sent to their email. Rate-limited to one send per recipient per minute — repeated calls in the same conversation are no-ops.',
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

    // Per-recipient cooldown — refuse silently rather than spamming.
    const now = Date.now();
    const lastSentAt = lastSendByRecipient.get(toEmail);
    const cd = cooldownMs();
    if (lastSentAt !== undefined && now - lastSentAt < cd) {
      const secsRemaining = Math.ceil((cd - (now - lastSentAt)) / 1000);
      return {
        ok: false,
        error: `rate_limited: already sent to ${toEmail} within the last ${cd / 1000}s (retry in ${secsRemaining}s)`,
      };
    }

    try {
      await sendResourceEmail(toEmail, topic);
      // Only mark the timestamp on success — a failed send shouldn't block
      // an immediate retry.
      lastSendByRecipient.set(toEmail, now);
      return { ok: true, message: `Resources sent to ${toEmail}` };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  },
});
