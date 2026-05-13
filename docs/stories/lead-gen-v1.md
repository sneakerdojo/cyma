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

## What we deliberately leave for v2+

- Abandonment recovery (visitor leaves mid-flow)
- Failure modes (LLM hallucination, calendar conflict, WhatsApp template rejection)
- Multi-language / multi-region
- Hostile inputs (prompt injection, profanity)
- Rate limiting + spam protection

## Definition of "done" for v1

All 6 happy-path stories run end-to-end on Octio's own site (`octio.co.za`) with founder-supervised acceptance. Zero critical bugs. No customer onboarded yet — Patient Zero pass.
