/**
 * Hallucination guard for tool-harness scenarios.
 *
 * Mirrors the production voice-agent guard (src/services/voice-agent/mastra-brain.ts).
 * After every agent.generate(), inspects the reply text for "acknowledge-without-firing"
 * patterns — phrases that imply a specific tool should have been called in this turn.
 * When detected AND the tool did not fire, the runner re-prompts with
 * toolChoice forcing the model to call that exact tool.
 *
 * Opt-in via HarnessConfig.guard. Reusable for any tool whose failure mode
 * is "agent says it did the thing but didn't fire the tool".
 */

import type { Agent } from '@mastra/core/agent';
import type { CapturedCall } from './runner.js';

export interface GuardRule {
  /** When this regex matches the assistant reply, the tool below is expected to have fired. */
  pattern: RegExp;
  /** Tool name that should have been called. Must match a real tool the agent has. */
  tool: string;
  /** Optional short label (used in the nudge message to give the model a hint). */
  kind?: string;
}

export interface GuardSpec {
  rules: GuardRule[];
  /**
   * Build the system-reminder message sent to the model on retry.
   * Receives the matched rule + the full call log so far for context-aware nudging.
   */
  buildNudge: (rule: GuardRule, prevCalls: CapturedCall[]) => string;
}

export interface GuardOutcome {
  triggered: boolean;
  matchedTool?: string;
  /** Replaces the original turn's reply if retry produced new text. */
  newReply?: string;
  /** Tokens consumed by the retry call (added to the turn's total). */
  retryTokensIn: number;
  retryTokensOut: number;
}

/**
 * Run the guard against a turn's outcome. If a hallucination is detected,
 * re-prompts the agent with `toolChoice` set to the matching tool. The
 * recording wrapper around the real tool will still capture the call into
 * the runner's call log, so no extra plumbing is needed for tool counting.
 *
 * Returns { triggered: false } if no detection fired or no rules are set.
 */
export async function runGuard(args: {
  guard: GuardSpec;
  agent: Agent;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  reply: string;
  callsThisTurn: CapturedCall[];
  prevCalls: CapturedCall[];
}): Promise<GuardOutcome> {
  const firedTools = new Set(args.callsThisTurn.map((c) => c.tool));

  for (const rule of args.guard.rules) {
    if (!rule.pattern.test(args.reply)) continue;
    if (firedTools.has(rule.tool)) continue;

    // Detected — assistant claimed something but didn't fire the matching tool.
    const nudge = args.guard.buildNudge(rule, args.prevCalls);
    const retryMessages = [
      ...args.messages,
      { role: 'assistant' as const, content: args.reply.trim() || '(no reply)' },
      { role: 'user' as const, content: nudge },
    ];

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const retry: any = await args.agent.generate(retryMessages, {
        toolChoice: { type: 'tool', toolName: rule.tool },
        maxSteps: 2,
      });
      const u = (retry.totalUsage ?? retry.usage ?? {}) as {
        inputTokens?: number;
        outputTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
      };
      const retryReply = (retry.text as string) ?? '';
      return {
        triggered: true,
        matchedTool: rule.tool,
        newReply: retryReply || undefined,
        retryTokensIn: u.inputTokens ?? u.promptTokens ?? 0,
        retryTokensOut: u.outputTokens ?? u.completionTokens ?? 0,
      };
    } catch (err) {
      // Retry failed — keep first-pass reply, mark triggered for telemetry.
      console.warn(
        '[guard] retry failed:',
        err instanceof Error ? err.message : String(err),
      );
      return {
        triggered: true,
        matchedTool: rule.tool,
        retryTokensIn: 0,
        retryTokensOut: 0,
      };
    }
  }

  return { triggered: false, retryTokensIn: 0, retryTokensOut: 0 };
}
