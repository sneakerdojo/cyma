# Lead Gen — User stories v3 (security + POPIA compliance)

**Source spec:** `docs/superpowers/specs/2026-05-12-lead-gen-superseded.md`
**Iteration:** 3 of 5 — adds security, POPIA compliance, data-handling, audit log. Cumulative.

---

## v1 + v2 stories carried forward

US-LG-001 through US-LG-015 remain in scope. v3 adds the compliance + security layer that must wrap every prior story.

---

## US-LG-016 — POPIA Information Officer consent on first interaction

**As a** website visitor in South Africa
**I want** clear disclosure that my data is being collected and what for
**So that** my engagement constitutes informed consent under POPIA

### Acceptance criteria

**Scenario: First-time visitor sees the greeting**
- **Given** a first-time visitor in SA arrives
- **When** the chat opens with its greeting
- **Then** the chat surfaces a one-line POPIA notice: "By chatting with us you agree to our [Privacy Notice]. We use your info only to respond to you."
- **And** the [Privacy Notice] links to the customer's POPIA-compliant privacy page (must be configured per tenant)
- **And** if the customer has no privacy URL configured, the link points to Octio's generic POPIA notice

**Scenario: Visitor refuses to proceed without reading the privacy notice**
- **Given** the visitor replies "I don't agree" or similar
- **When** the bot detects the refusal
- **Then** the bot does NOT continue qualifying
- **And** ends the session politely without storing PII beyond the session ID + timestamp

---

## US-LG-017 — Per-tenant data isolation (cross-tenant leakage prevention)

**As a** customer business owner
**I want** my visitors' data to NEVER be visible to another customer's tenant
**So that** I can trust Octio with my business pipeline

### Acceptance criteria

**Scenario: Tenant A queries chat sessions**
- **Given** there are sessions for both Tenant A and Tenant B
- **When** Tenant A's dashboard queries `GET /api/chat/sessions`
- **Then** only Tenant A's sessions are returned
- **And** the query is verified to include `WHERE tenant_id = $current` at the SQL level
- **And** any cross-tenant query attempt (forged JWT, IDOR) returns 403, not 200 with wrong data

**Scenario: Embed-widget script tag from Tenant A renders on Tenant B's site**
- **Given** a malicious party copies Tenant A's widget script onto a different domain
- **When** a visitor opens that page
- **Then** the worker validates the origin against the tenant's configured allowed domains
- **And** rejects the session if origin mismatches
- **And** logs the attempt for ops review

---

## US-LG-018 — Data retention policy (30/90/365)

**As a** POPIA Information Officer (founder, today)
**I want** automatic data purging on a published retention schedule
**So that** we don't store PII longer than necessary

### Acceptance criteria

**Scenario: Session transcripts purge after 90 days**
- **Given** a chat session with last-message-timestamp 91 days ago
- **When** the retention cron runs (daily)
- **Then** the message bodies are wiped (set to NULL or "[purged]")
- **And** the session metadata (id, tenant_id, timestamp, outcome) is retained for analytics
- **And** an audit-log row records `action = purge, target = session.id`

**Scenario: Abandoned-session contacts purge after 30 days if no booking**
- **Given** an abandoned session with a captured WhatsApp number, no booking, 31 days old
- **When** the retention cron runs
- **Then** the WhatsApp number is wiped (set to NULL)
- **And** the customer's CRM export reflects the redaction within 24 hours

**Scenario: Booked-customer contacts kept up to 365 days**
- **Given** a session that resulted in a booking + held call
- **When** the retention cron runs
- **Then** the contact is retained 365 days from last interaction
- **And** the customer can request earlier deletion via the customer dashboard

---

## US-LG-019 — Right of access / right to be forgotten (POPIA s.23 + s.24)

**As a** website visitor whose data was captured
**I want** to request all my data, or to have it deleted
**So that** I exercise my POPIA rights

### Acceptance criteria

**Scenario: Visitor emails `privacy@octio.co.za` requesting their data**
- **Given** a visitor submits a Subject Access Request
- **When** the operator triggers the workflow on `octio.co.za/admin/sar`
- **Then** all sessions + messages + WhatsApp threads + audit log entries matching their identifier (WhatsApp number OR email) are exported to a signed-URL ZIP
- **And** the export is delivered within POPIA's 30-day SLA (target: 5 business days)

**Scenario: Visitor requests deletion**
- **Given** a verified SAR-style deletion request
- **When** the operator triggers deletion
- **Then** all rows matching their identifier across `chat_sessions`, `chat_messages`, `whatsapp_threads` are wiped (not just soft-deleted)
- **And** the audit log retains a `deletion_completed` record (without the PII)
- **And** a confirmation email is sent within 24 hours

---

## US-LG-020 — Encryption at rest + in transit

