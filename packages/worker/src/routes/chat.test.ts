import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// Hoist mock references so they are available inside vi.mock closures.
// vi.mock calls are hoisted to the top of the file by Vitest.
// ---------------------------------------------------------------------------

const { mockHandleChatStream, mockCreateUIMessageStreamResponse } = vi.hoisted(() => {
  // A minimal ReadableStream that immediately closes — acts as a fake SSE stream.
  const fakeStream = new ReadableStream({
    start(controller) {
      controller.close();
    },
  });

  return {
    mockHandleChatStream: vi.fn().mockResolvedValue(fakeStream),
    mockCreateUIMessageStreamResponse: vi
      .fn()
      .mockReturnValue(
        new Response(fakeStream, {
          status: 200,
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
          },
        }),
      ),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@mastra/ai-sdk', () => ({
  handleChatStream: mockHandleChatStream,
}));

vi.mock('ai', () => ({
  createUIMessageStreamResponse: mockCreateUIMessageStreamResponse,
}));

// Mock the mastra instance — the route imports it but never calls it directly
// (handleChatStream owns that interaction).
vi.mock('../mastra/index.js', () => ({
  mastra: {},
}));

// Mock the logger to keep test output clean.
vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import the route under test AFTER mocks are declared.
// ---------------------------------------------------------------------------

import { chatRoutes } from './chat.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function buildApp(): Hono {
  const app = new Hono();
  app.route('/chat', chatRoutes);
  return app;
}

const VALID_BODY = {
  messages: [{ role: 'user', content: 'What services does Octio offer?' }],
  sessionId: 'test-session-123',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /chat/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('happy path', () => {
    it('returns 200 with SSE content-type for a valid request', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_BODY),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
    });

    it('calls handleChatStream with the correct agentId and messages', async () => {
      const app = buildApp();

      await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_BODY),
      });

      expect(mockHandleChatStream).toHaveBeenCalledOnce();
      const callArgs = mockHandleChatStream.mock.calls[0][0];
      expect(callArgs.agentId).toBe('octo');
      expect(callArgs.params.messages).toEqual(VALID_BODY.messages);
    });

    it('passes the stream from handleChatStream to createUIMessageStreamResponse', async () => {
      const app = buildApp();

      await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_BODY),
      });

      expect(mockCreateUIMessageStreamResponse).toHaveBeenCalledOnce();
    });

    it('accepts an optional contactId without error', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_BODY, contactId: 'contact-abc' }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe('security — session ID cross-check', () => {
    it('returns 400 when header and body sessionIds are both present but differ', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': 'header-session-abc',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'hi' }],
          sessionId: 'body-session-xyz',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/session id mismatch/i);
    });

    it('proceeds normally when header and body sessionIds match', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': 'test-session-123',
        },
        body: JSON.stringify(VALID_BODY),
      });

      expect(res.status).toBe(200);
    });

    it('proceeds normally when only body sessionId is present (no header)', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_BODY),
      });

      expect(res.status).toBe(200);
    });

    it('proceeds normally when only header sessionId is present (no body sessionId)', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': 'header-only-session',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe('validation — 400 responses', () => {
    it('returns 400 when messages is missing', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'test-session-123' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/messages/i);
    });

    it('returns 400 when messages is an empty array', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], sessionId: 'test-session-123' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/messages/i);
    });

    it('returns 400 when messages is not an array', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: 'hello', sessionId: 'test-session-123' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/messages/i);
    });

    it('returns 400 when sessionId is missing', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/sessionId/i);
    });

    it('returns 400 when body is not valid JSON', async () => {
      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('error handling — 500 responses', () => {
    it('returns 500 with error message when handleChatStream throws', async () => {
      mockHandleChatStream.mockRejectedValueOnce(new Error('ANTHROPIC_API_KEY is missing'));

      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_BODY),
      });

      expect(res.status).toBe(500);
      const body = await res.json() as { error: string };
      expect(body.error).toContain('ANTHROPIC_API_KEY is missing');
    });

    it('returns a generic error message for non-Error throws', async () => {
      mockHandleChatStream.mockRejectedValueOnce('something went wrong');

      const app = buildApp();

      const res = await app.request('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_BODY),
      });

      expect(res.status).toBe(500);
      const body = await res.json() as { error: string };
      expect(body.error).toBe('Internal server error');
    });
  });
});
