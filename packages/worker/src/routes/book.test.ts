import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// Hoist all mock references so they are available inside vi.mock closures.
// vi.mock calls are hoisted to the top of the file by Vitest.
// ---------------------------------------------------------------------------

const {
  mockParseBookingMultipart,
  mockSaveVoiceNote,
  mockSaveAttachment,
  mockCreateDiscoveryCallEvent,
  mockParseSlotToISO,
  mockSendInternalAlert,
  mockNotifyLeadsGroup,
  mockAddToOutreachList,
  mockCreateLeadContact,
  mockDbInsert,
  mockDbUpdate,
  mockDbInsertValues,
  mockDbInsertOnConflict,
  mockDbInsertOnConflictReturning,
  mockDbUpdateSet,
  mockDbUpdateWhere,
} = vi.hoisted(() => {
  // Chainable DB mock builders
  const mockDbInsertOnConflictReturning = vi.fn();
  const mockDbInsertOnConflict = vi
    .fn()
    .mockReturnValue({ returning: mockDbInsertOnConflictReturning });
  const mockDbInsertValues = vi.fn().mockReturnValue({
    onConflictDoUpdate: mockDbInsertOnConflict,
    // for plain inserts (leadScores, appointments, consentEvents)
  });
  const mockDbInsert = vi.fn().mockReturnValue({ values: mockDbInsertValues });

  const mockDbUpdateWhere = vi.fn().mockResolvedValue([]);
  const mockDbUpdateSet = vi
    .fn()
    .mockReturnValue({ where: mockDbUpdateWhere });
  const mockDbUpdate = vi.fn().mockReturnValue({ set: mockDbUpdateSet });

  return {
    mockParseBookingMultipart: vi.fn(),
    mockSaveVoiceNote: vi.fn(),
    mockSaveAttachment: vi.fn(),
    mockCreateDiscoveryCallEvent: vi.fn(),
    mockParseSlotToISO: vi.fn().mockReturnValue('2026-04-13T09:00:00+02:00'),
    mockSendInternalAlert: vi.fn().mockResolvedValue('msg-alert'),
    mockNotifyLeadsGroup: vi.fn().mockResolvedValue(undefined),
    mockAddToOutreachList: vi.fn().mockResolvedValue(undefined),
    mockCreateLeadContact: vi.fn().mockResolvedValue(undefined),
    mockDbInsert,
    mockDbUpdate,
    mockDbInsertValues,
    mockDbInsertOnConflict,
    mockDbInsertOnConflictReturning,
    mockDbUpdateSet,
    mockDbUpdateWhere,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../middleware/multipart.js', () => ({
  parseBookingMultipart: mockParseBookingMultipart,
  MissingFieldError: class MissingFieldError extends Error {
    fieldName: string;
    constructor(fieldName: string) {
      super(`Required multipart field "${fieldName}" is missing from the request body.`);
      this.name = 'MissingFieldError';
      this.fieldName = fieldName;
    }
  },
}));

vi.mock('../services/storage.js', () => ({
  saveVoiceNote: mockSaveVoiceNote,
  saveAttachment: mockSaveAttachment,
}));

vi.mock('../services/storage.errors.js', () => ({
  FileTooLargeError: class FileTooLargeError extends Error {
    actualBytes: number;
    maxBytes: number;
    constructor(actualBytes: number, maxBytes: number) {
      super(`File too large: ${actualBytes} bytes exceeds max ${maxBytes} bytes`);
      this.name = 'FileTooLargeError';
      this.actualBytes = actualBytes;
      this.maxBytes = maxBytes;
    }
  },
  InvalidFileTypeError: class InvalidFileTypeError extends Error {
    actualType: string;
    allowedTypes: readonly string[];
    constructor(actualType: string, allowedTypes: readonly string[]) {
      super(`Invalid file type: ${actualType}. Allowed: ${allowedTypes.join(', ')}`);
      this.name = 'InvalidFileTypeError';
      this.actualType = actualType;
      this.allowedTypes = allowedTypes;
    }
  },
}));

