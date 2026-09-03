/**
 * Voice Agent routes.
 *
 * v0 (current): mocks. Browser-native Web Speech API for audio; this worker
 * just runs the brain + tools and returns the reply text.
 *
 * v1 (next): real Deepgram + Cartesia via LiveKit Agents. The /turn contract
 * is the v1 shape — what the LiveKit Agents worker will call. /token is
 * stubbed for the same reason.
 *
 * Endpoints:
 *   POST /api/voice-agent/simulate   — text-in/text-out, full session state (v0)
 *   POST /api/voice-agent/turn       — v1-shape contract (used by both v0 voice UI and v1 LiveKit worker)
 *   POST /api/voice-agent/token      — v1-shape stub (returns fake LiveKit JWT; documents contract)
 *   POST /api/voice-agent/reset      — clear a session
 *   GET  /api/voice-agent/session/:id — inspect current state (debugging)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import {
  simulateTurn,
  resetSession,
  getSession,
  setSession,
} from '../services/voice-agent/index.js';
import { createMockBrain } from '../services/voice-agent/mock-brain.js';
import { createOctoBrainAdapter } from '../services/voice-agent/octo-brain-adapter.js';
import {
  createMockTools,
  mockLookupAvailability,
  mockBookAppointment,
  mockRouteToHuman,
} from '../services/voice-agent/tools.js';
import { runTurn } from '../services/voice-agent/orchestrator.js';
import {
  createMastraVoiceBrain,
  type MastraVoiceBrain,
} from '../services/voice-agent/mastra-brain.js';
import type { SessionState } from '../services/voice-agent/orchestrator.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

// Lazy-built singleton — only constructed when /turn is called with the
// real-brain flag enabled, so missing Kimi credentials don't break the
// process on boot. Rebuilt per call would mean rebuilding the openai-compatible
// provider; not worth it for the hot path.
let cachedRealBrain: MastraVoiceBrain | null = null;
function getRealBrain(tenantBrand: string): MastraVoiceBrain {
  if (cachedRealBrain) return cachedRealBrain;
  if (!config.kimiApiKey) {
    throw new Error(
      'VOICE_USE_REAL_BRAIN is enabled but KIMI_API_KEY is not set',
    );
  }
  cachedRealBrain = createMastraVoiceBrain({
    tenantBrand,
    llm: {
      apiKey: config.kimiApiKey,
      baseUrl: config.kimiBaseUrl,
      model: config.kimiModel,
    },
    // Inject the mock tool impls for now. The next swap (v1 step) is wiring
    // real Google Calendar + Twilio behind these same function signatures.
    toolImpls: {
      lookupAvailability: (a) => mockLookupAvailability(a),
      bookAppointment: (a) => mockBookAppointment(a),
      routeToHuman: (a) => mockRouteToHuman(a),
    },
  });
  return cachedRealBrain;
}

export const voiceAgentRoutes = new Hono();

const SimulateBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  tenantId: z.number().int().positive().optional().default(1),
  callerNumber: z.string().nullable().optional(),
  tenantBrand: z.string().optional(),
  transcript: z.string().min(1).max(4_000),
});

voiceAgentRoutes.post('/voice-agent/simulate', async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400);
  }
  const parsed = SimulateBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid request',
        issues: parsed.error.issues,
      },
      400,
    );
  }
  const response = await simulateTurn(parsed.data);
  return c.json(response);
});

const ResetBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
});

voiceAgentRoutes.post('/voice-agent/reset', async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400);
  }
  const parsed = ResetBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request' }, 400);
  }
  resetSession(parsed.data.sessionId);
  return c.json({ ok: true });
});

voiceAgentRoutes.get('/voice-agent/session/:id', async (c) => {
  const id = c.req.param('id');
  const state = getSession(id);
  if (state === null) {
    return c.json({ exists: false }, 404);
  }
  return c.json({ exists: true, state });
});

// ---------------------------------------------------------------------------
// v1-shape contract: /turn and /token
//
// /turn — called by the LiveKit Agents worker per caller utterance. v0 calls
//   it directly from the browser (Web Speech API → POST /turn → reply text →
//   SpeechSynthesisUtterance). Same request/response shape both ways.
//
// /token — stubbed. v1 will mint a real LiveKit JWT against a self-hosted
//   livekit-server. v0 returns a fake token that documents the contract +
//   lets the browser test the unlock UX flow.
// ---------------------------------------------------------------------------

const TurnBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  tenantId: z.number().int().positive().optional().default(1),
  tenantBrand: z.string().optional(),
  callerNumber: z.string().nullable().optional(),
  transcript: z.string().min(1).max(4_000),
  /** Optional pre-computed profile summary; v1 LiveKit worker injects this. */
  profileSummary: z.string().optional(),
});

