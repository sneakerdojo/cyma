/**
 * Mock brain for the Voice Agent simulator.
 *
 * Deterministic state-machine that mimics a receptionist's qualification
 * flow. Production replaces this with a real LLM (Haiku 4.5 EU primary,
 * Gemini 2.5 Flash fallback, Llama 3.3 Groq tertiary) but the public Brain
 * interface stays identical — see ./orchestrator.ts.
 *
 * The brain derives its "position" by inspecting message history every
 * turn — it stores nothing across calls. This means the simulator UI can
 * replay or edit history and the brain reacts deterministically.
 */

import type {
  Brain,
  BrainTurnRequest,
  HistoryMessage,
  Turn,
} from './orchestrator.js';

export interface MockBrainOptions {
  tenantBrand: string;
}

// ---------------------------------------------------------------------------
// Keyword sets
// ---------------------------------------------------------------------------

const URGENT_PHRASES = [
  /\bemergency\b/i,
  /\bflood(ing)?\b/i,
  /\bburst(ing)?\b/i,
  /\bright now\b/i,
  /\b(?<!not\s)urgent\b/i, // "urgent" but not "not urgent"
  /\bhelp\s+me\b/i,
];

const BOOK_INTENT_PHRASES = [
  /\bbook\b/i,
  /\bappointment\b/i,
  /\bschedule\b/i,
  /\bcan you come\b/i,
];

const AFFIRMATIVES = [
  /\b(yes|yep|sure|ok|okay|sounds good|works for me|that works)\b/i,
];

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createMockBrain(opts: MockBrainOptions): Brain {
  const brand = opts.tenantBrand;

  return {
    name: 'mock-fsm-brain',
    async generate(req: BrainTurnRequest): Promise<Turn> {
      return decideTurn(req.history, brand);
    },
  };
}

// ---------------------------------------------------------------------------
// Decision logic
// ---------------------------------------------------------------------------

function decideTurn(history: HistoryMessage[], brand: string): Turn {
  const lastUserMessage = lastOfRole(history, 'user') ?? '';
  const userTurnsSoFar = countUserTurns(history);

  // ── Overrides — keyword routing happens regardless of state ────────────

  if (matchesAny(lastUserMessage, URGENT_PHRASES)) {
    return {
      reply: `Hold on — putting you through to someone right now.`,
      toolCalls: [
        {
          name: 'route_to_human',
          args: { reason: lastUserMessage },
        },
      ],
    };
  }

  // After a book_appointment tool result, confirm.
  const lastTool = lastToolEntry(history);
  if (lastTool?.toolName === 'book_appointment' && parsedOk(lastTool.text)) {
    const parsed = safeJsonParse(lastTool.text);
    const slot = typeof parsed?.slot === 'string' ? parsed.slot : 'the slot';
    return {
      reply: `Booked. You're confirmed for ${humanSlot(slot)}. See you then.`,
      toolCalls: [],
    };
  }

  // If the user just picked from offered slots, book it.
  if (lastTool?.toolName === 'lookup_availability' && parsedOk(lastTool.text)) {
    const offered = safeJsonParse(lastTool.text)?.slots as string[] | undefined;
    if (Array.isArray(offered) && offered.length > 0) {
      const pickedSlot = pickSlotFromUserMessage(lastUserMessage, offered);
      if (pickedSlot) {
        return {
          reply: `Booking ${humanSlot(pickedSlot)} for you now.`,
          toolCalls: [{ name: 'book_appointment', args: { slot: pickedSlot } }],
        };
      }
    }
  }

  // If user signals book intent directly OR we've completed qualification.
  if (matchesAny(lastUserMessage, BOOK_INTENT_PHRASES)) {
    return {
      reply: `Let me check availability for you.`,
      toolCalls: [{ name: 'lookup_availability', args: {} }],
    };
  }

  // ── FSM by turn count ─────────────────────────────────────────────────

  // Turn 1 (first user message) — greeting.
  if (userTurnsSoFar <= 1 && countAssistantTurns(history) === 0) {
    return {
      reply: `Hi, you've reached ${brand}. How can I help today?`,
      toolCalls: [],
    };
  }

  const hasNeed = anyUserMessageMentions(history, [
    /pipe/i,
    /leak/i,
    /geyser/i,
    /tap/i,
    /drain/i,
    /toilet/i,
    /water/i,
    /need/i,
    /problem/i,
  ]);

  const askedUrgency = anyAssistantMessageMatches(history, /\burgent\b/i);
  const askedLocation = anyAssistantMessageMatches(history, /\b(where|location|suburb)\b/i);

  if (hasNeed && !askedUrgency) {
    return {
      reply: `Got it. Is this urgent or are you planning ahead?`,
      toolCalls: [],
    };
  }
  if (hasNeed && askedUrgency && !askedLocation) {
    return {
      reply: `What suburb are you in?`,
      toolCalls: [],
    };
  }
  if (hasNeed && askedUrgency && askedLocation) {
    // Ready to offer slots
    return {
      reply: `Let me check availability.`,
      toolCalls: [{ name: 'lookup_availability', args: {} }],
    };
  }

  // Default — no clear signal. Probe gently.
  if (countAssistantTurns(history) === 0) {
    return {
      reply: `Hi, you've reached ${brand}. How can I help today?`,
      toolCalls: [],
    };
  }
  return {
    reply: `Sorry — can you say a bit more about what you need help with?`,
    toolCalls: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lastOfRole(
  history: HistoryMessage[],
  role: HistoryMessage['role'],
): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === role) return history[i].text;
  }
  return undefined;
}

