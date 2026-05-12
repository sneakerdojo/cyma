/**
 * POST /chat/event
 *
 * Lightweight analytics endpoint for tracking step-level conversion events.
 * Called by the frontend on every step transition so we can build funnel
 * analytics (start → view → answer → complete) without external tools.
 *
 * Fire-and-forget from the frontend — the response is always 204 (no content).
 * Failures are logged but never surface to the user.
 *
 * SOLID notes:
 *   - Single responsibility: only handles event ingestion, no business logic.
 *   - Dependency inversion: imports db client, not raw pg.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client.js';
import { conversationEvents } from '../db/schema.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Validation schema — loose enough for analytics, strict enough to prevent junk
// ---------------------------------------------------------------------------

const eventSchema = z.object({
  sessionId: z.string().min(1).max(128),
  stepId: z.string().max(64).optional(),
  action: z.enum([
    'session_start',
    'step_view',
    'step_answer',
    'step_skip',
    'session_complete',
    'followup_question',
  ]),
  value: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

const eventRoutes = new Hono();

eventRoutes.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.body(null, 204); // silently drop malformed payloads
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    logger.debug({ errors: parsed.error.flatten() }, 'invalid event payload');
    return c.body(null, 204);
  }

  const { sessionId, stepId, action, value, metadata } = parsed.data;

  try {
    await db.insert(conversationEvents).values({
      sessionId,
      stepId: stepId ?? null,
      action,
      value: value ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    // Log but never fail the request — analytics must not block the UX
    logger.error({ err, sessionId, action }, 'failed to insert conversation event');
  }

  return c.body(null, 204);
});

export { eventRoutes };
