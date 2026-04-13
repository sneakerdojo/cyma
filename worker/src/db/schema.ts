import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// ── contacts ──────────────────────────────────────────────────────────────────
// Central CRM record. Created on first wizard submission.
// email is nullable because anonymous freechat sessions can create a stub
// contact before the user provides their email.
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(),
  name: text('name'),
  company: text('company'),
  phone: text('phone'),
  country: text('country').default('ZA'),
  source: text('source'), // e.g. 'website-wizard' | 'freechat'
  tags: text('tags').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── bookings ──────────────────────────────────────────────────────────────────
// One booking per wizard submission. Links a contact to a scheduled slot
// and stores all Google Calendar / Meet artefacts.
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id').references(() => contacts.id),
    intakeJson: jsonb('intake_json'),
    voiceNotePath: text('voice_note_path'),
    attachmentPath: text('attachment_path'),
    slotStartAt: timestamp('slot_start_at', { withTimezone: true }),
    googleCalendarEventId: text('google_calendar_event_id'),
    googleMeetLink: text('google_meet_link'),
    googleCalendarLink: text('google_calendar_link'),
    emailSent: boolean('email_sent').default(false),
    olsScoreAtBooking: integer('ols_score_at_booking'),
    status: text('status').default('pending'), // 'pending' | 'confirmed' | 'cancelled'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('bookings_contact_id_created_at_idx').on(
      table.contactId,
      table.createdAt,
    ),
    index('bookings_status_idx').on(table.status),
  ],
);

// ── conversations ─────────────────────────────────────────────────────────────
// Each freechat session maps to one conversation.
// bookingId is nullable — freechat can exist without a booking in future.
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id').references(() => contacts.id),
    bookingId: uuid('booking_id').references(() => bookings.id),
    sessionId: text('session_id'),
    status: text('status').default('active'), // 'active' | 'ended'
    olsScore: integer('ols_score').default(0),
    outcome: text('outcome'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [index('conversations_status_idx').on(table.status)],
);

// ── messages ──────────────────────────────────────────────────────────────────
// Individual turns within a conversation.
// onDelete: 'cascade' so deleting a conversation purges its messages (POPIA).
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull(), // 'user' | 'assistant' | 'tool'
    content: text('content'),
    toolCalls: jsonb('tool_calls'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('messages_conversation_id_created_at_idx').on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

// ── lead_scores ───────────────────────────────────────────────────────────────
// Append-only scoring ledger. Each row is one score event for one dimension.
// source distinguishes wizard (programmatic) from agent (LLM-evaluated).
export const leadScores = pgTable('lead_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id),
  bookingId: uuid('booking_id').references(() => bookings.id),
  dimension: text('dimension'),
  points: integer('points'),
  reason: text('reason'),
  source: text('source'), // 'wizard' | 'agent'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── appointments ──────────────────────────────────────────────────────────────
// Tracks the calendar appointment lifecycle independently of the booking record.
// calBookingId stores the Google Calendar event ID for external reference.
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id),
  bookingId: uuid('booking_id').references(() => bookings.id),
  calBookingId: text('cal_booking_id'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  status: text('status').default('booked'), // 'booked' | 'rescheduled' | 'cancelled'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── consent_events ────────────────────────────────────────────────────────────
// POPIA compliance audit trail. Append-only — never update or delete rows.
// Captures grant / revoke / deletion requests with IP and UA for audit.
export const consentEvents = pgTable('consent_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id),
  eventType: text('event_type').notNull(), // 'granted' | 'revoked' | 'deleted'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