voiceAgentRoutes.post('/voice-agent/turn', async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400);
  }
  const parsed = TurnBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json(
      { error: 'Invalid request', issues: parsed.error.issues },
      400,
    );
  }

  const tenantBrand = parsed.data.tenantBrand ?? 'Octio';
  const useRealBrain =
    process.env.VOICE_USE_REAL_BRAIN === '1' ||
    process.env.VOICE_USE_REAL_BRAIN === 'true';

  if (!useRealBrain) {
    // Mock path — deterministic FSM, no LLM cost. Used by the /voice-sim
    // page when the real-brain flag is off.
    const underlying = createMockBrain({ tenantBrand });
    const brain = createOctoBrainAdapter({
      underlying,
      tenantBrand,
      profileSummary: parsed.data.profileSummary,
    });
    const result = await simulateTurn({
      sessionId: parsed.data.sessionId,
      tenantId: parsed.data.tenantId,
      callerNumber: parsed.data.callerNumber ?? null,
      tenantBrand,
      transcript: parsed.data.transcript,
    });
    // Mark the adapter as referenced — the seam exists for when we wire it
    // into the mock simulator. Not load-bearing yet.
    void brain;
    void runTurn;

    return c.json({
      sessionId: result.sessionId,
      reply: result.reply,
      toolCalls: result.toolCalls,
      latencyMs: result.latencyMs,
      ended: result.ended,
      endedReason: result.endedReason,
      bookedSlot: result.bookedSlot,
      brain: 'mock',
    });
  }

  // Real-brain path — Mastra + Kimi K2 Turbo + hallucination guard.
  // Session state is still managed by the simulator's in-memory store; we
  // round-trip through it manually because simulateTurn() always uses the
  // mock brain.
  let realBrain: MastraVoiceBrain;
  try {
    realBrain = getRealBrain(tenantBrand);
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'real-brain init failed',
    );
    return c.json({ error: 'Voice brain not configured' }, 503);
  }

  // Pull session state by calling getSession; if absent, simulateTurn would
  // have created it on first call. To avoid duplicating that logic, run a
  // no-op simulate first to ensure the session exists, then operate on it.
  let sessionState: SessionState | null = getSession(parsed.data.sessionId);
  if (!sessionState) {
    sessionState = {
      sessionId: parsed.data.sessionId,
      tenantId: parsed.data.tenantId,
      callerNumber: parsed.data.callerNumber ?? null,
      history: [],
      bookedSlot: null,
    };
  }

  if (sessionState.ended) {
    return c.json({
      sessionId: parsed.data.sessionId,
      reply: 'This call has ended. Refresh to start a new session.',
      toolCalls: [],
      latencyMs: { stt: 0, brain: 0, tts: 0, totalMouthToEar: 0 },
      ended: true,
      endedReason: sessionState.endedReason,
      bookedSlot: sessionState.bookedSlot,
      brain: 'real',
    });
  }

  const outcome = await realBrain.runTurn({
    sessionState,
    transcript: parsed.data.transcript,
    tenantBrand,
    profileSummary: parsed.data.profileSummary,
  });

  // Persist new state into the shared session store so /reset and
  // /session/:id work uniformly across both brain paths.
  setSession(parsed.data.sessionId, outcome.nextState);

  if (outcome.guardRetries > 0) {
    logger.info(
      {
        sessionId: parsed.data.sessionId,
        guardRetries: outcome.guardRetries,
        brainLatencyMs: outcome.latencyMs.brain,
      },
      'voice-agent guard fired',
    );
  }

  return c.json({
    sessionId: parsed.data.sessionId,
    reply: outcome.reply,
    toolCalls: outcome.toolCalls,
    latencyMs: outcome.latencyMs,
    ended: outcome.nextState.ended === true,
    endedReason: outcome.nextState.endedReason,
    bookedSlot: outcome.nextState.bookedSlot,
    brain: 'real',
    guardRetries: outcome.guardRetries,
  });
});


const TokenBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  tenantId: z.number().int().positive().optional().default(1),
  callerName: z.string().max(128).optional(),
});

voiceAgentRoutes.post('/voice-agent/token', async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400);
  }
  const parsed = TokenBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  // v0 stub. v1: replace with real LiveKit JWT signed by livekit-server
  // admin key. Same response shape so the client doesn't change.
  return c.json({
    // Fake token — non-functional for LiveKit. Documents the contract.
    token: `v0-stub-${parsed.data.sessionId}`,
    // v0 has no real room; v1 returns the room name the client should join.
    roomName: `voice-${parsed.data.sessionId}`,
    // v1 fills this with `wss://livekit.octio.co.za` once livekit-server is up.
    serverUrl: null,
    // 1-hour TTL convention; v0 stub ignores this.
    expiresAtUnixSec: Math.floor(Date.now() / 1000) + 3600,
    // Tells the client which mode to use. v0 → 'webspeech-mock'. v1 → 'livekit'.
    mode: 'webspeech-mock',
  });
});
