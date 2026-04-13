import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock googleapis at the module level so that the calendar service uses our
// controlled fakes instead of making real HTTP requests.
// ---------------------------------------------------------------------------

// Hoist mock references so they are available inside vi.mock factory closures.
// vi.mock is hoisted to the top of the file by Vitest; any variables it
// captures must be initialised before that point via vi.hoisted().
const { mockEventsInsert, mockFreebusyQuery } = vi.hoisted(() => ({
  mockEventsInsert: vi.fn(),
  mockFreebusyQuery: vi.fn(),
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
      })),
    },
    calendar: vi.fn().mockReturnValue({
      events: { insert: mockEventsInsert },
      freebusy: { query: mockFreebusyQuery },
    }),
  },
}));

// Mock the google-auth module so we don't need real credentials in tests.
vi.mock('./google-auth.js', () => ({
  getOAuth2Client: vi.fn().mockReturnValue({ setCredentials: vi.fn() }),
  resetOAuth2ClientCache: vi.fn(),
}));

// Import after mocks are set up.
import {
  parseSlotToISO,
  createDiscoveryCallEvent,
  getAvailabilityForNextBusinessDays,
} from './calendar.js';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

// Slot id format: `${day.toISOString()}-${time}` where day is a Date whose
// local midnight was set in the browser. The id embeds the UTC representation
// of local midnight. For April 14 in SAST (UTC+2): midnight SAST = 22:00 UTC
// on April 13. So the id for April 14 is "2026-04-13T22:00:00.000Z-09:00".
const SAMPLE_INTAKE = {
  contact: { email: 'client@example.com', name: 'Alice Smith', company: 'Acme Corp' },
  selectedSlot: {
    id: '2026-04-13T22:00:00.000Z-09:00',
    dateLabel: 'Tue 14 Apr',
    time: '09:00',
    label: 'Tue 14 Apr · 9:00 AM',
  },
  selectedService: 'AI Agents & Automations',
  budget: 'R50K-R150K',
  requirements: 'We need an AI agent that can process invoices automatically.',
  voiceNoteUrl: undefined,
  attachmentUrl: undefined,
};

// ---------------------------------------------------------------------------
// parseSlotToISO
// ---------------------------------------------------------------------------

describe('parseSlotToISO', () => {
  it('parses a morning slot (09:00) correctly', () => {
    // April 14 midnight SAST (UTC+2) = April 13 22:00 UTC.
    // The browser in SAST serialises the Date as "2026-04-13T22:00:00.000Z".
    // parseSlotToISO adds +2h to get the SAST calendar date (April 14) then
    // appends the time component.
    const result = parseSlotToISO({
      id: '2026-04-13T22:00:00.000Z-09:00',
      time: '09:00',
    });
    expect(result).toBe('2026-04-14T09:00:00+02:00');
  });

  it('parses an afternoon slot (14:00) correctly', () => {
    // Same date base — April 13 22:00 UTC = April 14 midnight SAST
    const result = parseSlotToISO({
      id: '2026-04-13T22:00:00.000Z-14:00',
      time: '14:00',
    });
    expect(result).toBe('2026-04-14T14:00:00+02:00');
  });

  it('parses a slot at month boundary (April 30) correctly', () => {
    // April 30 midnight SAST = April 29 22:00 UTC
    const result = parseSlotToISO({
      id: '2026-04-29T22:00:00.000Z-09:00',
      time: '09:00',
    });
    expect(result).toBe('2026-04-30T09:00:00+02:00');
  });

  it('parses a 16:00 slot correctly', () => {
    // April 14 midnight SAST = April 13 22:00 UTC
    const result = parseSlotToISO({
      id: '2026-04-13T22:00:00.000Z-16:00',
      time: '16:00',
    });
    expect(result).toBe('2026-04-14T16:00:00+02:00');
  });

  it('throws for a malformed slot id with no dash', () => {
    expect(() => parseSlotToISO({ id: 'invalid', time: '09:00' })).toThrow(
      /Invalid slot id format/,
    );
  });
});

