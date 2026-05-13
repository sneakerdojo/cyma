/**
 * Production voice-agent brain — Mastra Agent + Kimi K2 Turbo + voice tools.
 *
 * Architectural note: this replaces the orchestrator's "Brain proposes, orchestrator
 * executes" flow with Mastra's autonomous loop (agent.generate runs tools internally).
 * The seam is the tool-implementation injection: callers pass the actual side-effect
 * functions, and the brain wires them into Mastra tools that also record every call
 * into a per-turn log. After agent.generate() resolves we inspect that log to derive
 * bookedSlot and ended state.
 *
 * Hallucination guard: the test harness (scripts/kimi-tool-reliability-test.ts)
 * proved Kimi K2 Turbo has ~0% raw reliability on closing tool calls — it says
 * "you're booked" without actually firing book_appointment. The guard inspects the
 * assistant text after each turn and, if a claimed action did not have its tool
 * fire, re-prompts with toolChoice forcing the specific tool. This pattern is what
 * actually makes Kimi viable for production, not the prompt alone.
 */

import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
// NOTE: this module deliberately avoids the pino logger so the voice-agent
// service stays unit-testable without DATABASE_URL. We log via console here
// — matches the pattern in orchestrator.ts.
import type {
  HistoryMessage,
  LatencyBreakdown,
  SessionState,
  ToolCallResult,
} from './orchestrator.js';

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export type VoiceToolName =
  | 'lookup_availability'
  | 'book_appointment'
  | 'route_to_human';

export interface ToolImpls {
  lookupAvailability(
    args: { date?: string },
  ): Promise<{ ok: true; slots: string[] } | { ok: false; error: string }>;
  bookAppointment(
    args: { slot: string },
  ): Promise<
    | { ok: true; eventId: string; slot: string }
    | { ok: false; error: string }
  >;
  routeToHuman(
    args: { reason: string },
  ): Promise<
    | { ok: true; transferTo: string; reason: string }
    | { ok: false; error: string }
  >;
}

export interface VoiceTurnIO {
  sessionState: SessionState;
  transcript: string;
  tenantBrand?: string;
  profileSummary?: string;
}

export interface VoiceTurnOutcome {
  reply: string;
  toolCalls: ToolCallResult[];
  latencyMs: LatencyBreakdown;
  nextState: SessionState;
  /** Number of times the guard had to force a tool call. 0 = first pass was clean. */
  guardRetries: number;
}

export interface CreateMastraVoiceBrainArgs {
  tenantBrand: string;
  toolImpls: ToolImpls;
  llm: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
  /** Per-turn brain timeout (default 12s — gives one guard retry headroom). */
  timeoutMs?: number;
  /** Max agent steps per generate() to prevent runaway loops (default 3). */
  maxSteps?: number;
}

export interface MastraVoiceBrain {
  runTurn(io: VoiceTurnIO): Promise<VoiceTurnOutcome>;
}

// ---------------------------------------------------------------------------
// Prompt — proven against 10 consecutive clean runs of the test harness.
// Change with care; re-run scripts/kimi-tool-reliability-test.ts after edits.
// ---------------------------------------------------------------------------

