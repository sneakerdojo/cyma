import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BookingIntake, CalendarResult } from './gmail.js';

// ---------------------------------------------------------------------------
// Hoist mock references so they are available inside vi.mock factory closures.
// vi.mock is hoisted to the top of the file by Vitest; any variables it
// captures must be initialised before that point via vi.hoisted().
// ---------------------------------------------------------------------------

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({ data: { id: 'msg-123' } }),
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({ setCredentials: vi.fn() })),
    },
    gmail: vi.fn().mockReturnValue({
      users: { messages: { send: mockSend } },
    }),
  },
}));

// Mock google-auth to avoid needing real credentials in unit tests
vi.mock('./google-auth.js', () => ({
  getOAuth2Client: vi.fn().mockReturnValue({ setCredentials: vi.fn() }),
  resetOAuth2ClientCache: vi.fn(),
}));

// Mock config to provide deterministic values
vi.mock('../config.js', () => ({
  config: {
    nodeEnv: 'test',
    googleSenderEmail: 'sender@octio.co.za',
    octioTeamEmail: 'team@octio.co.za',
  },
}));

// Mock logger to suppress output in tests
vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import SUT after all mocks are in place
// ---------------------------------------------------------------------------

import {
  sendBookingConfirmation,
  sendInternalAlert,
  sendResourceEmail,
} from './gmail.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Decode the base64url-encoded `raw` field back to a plain RFC 2822 string.
 */
function decodeRawMessage(raw: string): string {
  // Restore standard base64 padding/chars before decoding
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Decode an RFC 2047 encoded-word header value (`=?UTF-8?B?<base64>?=`).
 * Returns the value unchanged if not encoded.
 */
function decodeHeaderValue(value: string): string {
  const match = value.match(/^=\?UTF-8\?B\?(.+)\?=$/);
  if (match) {
    return Buffer.from(match[1], 'base64').toString('utf-8');
  }
  return value;
}

/**
 * Extract a named header value from a decoded RFC 2822 message.
 * Automatically decodes RFC 2047 encoded-word values so tests can assert
 * against plain UTF-8 strings regardless of header encoding.
 */
function extractHeader(decoded: string, header: string): string | undefined {
  const lines = decoded.split('\r\n');
  const prefix = `${header}: `;
  const line = lines.find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()));
  if (!line) return undefined;
  return decodeHeaderValue(line.slice(prefix.length));
}

/**
 * Extract and decode the base64-encoded body from a decoded RFC 2822 message.
 * The builder folds base64 at 76 chars with CRLF — unfold before decoding.
 */
function extractBody(decoded: string): string {
  const separator = decoded.indexOf('\r\n\r\n');
  if (separator === -1) return '';
  const body = decoded.slice(separator + 4);
  // Unfold base64 (remove CRLF line breaks inserted every 76 chars)
  const unfolded = body.replace(/\r\n/g, '');
  try {
    return Buffer.from(unfolded, 'base64').toString('utf-8');
  } catch {
    return body;
  }
}

function makeIntake(overrides: Partial<BookingIntake> = {}): BookingIntake {
  return {
    contact: { email: 'client@example.com', name: 'Jane Doe', company: 'Acme' },
    selectedSlot: { label: 'Tuesday 15 April at 10:00' },
    selectedService: 'AI Agents',
    budget: 'R50k – R100k',
    requirements: 'Build an automated customer support agent using LLMs.',
    ...overrides,
  };
}

function makeCalendarResult(overrides: Partial<CalendarResult> = {}): CalendarResult {
  return {
    meetLink: 'https://meet.google.com/abc-defg-hij',
    calendarLink: 'https://calendar.google.com/event/xyz',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sendBookingConfirmation', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it('calls gmail.users.messages.send with userId "me"', async () => {
    await sendBookingConfirmation(makeIntake(), makeCalendarResult());

    expect(mockSend).toHaveBeenCalledOnce();
    const callArg = mockSend.mock.calls[0][0] as { userId: string; requestBody: { raw: string } };
    expect(callArg.userId).toBe('me');
  });

  it('encodes a valid RFC 2822 message with correct From / To / Cc / Subject headers', async () => {
    const intake = makeIntake();
    const calendar = makeCalendarResult();

    await sendBookingConfirmation(intake, calendar);

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);

    expect(extractHeader(decoded, 'From')).toBe('Octio <sender@octio.co.za>');
    expect(extractHeader(decoded, 'To')).toBe('client@example.com');
    expect(extractHeader(decoded, 'Cc')).toBe('team@octio.co.za');
    expect(extractHeader(decoded, 'Subject')).toBe(
      'Your Octio discovery call is locked in — Tuesday 15 April at 10:00',
    );
  });

  it('includes the Meet link, slot label, and service name in the HTML body', async () => {
    const intake = makeIntake();
    const calendar = makeCalendarResult();

    await sendBookingConfirmation(intake, calendar);

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);
    const body = extractBody(decoded);

    expect(body).toContain(calendar.meetLink);
    expect(body).toContain(intake.selectedSlot.label);
    expect(body).toContain(intake.selectedService);
  });

  it('returns the message ID from the Gmail API response', async () => {
    const result = await sendBookingConfirmation(makeIntake(), makeCalendarResult());
    expect(result).toBe('msg-123');
  });

  it('truncates a 500-char requirements string to 200 chars + "..." in the body', async () => {
    const longReqs = 'x'.repeat(500);
    const intake = makeIntake({ requirements: longReqs });

    await sendBookingConfirmation(intake, makeCalendarResult());

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);
    const body = extractBody(decoded);

    // The first 200 x's followed by "..." must appear; the 201st char must NOT appear raw
    const truncated = `${'x'.repeat(200)}...`;
    expect(body).toContain(truncated);
    // 500 x's in a row should NOT appear (only 200 were kept)
    expect(body).not.toContain('x'.repeat(201));
  });
});

