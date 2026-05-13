import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import {
  rateLimitMiddleware,
  _resetMapsForTesting,
  _getMapsForTesting,
  type RateLimitConfig,
} from './rate-limit.js';

// ---------------------------------------------------------------------------
// Silence logger output during tests
// ---------------------------------------------------------------------------

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Hono app that mounts rate-limit middleware and returns 200
 * for any POST request that passes through.
 */
function buildApp(
  mode: Parameters<typeof rateLimitMiddleware>[0] = 'session-and-ip',
  config: Partial<RateLimitConfig> = {},
): Hono {
  const app = new Hono();
  app.use('*', rateLimitMiddleware(mode, config));
  app.post('/chat/stream', (c) => c.json({ ok: true }));
  app.post('/api/book', (c) => c.json({ ok: true }));
  return app;
}

/**
 * Build a Request for the test app.
 * sessionId is passed as a header (X-Session-Id) since the middleware reads
 * the header rather than parsing the body (avoids body-consumed-once conflict).
 */
function makeRequest(
  path: string,
  options: {
    sessionId?: string;
    ip?: string;
    forwardedFor?: string;
  } = {},
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.sessionId) {
    headers['X-Session-Id'] = options.sessionId;
  }
  if (options.ip) {
    headers['X-Real-Ip'] = options.ip;
  }
  if (options.forwardedFor) {
    headers['X-Forwarded-For'] = options.forwardedFor;
  }

  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    _resetMapsForTesting();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Under limit: 5 requests with same sessionId → all 200
  // =========================================================================

  it('allows 5 requests with the same sessionId (well under the limit)', async () => {
    const app = buildApp('session-and-ip', {
      perSession: { maxRequests: 20, windowMs: 60_000 },
      perIp: { maxNewSessions: 100, windowMs: 3_600_000 },
    });

    for (let i = 0; i < 5; i++) {
      const res = await app.fetch(
        makeRequest('/chat/stream', { sessionId: 'session-a', ip: '1.2.3.4' }),
      );
      expect(res.status).toBe(200);
    }
  });

  // =========================================================================
  // 2. Over session limit: 21st request returns 429 with Retry-After
  // =========================================================================

  it('returns 429 on the 21st request from the same sessionId within the window', async () => {
    const app = buildApp('session-and-ip', {
      perSession: { maxRequests: 20, windowMs: 60_000 },
      perIp: { maxNewSessions: 100, windowMs: 3_600_000 },
    });

    for (let i = 0; i < 20; i++) {
      const res = await app.fetch(
        makeRequest('/chat/stream', { sessionId: 'session-b', ip: '5.6.7.8' }),
      );
      expect(res.status).toBe(200);
    }

    // 21st request should be rejected
    const final = await app.fetch(
      makeRequest('/chat/stream', { sessionId: 'session-b', ip: '5.6.7.8' }),
    );
    expect(final.status).toBe(429);

    const body = (await final.json()) as { error: string; retryAfter: number };
    expect(body.error).toBe('Rate limit exceeded');
    expect(body.retryAfter).toBeGreaterThan(0);

    const retryAfterHeader = final.headers.get('Retry-After');
    expect(retryAfterHeader).toBeTruthy();
    expect(Number(retryAfterHeader)).toBeGreaterThan(0);
  });

  // =========================================================================
  // 3. Different sessions: session A (20 req) + session B (20 req) → all 200
  // =========================================================================

  it('tracks sessions independently — 20 from A and 20 from B all succeed', async () => {
    const app = buildApp('session-and-ip', {
      perSession: { maxRequests: 20, windowMs: 60_000 },
      perIp: { maxNewSessions: 100, windowMs: 3_600_000 },
    });

    for (let i = 0; i < 20; i++) {
      const resA = await app.fetch(
        makeRequest('/chat/stream', { sessionId: 'session-a', ip: '10.0.0.1' }),
      );
      expect(resA.status).toBe(200);

      const resB = await app.fetch(
        makeRequest('/chat/stream', { sessionId: 'session-b', ip: '10.0.0.1' }),
      );
      expect(resB.status).toBe(200);
    }
  });

  // =========================================================================
  // 4. IP limit: 6th new session from same IP returns 429
  // =========================================================================

  it('returns 429 when an IP introduces more than maxNewSessions distinct sessions', async () => {
    const app = buildApp('session-and-ip', {
      perSession: { maxRequests: 1000, windowMs: 60_000 }, // session limit won't trigger
      perIp: { maxNewSessions: 5, windowMs: 3_600_000 },
    });

    const ip = '192.168.1.1';

    // 5 distinct new sessions → all allowed
    for (let i = 1; i <= 5; i++) {
      const res = await app.fetch(
        makeRequest('/chat/stream', { sessionId: `ip-session-${i}`, ip }),
      );
      expect(res.status).toBe(200);
    }

    // 6th distinct session from the same IP → rejected
    const final = await app.fetch(
      makeRequest('/chat/stream', { sessionId: 'ip-session-6', ip }),
    );
    expect(final.status).toBe(429);

    const body = (await final.json()) as { error: string; retryAfter: number };
    expect(body.error).toBe('Rate limit exceeded');
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  // =========================================================================
  // 5. After window expires: next request succeeds
  // =========================================================================

  it('allows requests again after the session window is manually expired', async () => {
    const app = buildApp('session-and-ip', {
      perSession: { maxRequests: 1, windowMs: 60_000 }, // limit = 1 to hit quickly
      perIp: { maxNewSessions: 100, windowMs: 3_600_000 },
    });

    const sessionId = 'expiry-test-session';

    // First request — uses up the single allowed request
    const first = await app.fetch(
      makeRequest('/chat/stream', { sessionId, ip: '2.2.2.2' }),
    );
    expect(first.status).toBe(200);

    // Second request — should be rate-limited
    const blocked = await app.fetch(
      makeRequest('/chat/stream', { sessionId, ip: '2.2.2.2' }),
    );
    expect(blocked.status).toBe(429);

    // Simulate window expiry by back-dating the resetAt timestamp
    const { sessionMap } = _getMapsForTesting();
    const entry = sessionMap.get(sessionId);
    expect(entry).toBeDefined();
    if (entry) {
      entry.resetAt = Date.now() - 1; // expired 1ms ago
    }

    // Next request after expiry — should succeed (opens a fresh window)
    const recovered = await app.fetch(
      makeRequest('/chat/stream', { sessionId, ip: '2.2.2.2' }),
    );
    expect(recovered.status).toBe(200);
  });

  // =========================================================================
  // 6. Retry-After header has a reasonable value (> 0, < windowMs/1000)
  // =========================================================================

  it('Retry-After header value is between 1 and windowMs/1000 seconds', async () => {
    const windowMs = 60_000;
    const app = buildApp('session-and-ip', {
      perSession: { maxRequests: 1, windowMs },
      perIp: { maxNewSessions: 100, windowMs: 3_600_000 },
    });

    const sessionId = 'retry-after-test';
    const ip = '3.3.3.3';

    // Consume the one allowed request
    await app.fetch(makeRequest('/chat/stream', { sessionId, ip }));

    // Trigger the 429
    const res = await app.fetch(makeRequest('/chat/stream', { sessionId, ip }));
    expect(res.status).toBe(429);

    const retryAfterStr = res.headers.get('Retry-After');
    expect(retryAfterStr).not.toBeNull();

    const retryAfter = Number(retryAfterStr);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(windowMs / 1000);
  });

  // =========================================================================
  // 7. ip-only mode: session counter is NOT checked even if X-Session-Id present
  // =========================================================================

  it('ip-only mode: does not enforce per-session limit even with X-Session-Id header', async () => {
    const app = buildApp('ip-only', {
      perSession: { maxRequests: 1, windowMs: 60_000 }, // would block on 2nd if checked
      perIp: { maxNewSessions: 100, windowMs: 3_600_000 },
    });

    const sessionId = 'ip-only-session';
    const ip = '4.4.4.4';

    // Send 5 requests — all should pass because session axis is disabled
    for (let i = 0; i < 5; i++) {
      const res = await app.fetch(makeRequest('/api/book', { sessionId, ip }));
      expect(res.status).toBe(200);
    }
  });

  // =========================================================================
  // 8. ip-only mode: IP limit is still enforced
  // =========================================================================

  it('ip-only mode: still enforces the per-IP limit', async () => {
    const app = buildApp('ip-only', {
      perSession: { maxRequests: 1000, windowMs: 60_000 },
      perIp: { maxNewSessions: 2, windowMs: 3_600_000 },
    });

    const ip = '5.5.5.5';

    // 2 new sessions from same IP → ok
    for (let i = 1; i <= 2; i++) {
      const res = await app.fetch(
        makeRequest('/api/book', { sessionId: `book-session-${i}`, ip }),
      );
      expect(res.status).toBe(200);
    }

    // 3rd new session → blocked
    const blocked = await app.fetch(
      makeRequest('/api/book', { sessionId: 'book-session-3', ip }),
    );
    expect(blocked.status).toBe(429);
  });

  // =========================================================================
  // 9. Requests without X-Session-Id header still pass IP check
  // =========================================================================

  it('requests without X-Session-Id are not blocked by the session counter', async () => {
    const app = buildApp('session-and-ip', {
      perSession: { maxRequests: 1, windowMs: 60_000 },
      perIp: { maxNewSessions: 100, windowMs: 3_600_000 },
    });

    const ip = '6.6.6.6';

    // Multiple requests with no X-Session-Id should all pass
    for (let i = 0; i < 5; i++) {
      const res = await app.fetch(makeRequest('/chat/stream', { ip }));
      expect(res.status).toBe(200);
    }
  });

  // =========================================================================
  // 10. X-Forwarded-For fallback when X-Real-Ip is absent
  // =========================================================================

  it('falls back to the first address in X-Forwarded-For when X-Real-Ip is absent', async () => {
    const app = buildApp('session-and-ip', {
      perSession: { maxRequests: 1000, windowMs: 60_000 },
      perIp: { maxNewSessions: 1, windowMs: 3_600_000 }, // only 1 new session allowed
    });

    // Both requests use the same effective IP via X-Forwarded-For
    const first = await app.fetch(
      makeRequest('/chat/stream', {
        sessionId: 'fwd-session-1',
        forwardedFor: '7.7.7.7, 10.0.0.1',
      }),
    );
    expect(first.status).toBe(200);

    const second = await app.fetch(
      makeRequest('/chat/stream', {
        sessionId: 'fwd-session-2',
        forwardedFor: '7.7.7.7, 10.0.0.1',
      }),
    );
    expect(second.status).toBe(429);
  });

  // =========================================================================
  // 11. Per-IP frequency: 61st request from same IP across multiple sessions
  //     returns 429 even though each individual session is under its limit
  // =========================================================================

  it('returns 429 on the 61st request from the same IP across multiple sessions', async () => {
    const app = buildApp('session-and-ip', {
      perSession: { maxRequests: 1000, windowMs: 60_000 }, // session limit won't trigger
      perIp: { maxNewSessions: 1000, windowMs: 3_600_000 }, // new-session limit won't trigger
      perIpFrequency: { maxRequests: 60, windowMs: 60_000 },
    });

    const ip = '9.9.9.9';
    // Spread 60 requests across 4 sessions (15 each)
    for (let req = 0; req < 60; req++) {
      const sessionId = `freq-session-${(req % 4) + 1}`;
      const res = await app.fetch(makeRequest('/chat/stream', { sessionId, ip }));
      expect(res.status).toBe(200);
    }

    // 61st request — any session — should be blocked by the per-IP frequency cap
    const final = await app.fetch(
      makeRequest('/chat/stream', { sessionId: 'freq-session-1', ip }),
    );
    expect(final.status).toBe(429);

    const body = (await final.json()) as { error: string; retryAfter: number };
    expect(body.error).toBe('Rate limit exceeded');
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  // =========================================================================
  // 12. ip-only mode (booking): 11th request from same IP returns 429
  // =========================================================================

  it('ip-only mode: returns 429 on the 11th booking request from the same IP', async () => {
    const app = buildApp('ip-only', {
      perSession: { maxRequests: 1000, windowMs: 60_000 },
      perIp: { maxNewSessions: 1000, windowMs: 3_600_000 }, // new-session limit won't trigger
      perIpFrequency: { maxRequests: 10, windowMs: 60_000 }, // stricter for booking
    });

    const ip = '8.8.8.8';

    for (let i = 0; i < 10; i++) {
      const res = await app.fetch(makeRequest('/api/book', { ip }));
      expect(res.status).toBe(200);
    }

    // 11th request — blocked
    const final = await app.fetch(makeRequest('/api/book', { ip }));
    expect(final.status).toBe(429);

    const body = (await final.json()) as { error: string; retryAfter: number };
    expect(body.error).toBe('Rate limit exceeded');
    expect(body.retryAfter).toBeGreaterThan(0);
  });
});
