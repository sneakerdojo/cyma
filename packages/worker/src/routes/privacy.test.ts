import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// Hoist mock references so they are available inside vi.mock closures.
// ---------------------------------------------------------------------------

const {
  mockSendEmail,
  mockDbSelect,
  mockDbSelectFrom,
  mockDbSelectFromWhere,
  mockDbSelectFromWhereLimit,
  mockDbDelete,
  mockDbDeleteWhere,
} = vi.hoisted(() => {
  const mockDbSelectFromWhereLimit = vi.fn();
  const mockDbSelectFromWhere = vi
    .fn()
    .mockReturnValue({ limit: mockDbSelectFromWhereLimit });
  const mockDbSelectFrom = vi
    .fn()
    .mockReturnValue({ where: mockDbSelectFromWhere });
  const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbSelectFrom });

  const mockDbDeleteWhere = vi.fn().mockResolvedValue([]);
  const mockDbDelete = vi.fn().mockReturnValue({ where: mockDbDeleteWhere });

  return {
    mockSendEmail: vi.fn().mockResolvedValue('msg-id'),
    mockDbSelect,
    mockDbSelectFrom,
    mockDbSelectFromWhere,
    mockDbSelectFromWhereLimit,
    mockDbDelete,
    mockDbDeleteWhere,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../db/client.js', () => ({
  db: {
    select: mockDbSelect,
    delete: mockDbDelete,
  },
}));

vi.mock('../db/schema.js', () => ({
  contacts: { id: 'contacts.id', email: 'contacts.email' },
  bookings: { id: 'bookings.id', contactId: 'bookings.contact_id' },
  appointments: { id: 'appointments.id', contactId: 'appointments.contact_id' },
  leadScores: { id: 'lead_scores.id', contactId: 'lead_scores.contact_id' },
  conversations: { id: 'conversations.id', contactId: 'conversations.contact_id' },
  consentEvents: { id: 'consent_events.id', contactId: 'consent_events.contact_id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockReturnValue('eq-condition'),
}));

vi.mock('../services/gmail.js', () => ({
  sendEmail: mockSendEmail,
}));

vi.mock('../config.js', () => ({
  config: {
    nodeEnv: 'test',
    googleSenderEmail: 'hello@octio.co.za',
    octioTeamEmail: 'team@octio.co.za',
    apiBaseUrl: 'http://localhost:3005',
    deletionSecret: 'test-deletion-secret-32-chars-long',
    allowedOrigins: ['http://localhost:5173'],
    port: 3005,
    databaseUrl: 'postgres://test',
  },
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Rate-limit middleware is a pass-through in tests — we test the route logic only
vi.mock('../middleware/rate-limit.js', () => ({
  rateLimitMiddleware: () => async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));

// ---------------------------------------------------------------------------
// Load route + helpers AFTER mocks are registered
// ---------------------------------------------------------------------------

import { privacyRoutes, signDeletionToken, verifyDeletionToken } from './privacy.js';

// ---------------------------------------------------------------------------
// Test app builder
// ---------------------------------------------------------------------------

function buildApp(): Hono {
  const app = new Hono();
  app.route('/privacy', privacyRoutes);
  return app;
}

// ---------------------------------------------------------------------------
// Unit tests for token helpers
// ---------------------------------------------------------------------------

describe('signDeletionToken / verifyDeletionToken', () => {
  it('round-trips a valid contactId', () => {
    const contactId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const token = signDeletionToken(contactId);
    expect(verifyDeletionToken(token)).toBe(contactId);
  });

  it('returns null for a tampered token', () => {
    const contactId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const token = signDeletionToken(contactId);
    const tampered = token.slice(0, -4) + 'xxxx';
    expect(verifyDeletionToken(tampered)).toBeNull();
  });

  it('returns null for a token without a dot separator', () => {
    expect(verifyDeletionToken('nodotinhere')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(verifyDeletionToken('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// POST /privacy/request-deletion
// ---------------------------------------------------------------------------

describe('POST /privacy/request-deletion', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it('returns 200 with generic message when contact exists and sends email', async () => {
    mockDbSelectFromWhereLimit.mockResolvedValue([{ id: 'contact-uuid' }]);

    const res = await app.request('/privacy/request-deletion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com' }),
    });

    const body = await res.json() as { ok: boolean; message: string };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.message).toMatch(/confirmation email/i);
    expect(mockSendEmail).toHaveBeenCalledOnce();

    const callArg = mockSendEmail.mock.calls[0][0] as { to: string; subject: string; htmlBody: string };
    expect(callArg.to).toBe('alice@example.com');
    expect(callArg.subject).toMatch(/deletion/i);
    expect(callArg.htmlBody).toContain('confirm-deletion');
  });

  it('returns 200 with the same generic message when email is NOT found (no enumeration)', async () => {
    mockDbSelectFromWhereLimit.mockResolvedValue([]);

    const res = await app.request('/privacy/request-deletion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@example.com' }),
    });

    const body = await res.json() as { ok: boolean; message: string };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // Same message — cannot distinguish registered from unregistered
    expect(body.message).toMatch(/confirmation email/i);
    // No email was sent
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when email field is missing', async () => {
    const res = await app.request('/privacy/request-deletion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const body = await res.json() as { ok: boolean; error: string };
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/email is required/i);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await app.request('/privacy/request-deletion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail' }),
    });

    const body = await res.json() as { ok: boolean; error: string };
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/invalid/i);
  });

  it('returns 400 for non-JSON body', async () => {
    const res = await app.request('/privacy/request-deletion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{',
    });

    const body = await res.json() as { ok: boolean; error: string };
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('normalises email to lowercase before lookup', async () => {
    mockDbSelectFromWhereLimit.mockResolvedValue([{ id: 'contact-uuid' }]);

    await app.request('/privacy/request-deletion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ALICE@EXAMPLE.COM' }),
    });

    // sendEmail should have been called with the lowercase version
    const callArg = mockSendEmail.mock.calls[0][0] as { to: string };
    expect(callArg.to).toBe('alice@example.com');
  });

  it('returns 500 when DB throws', async () => {
    mockDbSelectFromWhereLimit.mockRejectedValue(new Error('DB connection lost'));

    const res = await app.request('/privacy/request-deletion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com' }),
    });

    const body = await res.json() as { ok: boolean; error: string };
    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /privacy/confirm-deletion
