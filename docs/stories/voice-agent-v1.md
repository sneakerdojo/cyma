# Voice Agent — User stories v1 (happy path)

**Source spec:** `docs/superpowers/specs/2026-05-12-voice-agent-superseded.md`
**Iteration:** 1 of 5 — happy path only.

---

## US-VA-001 — Inbound call is answered

**As a** caller dialling the customer's SA Twilio number
**I want** the AI receptionist to pick up within the first ring
**So that** I never hit voicemail

### Acceptance criteria

**Scenario: New inbound call**
- **Given** a Twilio +27 11/+27 21 number routes to Retell
- **When** a caller dials the number
- **Then** the agent answers within 1 second of the first ring (pickup_ms ≤ 1000)
- **And** plays the configured greeting in the tenant's brand voice
- **And** the greeting names the business: "Hi, you've reached [Customer], how can I help?"

---

## US-VA-002 — Voice qualification

**As a** caller with a service need
**I want** to describe what I need in natural conversation
**So that** I can book without navigating an IVR

### Acceptance criteria

**Scenario: Caller describes a service need**
- **Given** the call is connected and the agent has greeted
- **When** the caller says "my geyser is leaking"
- **Then** the agent confirms understanding: "Got it — leaking geyser, sounds urgent. Where are you?"
- **And** continues qualification in voice across at most 4 turns before offering booking

---

## US-VA-003 — Book appointment via tool call

**As a** qualified caller
**I want** the agent to book me directly into the calendar
**So that** I'm not asked to call back or visit a website

### Acceptance criteria

**Scenario: Agent offers + books a slot**
- **Given** qualification is complete
- **When** the agent calls `lookup_availability` for the next 3 business days
- **And** offers 2-3 slots out loud
- **And** the caller picks one
- **Then** the agent calls `book_appointment(slot, contact)` against Google Calendar
- **And** confirms the booked time + sends a WhatsApp confirmation template

---

## US-VA-004 — Founder warm-transfer on urgent signal

**As a** business owner (customer)
**I want** truly urgent calls warm-transferred to me
**So that** I capture emergencies myself

### Acceptance criteria

**Scenario: Caller signals an emergency**
- **Given** an in-progress call
- **When** the caller says "this is a flood right now" or any phrase the agent classifies as urgent
- **Then** the agent says "Hold on — I'm putting you through to [Owner Name] right now"
- **And** Twilio `<Dial>` warm-transfers to the founder's configured number
- **And** a Slack message posts to the customer's channel with caller info + transcript so far

---

## US-VA-005 — Voicemail-to-WhatsApp fallback when no human available

**As a** caller calling after-hours
**I want** to leave a message that reaches the business owner quickly
**So that** I don't have to call back

### Acceptance criteria

**Scenario: After-hours call with no booking taken**
- **Given** it is after the configured business hours
- **And** the caller didn't book or escalate
- **When** the call ends
- **Then** the agent says "I'll have [Customer] WhatsApp you first thing tomorrow"
- **And** the agent sends a WhatsApp template to the caller's number with a summary of their need + booking link
- **And** posts the call summary to Slack

---

## US-VA-006 — Post-call summary captured

**As a** business owner (customer)
**I want** a written summary of every call
**So that** I can review what happened without re-listening

### Acceptance criteria

**Scenario: Call completes (any outcome)**
- **Given** an inbound call has ended
- **When** the post-call hook fires
- **Then** the worker writes a `calls` row with: tenant_id, caller_number, duration_s, outcome (booked / transferred / voicemail / no_show), transcript, summary
- **And** the summary is 2-3 sentences in the customer's brand voice
- **And** the call appears in the customer's dashboard within 60 seconds

---

## Definition of done for v1

All 6 happy-path stories run against Octio's own inbound number. Patient Zero: founder is the only fallback for one week. Zero critical bugs.
