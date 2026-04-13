import type { MiddlewareHandler } from 'hono';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export interface SessionEntry extends RateLimitWindow {
  /** Distinct sessionIds seen from this IP in the current window. */
  sessionIds: Set<string>;
}

export interface RateLimitConfig {
  /**
   * Per-session (or per-sessionId-key) rate limit.
   * Applied to /chat/stream using the X-Session-Id request header.
   * Default: 20 requests per 60 seconds.
   */
  perSession: {
    maxRequests: number;
    windowMs: number;
  };
  /**
   * Per-IP new-session rate limit.
   * Counts distinct new sessionIds per IP per window.
   * Default: 5 new sessions per 3600 seconds.
   *
   * NOTE: Phase 1 uses in-memory Maps. A Redis store would be required for
   * multi-container / multi-process deployments.
   */
  perIp: {
    maxNewSessions: number;
    windowMs: number;
  };
  /**
   * Per-IP total request frequency cap (across all sessions).
   * Prevents an attacker from bypassing per-session limits by spawning many
   * sessions. Default: 60 requests per 60 seconds for chat routes;
   * callers may override for stricter routes (e.g. /api/book → 10 req/min).
   */
  perIpFrequency: {
    maxRequests: number;
    windowMs: number;
  };
}

export type RateLimitMode = 'session-and-ip' | 'ip-only';

const DEFAULT_CONFIG: RateLimitConfig = {
  perSession: {
    maxRequests: 20,
    windowMs: 60_000, // 1 minute
  },
  perIp: {
    maxNewSessions: 5,
    windowMs: 3_600_000, // 1 hour
  },
  perIpFrequency: {
    maxRequests: 60,
    windowMs: 60_000, // 1 minute
  },
};

/** Map size threshold above which we sweep expired entries to cap memory use. */
const SWEEP_THRESHOLD = 10_000;

// ---------------------------------------------------------------------------
// State (module-scoped — shared across requests in a single process)
// ---------------------------------------------------------------------------

/**
 * Per-session counter: key = sessionId, value = { count, resetAt }.
 */
const sessionMap = new Map<string, RateLimitWindow>();

/**
 * Per-IP counter: key = IP address, value = { count, resetAt, sessionIds }.
 * The `count` field tracks distinct new sessionIds observed from this IP.
 */
const ipMap = new Map<string, SessionEntry>();

/**
 * Per-IP request frequency counter: key = IP address, value = { count, resetAt }.
 * Tracks total requests from an IP regardless of how many sessions it uses.
 */
