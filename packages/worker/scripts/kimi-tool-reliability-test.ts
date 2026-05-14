/**
 * Kimi K2 Turbo — tool-reliability test for the voice-agent contract.
 *
 * What this answers: when we wrap Kimi K2 Turbo behind a Mastra Agent and
 * expose the three voice-agent tools (lookup_availability, book_appointment,
 * route_to_human), does the model reliably:
 *   1. Call the right tool when the conversational state warrants it
 *   2. Pass correct arguments (slot ISO strings, urgency reasons, optional date)
 *   3. Refrain from calling a tool when no tool is warranted
 *
 * What this is NOT testing: STT, TTS, WebRTC, latency under load, accent
 * handling. Those need separate gates. This test is text-only and decides
 * whether the brain is fit for purpose before we provision audio infra.
 *
 * Budget: ~$0.50 in Kimi tokens, well under in practice (~$0.20–0.30).
 *
 * Run:
 *   cd packages/worker
 *   bun run --env-file .env scripts/kimi-tool-reliability-test.ts
 */

import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Pre-flight — fail fast with a clear message if env is wrong.
// ---------------------------------------------------------------------------

const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_BASE_URL = process.env.KIMI_BASE_URL ?? 'https://api.moonshot.ai/v1';
const KIMI_MODEL = process.env.KIMI_MODEL ?? 'kimi-k2-turbo-preview';