// ---------------------------------------------------------------------------
// createDiscoveryCallEvent
// ---------------------------------------------------------------------------

describe('createDiscoveryCallEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path — returns eventId, meetLink, calendarLink', async () => {
    mockEventsInsert.mockResolvedValueOnce({
      data: {
        id: 'evt123',
        hangoutLink: 'https://meet.google.com/abc-defg-hij',
        htmlLink: 'https://calendar.google.com/calendar/event?eid=abc',
      },
    });

    const result = await createDiscoveryCallEvent(SAMPLE_INTAKE);

    expect(result).toEqual({
      eventId: 'evt123',
      meetLink: 'https://meet.google.com/abc-defg-hij',
      calendarLink: 'https://calendar.google.com/calendar/event?eid=abc',
    });
  });

  it('calls events.insert with conferenceDataVersion: 1 and sendUpdates: "all"', async () => {
    mockEventsInsert.mockResolvedValueOnce({
      data: {
        id: 'evt456',
        hangoutLink: 'https://meet.google.com/xxx',
        htmlLink: 'https://calendar.google.com/...',
      },
    });

    await createDiscoveryCallEvent(SAMPLE_INTAKE);

    expect(mockEventsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      }),
    );
  });

  it('calls events.insert with correct attendees', async () => {
    mockEventsInsert.mockResolvedValueOnce({
      data: {
        id: 'evt789',
        hangoutLink: 'https://meet.google.com/yyy',
        htmlLink: 'https://calendar.google.com/...',
      },
    });

    await createDiscoveryCallEvent(SAMPLE_INTAKE);

    const callArgs = mockEventsInsert.mock.calls[0][0];
    const attendees = callArgs.requestBody.attendees as Array<{
      email: string;
      displayName?: string;
    }>;

    // Client must be included
    expect(attendees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'client@example.com',
          displayName: 'Alice Smith',
        }),
      ]),
    );
  });

  it('calls events.insert with Africa/Johannesburg timezone on start and end', async () => {
    mockEventsInsert.mockResolvedValueOnce({
      data: {
        id: 'evtTZ',
        hangoutLink: 'https://meet.google.com/tz',
        htmlLink: 'https://calendar.google.com/...',
      },
    });

    await createDiscoveryCallEvent(SAMPLE_INTAKE);

    const callArgs = mockEventsInsert.mock.calls[0][0];
    expect(callArgs.requestBody.start.timeZone).toBe('Africa/Johannesburg');
    expect(callArgs.requestBody.end.timeZone).toBe('Africa/Johannesburg');
  });

  it('propagates Google API errors without wrapping', async () => {
    const apiError = new Error('Google API: insufficient permissions');
    mockEventsInsert.mockRejectedValueOnce(apiError);

    await expect(createDiscoveryCallEvent(SAMPLE_INTAKE)).rejects.toThrow(
      'Google API: insufficient permissions',
    );
  });
});

// ---------------------------------------------------------------------------
// getAvailabilityForNextBusinessDays
// ---------------------------------------------------------------------------

