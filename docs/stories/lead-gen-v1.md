# Lead Gen — User stories v1 (happy path)

**Source spec:** `docs/superpowers/specs/2026-05-12-lead-gen-superseded.md`
**Iteration:** 1 of 5 — happy path only. Edge cases land in v2.
**Format:** User story + Gherkin acceptance criteria. Tests come in v5.

---

## US-LG-001 — Proactive greeting on page load

**As a** website visitor arriving at a customer's site for the first time
**I want** the chat to greet me proactively within ~3 seconds
**So that** I know help is available without hunting for a contact form

### Acceptance criteria

**Scenario: First-time visitor lands on the homepage**
- **Given** a visitor with no prior session arrives at `customer.com`
- **And** the chat widget is embedded in the page
- **When** the page has been visible for 3 seconds (and the visitor has not scrolled past the fold)
- **Then** the chat widget opens automatically with a greeting message tailored to the customer's brand voice
- **And** the greeting references the customer's service (not generic "Hi, how can I help?")

**Scenario: Returning visitor in the same session**
- **Given** a visitor who already saw the greeting earlier this session
- **When** they navigate to another page on the same site
- **Then** the chat does NOT re-open or re-greet
- **But** the chat icon remains visible and clickable

---

## US-LG-002 — Need-first qualification (turns 1–5)

**As a** visitor who started a chat
**I want** the bot to ask one clear question at a time about my situation
**So that** I can express my need without filling out a long form

### Acceptance criteria

**Scenario: Visitor says they have a leaky pipe (plumbing customer)**
- **Given** the visitor responded to the greeting with "I have a leaky pipe"
- **When** the bot processes the message
- **Then** the bot's next turn (turn 2) confirms service match: e.g. "Got it — sounds like an emergency repair. Is that right?"
- **And** turn 3 asks about urgency: "Is this urgent today, or planning for the week?"
- **And** turn 4 asks about service area: "What suburb are you in?"
- **And** turn 5 asks about authority: "Is this for your home, or are you sorting it out for someone else?"

**Scenario: Visitor's need doesn't match what the customer offers**
- **Given** the visitor says "I need a new website"
- **And** the customer is a plumbing business
- **When** the bot processes the message
- **Then** the bot politely confirms the mismatch and offers to capture the request anyway for follow-up

---

## US-LG-003 — WhatsApp number capture (turn 6)

**As a** visitor who has been qualified
**I want** the bot to ask for my WhatsApp number (not email)
**So that** I can continue the conversation in the channel I actually use

### Acceptance criteria

**Scenario: Visitor agrees to share WhatsApp number**
- **Given** the bot has completed qualification through turn 5
- **When** the bot asks "What's the best WhatsApp number to reach you on?"
- **And** the visitor enters a valid SA mobile number (e.g. `+27 82 123 4567` or `082 123 4567`)
- **Then** the bot normalises the number to E.164 format
- **And** confirms back: "Got it — I'll send you a quick WhatsApp now to keep things going there."

---

## US-LG-004 — WhatsApp handoff (utility template)

**As a** visitor who shared a WhatsApp number
**I want** to receive an immediate WhatsApp message that continues the conversation
**So that** the booking happens where I actually live online

### Acceptance criteria

**Scenario: WhatsApp handoff message delivers within 10 seconds**
- **Given** a valid SA WhatsApp number captured in US-LG-003
- **When** the bot triggers the handoff
- **Then** an approved utility template is sent via Meta Cloud API direct
- **And** the message arrives at the visitor's phone within 10 seconds
- **And** the message includes the customer's brand name, a recap of the visitor's need, and a clear "tap to pick a time" call-to-action

---

## US-LG-005 — In-thread booking

**As a** qualified visitor
**I want** to pick a discovery-call slot inside the chat (or inside WhatsApp)
**So that** I don't get bounced to a third-party calendar page

### Acceptance criteria

**Scenario: Visitor picks an offered slot inside the chat**
- **Given** the visitor has been handed off and is back in the chat (or replied "yes" via WhatsApp)
- **When** the bot offers 3 calendar slots for the next 5 business days
- **And** the visitor selects slot 2
- **Then** a Google Calendar event is created on the customer's calendar
- **And** an invite is sent to the visitor's email (captured via WhatsApp profile if available, else asked once)
- **And** the bot confirms the booking time + sends a WhatsApp confirmation message