// ---------------------------------------------------------------------------

describe('GET /privacy/confirm-deletion', () => {
  const CONTACT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  function makeConfirmUrl(contactId: string, token: string): string {
    return `/privacy/confirm-deletion?token=${encodeURIComponent(token)}&contactId=${encodeURIComponent(contactId)}`;
  }

  it('returns HTML success page and performs cascade delete for valid token', async () => {
    const token = signDeletionToken(CONTACT_ID);

    // Contact exists
    mockDbSelectFromWhereLimit.mockResolvedValue([{ id: CONTACT_ID }]);
    // All deletes succeed
    mockDbDeleteWhere.mockResolvedValue([]);

    const res = await app.request(makeConfirmUrl(CONTACT_ID, token));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(text).toContain('Your data has been deleted');

    // cascade: 6 delete calls (leadScores, appointments, bookings, conversations,
    // consentEvents, contacts)
    expect(mockDbDelete).toHaveBeenCalledTimes(6);
  });

  it('returns HTML success page when contact is already gone (idempotent)', async () => {
    const token = signDeletionToken(CONTACT_ID);

    // Contact not found
    mockDbSelectFromWhereLimit.mockResolvedValue([]);

    const res = await app.request(makeConfirmUrl(CONTACT_ID, token));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain('Your data has been deleted');
    // No deletes should have run
    expect(mockDbDelete).not.toHaveBeenCalled();
  });

  it('returns 400 HTML error page for an invalid token', async () => {
    const badToken = 'bad-token-no-hmac';

    const res = await app.request(makeConfirmUrl(CONTACT_ID, badToken));
    const text = await res.text();

    expect(res.status).toBe(400);
    expect(text).toContain('Something went wrong');
    expect(text).toContain('Invalid or expired');
  });

  it('returns 400 when token contactId does not match query contactId', async () => {
    const otherContactId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const token = signDeletionToken(otherContactId);

    const res = await app.request(makeConfirmUrl(CONTACT_ID, token));
    const text = await res.text();

    expect(res.status).toBe(400);
    expect(text).toContain('Something went wrong');
  });

  it('returns 400 when token or contactId query params are missing', async () => {
    const res = await app.request('/privacy/confirm-deletion');
    const text = await res.text();

    expect(res.status).toBe(400);
    expect(text).toContain('Missing required parameters');
  });

  it('returns 500 HTML error page when cascade delete throws', async () => {
    const token = signDeletionToken(CONTACT_ID);

    // Contact exists
    mockDbSelectFromWhereLimit.mockResolvedValue([{ id: CONTACT_ID }]);
    // First delete (leadScores) throws
    mockDbDeleteWhere.mockRejectedValueOnce(new Error('DB error during delete'));

    const res = await app.request(makeConfirmUrl(CONTACT_ID, token));
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(text).toContain('Something went wrong');
  });
});
