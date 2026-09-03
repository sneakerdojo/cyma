/**
 * Voice Agent simulator — single-process in-memory session store
 * + a "run a turn" entrypoint that wires the orchestrator + mock brain + mock
 * tools together. Lets the HTTP route / web UI drive a conversation without
 * any telephony / API keys / DB.
 *
 * Sessions auto-expire after IDLE_TTL_MS to keep memory bounded.
 */

import { runTurn, type SessionState } from './orchestrator.js';
import { createMockBrain } from './mock-brain.js';
import { createMockTools } from './tools.js';

const IDLE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface StoredSession {
  state: SessionState;
  lastTouchedAt: number;
}

const sessions = new Map<string, StoredSession>();

function gcExpired(now: number = Date.now()) {
  for (const [id, entry] of sessions) {
    if (now - entry.lastTouchedAt > IDLE_TTL_MS) {
      sessions.delete(id);
    }
  }
}

function getOrCreate(
  sessionId: string,
  tenantId: number,
  callerNumber: string | null,
): SessionState {
  gcExpired();
  const existing = sessions.get(sessionId);
  if (existing) {
    existing.lastTouchedAt = Date.now();
    return existing.state;
  }
  const fresh: SessionState = {
    sessionId,
    tenantId,
    callerNumber,
    history: [],
    bookedSlot: null,
  };
  sessions.set(sessionId, { state: fresh, lastTouchedAt: Date.now() });
  return fresh;
}

export interface SimulateTurnArgs {
  sessionId: string;
  tenantId: number;
  callerNumber?: string | null;
  tenantBrand?: string;
  transcript: string;
}

export interface SimulateTurnResponse {
  sessionId: string;
  reply: string;
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    error?: string;
  }>;
  latencyMs: {
    stt: number;
    brain: number;
    tts: number;
    totalMouthToEar: number;
  };
  ended: boolean;
  endedReason: SessionState['endedReason'];
  bookedSlot: string | null;
  history: Array<{ role: string; text: string; toolName?: string }>;
}

export async function simulateTurn(
  args: SimulateTurnArgs,
): Promise<SimulateTurnResponse> {
  const tenantBrand = args.tenantBrand ?? 'Joburg Plumbing';
  const session = getOrCreate(
    args.sessionId,
    args.tenantId,
    args.callerNumber ?? null,
  );

  // Refuse new input on ended sessions
  if (session.ended) {
    return {
      sessionId: args.sessionId,
      reply: 'This call has ended. Refresh to start a new session.',
      toolCalls: [],
      latencyMs: { stt: 0, brain: 0, tts: 0, totalMouthToEar: 0 },
      ended: true,
      endedReason: session.endedReason,
      bookedSlot: session.bookedSlot,
      history: session.history,
    };
  }

  const brain = createMockBrain({ tenantBrand });
  const tools = createMockTools();

  const result = await runTurn({
    sessionState: session,
    transcript: args.transcript,
    brain,
    tools,
  });

  // Persist new state
  sessions.set(args.sessionId, {
    state: result.nextState,
    lastTouchedAt: Date.now(),
  });

  return {
    sessionId: args.sessionId,
    reply: result.reply,
    toolCalls: result.toolCalls,
    latencyMs: result.latencyMs,
    ended: result.nextState.ended === true,
    endedReason: result.nextState.endedReason,
    bookedSlot: result.nextState.bookedSlot,
    history: result.nextState.history,
  };
}

export function resetSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getSession(sessionId: string): SessionState | null {
  return sessions.get(sessionId)?.state ?? null;
}

/**
 * Persist a session's state. Used by the real-brain code path
 * (routes/voice-agent.ts) which manages its own turn execution but shares
 * the simulator's in-memory store so /reset and /session/:id work uniformly.
 */
export function setSession(sessionId: string, state: SessionState): void {
  sessions.set(sessionId, { state, lastTouchedAt: Date.now() });
}

/** Test-only: clears all sessions. */
export function _resetAllSessions(): void {
  sessions.clear();
}
