import { google } from 'googleapis';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getOAuth2Client } from './google-auth.js';
import { escapeHtml } from '../utils/html-escape.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CalendarEventResult {
  eventId: string;
  meetLink: string;
  calendarLink: string;
}

export interface AvailableSlot {
  /** ISO datetime string, e.g. "2026-04-14T09:00:00+02:00" */
  start: string;
  /** ISO datetime string, e.g. "2026-04-14T09:30:00+02:00" */
  end: string;
  /** Human-readable label, e.g. "Mon 14 Apr · 9:00 AM" */
  label: string;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** SAST is permanently UTC+2 — South Africa does not observe DST. */
const SAST_OFFSET_MINUTES = 2 * 60; // 120
const SAST_OFFSET_STRING = '+02:00';
const SLOT_DURATION_MINUTES = 30;
const DEFAULT_BUSINESS_DAYS = 5;

/** Fixed time slots offered to prospects, in 24-hour "HH:MM" format (SAST). */
const OFFERING_TIMES = ['09:00', '11:00', '14:00', '16:00'] as const;

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Convert the wizard's `OctoTimeSlot` slot id into a full ISO datetime string
 * with explicit SAST offset.
 *
 * The frontend generates ids as:
 *   `${day.toISOString()}-${time}`
 * where `day` is a Date object at the start of a business day (local midnight,
 * serialised to UTC via toISOString) and `time` is "HH:MM" (24 h).
 *
 * Example input : "2026-04-14T22:00:00.000Z-09:00"
 * Example output: "2026-04-14T09:00:00+02:00"
 *
 * Because SAST is always UTC+2 and South Africa has no DST we apply a fixed
 * +02:00 offset instead of relying on Intl.DateTimeFormat (which can disagree
 * with how the Google Calendar API interprets the Africa/Johannesburg timezone).
 */
export function parseSlotToISO(selectedSlot: {
  id: string;
  time: string;
}): string {
  const { id, time } = selectedSlot;

  // The id ends with "-HH:MM". Split at the last "-" to separate the ISO date
  // portion from the time component.
  const lastDashIndex = id.lastIndexOf('-');
  if (lastDashIndex === -1) {
    throw new Error(`Invalid slot id format (no dash found): "${id}"`);
  }

  const isoDatePart = id.slice(0, lastDashIndex); // e.g. "2026-04-14T22:00:00.000Z"

  // Parse the UTC date from the ISO portion.
  const utcDate = new Date(isoDatePart);
  if (isNaN(utcDate.getTime())) {
    throw new Error(`Invalid slot id: could not parse UTC date from "${isoDatePart}"`);
  }

  // Convert to SAST by adding the fixed offset, then extract the calendar date
  // in SAST. We add the offset to the UTC time to get "local" milliseconds, then
  // derive the year/month/day.
  const sastMs = utcDate.getTime() + SAST_OFFSET_MINUTES * 60 * 1000;
  const sastDate = new Date(sastMs);

  const year = sastDate.getUTCFullYear();
  const month = String(sastDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(sastDate.getUTCDate()).padStart(2, '0');

  // Validate and use the time component from the slot
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error(`Invalid slot time format: "${time}"`);
  }

  return `${year}-${month}-${day}T${time}:00${SAST_OFFSET_STRING}`;
}

// ---------------------------------------------------------------------------
// Description builder
// ---------------------------------------------------------------------------

function buildEventDescription(intake: {
  contact: { email: string; name: string; company?: string };
  selectedService: string;
  budget: string;
  requirements: string;
  voiceNoteUrl?: string;
  attachmentUrl?: string;
}): string {
  // Google Calendar renders HTML in event descriptions. We escape user-
  // controlled strings (XSS hardening) and use simple <b> / <br> / <hr> tags
  // that all calendar clients (Google, Outlook, Apple Mail, iOS Calendar)
  // render consistently in the event detail view.
  const safeService = escapeHtml(intake.selectedService);
  const safeBudget = escapeHtml(intake.budget);
  const safeCompany = intake.contact.company
    ? escapeHtml(intake.contact.company)
    : '(not provided)';
  const safeRequirements = escapeHtml(intake.requirements);

  const lines: string[] = [
    'Thanks for booking a discovery call with Octio. We\'re looking forward to speaking with you.',
    '',
    '<b>What to expect on the call</b>',
    '• We\'ll discuss your project in detail',
    '• We\'ll explore the best approach for your needs',
    '• No commitment — just a conversation',
    '',
    '<b>Your booking recap</b>',
    `<b>Service of interest:</b> ${safeService}`,
    `<b>Budget range:</b> ${safeBudget}`,
    `<b>Company:</b> ${safeCompany}`,
    '',
    '<b>What you told us</b>',
    safeRequirements,
  ];

  if (intake.voiceNoteUrl) {
    lines.push('', `<b>Voice note:</b> ${intake.voiceNoteUrl}`);
  }

  if (intake.attachmentUrl) {
    lines.push(`<b>Attachment:</b> ${intake.attachmentUrl}`);
  }

  lines.push(
    '',
    '---',
    'Questions before the call? Reply to the calendar invite or reach us at hello@octio.co.za',
    '',
    'This event was auto-generated by the Octio booking agent.',
  );

  return lines.join('\n').trim();
}

// ---------------------------------------------------------------------------
// Date / label helpers
// ---------------------------------------------------------------------------

function formatDateLabel(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  // date is a Date whose UTC fields correspond to the SAST calendar date
  return `${days[date.getUTCDay()]} ${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
}

function formatTimeLabel(time: string): string {
  const [h] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:00 ${ampm}`;
}

/**
 * Build a SAST ISO datetime string for a given SAST calendar date + HH:MM time.
 *
 * @param sastDateUtc - A Date whose UTC fields represent the SAST calendar date
 *                      (i.e. it was constructed by adding +02:00 offset to UTC).
 * @param time        - "HH:MM" in SAST.
 */
function buildSastISO(sastDateUtc: Date, time: string): string {
  const year = sastDateUtc.getUTCFullYear();
  const month = String(sastDateUtc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(sastDateUtc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}T${time}:00${SAST_OFFSET_STRING}`;
}

/**
 * Add SLOT_DURATION_MINUTES to an ISO datetime string and return the new ISO string.
 */
function addMinutes(isoDatetime: string, minutes: number): string {
  const ms = new Date(isoDatetime).getTime() + minutes * 60 * 1000;
  const end = new Date(ms);
  // Reconstruct with the same SAST offset — getTime() gave us absolute UTC ms,
  // so we add the offset back to get SAST fields.
  const sastMs = end.getTime() + SAST_OFFSET_MINUTES * 60 * 1000;
  const sastEnd = new Date(sastMs);
  const year = sastEnd.getUTCFullYear();
  const month = String(sastEnd.getUTCMonth() + 1).padStart(2, '0');
  const day = String(sastEnd.getUTCDate()).padStart(2, '0');
  const hour = String(sastEnd.getUTCHours()).padStart(2, '0');
  const minute = String(sastEnd.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:00${SAST_OFFSET_STRING}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a 30-minute Google Calendar discovery call event with a Google Meet
 * link and invites both the client and the Octio team.
 */
export async function createDiscoveryCallEvent(intake: {
  contact: { email: string; name: string; company?: string };
  selectedSlot: { id: string; dateLabel: string; time: string; label: string };
  selectedService: string;
  budget: string;
  requirements: string;
  voiceNoteUrl?: string;
  attachmentUrl?: string;
}): Promise<CalendarEventResult> {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });

  const startDateTime = parseSlotToISO(intake.selectedSlot);
  const endDateTime = addMinutes(startDateTime, SLOT_DURATION_MINUTES);

  const attendees: Array<{ email: string; displayName?: string }> = [
    { email: intake.contact.email, displayName: intake.contact.name },
  ];

  if (config.octioTeamEmail) {
    attendees.push({ email: config.octioTeamEmail });
  }

  const requestBody = {
    summary: `Octio Discovery Call — ${intake.contact.company || intake.contact.name}`,
    description: buildEventDescription(intake),
    start: {
      dateTime: startDateTime,
      timeZone: 'Africa/Johannesburg',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Africa/Johannesburg',
    },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: `octio-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 1440 }, // 24 hours
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  logger.info(
    { slot: intake.selectedSlot.label, attendees: attendees.map((a) => a.email) },
    'inserting calendar event',
  );

  // Write to the team booking calendar when configured. Otherwise fall back
  // to the OAuth-owner's primary calendar (single-user mode).
  const calendarId = config.bookingCalendarId || 'primary';

  const result = await calendar.events.insert({
    calendarId,
    requestBody,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });

  const eventId = result.data.id;
  const meetLink = result.data.hangoutLink;
  const calendarLink = result.data.htmlLink;

  if (!eventId || !meetLink || !calendarLink) {
    throw new Error(
      'Google Calendar API returned an incomplete response — missing eventId, meetLink, or calendarLink',
    );
  }

  logger.info({ eventId, meetLink }, 'calendar event created');

  return { eventId, meetLink, calendarLink };
}

/**
 * Returns available 30-minute slots for the next N business days (Mon–Fri).
 *
 * Slots are generated at fixed SAST times: 09:00, 11:00, 14:00, 16:00.
 * Slots that overlap with busy periods from the freebusy API are excluded.
 */
export async function getAvailabilityForNextBusinessDays(
  days: number = DEFAULT_BUSINESS_DAYS,
): Promise<AvailableSlot[]> {
  // Build the list of next N business days as SAST calendar dates.
  // We represent each day as a Date whose UTC fields equal the SAST date fields.
  const businessDays: Date[] = [];
  const nowUtcMs = Date.now();
  // "Tomorrow" in SAST: advance by 1 day and floor to SAST midnight.
  // We work in SAST-ms space (UTC ms + 2h offset).
  const nowSastMs = nowUtcMs + SAST_OFFSET_MINUTES * 60 * 1000;
  const nowSastDate = new Date(nowSastMs);

  // Start from tomorrow's SAST date
  const startSast = new Date(
    Date.UTC(
      nowSastDate.getUTCFullYear(),
      nowSastDate.getUTCMonth(),
      nowSastDate.getUTCDate() + 1, // +1 = tomorrow
    ),
  );

  const cursor = new Date(startSast);
  while (businessDays.length < days) {
    const dayOfWeek = cursor.getUTCDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Determine the full time range to query
  // timeMin = first slot start, timeMax = last day last slot end + duration
  const firstSlotStart = buildSastISO(businessDays[0], OFFERING_TIMES[0]);
  const lastDay = businessDays[businessDays.length - 1];
  const lastSlotEnd = addMinutes(
    buildSastISO(lastDay, OFFERING_TIMES[OFFERING_TIMES.length - 1]),
    SLOT_DURATION_MINUTES,
  );

  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });

  // Free/busy is checked against the team booking calendar when configured,
  // so availability reflects what's already booked across the whole team.
  // Falls back to the OAuth-owner's primary calendar in single-user mode.
  const calendarId = config.bookingCalendarId || 'primary';

  const freebusyResponse = await calendar.freebusy.query({
    requestBody: {
      timeMin: firstSlotStart,
      timeMax: lastSlotEnd,
      items: [{ id: calendarId }],
    },
  });

  const busyPeriods: Array<{ startMs: number; endMs: number }> =
    (freebusyResponse.data.calendars?.[calendarId]?.busy ?? []).map((b) => ({
      startMs: new Date(b.start!).getTime(),
      endMs: new Date(b.end!).getTime(),
    }));

  logger.info({ busyCount: busyPeriods.length }, 'fetched freebusy data');

  // Generate all candidate slots and filter out those that overlap busy periods.
  const availableSlots: AvailableSlot[] = [];

  for (const day of businessDays) {
    const dateLabel = formatDateLabel(day);

    for (const time of OFFERING_TIMES) {
      const slotStart = buildSastISO(day, time);
      const slotEnd = addMinutes(slotStart, SLOT_DURATION_MINUTES);

      const slotStartMs = new Date(slotStart).getTime();
      const slotEndMs = new Date(slotEnd).getTime();

      const isBusy = busyPeriods.some(
        (busy) => slotStartMs < busy.endMs && slotEndMs > busy.startMs,
      );

      if (!isBusy) {
        availableSlots.push({
          start: slotStart,
          end: slotEnd,
          label: `${dateLabel} · ${formatTimeLabel(time)}`,
        });
      }
    }
  }

  return availableSlots;
}