describe('sendInternalAlert', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it('sends to octioTeamEmail with no Cc header', async () => {
    await sendInternalAlert('HOT LEAD: Jane from Acme', 'She asked about AI agents.');

    expect(mockSend).toHaveBeenCalledOnce();
    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);

    expect(extractHeader(decoded, 'To')).toBe('team@octio.co.za');
    expect(extractHeader(decoded, 'Cc')).toBeUndefined();
  });

  it('includes the provided subject and body in the decoded message', async () => {
    const subject = 'HOT LEAD: Jane from Acme';
    const bodyText = 'She asked about AI agents.';

    await sendInternalAlert(subject, bodyText);

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);
    const body = extractBody(decoded);

    expect(extractHeader(decoded, 'Subject')).toBe(subject);
    expect(body).toContain(bodyText);
  });
});

describe('sendResourceEmail', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it('uses the correct subject for the "ai-agents" topic', async () => {
    await sendResourceEmail('lead@example.com', 'ai-agents');

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);

    expect(extractHeader(decoded, 'Subject')).toBe(
      'AI Agents & Automation — How We Build Intelligence',
    );
  });

  it('falls back to the default subject for an unknown topic', async () => {
    await sendResourceEmail('lead@example.com', 'quantum-computing');

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);

    expect(extractHeader(decoded, 'Subject')).toBe('Learn More About Octio');
  });
});

describe('XSS escaping in HTML email bodies', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it('escapes <script> tags in contact name so raw HTML is never injected', async () => {
    const xssName = "<script>alert('xss')</script>";
    const intake = makeIntake({
      contact: { email: 'client@example.com', name: xssName, company: 'Acme' },
    });

    await sendBookingConfirmation(intake, makeCalendarResult());

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);
    const body = extractBody(decoded);

    // The escaped form must appear in the body
    expect(body).toContain('&lt;script&gt;');
    // The raw tag must NOT appear
    expect(body).not.toContain('<script>');
  });

  it('escapes HTML in internal alert body', async () => {
    const xssBody = '<img src=x onerror="alert(1)">';

    await sendInternalAlert('Test', xssBody);

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);
    const body = extractBody(decoded);

    expect(body).toContain('&lt;img');
    expect(body).not.toContain('<img');
  });
});

describe('UTF-8 encoding of headers and body (mojibake prevention)', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it('RFC 2047 encodes subject containing em dash and middle dot', async () => {
    const intake = makeIntake({
      selectedSlot: { label: 'Tue 14 Apr · 10:00 AM' },
    });

    await sendBookingConfirmation(intake, makeCalendarResult());

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);

    // The raw Subject header must be in RFC 2047 encoded-word format
    const lines = decoded.split('\r\n');
    const rawSubject = lines.find((l) => l.startsWith('Subject: '))?.slice('Subject: '.length);
    expect(rawSubject).toMatch(/^=\?UTF-8\?B\?.+\?=$/);

    // When decoded, the subject must contain the original non-ASCII characters
    expect(extractHeader(decoded, 'Subject')).toBe(
      'Your Octio discovery call is locked in — Tue 14 Apr · 10:00 AM',
    );
  });

  it('pure ASCII subject is not RFC 2047 encoded (stays readable)', async () => {
    await sendInternalAlert('HOT LEAD: Jane', 'Body text');

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);
    const lines = decoded.split('\r\n');
    const rawSubject = lines.find((l) => l.startsWith('Subject: '))?.slice('Subject: '.length);

    // ASCII subjects pass through unchanged — no encoded-word wrapping
    expect(rawSubject).toBe('HOT LEAD: Jane');
  });

  it('body is base64-encoded with Content-Transfer-Encoding: base64 header', async () => {
    await sendBookingConfirmation(makeIntake(), makeCalendarResult());

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);

    expect(decoded).toContain('Content-Transfer-Encoding: base64');
    expect(decoded).toContain('Content-Type: text/html; charset=utf-8');
  });

  it('non-ASCII characters in body survive the base64 round trip', async () => {
    const intake = makeIntake({
      requirements: 'Need AI agents — urgent · high priority · ZAR R500k+',
      selectedSlot: { label: 'Wed 15 Apr · 14:00' },
    });

    await sendBookingConfirmation(intake, makeCalendarResult());

    const { raw } = (mockSend.mock.calls[0][0] as { requestBody: { raw: string } }).requestBody;
    const decoded = decodeRawMessage(raw);
    const body = extractBody(decoded);

    // Original UTF-8 characters must round-trip correctly — no mojibake
    expect(body).toContain('—');
    expect(body).toContain('·');
    expect(body).toContain('Wed 15 Apr · 14:00');
    expect(body).not.toContain('Ã¢'); // The mojibake signature
  });
});

describe('Gmail API error propagation', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it('propagates Gmail API errors without swallowing them', async () => {
    mockSend.mockRejectedValueOnce(new Error('Gmail API 401 Unauthorized'));

    await expect(
      sendInternalAlert('Test subject', 'Test body'),
    ).rejects.toThrow('Gmail API 401 Unauthorized');
  });
});
