import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import {
  parseBookingMultipart,
  MissingFieldError,
  WrongFieldTypeError,
} from './multipart.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Hono app that invokes parseBookingMultipart and returns
 * either the parsed result (200) or the thrown error (422 + name/message).
 */
function buildTestApp() {
  const app = new Hono();

  app.post('/api/book', async (c) => {
    try {
      const parsed = await parseBookingMultipart(c);
      return c.json({
        intake: parsed.intake,
        hasVoiceNote: parsed.voiceNote !== undefined,
        hasAttachment: parsed.attachment !== undefined,
        voiceNoteType: parsed.voiceNote?.type ?? null,
        attachmentType: parsed.attachment?.type ?? null,
      });
    } catch (err) {
      const error = err as Error;
      return c.json({ error: error.name, message: error.message }, 422);
    }
  });

  return app;
}

/**
 * Create a multipart/form-data Request for the test Hono app.
 * `fields` is a plain object — values are either strings or Blob/File.
 */
function makeRequest(
  fields: Record<string, string | Blob>,
): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      form.append(key, value);
    } else {
      form.append(key, value, key === 'voiceNote' ? 'voice.webm' : 'file.pdf');
    }
  }
  return new Request('http://test/api/book', { method: 'POST', body: form });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseBookingMultipart', () => {
  const app = buildTestApp();

  it('parses intake + voiceNote + attachment correctly', async () => {
    const intakeJson = JSON.stringify({ name: 'Test User', service: 'mixing' });
    const req = makeRequest({
      intake: intakeJson,
      voiceNote: new Blob([new Uint8Array(100)], { type: 'audio/webm' }),
      attachment: new Blob([new Uint8Array(200)], { type: 'application/pdf' }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['intake']).toBe(intakeJson);
    expect(body['hasVoiceNote']).toBe(true);
    expect(body['hasAttachment']).toBe(true);
    expect(body['voiceNoteType']).toBe('audio/webm');
    expect(body['attachmentType']).toBe('application/pdf');
  });

  it('parses intake alone (no voice note, no attachment)', async () => {
    const req = makeRequest({
      intake: JSON.stringify({ name: 'Solo' }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body['intake']).toContain('Solo');
    expect(body['hasVoiceNote']).toBe(false);
    expect(body['hasAttachment']).toBe(false);
  });

  it('throws MissingFieldError when intake is absent', async () => {
    const req = makeRequest({
      voiceNote: new Blob([new Uint8Array(50)], { type: 'audio/webm' }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(422);

    const body = await res.json() as Record<string, unknown>;
    expect(body['error']).toBe('MissingFieldError');
    expect(body['message']).toContain('intake');
  });

  it('throws WrongFieldTypeError when intake is sent as a File blob', async () => {
    // Send a Blob for `intake` — caller made a mistake
    const req = makeRequest({
      intake: new Blob([JSON.stringify({ oops: true })], {
        type: 'application/json',
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(422);

    const body = await res.json() as Record<string, unknown>;
    expect(body['error']).toBe('WrongFieldTypeError');
    expect(body['message']).toContain('intake');
    expect(body['message']).toContain('string');
  });
});