**As a** POPIA Information Officer
**I want** all visitor data encrypted at rest and in transit
**So that** a stolen database backup does not expose PII

### Acceptance criteria

**Scenario: Database backup retrieved and inspected**
- **Given** a backup taken from the live Postgres
- **When** the backup is downloaded
- **Then** sensitive columns (whatsapp_number, email, name, message body) are encrypted with a key not stored alongside the backup
- **And** the backup itself is encrypted at the storage layer (Hetzner volume + offsite S3-compatible)

**Scenario: Worker → Postgres connection**
- **Given** the worker connects to the database
- **When** the connection is initiated
- **Then** TLS is enforced (no fallback to plaintext)
- **And** the certificate chain is validated, not skipped

**Scenario: Worker → external API connections**
- **Given** the worker calls Anthropic / Google Calendar / Meta Cloud API
- **When** any of those calls fire
- **Then** TLS 1.2+ is enforced
- **And** request bodies are never logged in plaintext (only request metadata + sanitised debug fields)

---

## US-LG-021 — Audit log completeness

**As a** POPIA Information Officer
**I want** every action that touches PII recorded with actor + timestamp + reason
**So that** we can answer breach investigations and compliance audits

### Acceptance criteria

**Scenario: Operator views a session in the dashboard**
- **Given** an operator (founder, CS hire) opens a session detail view
- **When** the page renders
- **Then** an audit-log row is written: `actor = operator.email, action = read, target = session.id, ts = now()`
- **And** the audit log is append-only (no UPDATE / DELETE allowed at the DB level for that table)

**Scenario: Bot calls a tool that touches PII**
- **Given** the bot calls `send_whatsapp` with a visitor's number
- **When** the call executes
- **Then** an audit-log row is written: `actor = system:bot, action = send_whatsapp, target = session.id, contact_hash = sha256(number)`
- **And** the raw number is NOT in the audit log (only its hash)

---

## US-LG-022 — Breach-notification readiness (POPIA s.22 + e-portal Apr 2025)

**As a** POPIA Information Officer
**I want** a documented breach-notification playbook + tested e-portal flow
**So that** I can notify the Information Regulator within 72 hours if PII leaks

### Acceptance criteria

**Scenario: Detected breach (e.g. credential leak)**
- **Given** an alert fires (e.g. exposed credential in CI logs)
- **When** the on-call (founder) acknowledges
- **Then** the playbook at `docs/runbooks/breach-notification.md` is opened
- **And** within 72 hours, the Regulator's eServices breach-reporting form is submitted
- **And** affected data subjects (any visitor whose data was at risk) are notified by email or WhatsApp within 72 hours

**Scenario: Rehearsal (quarterly)**
- **Given** the scheduled quarterly breach rehearsal
- **When** the founder runs through the playbook
- **Then** the eServices login works, the form schema is current, and the data-subject contact export still produces a valid CSV

---

## US-LG-023 — Tenant cross-domain JWT integrity

**As a** customer business owner
**I want** the embedded widget's session tokens to be bound to my tenant + origin
**So that** a captured JWT cannot be replayed on another tenant's chat

### Acceptance criteria

**Scenario: JWT signed with tenant + origin claims**
- **Given** the worker mints a session JWT
- **When** the visitor's browser presents it on subsequent calls
- **Then** the worker verifies `tenant_id`, `origin`, and `exp` claims
- **And** rejects if origin mismatches the tenant's allowed domains
- **And** rejects if expiry is past
- **And** rejects if signature is invalid (HS256 with rotated secret)

---

## US-LG-024 — Secret hygiene (no plaintext credentials in logs / errors / DB)

**As a** founder operating the system
**I want** zero secrets in log streams, error reports, or DB rows
**So that** a compromised log aggregator can't escalate to API takeover

### Acceptance criteria

**Scenario: An error includes a request body with an API key in the headers**
- **Given** an outbound API call fails
- **When** the error is logged
- **Then** the logged record has headers redacted (Authorization, x-api-key, x-meta-token all stripped)
- **And** the request body is redacted if it contains email, WhatsApp number, or any token-like string
- **And** a unit test verifies redaction patterns on common headers

**Scenario: Stack trace surfaces in a 500 response**
- **Given** an unhandled exception in the worker
- **When** the worker returns 500
- **Then** the response body contains a request-ID and a generic message — NEVER the stack trace
- **And** the stack trace is in the internal log, with PII redacted

---

## What we deliberately still leave for v4+

- Performance SLAs (p50/p95 latency)
- Cost guardrails (per-tenant token budgets)
- Concurrency / load testing
- Failover behaviour
- Cache strategy

## Definition of "done" for v3

All 24 stories pass. Founder runs a manual POPIA audit checklist before any customer onboards. Information Officer registration confirmed. DPA template ready.