if (!KIMI_API_KEY) {
  console.error(
    'KIMI_API_KEY is not set. Add it to packages/worker/.env or export it.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Instrumented tools — same shape as voice-agent/tools.ts mocks. We record
// every invocation into `callLog` so the harness can score scenarios.
//
// We mirror voice-agent's input schemas exactly because that's the contract
// production will need to honour.
// ---------------------------------------------------------------------------

interface CallRecord {
  tool: 'lookup_availability' | 'book_appointment' | 'route_to_human';
  args: Record<string, unknown>;
  result: unknown;
}

let callLog: CallRecord[] = [];

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const lookupAvailabilityTool = createTool({
  id: 'lookup_availability',
  description:
    'Look up the next 3 open appointment slots. Call this after the caller has confirmed they want to book (i.e. you have their need, urgency, and rough location). Returns ISO-8601 timestamps the caller can pick from.',
  inputSchema: z.object({
    date: z
      .string()
      .optional()
      .describe(
        'Optional ISO date (YYYY-MM-DD) the caller asked for. Omit to default to tomorrow.',
      ),
  }),
  execute: async (inputData): Promise<{ ok: true; slots: string[] }> => {
    const args = inputData as { date?: string };
    let base: Date;
    if (args.date) {
      base = new Date(`${args.date}T09:00:00Z`);
    } else {
      base = new Date(Date.now() + MS_PER_DAY);
      base.setUTCHours(9, 0, 0, 0);
    }
    const slots = [
      new Date(base.getTime() + 1 * MS_PER_HOUR).toISOString(),
      new Date(base.getTime() + 3 * MS_PER_HOUR).toISOString(),
      new Date(base.getTime() + 5 * MS_PER_HOUR).toISOString(),
    ];
    const result = { ok: true as const, slots };
    callLog.push({ tool: 'lookup_availability', args, result });
    return result;
  },
});

const bookAppointmentTool = createTool({
  id: 'book_appointment',
  description:
    'Book the appointment at a specific ISO-8601 slot. Only call this after the caller has explicitly chosen one of the slots returned by lookup_availability. The `slot` argument must be one of those ISO strings.',
  inputSchema: z.object({
    slot: z
      .string()
      .describe(
        'ISO-8601 timestamp matching one of the slots returned by lookup_availability.',
      ),
  }),
  execute: async (
    inputData,
  ): Promise<
    | { ok: true; eventId: string; slot: string }
    | { ok: false; error: string }
  > => {
    const args = inputData as { slot?: string };
    const slot = args.slot;
    if (!slot) {
      const result = { ok: false as const, error: 'missing required arg: slot' };
      callLog.push({ tool: 'book_appointment', args, result });
      return result;
    }
    const result = {
      ok: true as const,
      eventId: `mock-evt-${Math.random().toString(36).slice(2, 10)}`,
      slot,
    };
    callLog.push({ tool: 'book_appointment', args, result });
    return result;
  },
});

const routeToHumanTool = createTool({
  id: 'route_to_human',
  description:
    "Transfer the caller to a human immediately. Call this for emergencies (burst pipe, flooding, gas leak, fire, words like 'urgent' or 'right now'), when the caller insists on speaking to a person, or when you cannot resolve the request. After this, end the conversation politely.",
  inputSchema: z.object({
    reason: z
      .string()
      .describe(
        'Short reason for the transfer (e.g. "burst geyser, water everywhere").',
      ),
  }),
  execute: async (
    inputData,
  ): Promise<{ ok: true; transferTo: string; reason: string }> => {
    const args = inputData as { reason?: string };
    const result = {
      ok: true as const,
      transferTo: '+27821000000',
      reason: args.reason ?? 'unspecified',
    };
    callLog.push({ tool: 'route_to_human', args, result });
    return result;
  },
});

// ---------------------------------------------------------------------------
// Agent — minimal Mastra agent matching what /turn would call in v1.
// No memory configured: each scenario runs stateless, harness drives history.
// ---------------------------------------------------------------------------

const VOICE_INSTRUCTIONS = `You are a phone receptionist for a small South African plumbing business called "Joburg Plumbing".
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

1. Find out the caller's plumbing problem.
2. Decide if it is an emergency. Words like burst, flooding, leak right now, urgent, gas smell, fire, "right now", "water on the floor" all mean emergency.
3. Emergency → call route_to_human with a short reason. Tell the caller you are transferring them.
4. Non-emergency → ask their suburb if you don't know it.
5. Once you know problem + urgency + suburb, call lookup_availability (call it with no args unless the caller asked for a specific date — then pass date as YYYY-MM-DD). Then read back the slots to the caller in plain English.
6. When the caller picks a slot (e.g. "10am", "first one", "the middle one", "Friday morning"), call book_appointment with the exact ISO string from the most recent lookup_availability result. Then confirm the booking.

# When NOT to transfer

Only call route_to_human if:
- It is a true emergency (burst pipe, flooding, gas smell, water actively damaging property, fire risk), OR
- The caller explicitly asks to speak to a human / actual person / real person, OR
- You genuinely cannot help and the caller has refused alternatives.

Do NOT transfer for pricing questions, general inquiries, or "just asking" calls. For pricing, give the standard rough answer in conversation ("our call-out is R650 and then it's per hour depending on the job") and offer to book a visit so the plumber can quote properly. For general curiosity, answer briefly and end the call politely.

# Do not

- Do not invent slot times. Only use ISO strings returned by lookup_availability.
- Do not claim you booked someone without calling book_appointment in the same reply.
- Do not claim you transferred someone without calling route_to_human in the same reply.
- Do not call book_appointment before lookup_availability has returned slots.
- Do not call lookup_availability for an emergency. Emergencies skip straight to route_to_human.
- Do not call lookup_availability when the caller has just picked a slot — at that point you call book_appointment.
- Do not pick a slot for the caller. If they say "tomorrow morning" without naming a specific time, ASK which time, do not assume.

# Worked examples

## Example 1 — closing the booking
Previous tool result: lookup_availability returned slots ["2026-05-14T10:00:00Z", "2026-05-14T12:00:00Z", "2026-05-14T14:00:00Z"]
Previous assistant reply: "I've got tomorrow 10am, 12pm or 2pm. Which works?"
Caller: "10am."
CORRECT next action: call book_appointment with slot="2026-05-14T10:00:00Z", then reply "You're booked for tomorrow at 10am."
INCORRECT: reply "You're booked for 10am" without calling book_appointment.
INCORRECT: call lookup_availability again.

## Example 2 — ordinal close
Previous tool result: lookup_availability returned slots ["2026-05-14T10:00:00Z", "2026-05-14T12:00:00Z", "2026-05-14T14:00:00Z"]
Caller: "First one works."
CORRECT next action: call book_appointment with slot="2026-05-14T10:00:00Z", then reply "You're booked for tomorrow at 10am."

## Example 3 — vague slot pick
Previous tool result: lookup_availability returned slots [10am, 12pm, 2pm]
Caller: "Tomorrow morning is fine."
CORRECT next action: ASK "10am or 12pm — which suits you?" Do NOT call book_appointment yet, do NOT call lookup_availability again.

## Example 4 — emergency mid-call
Caller (after some chit-chat): "Water is gushing out of my ceiling right now!"
CORRECT next action: call route_to_human with reason="ceiling leak gushing water", then reply "That's an emergency — putting you through now."

# Final check before every reply

Ask yourself: "Am I about to claim an action happened?" If yes — book, transfer, schedule — the matching tool call MUST be in this same reply. No exceptions.`;

function buildAgent(): Agent {
  const kimi = createOpenAICompatible({
    name: 'kimi',
    baseURL: KIMI_BASE_URL,
    apiKey: KIMI_API_KEY!,
  });

  return new Agent({
    id: 'voice-octo-test',
    name: 'voice-octo-test',
    instructions: VOICE_INSTRUCTIONS,
    model: kimi.chatModel(KIMI_MODEL),
    tools: {
      lookup_availability: lookupAvailabilityTool,
      book_appointment: bookAppointmentTool,
      route_to_human: routeToHumanTool,
    },
  });
}

// ---------------------------------------------------------------------------
// Scenarios. `expectTools` is the set of tools the brain SHOULD call across
// the whole scenario (order-agnostic). `forbidTools` is what it must NOT call.
// ---------------------------------------------------------------------------

type ToolName = 'lookup_availability' | 'book_appointment' | 'route_to_human';

interface Scenario {
  name: string;
  /** User utterances driven one per turn. */
  turns: string[];
  /** Tools the agent should call by the end (set semantics). */
  expectTools: ToolName[];
  /** Tools the agent must NOT call (e.g. emergencies must skip booking). */
  forbidTools?: ToolName[];
  /** Optional extra arg checks for specific tools. */
  argChecks?: Partial<Record<ToolName, (args: Record<string, unknown>) => string | null>>;
}

const SCENARIOS: Scenario[] = [
  {
    name: 'happy_path_booking',
    turns: [
      'Hi, my kitchen tap has been leaking for a couple days.',
      'It can wait, I am just planning ahead.',
      'I am in Sandton.',
      'Tomorrow morning works for me.',
      'The 10am slot please.',
    ],
    expectTools: ['lookup_availability', 'book_appointment'],
    forbidTools: ['route_to_human'],
  },
  {
    name: 'emergency_burst_geyser',
    turns: [
      'Hi, my geyser just burst and water is everywhere!',
    ],
    expectTools: ['route_to_human'],
    forbidTools: ['lookup_availability', 'book_appointment'],
  },
  {
    name: 'emergency_gas_smell',
    turns: [
      'I can smell gas in my house, it is strong.',
    ],
    expectTools: ['route_to_human'],
    forbidTools: ['lookup_availability', 'book_appointment'],
  },
  {
    name: 'non_emergency_just_chatting',
    turns: [
      'Hi, just wanted to ask about your prices.',
      'Okay thanks, I will think about it.',
    ],
    expectTools: [],
    forbidTools: ['route_to_human', 'book_appointment'],
  },
  {
    name: 'ambiguous_urgency_then_emergency',
    turns: [
      'Hi there.',
      'My toilet is overflowing.',
      'Yes, water is on the floor right now.',
    ],
    expectTools: ['route_to_human'],
    forbidTools: ['book_appointment'],
  },
  {
    name: 'caller_skips_to_booking',
    turns: [
      'Can I just book an appointment please?',
      'It is a slow drain, nothing urgent.',
      'I am in Rosebank.',
      'Any time tomorrow morning.',
      'First slot is fine.',
    ],
    expectTools: ['lookup_availability', 'book_appointment'],
    forbidTools: ['route_to_human'],
  },
  {
    name: 'caller_insists_on_human',
    turns: [
      'Hi, can I please speak to an actual person?',
    ],
    expectTools: ['route_to_human'],
    forbidTools: ['lookup_availability', 'book_appointment'],
  },
  {
    name: 'asks_for_specific_date',
    turns: [
      'Hi, I need someone to fix my shower head.',
      'Not urgent at all.',
      'Cape Town actually, sea point.',
      'Can you check Friday?',
      'The middle one works.',
    ],
    expectTools: ['lookup_availability', 'book_appointment'],
    forbidTools: ['route_to_human'],
  },
  // ── Closing-turn stress tests — specifically target the failure mode
  // we saw on v1 of the prompt (Kimi says "you're booked" without calling
  // book_appointment).
  {
    name: 'short_affirmative_close',
    turns: [
      'Hi, my outside tap drips.',
      'Whenever, not urgent.',
      'Randburg.',
      'tomorrow is fine.',
      '10am.',
    ],
    expectTools: ['lookup_availability', 'book_appointment'],
    forbidTools: ['route_to_human'],
  },
  {
    name: 'ordinal_close',
    turns: [
      'Hi, the showerhead in the guest bathroom needs replacing.',
      'No, can wait.',
      'Parkview.',
      'Sometime tomorrow morning.',
      'the first one',
    ],
    expectTools: ['lookup_availability', 'book_appointment'],
    forbidTools: ['route_to_human'],
  },
  {
    name: 'emergency_after_chitchat',
    turns: [
      'Hi there.',
      'I wanted to ask about pricing actually.',
      'Wait, I just heard a loud bang and water is now spraying out of my ceiling!',
    ],
    expectTools: ['route_to_human'],
    forbidTools: ['book_appointment'],
  },
];

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface TurnRecord {
  user: string;
  assistantReply: string;
  toolsCalledThisTurn: ToolName[];
  /** True iff the FIRST agent.generate() of this turn fired the action it claimed. */
  rawFirstPassOk: boolean;
  /** True iff the guard had to re-prompt to force the tool call. */
  guardTriggered: boolean;
  tokensIn: number;
  tokensOut: number;
  ms: number;
}

/**
 * Detect when the assistant claims an action ("you're booked", "transferring you")
 * without actually firing the matching tool. This is the hallucination pattern we
 * keep seeing on Kimi's closing turn.
 *
 * Returns:
 *   - 'book' if the reply implies a booking happened
 *   - 'transfer' if the reply implies a transfer happened
 *   - null otherwise
 */
function detectHallucinatedAction(
  reply: string,
  toolsFiredThisTurn: ToolName[],
): 'book' | 'transfer' | 'lookup' | null {
  // Normalise: lowercase + map both apostrophe variants to '. Kimi
  // sometimes emits curly U+2019 which would slip past straight-apostrophe
  // regexes.
  const lower = reply.toLowerCase().replace(/[‘’ʼ]/g, "'");

  const claimsBook =
    /\b(?:you'?re booked|you are booked|i'?ve booked|i have booked|booked (?:you )?(?:for|in)|booking confirmed|scheduled (?:you )?for|confirmed (?:you )?for|appointment is (?:set|booked))\b/.test(
      lower,
    );
  const claimsTransfer =
    /\b(?:transferring|putting you through|putting through|connecting you|i'?ll put you through|on the line|getting someone for you)\b/.test(
      lower,
    );
  // Future-tense lookup claim — model says it's checking but didn't actually
  // fire the tool. If the next turn it serves slots, those will be invented.
  const claimsLookup =
    /\b(?:let me check (?:availability|the calendar|what'?s open|what we have|the slots)|checking (?:availability|the calendar|the slots)|let me see what'?s open|i'?ll check (?:availability|what'?s open|the calendar)|let me look at (?:availability|the calendar))\b/.test(
      lower,
    );

  if (claimsBook && !toolsFiredThisTurn.includes('book_appointment')) return 'book';
  if (claimsTransfer && !toolsFiredThisTurn.includes('route_to_human'))
    return 'transfer';
  if (claimsLookup && !toolsFiredThisTurn.includes('lookup_availability'))
    return 'lookup';

  // Kimi quirk: sometimes emits the function-call syntax as raw text
  // ("functions.book_appointment:0{...}") instead of using the
  // tool_calls API. The user/STT would hear gibberish, and the tool
  // does not actually fire. Treat the leaked syntax as a missed call.
  const leakedBook = /functions?\.book_appointment\b/.test(lower);
  const leakedTransfer = /functions?\.route_to_human\b/.test(lower);
  const leakedLookup = /functions?\.lookup_availability\b/.test(lower);
  if (leakedBook && !toolsFiredThisTurn.includes('book_appointment')) return 'book';
  if (leakedTransfer && !toolsFiredThisTurn.includes('route_to_human'))
    return 'transfer';
  if (leakedLookup && !toolsFiredThisTurn.includes('lookup_availability'))
    return 'lookup';
  return null;
}

function lastLookupSlots(): string[] | null {
  for (let i = callLog.length - 1; i >= 0; i--) {
    if (callLog[i].tool === 'lookup_availability') {
      const r = callLog[i].result as { ok?: boolean; slots?: string[] };
      if (r?.ok && Array.isArray(r.slots)) return r.slots;
      return null;
    }
  }
  return null;
}

interface ScenarioResult {
  scenario: Scenario;
  turns: TurnRecord[];
  toolsCalled: ToolName[];
  passed: boolean;
  failures: string[];
  totalTokensIn: number;
  totalTokensOut: number;
  totalMs: number;
}

async function runScenario(scenario: Scenario): Promise<ScenarioResult> {
  const agent = buildAgent();
  callLog = []; // reset shared log

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const turns: TurnRecord[] = [];

  for (const userText of scenario.turns) {
    messages.push({ role: 'user', content: userText });

    const callLogLengthBefore = callLog.length;
    const start = Date.now();

    let reply = '';
    let tokensIn = 0;
    let tokensOut = 0;
    let rawFirstPassOk = true;
    let guardTriggered = false;

    const pullUsage = (output: { totalUsage?: unknown; usage?: unknown }) => {
      const u = (output.totalUsage ?? output.usage ?? {}) as {
        inputTokens?: number;
        outputTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
      };
      return {
        in: u.inputTokens ?? u.promptTokens ?? 0,
        out: u.outputTokens ?? u.completionTokens ?? 0,
      };
    };

    try {
      // First pass — let the agent reason normally. Cap steps at 3 so
      // Kimi can't run away calling the same tool 5x in a loop (observed).
      const output = await agent.generate(messages, { maxSteps: 3 });
      reply = output.text ?? '';
      const u = pullUsage(output);
      tokensIn += u.in;
      tokensOut += u.out;

      let toolsThisTurn = callLog
        .slice(callLogLengthBefore)
        .map((c) => c.tool);

      // ── Guard layer ───────────────────────────────────────────────
      // Detect when assistant claims an action ("you're booked",
      // "transferring you") but did not fire the matching tool. Force
      // a re-prompt and use the second response as the real reply.
      const hallucinated = detectHallucinatedAction(reply, toolsThisTurn);
      if (hallucinated) {
        rawFirstPassOk = false;
        guardTriggered = true;

        // Append the hallucinated reply so the model sees its own
        // commitment, then nudge it to actually fire the tool.
        messages.push({ role: 'assistant', content: reply });

        let nudge: string;
        let forcedTool: 'book_appointment' | 'route_to_human' | 'lookup_availability';
        if (hallucinated === 'book') {
          forcedTool = 'book_appointment';
          const slots = lastLookupSlots();
          const slotsHint = slots
            ? ` The slots from your most recent lookup_availability call are: ${JSON.stringify(slots)}. Pick the one the caller chose and pass it as the slot argument.`
            : '';
          nudge = `[system reminder] You told the caller they are booked but you did not call book_appointment. Call book_appointment now with the exact ISO slot the caller picked, then confirm the booking.${slotsHint}`;
        } else if (hallucinated === 'transfer') {
          forcedTool = 'route_to_human';
          nudge = `[system reminder] You told the caller you would transfer/connect them but you did not call route_to_human. Call route_to_human now with a short reason, then confirm the transfer.`;
        } else {
          // hallucinated === 'lookup'
          forcedTool = 'lookup_availability';
          nudge = `[system reminder] You said you would check availability but did not call lookup_availability. Call lookup_availability now (pass date if the caller specified one, otherwise call with no arguments), then offer the returned slots to the caller in plain English.`;
        }
        messages.push({ role: 'user', content: nudge });

        const retryBefore = callLog.length;
        // toolChoice forces the model to call THIS tool. Belt-and-braces:
        // the system reminder gives it the context, the toolChoice removes
        // its option to keep hallucinating.
        const retryOutput = await agent.generate(messages, {
          toolChoice: { type: 'tool', toolName: forcedTool },
        });
        let retryReply = retryOutput.text ?? '';
        // Kimi sometimes returns empty text when a tool call is forced —
        // it emits only the tool_calls and no content. Moonshot's chat
        // endpoint then rejects a follow-up turn that has an empty
        // assistant message. Substitute a plain-English confirmation so
        // history stays well-formed.
        if (!retryReply.trim()) {
          if (forcedTool === 'book_appointment') {
            retryReply = "You're booked.";
          } else if (forcedTool === 'route_to_human') {
            retryReply = 'Putting you through now.';
          } else {
            retryReply = "Let me see what's open.";
          }
        }
        const u2 = pullUsage(retryOutput);
        tokensIn += u2.in;
        tokensOut += u2.out;

        // Pop the nudge from messages (it was bookkeeping, not real
        // conversation) and replace the prior assistant reply with the
        // retry result so history stays clean for the next turn.
        messages.pop(); // remove nudge user message
        messages.pop(); // remove first hallucinated assistant reply
        reply = retryReply;

        // Tools fired on the retry get attributed to this turn.
        const retryTools = callLog
          .slice(retryBefore)
          .map((c) => c.tool);
        toolsThisTurn = [...toolsThisTurn, ...retryTools];
      }

      messages.push({ role: 'assistant', content: reply });

      const ms = Date.now() - start;
      turns.push({
        user: userText,
        assistantReply: reply,
        toolsCalledThisTurn: toolsThisTurn,
        rawFirstPassOk,
        guardTriggered,
        tokensIn,
        tokensOut,
        ms,
      });
    } catch (err) {
      reply = `[ERROR] ${err instanceof Error ? err.message : String(err)}`;
      messages.push({ role: 'assistant', content: reply });
      turns.push({
        user: userText,
        assistantReply: reply,
        toolsCalledThisTurn: [],
        rawFirstPassOk: false,
        guardTriggered: false,
        tokensIn,
        tokensOut,
        ms: Date.now() - start,
      });
    }
  }

  const toolsCalled = Array.from(new Set(callLog.map((c) => c.tool)));
  const failures: string[] = [];

  for (const expected of scenario.expectTools) {
    if (!toolsCalled.includes(expected)) {
      failures.push(`expected tool ${expected} was NOT called`);
    }
  }
  for (const forbidden of scenario.forbidTools ?? []) {
    if (toolsCalled.includes(forbidden)) {
      failures.push(`forbidden tool ${forbidden} WAS called`);
    }
  }
  // Check arg shapes
  for (const call of callLog) {
    if (call.tool === 'book_appointment') {
      const slot = (call.args as { slot?: unknown }).slot;
      if (typeof slot !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(slot)) {
        failures.push(
          `book_appointment called with non-ISO slot: ${JSON.stringify(slot)}`,
        );
      }
    }
    if (call.tool === 'route_to_human') {
      const reason = (call.args as { reason?: unknown }).reason;
      if (typeof reason !== 'string' || reason.length < 2) {
        failures.push(
          `route_to_human called with missing/empty reason: ${JSON.stringify(reason)}`,
        );
      }
    }
  }

  const totalTokensIn = turns.reduce((s, t) => s + t.tokensIn, 0);
  const totalTokensOut = turns.reduce((s, t) => s + t.tokensOut, 0);
  const totalMs = turns.reduce((s, t) => s + t.ms, 0);

  return {
    scenario,
    turns,
    toolsCalled,
    passed: failures.length === 0,
    failures,
    totalTokensIn,
    totalTokensOut,
    totalMs,
  };
}

// Kimi K2 Turbo pricing (Moonshot AI, as of May 2026): $1.15 in, $8.00 out per 1M tokens.
const PRICE_IN_PER_M = 1.15;
const PRICE_OUT_PER_M = 8.0;

function formatScenario(r: ScenarioResult): string {
  const head = `${r.passed ? 'PASS' : 'FAIL'}  ${r.scenario.name}`;
  const lines: string[] = [head];
  lines.push(
    `  tools called: ${r.toolsCalled.join(', ') || '(none)'}`,
  );
  lines.push(
    `  expected: ${r.scenario.expectTools.join(', ') || '(none)'}` +
      (r.scenario.forbidTools?.length
        ? `   forbidden: ${r.scenario.forbidTools.join(', ')}`
        : ''),
  );
  if (r.failures.length > 0) {
    for (const f of r.failures) lines.push(`  - ${f}`);
  }
  lines.push(
    `  turns: ${r.turns.length}   total: ${r.totalMs}ms   tokens: ${r.totalTokensIn} in / ${r.totalTokensOut} out`,
  );
  for (const t of r.turns) {
    const truncReply = t.assistantReply.replace(/\s+/g, ' ').slice(0, 90);
    const toolPart = t.toolsCalledThisTurn.length
      ? ` [tools: ${t.toolsCalledThisTurn.join(',')}]`
      : '';
    lines.push(`    > ${t.user}`);
    lines.push(`    < ${truncReply}${truncReply.length === 90 ? '...' : ''}${toolPart}`);
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  console.log('=== Kimi K2 Turbo — Voice Agent Tool Reliability Test ===');
  console.log(`Model: ${KIMI_MODEL}`);
  console.log(`BaseURL: ${KIMI_BASE_URL}`);
  console.log(`Scenarios: ${SCENARIOS.length}`);
  console.log('');

  const results: ScenarioResult[] = [];
  for (const scenario of SCENARIOS) {
    process.stdout.write(`running ${scenario.name} ... `);
    const result = await runScenario(scenario);
    results.push(result);
    console.log(result.passed ? 'PASS' : `FAIL (${result.failures.length})`);
  }

  console.log('');
  console.log('=== Per-scenario detail ===');
  for (const r of results) {
    console.log('');
    console.log(formatScenario(r));
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const tokensIn = results.reduce((s, r) => s + r.totalTokensIn, 0);
  const tokensOut = results.reduce((s, r) => s + r.totalTokensOut, 0);
  const costUsd =
    (tokensIn * PRICE_IN_PER_M + tokensOut * PRICE_OUT_PER_M) / 1_000_000;
  const totalMs = results.reduce((s, r) => s + r.totalMs, 0);
  const totalTurns = results.reduce((s, r) => s + r.turns.length, 0);
  const avgTurnMs = Math.round(totalMs / Math.max(totalTurns, 1));

  // Raw Kimi reliability (before guard) vs final reliability (after guard).
  // Counts ONLY turns where the assistant claimed a closing action — that's
  // the failure mode the guard is built to catch.
  let closingTurns = 0;
  let closingRawOk = 0;
  let guardFires = 0;
  for (const r of results) {
    for (const t of r.turns) {
      const claimedAction =
        detectHallucinatedAction(t.assistantReply, t.toolsCalledThisTurn) !==
          null || t.guardTriggered;
      if (claimedAction) {
        closingTurns++;
        if (t.rawFirstPassOk) closingRawOk++;
        if (t.guardTriggered) guardFires++;
      }
    }
  }
  const rawClosingPct =
    closingTurns === 0
      ? 100
      : Math.round((closingRawOk / closingTurns) * 100);

  console.log('');
  console.log('=== Summary ===');
  console.log(`scenarios: ${passed}/${results.length} passed, ${failed} failed (with guard)`);
  console.log(
    `closing-action turns: ${closingRawOk}/${closingTurns} fired tool on first pass (${rawClosingPct}% raw Kimi reliability)`,
  );
  console.log(`guard re-prompts triggered: ${guardFires}`);
  console.log(`tokens: ${tokensIn} in / ${tokensOut} out`);
  console.log(`est. cost: $${costUsd.toFixed(4)}`);
  console.log(`turns: ${totalTurns}   avg generate latency: ${avgTurnMs}ms`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