---

## US-LG-006 — Founder escalation on urgent signal

**As a** business owner (Octio's customer)
**I want** urgent calls routed to me within seconds
**So that** I never miss a high-value emergency

### Acceptance criteria

**Scenario: Visitor signals urgency mid-conversation**
- **Given** an in-progress chat session
- **When** the visitor says "this is a flood right now" or any phrase the bot classifies as urgent
- **Then** the bot fires the `route_to_human` tool
- **And** posts an alert to the customer's configured Slack channel with the conversation transcript
- **And** continues to keep the visitor engaged in chat while the human picks up
- **And** the Slack alert is acknowledged within 5 minutes (SLA), or escalates further

---

---

## Profile-system stories (cross-cutting; see `docs/superpowers/specs/2026-05-13-profile-system.md`)

## US-LG-035 — First-time visitor: inline profile consent

**As a** first-time visitor to a customer's site
**I want** to be asked once, gently, if I want the chat to remember me
**So that** I make an informed choice without friction

### Acceptance criteria

**Scenario: Consent ask after first useful exchange**
- **Given** a first-time visitor has answered the first qualification question (turn 1 done)
- **When** the bot prepares turn 2
- **Then** the bot first surfaces an inline consent card: "Quick note — I can remember our chat so you don't repeat yourself next time. Want me to? You can change your mind any time."
- **And** the card offers two buttons: `Yes, remember me` / `No, this time only`
- **And** the visitor's choice is captured by `profile.consent(tenantId, profileId, decision, 'chat', consentTextHash)`
- **And** qualification continues regardless of the choice

**Scenario: Consent stored with exact-text audit trail**
- **Given** the visitor clicked `Yes, remember me`
- **When** consent is persisted
- **Then** the `profile_consent` row includes `consent_text_hash = sha256(consent_text)`, `channel = 'chat'`, `granted_at = now()`
- **And** the audit log records the decision

---

## US-LG-036 — Returning visitor: personalised greeting from profile

**As a** returning visitor with a profile (>90 days OR within 90 days)
**I want** the chat to recognise me + reference past context
**So that** I feel known, not re-onboarded

### Acceptance criteria

**Scenario: Returning visitor identified by phone/email**
- **Given** a visitor whose phone or email matches an existing profile in this tenant with `consent_granted = true`
- **When** they open the chat
- **Then** the bot calls `profile.lookup(tenant, identity)` and receives a non-null `profile_id` and `summary`
- **And** the greeting personalises: "Hi [name] — calling about [last topic]?" OR a brand-voice equivalent
- **And** if `preferred_channel` is in the summary, the bot defaults to that contact method when relevant

**Scenario: Consent absent or revoked**
- **Given** a returning visitor whose `consent_granted = false` (declined or revoked)
- **When** they open the chat
- **Then** the bot uses the generic greeting (no personalisation)
- **And** the bot does NOT reference any prior session

---

## US-LG-037 — Profile-driven shortcut: skip already-known turns

**As a** returning visitor whose previous chat captured their service area + WhatsApp number
**I want** the bot to skip those questions
**So that** I'm not asked the same thing twice

### Acceptance criteria

**Scenario: Profile summary contains service_area + WhatsApp**
- **Given** the profile summary has `service_area: Centurion` and `whatsapp: +27821234567`
- **When** the bot plans the qualification flow
- **Then** the bot skips turn 4 (location) — confirms instead: "Still in Centurion?"
- **And** skips turn 6 (WhatsApp ask) — confirms instead: "Reaching you on +27 82 *** 4567 ok?"
- **And** if the visitor corrects either, the bot updates the profile via `profile.extend`

---

## What we deliberately leave for v2+

- Abandonment recovery (visitor leaves mid-flow)
- Failure modes (LLM hallucination, calendar conflict, WhatsApp template rejection)
- Multi-language / multi-region
- Hostile inputs (prompt injection, profanity)
- Rate limiting + spam protection

## Definition of "done" for v1

All 9 happy-path stories (6 original + 3 profile) run end-to-end on Octio's own site (`octio.co.za`) with founder-supervised acceptance. Zero critical bugs. No customer onboarded yet — Patient Zero pass.
