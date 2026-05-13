/**
 * Voice Agent orchestrator — runs a single conversation turn.
 *
 * Production wiring is Twilio inbound → Deepgram STT → Brain (Haiku 4.5 EU
 * primary, Gemini 2.5 Flash fallback, Llama 3.3 Groq tertiary) → tools →
 * Cartesia Sonic-3 TTS. The shape below mocks every external piece so the
 * orchestration is testable AND playable without telephony / API keys.
 *
 * Spec: docs/superpowers/specs/2026-05-12-voice-agent-superseded.md
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = 'user' | 'assistant' | 'tool';

export interface HistoryMessage {
  role: Role;
  text: string;
  /** Tool name when role==='tool'. */
  toolName?: string;
}

export interface SessionState {
  sessionId: string;
  tenantId: number;
  callerNumber: string | null;
  history: HistoryMessage[];
  bookedSlot: string | null;
  /** Set when route_to_human fires; orchestrator stops accepting input. */
  ended?: boolean;
  endedReason?: 'transferred' | 'caller_hangup' | 'bot_ended' | 'error';
  /** True when LLM cascade failed and we returned a static reply. */
  degraded?: boolean;
}

export interface BrainTurnRequest {
  history: HistoryMessage[];
  systemHints?: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface Turn {
  reply: string;
  toolCalls: ToolCall[];
}

export interface Brain {
  name: string;
  generate(req: BrainTurnRequest): Promise<Turn>;
}

export type Tool = (args: Record<string, unknown>) => Promise<unknown>;

export interface ToolRegistry {
  lookup_availability: Tool;
  book_appointment: Tool;
  route_to_human: Tool;
}

export interface ToolCallResult {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface LatencyBreakdown {
  /** Time spent on STT (mocked unless real Deepgram is wired). */
  stt: number;
  /** Brain generation latency. */
  brain: number;
  /** TTS first-byte latency (mocked unless real Cartesia is wired). */
  tts: number;
  /** Total mouth-to-ear including transport. */
  totalMouthToEar: number;
}

export interface RunTurnArgs {
  sessionState: SessionState;
  transcript: string;
  brain: Brain;
  /** Tool registry; defaults to no-op tools that just log. */
  tools?: ToolRegistry;
  /**
   * STT latency stub (ms). Real telephony measures this; the simulator
   * supplies a plausible value to keep the latency story visible.
   */
  sttLatencyMs?: number;
  /** TTS TTFB stub (ms). */
  ttsLatencyMs?: number;
  /** Network transport (Twilio inbound + return media). */
  networkLatencyMs?: number;
}

export interface RunTurnResult {
  reply: string;
  toolCalls: ToolCallResult[];
  latencyMs: LatencyBreakdown;
  nextState: SessionState;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const FALLBACK_REPLY =
  "I'm having a connection issue — give me a moment and try again.";

const DEFAULT_STT_MS = 220;
const DEFAULT_TTS_MS = 140;
const DEFAULT_NETWORK_MS = 600;

const NOOP_TOOL: Tool = async () => ({ ok: false, note: 'tool not wired' });

const DEFAULT_TOOLS: ToolRegistry = {
  lookup_availability: NOOP_TOOL,
  book_appointment: NOOP_TOOL,
  route_to_human: NOOP_TOOL,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runTurn(args: RunTurnArgs): Promise<RunTurnResult> {
  const {
    sessionState,
    transcript,
    brain,
    tools = DEFAULT_TOOLS,
    sttLatencyMs = DEFAULT_STT_MS,
    ttsLatencyMs = DEFAULT_TTS_MS,
    networkLatencyMs = DEFAULT_NETWORK_MS,
  } = args;

  // 1. Append the user transcript to the session history.
  const historyWithUser: HistoryMessage[] = [
    ...sessionState.history,
    { role: 'user', text: transcript },
  ];

  // 2. Brain generates the next turn.
  const brainStart = performance.now();
  let turn: Turn;
  let degraded = false;
  try {
    turn = await brain.generate({ history: historyWithUser });
  } catch (err) {
    console.error('[voice-agent] brain failed:', brain.name, err);
    turn = { reply: FALLBACK_REPLY, toolCalls: [] };
    degraded = true;
  }
  const brainLatency = performance.now() - brainStart;

  // 3. Dispatch tool calls sequentially. Errors are captured per-call,
  //    not thrown, so a single broken tool doesn't kill the turn.
  const toolResults: ToolCallResult[] = [];
  let bookedSlot: string | null = sessionState.bookedSlot;
  let endedReason: SessionState['endedReason'] | undefined;
  for (const call of turn.toolCalls) {
    const tool = tools[call.name as keyof ToolRegistry];
    if (!tool) {
      toolResults.push({
        name: call.name,
        args: call.args,
        error: `unknown tool: ${call.name}`,
      });
      continue;
    }
    try {
      const result = await tool(call.args);
      toolResults.push({ name: call.name, args: call.args, result });

      // Side effects we extract from results:
      if (
        call.name === 'book_appointment' &&
        isObject(result) &&
        result.ok === true &&
        typeof (result as { slot?: unknown }).slot === 'string'
      ) {
        bookedSlot = (result as { slot: string }).slot;
      }
      if (call.name === 'route_to_human' && isObject(result) && result.ok === true) {
        endedReason = 'transferred';
      }
    } catch (err) {
      toolResults.push({
        name: call.name,
        args: call.args,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 4. Build history that includes the assistant reply + any tool entries.
  const historyWithAssistant: HistoryMessage[] = [
    ...historyWithUser,
    { role: 'assistant', text: turn.reply },
    ...toolResults.map<HistoryMessage>((t) => ({
      role: 'tool',
      toolName: t.name,
      text: t.error
        ? `error: ${t.error}`
        : JSON.stringify(t.result ?? null),
    })),
  ];

  const latencyMs: LatencyBreakdown = {
    stt: sttLatencyMs,
    brain: Math.round(brainLatency),
    tts: ttsLatencyMs,
    totalMouthToEar:
      Math.round(brainLatency) + sttLatencyMs + ttsLatencyMs + networkLatencyMs,
  };

  return {
    reply: turn.reply,
    toolCalls: toolResults,
    latencyMs,
    nextState: {
      ...sessionState,
      history: historyWithAssistant,
      bookedSlot,
      ended: endedReason ? true : sessionState.ended,
      endedReason: endedReason ?? sessionState.endedReason,
      degraded,
    },
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
