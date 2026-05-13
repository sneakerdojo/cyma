# Voice Agent — User stories v3 (security + POPIA + recording compliance)

**Source spec:** `docs/superpowers/specs/2026-05-12-voice-agent-superseded.md`
**Iteration:** 3 of 5 — voice has unique compliance: call recording (POPIA s.69), data residency, telco regulation.

---

## v1 + v2 stories carried forward

US-VA-001 through US-VA-015 remain in scope.

---

## US-VA-016 — Recording notice (POPIA s.69 + RICA)

**As a** caller
**I want** to know upfront that the call may be recorded
**So that** my consent is informed

### Acceptance criteria

**Scenario: First seconds of every call**
- **Given** an inbound call connects
- **When** the agent's first audio plays
- **Then** the very first second includes: "This call may be recorded for service quality"
- **And** that disclosure is read regardless of tenant config (Octio-level requirement)
- **And** the disclosure is in English Phase 1; multi-language Phase 3

**Scenario: Caller objects to recording**
- **Given** the disclosure has played
- **When** the caller says "I don't want to be recorded"
- **Then** the agent immediately disables recording for the rest of the call
- **And** notes `recording_objected = true` in the call record
- **And** continues the call without recording

---

## US-VA-017 — Per-tenant call-recording opt-in

**As a** business owner (customer)
**I want** to choose whether my account records calls
**So that** I match my own privacy posture

### Acceptance criteria

**Scenario: Tenant disables recording in settings**
- **Given** Tenant A has `record_calls = false`
- **When** a call comes in to Tenant A's number
- **Then** no recording is captured (only transcript is stored)
- **And** the disclosure still plays ("may be recorded for service quality") OR is replaced with a transcript-only variant based on tenant setting

---

## US-VA-018 — Transcript retention + purge

**As a** POPIA Information Officer
**I want** automatic purging of call transcripts on a published schedule
**So that** old PII doesn't pile up

### Acceptance criteria

**Scenario: Transcript purge 90 days after call**
- **Given** a call from 91 days ago
- **When** the daily retention cron runs
- **Then** the transcript body is wiped (set to "[purged]")
- **And** the call metadata (id, tenant_id, duration, outcome) is retained for analytics
- **And** an audit-log row records the purge

**Scenario: Recording purge 30 days after call (Octio default)**
- **Given** a recording from 31 days ago
- **When** the daily retention cron runs
- **Then** the audio file is deleted from R2/S3
- **And** the recording_url in DB is set to NULL

---

## US-VA-019 — Per-tenant audio isolation

**As a** customer business owner
**I want** my call audio + transcripts NEVER visible to another customer's tenant
**So that** my caller PII stays mine

### Acceptance criteria

**Scenario: Tenant A queries call records**
- **Given** calls exist for both Tenant A and Tenant B
- **When** Tenant A's dashboard queries `GET /api/calls`
- **Then** only Tenant A's call rows return
- **And** any cross-tenant access attempt returns 403, not 200 with wrong data
- **And** signed audio URLs are bound to tenant_id (URL forgery does not work cross-tenant)

---

## US-VA-020 — Retell DPA + EU data residency

**As a** POPIA Information Officer
**I want** Retell's data processing to comply with POPIA via DPA + EU residency
**So that** I have a defensible compliance posture

### Acceptance criteria

**Scenario: Configuration verified at deployment**
- **Given** the Retell account
- **When** the worker's startup check runs
- **Then** it verifies the Retell DPA is signed (manual one-time check, recorded in `docs/compliance/dpa-register.md`)
- **And** Retell agent is configured for EU region
- **And** Anthropic API calls route to EU endpoint
- **And** any external API not configured for EU is logged as a compliance drift

---

## US-VA-021 — Caller right of access / deletion

**As a** caller whose call was recorded
**I want** to request my call transcript + recording, or its deletion
**So that** I exercise POPIA s.23 / s.24

### Acceptance criteria

