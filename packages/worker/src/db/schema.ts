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

// ── emails_sent ──────────────────────────────────────────────────────────────
// Tracks outbound automated emails to prevent duplicate sends.
// Each row = one email sent. Append-only — never update or delete rows.
export const emailsSent = pgTable(
  'emails_sent',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactEmail: text('contact_email').notNull(),
    emailType: text('email_type').notNull(), // 'abandonment_recovery' | 'prep' | 'reminder' | 'feedback'
    sessionId: text('session_id'),
    bookingId: uuid('booking_id'),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('emails_sent_contact_email_type_idx').on(table.contactEmail, table.emailType),
    index('emails_sent_booking_id_idx').on(table.bookingId),
  ],
);

// ── conversation_events ──────────────────────────────────────────────────────
// Step-level analytics for funnel tracking. Each row records a single event
// (step_view, step_answer, step_skip, session_start, session_complete).
// Append-only — never update or delete rows.
export const conversationEvents = pgTable(
  'conversation_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull(),
    stepId: text('step_id'),
    action: text('action').notNull(), // 'session_start' | 'step_view' | 'step_answer' | 'step_skip' | 'session_complete'
    value: text('value'), // e.g. the selected option or typed text (truncated for privacy)
    metadata: jsonb('metadata'), // optional extra context (entryPath, referrerPath, etc.)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('conversation_events_session_id_idx').on(table.sessionId),
    index('conversation_events_action_idx').on(table.action),
    index('conversation_events_created_at_idx').on(table.createdAt),
  ],
);

// ── ab_test_assignments ──────────────────────────────────────────────────────
// Tracks which A/B test variant a session was assigned to.
// One row per session per test. Append-only — never reassign variants.
export const abTestAssignments = pgTable(
  'ab_test_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull(),
    testName: text('test_name').notNull(), // e.g. 'step_0_wording'
    variant: text('variant').notNull(), // e.g. 'A' or 'B'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('ab_test_session_test_idx').on(table.sessionId, table.testName),
  ],
);

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

// ─────────────────────────────────────────────────────────────────────────────
// Profile system
// ─────────────────────────────────────────────────────────────────────────────
// Per-tenant persistent profiles of people who interact with our agents
// (chat visitors, voice callers). See docs/superpowers/specs/2026-05-13-
// profile-system.md for the full design.
//
// All profile tables carry `tenant_id` (default 1 = Octio Patient Zero).
// Cross-tenant data sharing is explicitly disallowed by the spec.
//
// PII handling note for v1 (single-tenant):
//   - value_hash columns are SHA-256(kind:normalised value), used for lookup
//   - value columns store the raw value
//   - HARDENING TODO before any second tenant is onboarded: enable pgcrypto
//     column encryption on value columns or move to envelope-encrypted JSONB
//
// pgvector for semantic recall is deferred to v2 — v1 uses the summary text
// only. profile_embeddings table is not created here.

// ── profiles ──────────────────────────────────────────────────────────────────
// Root entity. One row per recognised person per tenant.
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: integer('tenant_id').notNull().default(1),
    displayName: text('display_name'),
    // Pre-summarised compact context (~300 tokens max). Regenerated nightly.
    // Injected into the consuming agent's system prompt at session start.
    summary: text('summary'),
    // Channel preference inferred from facts or explicitly stated.
    preferredChannel: text('preferred_channel'), // 'chat' | 'voice' | 'whatsapp' | 'email' | null
    identityConfidence: text('identity_confidence'), // numeric stored as text for portability; 0.00–1.00
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
    summaryUpdatedAt: timestamp('summary_updated_at', { withTimezone: true }),
  },
  (table) => [
    index('profiles_tenant_id_last_seen_at_idx').on(
      table.tenantId,
      table.lastSeenAt,
    ),
  ],
);

// ── profile_identifiers ───────────────────────────────────────────────────────
// One profile can have multiple identifiers (phone, email, whatsapp, name_hint).
// Lookup is by (tenant_id, kind, value_hash).
export const profileIdentifiers = pgTable(
  'profile_identifiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    tenantId: integer('tenant_id').notNull().default(1),
    kind: text('kind').notNull(), // 'phone' | 'email' | 'whatsapp' | 'name_hint'
    valueHash: text('value_hash').notNull(), // SHA-256(kind:normalised value)
    value: text('value').notNull(), // raw value (see HARDENING TODO above)
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
    supersededAt: timestamp('superseded_at', { withTimezone: true }),
  },
  (table) => [
    index('profile_identifiers_lookup_idx').on(
      table.tenantId,
      table.kind,
      table.valueHash,
    ),
    index('profile_identifiers_profile_id_idx').on(table.profileId),
  ],
);

// ── profile_facts ─────────────────────────────────────────────────────────────
// Per-fact category drives per-category retention TTL:
//   sensitive  → 90 days
//   off_topic  → 12 months
//   personal / preference / history / service_context → matches profile root
export const profileFacts = pgTable(
  'profile_facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    tenantId: integer('tenant_id').notNull().default(1),
    category: text('category').notNull(), // 'preference'|'history'|'service_context'|'personal'|'off_topic'|'sensitive'
    key: text('key').notNull(),
    value: jsonb('value'),
    source: text('source').notNull(), // 'agent_inferred'|'user_stated'|'system_recorded'
    confidence: text('confidence').notNull().default('1.0'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('profile_facts_profile_id_category_idx').on(
      table.profileId,
      table.category,
    ),
    index('profile_facts_tenant_expires_idx').on(
      table.tenantId,
      table.expiresAt,
    ),
  ],
);

// ── profile_consent ───────────────────────────────────────────────────────────
// Audit trail of consent grants + revocations.
// consent_text_hash captures the exact text shown for compliance evidence.
export const profileConsent = pgTable(
  'profile_consent',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    tenantId: integer('tenant_id').notNull().default(1),
    granted: boolean('granted').notNull(),
    channel: text('channel').notNull(), // 'chat' | 'voice'
    consentTextHash: text('consent_text_hash').notNull(),
    // For voice consent we capture the transcript snippet that contained the response.
    transcriptSnippet: text('transcript_snippet'),
    // Audit metadata
    ipOrCallerIdHash: text('ip_or_caller_id_hash'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    index('profile_consent_profile_idx').on(table.profileId),
  ],
);

// ── profile_audit_log ─────────────────────────────────────────────────────────
// Append-only audit log for every profile read/write/consent/export/deletion.
// PII is hashed before logging (raw values never appear here).
export const profileAuditLog = pgTable(
  'profile_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: integer('tenant_id').notNull().default(1),
    actor: text('actor').notNull(), // 'system:bot' | 'operator:<email>' | 'system:cron' | etc.
    action: text('action').notNull(), // 'lookup'|'extend'|'consent'|'forget'|'export'|'auto_purge'
    targetProfileId: uuid('target_profile_id'),
    targetHash: text('target_hash'), // sha256 of profile_id or identifier — never raw
    metadata: jsonb('metadata'), // free-form; should not contain raw PII
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('profile_audit_tenant_action_idx').on(
      table.tenantId,
      table.action,
      table.createdAt,
    ),
  ],
);