function countUserTurns(history: HistoryMessage[]): number {
  return history.filter((m) => m.role === 'user').length;
}

function countAssistantTurns(history: HistoryMessage[]): number {
  return history.filter((m) => m.role === 'assistant').length;
}

function lastToolEntry(history: HistoryMessage[]): HistoryMessage | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'tool') return history[i];
  }
  return undefined;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

function anyUserMessageMentions(
  history: HistoryMessage[],
  patterns: RegExp[],
): boolean {
  return history.some(
    (m) => m.role === 'user' && matchesAny(m.text, patterns),
  );
}

function anyAssistantMessageMatches(
  history: HistoryMessage[],
  pattern: RegExp,
): boolean {
  return history.some(
    (m) => m.role === 'assistant' && pattern.test(m.text),
  );
}

function safeJsonParse(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parsedOk(s: string): boolean {
  const obj = safeJsonParse(s);
  return obj?.ok === true;
}

function humanSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-ZA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Johannesburg',
  });
}

/**
 * Try to match the user's utterance to one of the offered slots.
 * Looks for hour mentions ("10am", "12 noon", "2pm") and time hints
 * ("morning", "afternoon"). Returns the matching slot or null.
 */
function pickSlotFromUserMessage(
  text: string,
  offered: string[],
): string | null {
  const lower = text.toLowerCase();

  // Affirm-only ("yes", "sure") with a single offered slot → pick it
  if (offered.length === 1 && AFFIRMATIVES.some((re) => re.test(lower))) {
    return offered[0];
  }

  // Hour pattern: "10am", "10 am", "2pm", "2 pm"
  const hourMatch = lower.match(/(\d{1,2})\s*(am|pm)/);
  if (hourMatch) {
    const hour12 = parseInt(hourMatch[1], 10);
    const isPm = hourMatch[2] === 'pm';
    const hour24 =
      isPm && hour12 < 12 ? hour12 + 12 : !isPm && hour12 === 12 ? 0 : hour12;
    for (const slot of offered) {
      const d = new Date(slot);
      if (d.getUTCHours() === hour24) return slot;
    }
  }

  // First / second / third
  if (/\bfirst|earliest\b/.test(lower)) return offered[0];
  if (/\bsecond|middle\b/.test(lower)) return offered[1] ?? offered[0];
  if (/\bthird|last|latest\b/.test(lower)) return offered[offered.length - 1];

  return null;
}