**Scenario: Operator processes a caller deletion request**
- **Given** a verified deletion request from a caller (matched by phone number)
- **When** the operator triggers the workflow
- **Then** all calls with `caller_number = <hash>` are wiped (transcript, recording, summary)
- **And** the audit log records the deletion
- **And** the caller receives a confirmation within 24 hours

---

## US-VA-022 — Audit log: tool calls touch PII

**As a** POPIA Information Officer
**I want** every tool call that touches PII recorded
**So that** I can reconstruct what happened

### Acceptance criteria

**Scenario: Agent calls book_appointment**
- **Given** the agent fires `book_appointment` with caller info
- **When** the call executes
- **Then** an audit-log row is written: `actor = system:voice-agent, action = book_appointment, target = call.id, contact_hash = sha256(number)`
- **And** the raw phone number is NOT in the audit log

---

## US-VA-023 — Secret hygiene in voice path

**As a** founder operating the system
**I want** zero secrets in voice-related logs / error reports
**So that** a compromised log aggregator can't escalate

### Acceptance criteria

**Scenario: Retell webhook signed-request verification**
- **Given** Retell posts a webhook to our worker
- **When** the worker receives the request
- **Then** it verifies the signature against the configured Retell webhook secret
- **And** rejects (401) on signature mismatch
- **And** the secret is never logged

**Scenario: Audio file URLs**
- **Given** an operator downloads a recording
- **When** the worker generates the signed URL
- **Then** the URL has TTL ≤ 15 minutes
- **And** the storage credential is not embedded in the URL
- **And** the download access is audit-logged

---

## US-VA-024 — Call summary contains no hallucinated facts

**As a** business owner (customer)
**I want** the post-call summary to faithfully reflect the call
**So that** I don't act on bot-fiction

### Acceptance criteria

**Scenario: Summary review (manual)**
- **Given** 20 random call summaries / week
- **When** founder reviews them against transcripts
- **Then** zero summaries contain claims not present in the transcript
- **And** if any do, the summary prompt is corrected before the next batch

---

---

## Profile-system POPIA stories (see `docs/superpowers/specs/2026-05-13-profile-system.md`)

## US-VA-049 — Per-tenant profile isolation (voice)

**As a** POPIA Information Officer
**I want** voice-driven profile data strictly isolated per tenant
**So that** Customer B can never see what a caller said while calling Customer A

### Acceptance criteria

**Scenario: Same caller phone reaches two tenants**
- **Given** caller `+27821234567` has a consented profile at Tenant A AND at Tenant B (each separate)
- **When** the caller dials Tenant A's number
- **Then** the voice agent's `profile.lookup` returns only Tenant A's profile
- **And** zero data from Tenant B's profile is visible in this call
- **And** the audit log records the lookup tied to Tenant A only

**Scenario: Forged tenant in profile API**
- **Given** an attacker attempts a `profile.lookup` with `tenantId = 999`
- **When** the call is processed
- **Then** the worker rejects with 403
- **And** the attempt is audit-logged

---

## US-VA-050 — Profile retention + auto-purge (voice context)

**As a** POPIA Information Officer
**I want** voice profile data subject to the same 24-month retention boundary
**So that** old caller data doesn't accumulate forever

### Acceptance criteria

**Scenario: Profile inactive 24 months auto-purges**
- **Given** a voice-built profile whose `last_seen_at` is 24+ months ago
- **When** the daily retention cron runs
- **Then** the profile + all facts + identifiers + embeddings are hard-deleted
- **And** the audit-log record is preserved without PII

**Scenario: Per-category TTL (sensitive 90 days, off_topic 12 months)**
- **Given** voice-captured `sensitive` facts older than 90 days and `off_topic` facts older than 12 months
- **When** the retention sweep runs
- **Then** those facts are deleted while the profile root remains

---

## Definition of done for v3

All 26 stories (24 original + 2 profile POPIA) pass. POPIA Information Officer registered. Retell DPA recorded. Recording disclosure tested on every call route. Audit log completeness verified. Profile per-tenant isolation verified by red-team test.