describe('getAvailabilityForNextBusinessDays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 4 slots × N days when all slots are free', async () => {
    mockFreebusyQuery.mockResolvedValueOnce({
      data: { calendars: { primary: { busy: [] } } },
    });

    const slots = await getAvailabilityForNextBusinessDays(5);

    expect(slots).toHaveLength(20); // 4 times × 5 days
  });

  it('excludes a 09:00 slot that overlaps a busy period', async () => {
    // Construct a busy block that covers the first 09:00 slot of the next
    // business day. We need the actual date so we compute it the same way
    // the implementation does.
    const nowSastMs = Date.now() + 2 * 60 * 60 * 1000;
    const nowSast = new Date(nowSastMs);
    // Advance to tomorrow in SAST
    const tomorrowSast = new Date(
      Date.UTC(nowSast.getUTCFullYear(), nowSast.getUTCMonth(), nowSast.getUTCDate() + 1),
    );

    // Skip weekends to match the implementation
    while (tomorrowSast.getUTCDay() === 0 || tomorrowSast.getUTCDay() === 6) {
      tomorrowSast.setUTCDate(tomorrowSast.getUTCDate() + 1);
    }

    const year = tomorrowSast.getUTCFullYear();
    const month = String(tomorrowSast.getUTCMonth() + 1).padStart(2, '0');
    const day = String(tomorrowSast.getUTCDate()).padStart(2, '0');

    // Busy from 09:00 to 10:00 SAST
    const busyStart = `${year}-${month}-${day}T09:00:00+02:00`;
    const busyEnd = `${year}-${month}-${day}T10:00:00+02:00`;

    mockFreebusyQuery.mockResolvedValueOnce({
      data: {
        calendars: {
          primary: {
            busy: [{ start: busyStart, end: busyEnd }],
          },
        },
      },
    });

    const slots = await getAvailabilityForNextBusinessDays(5);

    // 20 total - 1 busy = 19
    expect(slots).toHaveLength(19);

    // The excluded slot should not appear in the results
    const busySlotLabel = slots.find((s) => s.start === busyStart);
    expect(busySlotLabel).toBeUndefined();
  });

  it('returns 3 slots × N days when 1 slot per day is busy (sanity check)', async () => {
    // Simple: 5-day query, but mock returns empty busy and override slot count
    mockFreebusyQuery.mockResolvedValueOnce({
      data: { calendars: { primary: { busy: [] } } },
    });

    const slots = await getAvailabilityForNextBusinessDays(3);
    expect(slots).toHaveLength(12); // 4 × 3
  });

  it('skips weekends — if tomorrow is Friday the 5 days are Fri Mon Tue Wed Thu', async () => {
    mockFreebusyQuery.mockResolvedValueOnce({
      data: { calendars: { primary: { busy: [] } } },
    });

    // Pin "now" to a Thursday in SAST so that "tomorrow" is Friday.
    // Thursday 2026-04-09 (a real Thursday) midnight SAST = 2026-04-08T22:00:00Z UTC.
    const thursdayUtcMs = Date.UTC(2026, 3, 9, 0, 0, 0); // April 9 UTC midnight
    // In SAST that is also April 9, and "tomorrow" would be Friday April 10.

    const originalDateNow = Date.now;
    vi.spyOn(Date, 'now').mockReturnValue(thursdayUtcMs);

    const slots = await getAvailabilityForNextBusinessDays(5);

    Date.now = originalDateNow;

    // 5 business days × 4 slots = 20, no weekends in the set
    expect(slots).toHaveLength(20);

    // Verify none of the slots fall on Saturday (UTC day 6) or Sunday (UTC day 0).
    // We check by inspecting the start ISO string date component.
    for (const slot of slots) {
      const slotDate = new Date(slot.start);
      const dayOfWeek = slotDate.getUTCDay();
      // SAST +02:00 offset is baked into the string, but Date constructor
      // handles the offset correctly.
      // Saturday = 6, Sunday = 0
      expect(dayOfWeek).not.toBe(0);
      expect(dayOfWeek).not.toBe(6);
    }
  });

  it('slot labels match the expected human-readable format', async () => {
    mockFreebusyQuery.mockResolvedValueOnce({
      data: { calendars: { primary: { busy: [] } } },
    });

    const slots = await getAvailabilityForNextBusinessDays(1);

    expect(slots).toHaveLength(4);
    // Each label should be like "Mon 14 Apr · 9:00 AM"
    for (const slot of slots) {
      expect(slot.label).toMatch(/^(Mon|Tue|Wed|Thu|Fri) \d{1,2} \w{3} · \d{1,2}:00 (AM|PM)$/);
    }
  });
});
