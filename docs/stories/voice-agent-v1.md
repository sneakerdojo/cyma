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
- **Then** the agent answers with a greeting within p50 ≤ 1,000ms / p99 ≤ 2,000ms (Twilio inbound → Retell webhook → first audio realistically 800–1,200ms even on hot path)
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
- **And** see US-VA-012 for the fallback path when the owner doesn't answer

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

---

## US-VA-035 — Returning caller personalisation

**As a** returning caller (the agent has my number from a previous call)
**I want** to be greeted by name and reminded what I was last there for
**So that** I don't have to re-explain my situation

### Acceptance criteria

**Scenario: Same number called us within the last 90 days**
- **Given** a previous call from the same caller number with captured details (name + last need + last outcome)
- **When** the call connects
- **Then** the greeting personalises: "Hi [Name] — calling about [last need] again?"
- **And** if the caller confirms, the agent skips early qualification turns
- **And** if the caller says "different issue" the agent proceeds with normal qualification

**Scenario: Number recognised but personalisation data stale (>90 days)**
- **Given** the same number called >90 days ago
- **When** the call connects
- **Then** the agent uses the generic greeting (POPIA retention boundary respected)

---

## US-VA-036 — Reschedule existing booking

**As a** caller with an existing upcoming appointment
**I want** to move it without talking to a human
**So that** I'm not stuck calling back during business hours

### Acceptance criteria

**Scenario: Caller has an upcoming booking and wants to move it**
- **Given** the caller's number is matched to an existing future booking
- **When** the caller says "I need to move my appointment" or similar
- **Then** the agent confirms which booking: "I see you're booked for [day, time] — moving that?"
- **And** offers 3 new slots
- **And** on selection, `update_appointment(eventId, newSlot)` is called against Google Calendar
- **And** the customer's calendar event is moved (single move, not delete-then-create)
- **And** a WhatsApp confirmation goes out for the new time

---

## US-VA-037 — Cancel existing booking

**As a** caller with an existing booking I can't make
**I want** to cancel it quickly
**So that** I free up the slot for someone else

### Acceptance criteria

**Scenario: Caller wants to cancel**
- **Given** the caller's number is matched to an existing future booking
- **When** the caller says "I need to cancel"
- **Then** the agent confirms the specific booking
- **And** asks once if they want to reschedule instead
- **And** on confirmation, `cancel_appointment(eventId)` is called against Google Calendar
- **And** the customer's calendar event is deleted (or marked cancelled per tenant preference)
- **And** the cancellation is logged so the customer's dashboard reflects it

---

## US-VA-038 — Business-hours awareness (no hallucination)

**As a** caller asking "what time are you open?"
**I want** the agent to give me the customer's actual hours
**So that** I don't get a hallucinated answer

### Acceptance criteria

**Scenario: Caller asks for business hours**
- **Given** the customer has business hours configured in their tenant settings
- **When** the caller asks about hours
- **Then** the agent answers from a deterministic tool call (`get_business_hours(tenant)`), NOT free-form LLM generation
- **And** the answer matches the configured value
- **And** if hours are not configured, the agent says "Let me have [Customer] confirm that — what's your number for a quick callback?"

---

## US-VA-039 — Service-catalog awareness

**As a** caller asking "do you do [service]?"
**I want** the agent to know whether the customer offers that service
**So that** I'm not promised something the business can't deliver

### Acceptance criteria

**Scenario: Caller asks about a specific service**
- **Given** the customer has a configured service catalog
- **When** the caller asks "do you handle [service]?"
- **Then** the agent answers from a deterministic lookup (`service_catalog(tenant)`)
- **And** if YES, continues to qualification
- **And** if NO, declines politely and asks if there's a related service the customer DOES offer
- **And** the bot never invents a service that isn't configured

---

## Definition of done for v1

All 11 happy-path stories (6 original + 5 newly added: US-VA-035 to US-VA-039) run against Octio's own inbound number. Patient Zero: founder is the only fallback for one week. Zero critical bugs.