const ipFrequencyMap = new Map<string, RateLimitWindow>();

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function resolveClientIp(req: { header: (name: string) => string | undefined }): string {
  return (
    req.header('x-real-ip') ??
    req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function resolveSessionId(req: { header: (name: string) => string | undefined }): string | null {
  return req.header('x-session-id') ?? null;
}

function secondsUntilReset(resetAt: number): number {
  return Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
}

/**
 * Sweep entries whose window has expired to prevent unbounded Map growth.
 * Called when the Map size exceeds SWEEP_THRESHOLD.
 */
function sweepExpired<T extends RateLimitWindow>(map: Map<string, T>): void {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (entry.resetAt <= now) {
      map.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Core check functions
// ---------------------------------------------------------------------------

/**
 * Check (and increment) the per-session counter.
 * Returns null if the request is within limit, or the reset timestamp if exceeded.
 */
function checkSessionLimit(
  sessionId: string,
  config: RateLimitConfig['perSession'],
): number | null {
  if (sessionMap.size > SWEEP_THRESHOLD) {
    sweepExpired(sessionMap);
  }

  const now = Date.now();
  const existing = sessionMap.get(sessionId);

  if (!existing || existing.resetAt <= now) {
    // First request in a new window — reset counter.
    sessionMap.set(sessionId, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  if (existing.count >= config.maxRequests) {
    return existing.resetAt;
  }

  existing.count += 1;
  return null;
}

/**
 * Check (and record) the per-IP new-session counter.
 * Returns null if the request is within limit, or the reset timestamp if exceeded.
 */
function checkIpLimit(
  ip: string,
  sessionId: string | null,
  config: RateLimitConfig['perIp'],
): number | null {
  if (ipMap.size > SWEEP_THRESHOLD) {
    sweepExpired(ipMap);
  }

  const now = Date.now();
  const existing = ipMap.get(ip);

  if (!existing || existing.resetAt <= now) {
    // First session from this IP in a new window.
    const sessionIds = new Set<string>(sessionId ? [sessionId] : []);
    ipMap.set(ip, { count: sessionIds.size, resetAt: now + config.windowMs, sessionIds });
    return null;
  }

  // Within an active window — check if this is a *new* sessionId for this IP.
  if (sessionId && !existing.sessionIds.has(sessionId)) {
    if (existing.count >= config.maxNewSessions) {
      return existing.resetAt;
    }
    existing.sessionIds.add(sessionId);
    existing.count += 1;
  }

  return null;
}

/**
 * Check (and increment) the per-IP total request frequency counter.
 * This counts every request from the IP, regardless of session, and caps
 * total throughput from a single address.
 * Returns null if within limit, or the reset timestamp if exceeded.
 */
function checkIpFrequencyLimit(
  ip: string,
  config: RateLimitConfig['perIpFrequency'],
): number | null {
  if (ipFrequencyMap.size > SWEEP_THRESHOLD) {
    sweepExpired(ipFrequencyMap);
  }

  const now = Date.now();
  const existing = ipFrequencyMap.get(ip);

  if (!existing || existing.resetAt <= now) {
    ipFrequencyMap.set(ip, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  if (existing.count >= config.maxRequests) {
    return existing.resetAt;
  }

  existing.count += 1;
  return null;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Rate-limit middleware for Hono.
 *
 * Two modes:
 *  - 'session-and-ip': Enforces both per-session and per-IP limits.
 *    Reads sessionId from the X-Session-Id request header.
 *    Use this for /chat/* routes.
 *
 *  - 'ip-only': Enforces only the per-IP new-session limit.
 *    Use this for /api/* routes where there is no explicit sessionId.
 *
 * The session axis requires the frontend to send the X-Session-Id header
 * alongside the JSON body. This avoids reading and buffering the request body
 * in middleware (which would prevent downstream route handlers from reading it).
 *
 * Phase 1 note: State is held in module-scoped Maps. This is correct for a
 * single-process deployment. Migrate to Redis for horizontal scaling.
 *
 * @param mode    - Which axes to enforce (default: 'session-and-ip')
 * @param config  - Optional overrides for thresholds and window sizes
 */
export function rateLimitMiddleware(
  mode: RateLimitMode = 'session-and-ip',
  config: Partial<RateLimitConfig> = {},
): MiddlewareHandler {
  const resolvedConfig: RateLimitConfig = {
    perSession: { ...DEFAULT_CONFIG.perSession, ...config.perSession },
    perIp: { ...DEFAULT_CONFIG.perIp, ...config.perIp },
    perIpFrequency: { ...DEFAULT_CONFIG.perIpFrequency, ...config.perIpFrequency },
  };

  return async (c, next) => {
    const ip = resolveClientIp(c.req);
    const sessionId = resolveSessionId(c.req);

    // ---- Per-session check (chat routes only) --------------------------------
    if (mode === 'session-and-ip' && sessionId) {
      const resetAt = checkSessionLimit(sessionId, resolvedConfig.perSession);
      if (resetAt !== null) {
        const retryAfter = secondsUntilReset(resetAt);
        logger.warn(
          { sessionId, ip, retryAfter },
          'rate-limit: per-session limit exceeded',
        );
        c.header('Retry-After', String(retryAfter));
        return c.json(
          { error: 'Rate limit exceeded', retryAfter },
          429,
        );
      }
    }

    // ---- Per-IP new-session check (all rate-limited routes) -----------------
    const ipResetAt = checkIpLimit(ip, sessionId, resolvedConfig.perIp);
    if (ipResetAt !== null) {
      const retryAfter = secondsUntilReset(ipResetAt);
      logger.warn(
        { ip, sessionId, retryAfter },
        'rate-limit: per-IP new-session limit exceeded',
      );
      c.header('Retry-After', String(retryAfter));
      return c.json(
        { error: 'Rate limit exceeded', retryAfter },
        429,
      );
    }

    // ---- Per-IP frequency check (total requests across all sessions) --------
    const ipFreqResetAt = checkIpFrequencyLimit(ip, resolvedConfig.perIpFrequency);
    if (ipFreqResetAt !== null) {
      const retryAfter = secondsUntilReset(ipFreqResetAt);
      logger.warn(
        { ip, sessionId, retryAfter },
        'rate-limit: per-IP frequency limit exceeded',
      );
      c.header('Retry-After', String(retryAfter));
      return c.json(
        { error: 'Rate limit exceeded', retryAfter },
        429,
      );
    }

    await next();
  };
}

// ---------------------------------------------------------------------------
// Test helpers — exported for white-box testing only, not for production use.
// ---------------------------------------------------------------------------

/** Reset all maps to a clean state (test isolation). */
export function _resetMapsForTesting(): void {
  sessionMap.clear();
  ipMap.clear();
  ipFrequencyMap.clear();
}

/** Expose internal maps for direct manipulation in tests. */
export function _getMapsForTesting(): {
  sessionMap: Map<string, RateLimitWindow>;
  ipMap: Map<string, SessionEntry>;
  ipFrequencyMap: Map<string, RateLimitWindow>;
} {
  return { sessionMap, ipMap, ipFrequencyMap };
}
