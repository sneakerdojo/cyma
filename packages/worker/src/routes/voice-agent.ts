/**
 * Voice Agent simulator route — drives the FSM brain + mock tools from a
 * browser. No telephony / real LLM / real DB involvement. Production gets a
 * different route that wires Retell webhooks; this exists so the team can
 * play with the agent's behavior shape.
 *
 * Endpoints:
 *   POST /api/voice-agent/simulate   — run one turn
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