vi.mock('../services/calendar.js', () => ({
  createDiscoveryCallEvent: mockCreateDiscoveryCallEvent,
  parseSlotToISO: mockParseSlotToISO,
}));

vi.mock('../services/gmail.js', () => ({
  sendInternalAlert: mockSendInternalAlert,
}));

vi.mock('../services/leads-group.js', () => ({
  notifyLeadsGroup: mockNotifyLeadsGroup,
  addToOutreachList: mockAddToOutreachList,
}));

vi.mock('../services/google-contacts.js', () => ({
  createLeadContact: mockCreateLeadContact,
}));

vi.mock('../db/client.js', () => ({
  db: {
    insert: mockDbInsert,
    update: mockDbUpdate,
  },
}));

vi.mock('../db/schema.js', () => ({
  contacts: { id: 'contacts.id', email: 'contacts.email' },
  bookings: { id: 'bookings.id' },
  leadScores: {},
  appointments: {},
  consentEvents: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockReturnValue('eq-condition'),
}));

vi.mock('../config.js', () => ({
  config: {
    nodeEnv: 'test',
    googleSenderEmail: 'sender@octio.co.za',
    octioTeamEmail: 'team@octio.co.za',
    leadsGroupEmail: 'leads@octio.co.za',
    outreachGroupEmail: 'outreach@octio.co.za',
    uploadDir: '/tmp/uploads',
    uploadPublicUrlBase: 'http://localhost:3000/uploads',
    googleClientId: undefined,
    googleClientSecret: undefined,
    googleRefreshToken: undefined,
    allowedOrigins: ['http://localhost:5173'],
    port: 3000,
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

// ---------------------------------------------------------------------------
// Load route after mocks are registered
// ---------------------------------------------------------------------------

import { bookRoutes } from './book.js';
import { FileTooLargeError, InvalidFileTypeError } from '../services/storage.errors.js';
import { MissingFieldError } from '../middleware/multipart.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const VALID_INTAKE = {
  selectedService: 'AI Agents & Automations' as const,
  budget: 'R500K+' as const,
  requirements: 'Need a full AI booking agent integrated with our CRM',
  contact: { name: 'Alice Smith', email: 'alice@acme.co.za', company: 'Acme Corp' },
  selectedSlot: {
    id: '2026-04-13T00:00:00.000Z-09:00',
    dateLabel: 'Mon 14 Apr',
    time: '09:00',
    label: 'Mon 14 Apr · 9:00 AM',
  },
};

const CAL_RESULT = {
  eventId: 'evt-abc-123',
  meetLink: 'https://meet.google.com/abc-defg-hij',
  calendarLink: 'https://calendar.google.com/event?id=abc',
};

/** Build a Hono test app so we can call app.request() */
function buildApp() {
  const app = new Hono();
  app.route('/api', bookRoutes);
  return app;
}

/** POST /api/book with a JSON-stringified intake in multipart form */
async function postBook(
  app: Hono,
  intakeJson: string = JSON.stringify(VALID_INTAKE),
) {
  return app.request('/api/book', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// DB mock helpers — reset between tests
// ---------------------------------------------------------------------------

function setupHappyDbMocks() {
  // contact upsert returns a contact id
  mockDbInsertOnConflictReturning.mockResolvedValue([{ id: 'contact-uuid' }]);
  // plain inserts (leadScores, appointments, consentEvents) resolve OK
  mockDbInsertValues.mockImplementation(function () {
    // If the call chain continues with onConflictDoUpdate, return that chain
    // Otherwise resolve directly (for bulk inserts)
    return {
      onConflictDoUpdate: mockDbInsertOnConflict,
      // direct .values() resolution used for plain inserts
      then: (resolve: (v: unknown) => void) => resolve([]),
    };
  });
  // booking insert - first call is for bookings row
  mockDbInsert.mockImplementation((table: unknown) => {
    return {
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: mockDbInsertOnConflict,
        returning: vi.fn().mockResolvedValue([{ id: 'booking-uuid' }]),
        // for plain inserts without returning
        then: (resolve: (v: unknown) => void) => resolve([]),
      }),
    };
  });
  mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet });
  mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateWhere });
  mockDbUpdateWhere.mockResolvedValue([]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/book', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();

    // Default happy-path mocks
    mockParseBookingMultipart.mockResolvedValue({
      intake: JSON.stringify(VALID_INTAKE),
      voiceNote: undefined,
      attachment: undefined,
    });

    mockCreateDiscoveryCallEvent.mockResolvedValue(CAL_RESULT);
    mockParseSlotToISO.mockReturnValue('2026-04-13T09:00:00+02:00');
    mockSendInternalAlert.mockResolvedValue('msg-alert');
    mockNotifyLeadsGroup.mockResolvedValue(undefined);
    mockAddToOutreachList.mockResolvedValue(undefined);
    mockCreateLeadContact.mockResolvedValue(undefined);
    mockSaveVoiceNote.mockResolvedValue({ url: 'http://localhost:3000/uploads/2026/04/voice.webm' });
    mockSaveAttachment.mockResolvedValue({ url: 'http://localhost:3000/uploads/2026/04/file.pdf' });

    setupHappyDbMocks();
  });

  // ── Test 1: Happy path — full intake, no files ───────────────────────────
  it('returns 200 with meetLink, calendarLink, scoreBand for valid intake without files', async () => {
    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.meetLink).toBe(CAL_RESULT.meetLink);
    expect(body.calendarLink).toBe(CAL_RESULT.calendarLink);
    expect(body.eventId).toBe(CAL_RESULT.eventId);
    expect(['hot', 'warm', 'cold']).toContain(body.scoreBand);
  });

  // ── Test 2: Happy path — with voice note and attachment ──────────────────
  it('returns 200 when voice note and attachment are present', async () => {
    const mockVoiceFile = {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      type: 'audio/webm',
    };
    const mockAttachFile = {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(2048)),
      type: 'application/pdf',
      name: 'spec.pdf',
    };

    mockParseBookingMultipart.mockResolvedValue({
      intake: JSON.stringify(VALID_INTAKE),
      voiceNote: mockVoiceFile,
      attachment: mockAttachFile,
    });

    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockSaveVoiceNote).toHaveBeenCalledOnce();
    expect(mockSaveAttachment).toHaveBeenCalledOnce();
  });

  // ── Test 3: Missing intake field → 400 ───────────────────────────────────
  it('returns 400 when intake field is missing', async () => {
    const { MissingFieldError: MFE } = await import('../middleware/multipart.js');
    mockParseBookingMultipart.mockRejectedValue(new MFE('intake'));

    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('intake');
  });

  // ── Test 4: Invalid intake JSON → 400 ─────────────────────────────────
  it('returns 400 when intake is invalid JSON', async () => {
    mockParseBookingMultipart.mockResolvedValue({
      intake: 'not-valid-json{{{',
      voiceNote: undefined,
      attachment: undefined,
    });

    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/invalid intake data/i);
  });

  // ── Test 5: Invalid intake schema → 400 ──────────────────────────────────
  it('returns 400 when intake JSON fails schema validation', async () => {
    const badIntake = { ...VALID_INTAKE, budget: 'Way too much' }; // invalid enum
    mockParseBookingMultipart.mockResolvedValue({
      intake: JSON.stringify(badIntake),
      voiceNote: undefined,
      attachment: undefined,
    });

    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/invalid intake data/i);
  });

  // ── Test 6: Voice note too large → 413 ───────────────────────────────────
  it('returns 413 when voice note exceeds size limit', async () => {
    const { FileTooLargeError: FTLE } = await import('../services/storage.errors.js');
    const largeVoiceFile = {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(11 * 1024 * 1024)),
      type: 'audio/webm',
    };

    mockParseBookingMultipart.mockResolvedValue({
      intake: JSON.stringify(VALID_INTAKE),
      voiceNote: largeVoiceFile,
      attachment: undefined,
    });

    mockSaveVoiceNote.mockRejectedValue(
      new FTLE(11 * 1024 * 1024, 10 * 1024 * 1024),
    );

    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(413);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/too large/i);
  });

  // ── Test 7: Invalid file type → 415 ──────────────────────────────────────
  it('returns 415 when voice note has unsupported MIME type', async () => {
    const { InvalidFileTypeError: IFTE } = await import('../services/storage.errors.js');
    const badTypeFile = {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      type: 'video/mp4',
    };

    mockParseBookingMultipart.mockResolvedValue({
      intake: JSON.stringify(VALID_INTAKE),
      voiceNote: badTypeFile,
      attachment: undefined,
    });

    mockSaveVoiceNote.mockRejectedValue(
      new IFTE('video/mp4', ['audio/webm', 'audio/ogg', 'audio/mp4']),
    );

    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(415);
    expect(body.ok).toBe(false);
  });

  // ── Test 8: Calendar API failure → 502 ──────────────────────────────────
  it('returns 502 when Google Calendar API fails and sets booking status to failed', async () => {
    mockCreateDiscoveryCallEvent.mockRejectedValue(
      new Error('Google Calendar API unavailable'),
    );

    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/calendar event/i);
  });

  // ── Test 9: Native Google invite is the only client email ──────────────
  // No custom confirmation email is sent — Google Calendar's `sendUpdates: 'all'`
  // in createDiscoveryCallEvent handles the ICS invite to the client natively.
  // The response must NOT include a `warning` field (that field was tied to
  // the old sendBookingConfirmation flow and has been removed).
  it('returns 200 without a warning field (no custom email is sent)', async () => {
    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.meetLink).toBe(CAL_RESULT.meetLink);
    expect(body.warning).toBeUndefined();
  });

  // ── Test 10: Hot lead triggers internal alert ─────────────────────────────
  it('calls sendInternalAlert for a hot lead (R500K+, company, high-fit service)', async () => {
    // VALID_INTAKE is already: R500K+, company=Acme Corp, service=AI Agents & Automations
    // Timeline is 2026-04-13 from 2026-04-11T12:00Z — ~1.8 days → timeline=4
    // budget=4, timeline=4, clarity=2 (50 chars, no media), fit=4, contact=4 = 18 → hot
    mockParseBookingMultipart.mockResolvedValue({
      intake: JSON.stringify(VALID_INTAKE),
      voiceNote: undefined,
      attachment: undefined,
    });

    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.scoreBand).toBe('hot');
    expect(mockSendInternalAlert).toHaveBeenCalledOnce();
    expect(mockSendInternalAlert.mock.calls[0][0]).toMatch(/HOT LEAD/);
  });

  // ── Test 11: Cold lead does NOT trigger internal alert ───────────────────
  it('does NOT call sendInternalAlert for a cold lead', async () => {
    const coldIntake = {
      ...VALID_INTAKE,
      budget: 'Under R50K' as const,
      selectedService: 'Just Browsing' as const,
      requirements: 'unclear',
      selectedSlot: {
        id: '2026-05-16T00:00:00.000Z-09:00', // ~35 days away
        dateLabel: 'Sat 16 May',
        time: '09:00',
        label: 'Sat 16 May · 9:00 AM',
      },
      contact: { name: 'Bob Brown', email: 'bob@example.com' }, // no company
    };

    mockParseBookingMultipart.mockResolvedValue({
      intake: JSON.stringify(coldIntake),
      voiceNote: undefined,
      attachment: undefined,
    });

    const res = await postBook(app);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.scoreBand).toBe('cold');
    expect(mockSendInternalAlert).not.toHaveBeenCalled();
  });
});
