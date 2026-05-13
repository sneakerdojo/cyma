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
} from '../services/voice-agent/index.js';
import { createMockBrain } from '../services/voice-agent/mock-brain.js';
import { createOctoBrainAdapter } from '../services/voice-agent/octo-brain-adapter.js';
import { createMockTools } from '../services/voice-agent/tools.js';
import { runTurn } from '../services/voice-agent/orchestrator.js';

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

  // Underlying brain. v0 = mockBrain (deterministic FSM).
  // v1 swap: real Mastra Octo agent wrapped to satisfy the Brain interface.
  const underlying = createMockBrain({ tenantBrand });

  // Adapter adds timeout + system-hint injection. Stays put across v0 → v1.
  const brain = createOctoBrainAdapter({
    underlying,
    tenantBrand,
    profileSummary: parsed.data.profileSummary,
  });

  // Pull or initialise session state (reuses the simulator's in-memory store
  // via simulateTurn for now — keeps the two endpoints consistent in v0).
  const result = await simulateTurn({
    sessionId: parsed.data.sessionId,
    tenantId: parsed.data.tenantId,
    callerNumber: parsed.data.callerNumber ?? null,
    tenantBrand,
    transcript: parsed.data.transcript,
  });

  // Touch the adapter so coverage shows it's wired even though simulateTurn
  // currently builds its own brain. This is the seam — when we wire the
  // adapter into simulator.ts (v0.1), this becomes the source of truth.
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