const VOICE_INSTRUCTIONS_TEMPLATE = (brand: string) => `You are a phone receptionist for "${brand}".
You are speaking on the phone — keep every reply to one or two short sentences. No bullet points, no markdown.

# Tool-use contract (READ THIS BEFORE EVERY REPLY)

You have three tools: lookup_availability, book_appointment, route_to_human.

**Hard rule — your words must match your actions.** If your reply will tell the caller that you have booked them, scheduled them, are transferring them, or are connecting them to a human, you MUST call the matching tool in THIS SAME REPLY. Saying "you're booked" without calling book_appointment is a critical bug — the calendar will be empty and the caller will not be served.

Concrete trigger phrases — if you are about to say any of these, the corresponding tool call is REQUIRED in this turn:
- "you're booked" / "I've booked you" / "booked for" / "scheduled for" / "confirmed for" → book_appointment
- "transferring you" / "putting you through" / "connecting you" / "let me get someone" → route_to_human
- "let me check availability" / "let me see what's open" / "checking the calendar" → lookup_availability

If you do not have enough information to call the tool (e.g. you don't know which slot they picked), ask one more question instead — do NOT pretend the action happened.

# Conversation flow

1. Find out the caller's problem.
2. Decide if it is an emergency. Words like burst, flooding, leak right now, urgent, gas smell, fire, "right now", "water on the floor" all mean emergency.
3. Emergency → call route_to_human with a short reason. Tell the caller you are transferring them.
4. Non-emergency → ask their suburb if you don't know it.
5. Once you know problem + urgency + suburb, call lookup_availability (no args unless caller asked for a specific date — then pass date as YYYY-MM-DD). Then read back the slots in plain English.
6. When the caller picks a slot, call book_appointment with the exact ISO string from the most recent lookup_availability result. Then confirm the booking.

# When NOT to transfer

Only call route_to_human if:
- It is a true emergency (burst pipe, flooding, gas smell, water actively damaging property, fire risk), OR
- The caller explicitly asks to speak to a human / actual person / real person, OR
- You genuinely cannot help and the caller has refused alternatives.

Do NOT transfer for pricing questions, general inquiries, or "just asking" calls. For pricing, give the standard rough answer in conversation and offer to book a visit so the technician can quote properly.

# Do not

- Do not invent slot times. Only use ISO strings returned by lookup_availability.
- Do not claim you booked someone without calling book_appointment in the same reply.
- Do not claim you transferred someone without calling route_to_human in the same reply.
- Do not call book_appointment before lookup_availability has returned slots.
- Do not call lookup_availability for an emergency — emergencies skip to route_to_human.
- Do not call lookup_availability after the caller picked a slot — at that point you book.
- Do not pick a slot for the caller. If they say "tomorrow morning" without a specific time, ASK.

# Worked examples

## Example 1 — closing the booking
Previous tool result: lookup_availability returned slots ["2026-05-14T10:00:00Z", "2026-05-14T12:00:00Z", "2026-05-14T14:00:00Z"]
Previous assistant reply: "I've got tomorrow 10am, 12pm or 2pm. Which works?"
Caller: "10am."
CORRECT next action: call book_appointment with slot="2026-05-14T10:00:00Z", then reply "You're booked for tomorrow at 10am."
INCORRECT: reply "You're booked for 10am" without calling book_appointment.
INCORRECT: call lookup_availability again.

## Example 2 — ordinal close
Caller: "First one works."
CORRECT next action: call book_appointment with the first ISO slot from the latest lookup, then confirm.

## Example 3 — vague slot pick
Caller: "Tomorrow morning is fine."
CORRECT next action: ASK "10am or 12pm — which suits you?" Do NOT book yet.

## Example 4 — emergency mid-call
Caller: "Water is gushing out of my ceiling right now!"
CORRECT next action: call route_to_human with reason="ceiling leak gushing water", then reply "That's an emergency — putting you through now."

# Final check before every reply

Ask yourself: "Am I about to claim an action happened?" If yes — book, transfer, schedule — the matching tool call MUST be in this same reply. No exceptions.`;

// ---------------------------------------------------------------------------
// Hallucination detection (same regexes as the test harness)
// ---------------------------------------------------------------------------

function detectHallucinatedAction(
  reply: string,
  firedThisTurn: VoiceToolName[],
): 'book' | 'transfer' | 'lookup' | null {
  // Normalise: lowercase + collapse curly apostrophe variants.
  const lower = reply.toLowerCase().replace(/[‘’ʼ]/g, "'");

  const claimsBook =
    /\b(?:you'?re booked|you are booked|i'?ve booked|i have booked|booked (?:you )?(?:for|in)|booking confirmed|scheduled (?:you )?for|confirmed (?:you )?for|appointment is (?:set|booked))\b/.test(
      lower,
    );
  const claimsTransfer =
    /\b(?:transferring|putting you through|putting through|connecting you|i'?ll put you through|on the line|getting someone for you)\b/.test(
      lower,
    );
  const claimsLookup =
    /\b(?:let me check (?:availability|the calendar|what'?s open|what we have|the slots)|checking (?:availability|the calendar|the slots)|let me see what'?s open|i'?ll check (?:availability|what'?s open|the calendar)|let me look at (?:availability|the calendar))\b/.test(
      lower,
    );

  if (claimsBook && !firedThisTurn.includes('book_appointment')) return 'book';
  if (claimsTransfer && !firedThisTurn.includes('route_to_human'))
    return 'transfer';
  if (claimsLookup && !firedThisTurn.includes('lookup_availability'))
    return 'lookup';

  // Kimi quirk: sometimes emits the function-call syntax as raw text instead
  // of using the tool_calls API. The user/STT would hear gibberish.
  if (
    /functions?\.book_appointment\b/.test(lower) &&
    !firedThisTurn.includes('book_appointment')
  )
    return 'book';
  if (
    /functions?\.route_to_human\b/.test(lower) &&
    !firedThisTurn.includes('route_to_human')
  )
    return 'transfer';
  if (
    /functions?\.lookup_availability\b/.test(lower) &&
    !firedThisTurn.includes('lookup_availability')
  )
    return 'lookup';

  return null;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

interface CallRecord {
  tool: VoiceToolName;
  args: Record<string, unknown>;
  result: unknown;
}

export function createMastraVoiceBrain(
  args: CreateMastraVoiceBrainArgs,
): MastraVoiceBrain {
  const instructions = VOICE_INSTRUCTIONS_TEMPLATE(args.tenantBrand);
  const baseURL = args.llm.baseUrl ?? 'https://api.moonshot.ai/v1';
  const modelId = args.llm.model ?? 'kimi-k2-turbo-preview';
  const timeoutMs = args.timeoutMs ?? 12_000;
  const maxSteps = args.maxSteps ?? 3;

  const kimi = createOpenAICompatible({
    name: 'kimi',
    baseURL,
    apiKey: args.llm.apiKey,
  });

  return {
    async runTurn(io: VoiceTurnIO): Promise<VoiceTurnOutcome> {
      const turnCallLog: CallRecord[] = [];

      // Build tools that record every invocation into this turn's log.
      // SRP: each tool's only extra responsibility (vs the raw impl) is to
      // record + return.
      const tools = {
        lookup_availability: createTool({
          id: 'lookup_availability',
          description:
            'Look up the next open appointment slots. Call after caller has confirmed they want to book (you have problem + urgency + suburb). Returns ISO-8601 timestamps.',
          inputSchema: z.object({
            date: z
              .string()
              .optional()
              .describe(
                'Optional ISO date (YYYY-MM-DD) the caller asked for. Omit for next-available.',
              ),
          }),
          execute: async (input) => {
            const result = await args.toolImpls.lookupAvailability(
              input as { date?: string },
            );
            turnCallLog.push({
              tool: 'lookup_availability',
              args: input as Record<string, unknown>,
              result,
            });
            return result;
          },
        }),
        book_appointment: createTool({
          id: 'book_appointment',
          description:
            'Book the appointment at a specific ISO-8601 slot. Only call after caller explicitly chose one of the slots returned by lookup_availability.',
          inputSchema: z.object({
            slot: z
              .string()
              .describe(
                'ISO-8601 timestamp matching one of the slots from the latest lookup_availability result.',
              ),
          }),
          execute: async (input) => {
            const result = await args.toolImpls.bookAppointment(
              input as { slot: string },
            );
            turnCallLog.push({
              tool: 'book_appointment',
              args: input as Record<string, unknown>,
              result,
            });
            return result;
          },
        }),
        route_to_human: createTool({
          id: 'route_to_human',
          description:
            'Transfer the caller to a human immediately. For emergencies (burst pipe, flooding, gas leak, fire), when the caller insists on a person, or when you cannot resolve their request.',
          inputSchema: z.object({
            reason: z
              .string()
              .describe(
                'Short reason for the transfer (e.g. "burst geyser, water everywhere").',
              ),
          }),
          execute: async (input) => {
            const result = await args.toolImpls.routeToHuman(
              input as { reason: string },
            );
            turnCallLog.push({
              tool: 'route_to_human',
              args: input as Record<string, unknown>,
              result,
            });
            return result;
          },
        }),
      };

      const agent = new Agent({
        id: 'voice-octo',
        name: 'voice-octo',
        instructions,
        model: kimi.chatModel(modelId),
        tools,
      });

      // Build Mastra messages from session history + system hints + new transcript.
      const systemContent = buildSystemHint(
        args.tenantBrand,
        io.profileSummary,
      );
      const messages = historyToMessages(
        io.sessionState.history,
        io.transcript,
        systemContent,
      );

      // ── First pass ──────────────────────────────────────────────────
      const brainStart = performance.now();
      let guardRetries = 0;
      let reply = '';

      try {
        const firstOutput = await withTimeout(
          agent.generate(messages, { maxSteps }),
          timeoutMs,
          'first-pass',
        );
        reply = firstOutput.text ?? '';
      } catch (err) {
        console.warn(
          '[mastra-brain] first pass failed; returning degraded reply:',
          err instanceof Error ? err.message : String(err),
        );
        return buildDegradedOutcome(io, performance.now() - brainStart);
      }

      let firedThisTurn = turnCallLog.map((c) => c.tool);

      // ── Guard layer ─────────────────────────────────────────────────
      const hallucinated = detectHallucinatedAction(reply, firedThisTurn);
      if (hallucinated) {
        guardRetries = 1;
        const forcedTool = forcedToolFor(hallucinated);
        const nudge = buildGuardNudge(hallucinated, turnCallLog);

        // Append the hallucinated reply + nudge to messages for retry context.
        const retryMessages = [
          ...messages,
          { role: 'assistant' as const, content: reply },
          { role: 'user' as const, content: nudge },
        ];

        try {
          const retryOutput = await withTimeout(
            agent.generate(retryMessages, {
              toolChoice: { type: 'tool', toolName: forcedTool },
              maxSteps,
            }),
            timeoutMs,
            'guard-retry',
          );
          let retryReply = retryOutput.text ?? '';
          // Kimi sometimes returns empty text when toolChoice forces a tool.
          // Substitute a plain confirmation so downstream TTS has something
          // to say AND so future turn history isn't malformed.
          if (!retryReply.trim()) {
            retryReply = defaultReplyFor(forcedTool);
          }
          reply = retryReply;
          firedThisTurn = turnCallLog.map((c) => c.tool);
        } catch (err) {
          console.warn(
            '[mastra-brain] guard retry failed; keeping first-pass reply:',
            err instanceof Error ? err.message : String(err),
          );
          // Keep the first-pass reply; tool side effect did not happen,
          // but at least we don't silently swallow the turn.
        }
      }

      const brainLatency = performance.now() - brainStart;

      // ── Build outcome ───────────────────────────────────────────────
      const toolCalls: ToolCallResult[] = turnCallLog.map((c) => ({
        name: c.tool,
        args: c.args,
        result: c.result,
      }));

      // Derive next session state from tool results.
      let bookedSlot: string | null = io.sessionState.bookedSlot;
      let endedReason: SessionState['endedReason'] | undefined;
      for (const c of turnCallLog) {
        if (
          c.tool === 'book_appointment' &&
          isOkResult(c.result) &&
          typeof (c.result as { slot?: unknown }).slot === 'string'
        ) {
          bookedSlot = (c.result as { slot: string }).slot;
        }
        if (c.tool === 'route_to_human' && isOkResult(c.result)) {
          endedReason = 'transferred';
        }
      }

      const historyWithThisTurn: HistoryMessage[] = [
        ...io.sessionState.history,
        { role: 'user', text: io.transcript },
        { role: 'assistant', text: reply },
        ...turnCallLog.map<HistoryMessage>((c) => ({
          role: 'tool',
          toolName: c.tool,
          text: JSON.stringify(c.result ?? null),
        })),
      ];

      const latencyMs: LatencyBreakdown = {
        stt: 0,
        brain: Math.round(brainLatency),
        tts: 0,
        totalMouthToEar: Math.round(brainLatency),
      };

      return {
        reply,
        toolCalls,
        latencyMs,
        nextState: {
          ...io.sessionState,
          history: historyWithThisTurn,
          bookedSlot,
          ended: endedReason ? true : io.sessionState.ended,
          endedReason: endedReason ?? io.sessionState.endedReason,
        },
        guardRetries,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function forcedToolFor(
  kind: 'book' | 'transfer' | 'lookup',
): VoiceToolName {
  if (kind === 'book') return 'book_appointment';
  if (kind === 'transfer') return 'route_to_human';
  return 'lookup_availability';
}

function defaultReplyFor(tool: VoiceToolName): string {
  if (tool === 'book_appointment') return "You're booked.";
  if (tool === 'route_to_human') return 'Putting you through now.';
  return "Let me see what's open.";
}

function buildGuardNudge(
  kind: 'book' | 'transfer' | 'lookup',
  callLog: CallRecord[],
): string {
  if (kind === 'book') {
    const slots = lastLookupSlots(callLog);
    const slotsHint = slots
      ? ` The slots from your most recent lookup_availability call are: ${JSON.stringify(slots)}. Pick the one the caller chose.`
      : '';
    return `[system reminder] You told the caller they are booked but did not call book_appointment. Call book_appointment now with the exact ISO slot the caller picked, then confirm.${slotsHint}`;
  }
  if (kind === 'transfer') {
    return `[system reminder] You told the caller you would transfer/connect them but did not call route_to_human. Call route_to_human now with a short reason, then confirm the transfer.`;
  }
  return `[system reminder] You said you would check availability but did not call lookup_availability. Call lookup_availability now (pass date if caller specified one, otherwise no arguments), then offer the returned slots.`;
}

function lastLookupSlots(callLog: CallRecord[]): string[] | null {
  for (let i = callLog.length - 1; i >= 0; i--) {
    if (callLog[i].tool === 'lookup_availability') {
      const r = callLog[i].result as { ok?: boolean; slots?: string[] };
      if (r?.ok && Array.isArray(r.slots)) return r.slots;
      return null;
    }
  }
  return null;
}

function historyToMessages(
  history: HistoryMessage[],
  transcript: string,
  systemContent: string | null,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const out: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> =
    [];
  if (systemContent) out.push({ role: 'system', content: systemContent });
  for (const m of history) {
    // Tool messages are dropped — they are artifacts of a previous agent
    // loop and Mastra/Kimi sees them as out-of-band. The assistant's reply
    // that came AFTER each tool call usually summarises the outcome.
    if (m.role === 'user' || m.role === 'assistant') {
      // Skip empty assistant entries — Moonshot rejects them.
      if (m.text.trim().length > 0) {
        out.push({ role: m.role, content: m.text });
      }
    }
  }
  out.push({ role: 'user', content: transcript });
  return out;
}

function buildSystemHint(
  tenantBrand: string,
  profileSummary?: string,
): string | null {
  const parts: string[] = [];
  if (tenantBrand) parts.push(`Tenant: ${tenantBrand}`);
  if (profileSummary) parts.push(`About the caller: ${profileSummary}`);
  return parts.length === 0 ? null : parts.join('\n');
}

function isOkResult(r: unknown): boolean {
  return (
    typeof r === 'object' &&
    r !== null &&
    (r as { ok?: unknown }).ok === true
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`mastra-brain timeout (${label}) after ${ms}ms`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildDegradedOutcome(
  io: VoiceTurnIO,
  brainLatency: number,
): VoiceTurnOutcome {
  const reply =
    "I'm having a connection issue — give me a moment and try again.";
  const historyWithThisTurn: HistoryMessage[] = [
    ...io.sessionState.history,
    { role: 'user', text: io.transcript },
    { role: 'assistant', text: reply },
  ];
  return {
    reply,
    toolCalls: [],
    latencyMs: {
      stt: 0,
      brain: Math.round(brainLatency),
      tts: 0,
      totalMouthToEar: Math.round(brainLatency),
    },
    nextState: {
      ...io.sessionState,
      history: historyWithThisTurn,
      degraded: true,
    },
    guardRetries: 0,
  };
}

// Re-export the detector so tests can target it directly.
export { detectHallucinatedAction };
