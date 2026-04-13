# n8n Rebuild Plan - Adam Erhart Agency OS

**Source:** GoHighLevel "Adam Erhart Agency OS" snapshot (Octoo sub-account, location `x6Fgq0IQSPQ8jwsLZnDj`)
**Target:** n8n self-hosted/cloud instance
**Scope:** 18 workflows, ~120 nodes

> **Important note on source data:** GHL's workflow canvas runs in a cross-origin iframe, which blocked automated extraction of node side-panel content (message templates, AI prompts, exact condition operators). This plan captures architecture, node types, flow logic, and integration requirements inferred from canvas data. **Fields marked `[CONFIG]` must be filled in manually** by opening each node in GHL before go-live.

---

## Table of Contents
1. [GHL → n8n Node Type Mapping](#ghl--n8n-node-type-mapping)
2. [External Integrations Required](#external-integrations-required)
3. [Shared Sub-Workflows](#shared-sub-workflows)
4. [Implementation Phases](#implementation-phases)
5. [Per-Workflow Build Specifications](#per-workflow-build-specifications)
6. [Pre-Go-Live Checklist](#pre-go-live-checklist)

---

## GHL → n8n Node Type Mapping

| GHL Node | n8n Equivalent | Notes |
|----------|----------------|-------|
| **Triggers** | | |
| Appointment Status | Webhook + calendar integration (Google Calendar / Cal.com) | GHL calendar webhooks fire on status change |
| Form Submitted | n8n Form Trigger OR Webhook (from external form) | |
| Survey Submitted | Webhook | |
| Facebook Lead Form | Facebook Lead Ads Trigger | Official n8n node |
| Facebook Comment | Webhook from Facebook Graph API subscription | |
| Instagram Comment | Webhook from Instagram Graph API subscription | |
| Contact Tag Added | Webhook (from CRM) or DB trigger | Depends on CRM choice |
| Documents & Contracts Signed | Webhook from e-sign provider (DocuSign, PandaDoc, Dropbox Sign) | |
| Call Details (missed/busy) | Twilio Trigger (`call-status`) | |
| Opportunity Status Changed | Webhook from CRM or DB trigger | |
| Stale Opportunity (N days) | n8n Schedule Trigger (Cron) + DB query | Daily scan |
| **Actions** | | |
| Send SMS | Twilio node (`sms` resource) | |
| Send Email | SMTP node OR SendGrid / Mailgun / Resend | |
| Add Tag | HTTP Request to CRM OR DB update | |
| Wait | Wait node (fixed duration) | |
| Wait Until Reply (with timeout) | Wait node + Webhook listener + branching logic | Custom pattern — see Shared Sub-Workflows |
| Wait Until X Before/After Date | Wait node (dynamic) with date math | |
| If/Else Condition | IF node | |
| Multi-way Branch (Switch) | Switch node | |
| Create/Update Opportunity | HTTP Request to CRM | |
| Assign to User | HTTP Request to CRM/DB | |
| Internal Notification (email) | SMTP node | |
| Internal SMS | Twilio node | |
| Push Notification | Firebase Cloud Messaging / OneSignal HTTP | |
| Call Connect | Twilio Voice (`calls.create` with TwiML) | |
| Voicemail Drop | Twilio Voice with pre-recorded TwiML URL | |
| AI Sentiment Analysis | OpenAI node (or Anthropic) with prompt | Structured output |
| AI Conversational Bot (multi-turn) | OpenAI / Anthropic + state storage + webhook loop | Complex — see Shared Sub-Workflows |
| Respond on FB/IG Comment | HTTP Request to Facebook/Instagram Graph API | |
| FB/IG Interactive Messenger (DM) | HTTP Request to Messenger Platform API | |
| Send Documents & Contracts | HTTP Request to e-sign provider API | |
| Send to Review Site | Send SMS/Email with pre-built review link | |
| Remove from Workflow | Custom — cancel pending Wait nodes via queue ID | |

---

## External Integrations Required

| Service | Purpose | Used By |
|---------|---------|---------|
| **Twilio** | SMS send/receive, voice calls, voicemail drops, call status webhooks | WF04, WF11, WF12, WF13, WF14, WF15, WF17, WF18 |
| **SMTP / Resend / SendGrid** | Transactional email | WF03, WF06, WF07, WF13, WF14, WF15 |
| **OpenAI or Anthropic API** | Sentiment analysis, conversational AI, intent classification | WF01, WF02, WF08, WF12, WF14 |
| **Facebook Graph API** | Comment read/reply, Messenger DM, Lead Ads | WF08, WF14 |
| **Instagram Graph API** | Comment read/reply, DM send | WF09, WF10 |
| **Vapi / Retell / Bland** | Voice AI bot for inbound/outbound calls | WF02 (post-call processing), WF14 (call connect) |
| **Calendar (Cal.com / Google Calendar)** | Appointment booking, status webhooks | WF01, WF03, WF04 |
| **E-sign (PandaDoc / DocuSign / Dropbox Sign)** | Contract send + signed webhook | WF05, WF06 |
| **CRM Backend** — Postgres/Supabase, HubSpot, or Airtable | Contacts, opportunities, pipelines, tags, custom fields | All workflows |
| **Slack / Discord / OneSignal** | Internal team notifications, push alerts | WF02, WF11, WF13, WF15 |

---

## Shared Sub-Workflows

Build these **once** and reuse across workflows:

### SW1: `wait-for-reply-with-timeout`
Used by: WF10, WF12, WF14, WF17, WF18
- **Inputs:** `contactId`, `timeoutSeconds`, `channel` (sms/email)
- **Logic:** Start Wait → in parallel, register webhook listener keyed by contact+channel → whichever fires first (reply webhook OR timeout) resolves → returns `{replied: bool, messageBody: string|null}`
- **n8n pattern:** Use an "Execute Workflow" sub-workflow with Wait + Webhook, respond via Respond to Webhook node

### SW2: `sentiment-classify`
Used by: WF02, WF08, WF12, WF14
- **Inputs:** `messageBody`
- **Output:** `{sentiment: "positive"|"negative"|"neutral", intent: string, confidence: number}`
- **Implementation:** Single OpenAI/Anthropic call with structured JSON response
- Replace GHL's "Intent Positive/Yes" check with `sentiment === "positive"`

### SW3: `crm-contact-upsert`
Used by: all workflows that touch contacts
- **Inputs:** `{email, phone, firstName, lastName, source, tags[]}`
- **Logic:** Find by email or phone → update OR create → return contactId
- **Why shared:** Don't duplicate this HTTP boilerplate 18+ times

### SW4: `crm-opportunity-update`
Used by: WF02, WF03, WF13, WF14, WF15, WF16
- **Inputs:** `{contactId, pipelineId, stageId, status, monetaryValue?}`
- **Output:** `opportunityId`

### SW5: `ai-voice-bot-orchestrator`
Used by: WF01, WF14
- **Inputs:** `{contactId, phoneNumber, goal: "book-appointment"|"nurture-callback", maxTurns: int}`
- **Logic:** Initiate Vapi/Retell call with system prompt → receive webhook with transcript + outcome → emit events (booked/not-booked/no-answer)

### SW6: `stale-opportunity-scanner`
Used by: WF16
- **Cron:** Every hour
- **Logic:** Query opportunities in stage X updated > N days ago → emit per-opportunity event → triggers status update

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Pick the CRM backend, wire up Twilio + SMTP, build shared sub-workflows.
1. Choose CRM backend (recommendation: **Supabase Postgres** for full control, or **HubSpot** if you want pre-built UI)
2. Set up Twilio account + phone number + webhook endpoints
3. Set up SMTP/email provider + verify domain (SPF, DKIM, DMARC)
4. Build SW3 (contact upsert), SW4 (opportunity update), SW1 (wait-for-reply), SW2 (sentiment)
5. Build "Remove from Workflow" cancellation pattern (queue management)

### Phase 2: Simple Linear Workflows (Week 2)
Low complexity, no branching — build confidence and validate the stack.
- **WF05** — Client Onboarding - Send Contract (stub, needs trigger defined)
- **WF06** — Contract Signed > Send Onboarding Form (2 actions)
- **WF07** — Onboarding Form Complete > Book Call (2 actions)
- **WF15** — New Sale Review Request (linear, 5 actions)
- **WF16** — Stale Leads (cron + update, 1 action)
- **WF11** — Auto Missed Call Text-Back (linear, 6 actions)
- **WF04** — Appointment No Show (linear SMS sequence)

### Phase 3: Conditional Workflows (Week 3)
Introduce branching logic with the IF / Switch nodes.
- **WF03** — Appointment Confirmation (wait + reminders)
- **WF13** — Instant Lead Response (Qualified/Appointment branches)
- **WF17** — Review Request (4-5 Star routing)
- **WF18** — Simple Review Request (reply/timeout branches)
- **WF01** — Conversational AI Appointment (bot outcomes) — requires Vapi/Retell integration

### Phase 4: AI + Social Workflows (Week 4)
Most complex; dependent on Phase 1 sub-workflows being stable.
- **WF02** — Voice AI End Of Call (6-way branch, heaviest node count)
- **WF08** — Facebook Comments + AI (sentiment, Messenger)
- **WF09** — Instagram Comment Automation
- **WF10** — IG Comment-to-Client
- **WF12** — Customer Reactivation (2-attempt nurture)
- **WF14** — New Lead Nurture (Fast 5) — most complex, 14+ nodes

---

## Per-Workflow Build Specifications

Each workflow below has: trigger, ordered node list with n8n equivalent, and what needs to be manually configured.

---

### WF01: Conversational AI Appointment Booking

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | (trigger not configured in GHL) | **Decide trigger:** inbound call webhook (Twilio) OR website chat widget | `[CONFIG]` trigger source |
| 1 | Appointment Booking Conversation AI Bot | Execute Workflow → SW5 (`ai-voice-bot-orchestrator`) with `goal: "book-appointment"` | `[CONFIG]` AI system prompt, calendar link, max turns |
| | Branch: Time Out | Switch → timeout output | End |
| | Branch: Appointment Booked | Switch → booked output | Trigger WF03 (Appointment Confirmation) |
| | Branch: Not Booked | Switch → not-booked output | Tag contact "bot-failed", optionally enroll in WF14 nurture |

---

### WF02: Voice AI End Of Call

Most complex workflow. 6-way switch on call intent.

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | (trigger not configured) | Webhook from Vapi/Retell "call-ended" event | `[CONFIG]` webhook URL, payload mapping (intent, transcript, contact) |
| 1 | Add Voice AI Tag | HTTP → CRM add tag "voice-ai-called" | |
| 2 | Call Reason (custom code) | Function / Set node — extracts `intent` field from payload | `[CONFIG]` mapping logic |
| 3 | **Switch (6-way)** on intent | Switch node, 6 outputs | `[CONFIG]` exact intent value mapping |

**Branch: Estimate**
| # | Node | n8n | Config |
|---|------|-----|--------|
| 4 | Qualified? (IF) | IF node: check `full_name != null AND [other field] != null` | `[CONFIG]` exact qualification criteria |
| 5a | (Yes) Add Tag "Qualified & AI Off" | CRM tag update | |
| 6a | Create/Update Opportunity - Qualified | Execute Workflow → SW4, stage = "qualified" | |
| 7a | Internal Notification - QUALIFIED Lead | SMTP / Slack | `[CONFIG]` notification template + recipients |
| 8a | Reset Intent Estimate field | HTTP → CRM clear custom field | |
| 5b | (No) Add Tag "Qualified & AI Off" | same | |
| 6b | Create/Update Opportunity - New Lead | SW4, stage = "new-lead" | |
| 7b | Internal Notification - UNQUALIFIED | SMTP / Slack | |
| 8b | Reset Intent Estimate field | same | |

**Branch: Cancel or Reschedule**
| # | Node | n8n | Config |
|---|------|-----|--------|
| 4 | Add Voice AI Cancel/Reschedule Tag | CRM tag | |
| 5 | Internal Notification - Cancel/Reschedule | SMTP / Slack | `[CONFIG]` template |
| 6 | Reset Intent Cancel/Reschedule field | CRM field clear | |

**Branch: Complaint** — same shape as Cancel, with Complaint notification template
**Branch: General Inquiry** — Tag + reset field (no notification)
**Branch: Call Transfer** — Tag + reset field (no notification)
**Branch: None** — end immediately

---

### WF03: Appointment Confirmation

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Appointment Status = Confirmed | Webhook from calendar provider | Filter: status = confirmed |
| 1 | Remove from New Lead Workflow | Cancel pending "New Lead" workflow executions for this contact | Custom cancellation logic |
| 2 | Update Opportunity to Booking Stage | SW4 with stage = "booked" | |
| 3 | Confirmation Email | Email node | `[CONFIG]` confirmation email template |
| 4 | Wait until 24h before appointment | Wait node (dynamic, `appointmentDate - 24h`) | |
| 5 | 24hr Reminder Email | Email node | `[CONFIG]` reminder template |
| 6 | *(likely SMS reminder + shorter wait — off canvas)* | Wait + Twilio SMS | **Re-capture canvas before build** |

---

### WF04: Appointment No Show

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Appointment Status = No Show | Webhook from calendar | |
| 1 | Reschedule Follow Up Link | (implied precursor to SMS?) — may be Set node building a rebooking URL | `[CONFIG]` dynamic rebook URL |
| 2 | SMS #1 | Twilio SMS | `[CONFIG]` no-show SMS copy with rebook link |
| 3 | Wait 1 Day | Wait (86400s) | |
| 4 | SMS #2 | Twilio SMS | `[CONFIG]` follow-up SMS copy |

---

### WF05: Client Onboarding - Send Contract

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | (not configured) | `[CONFIG]` — decide: manual trigger, webhook from deal-won, or sub-workflow call | |
| 1 | Send Documents & Contracts | HTTP Request to e-sign provider (PandaDoc/DocuSign/Dropbox Sign) — create + send envelope | `[CONFIG]` template ID, signer fields |

---

### WF06: Contract Signed > Send Onboarding Form

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Documents & Contracts signed | Webhook from e-sign provider | Filter: template = [ID], status = completed |
| 1 | Add Tag | CRM tag "contract-signed" | |
| 2 | Email - Onboarding Form | Email with form link (Typeform/n8n Form/Tally) | `[CONFIG]` email copy + form URL |

---

### WF07: Onboarding Form Complete > Book Onboarding Call

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Survey Submitted | Webhook from form provider | |
| 1 | Add Tag | CRM tag "onboarded" | |
| 2 | Email - Onboarding Call | Email with calendar booking link | `[CONFIG]` template + Cal.com link |

---

### WF08: Facebook Comments + AI

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | FB Comment on published post | Webhook from FB Graph API subscription | `[CONFIG]` page ID, post filter |
| 1 | #1 Comment Response | OpenAI node — generate on-brand reply | `[CONFIG]` AI system prompt |
| 2 | Respond On Comment | HTTP → FB Graph API `POST /{comment-id}/comments` | |
| 3 | #2 Analyse comment sentiment | Execute Workflow → SW2 | |
| 4 | Switch on sentiment | Switch node | |
| 5a | (Positive) FB Interactive Messenger | HTTP → Messenger Platform: structured message with quick replies | `[CONFIG]` message template + lead capture flow |
| 6a | Default Timeout | Wait node | `[CONFIG]` timeout duration |
| | (further nodes off-canvas) | **Re-capture canvas before build** | |
| 5b | (Negative) | End | |

---

### WF09: Instagram Comment Automation

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | IG Comment (first-level, contains phrase "Ag...") | Webhook from IG Graph API | `[CONFIG]` exact keyword filter |
| 1 | Respond On Comment | HTTP → IG Graph API | `[CONFIG]` public reply copy |
| 2 | Instagram Interactive Messenger | HTTP → IG Messenger API | `[CONFIG]` DM template + quick replies |
| 3 | Switch (3-way) on DM response | Switch node | |
| 4a | Timeout → End | | |
| 4b | Sign Up → Tag + follow-up | `[CONFIG]` sign-up action | |
| 4c | Book a Call → Send calendar link | `[CONFIG]` Cal.com link | |

---

### WF10: [IG] Comment-to-Client

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | IG Comment on published post (keyword "A...") | Webhook from IG API | `[CONFIG]` keyword |
| 1 | DM Link | HTTP → IG API send DM | `[CONFIG]` DM copy + link |
| 2 | Respond On Comment | HTTP → IG API public reply | |
| 3 | Add Tag | CRM tag "ig-dm-sent" | |
| 4 | Wait for reply / 4hr timeout | Execute Workflow → SW1 with `timeout=14400` | |
| 5a | (Contact Reply) | End (or handoff to sales) | |
| 5b | (Timeout 4hr) Instagram DM | HTTP → IG API | `[CONFIG]` follow-up DM copy |

---

### WF11: Auto Missed Call Text-Back

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Twilio call-status webhook (busy/missed/no-answer) | Twilio Trigger | Filter: `CallStatus in (busy, no-answer, failed)` |
| 1 | Slight Delay | Wait (10-30s) | |
| 2 | Assign to user | CRM update owner (round-robin?) | `[CONFIG]` assignment rule |
| 3 | Add contact tag | CRM tag "missed-call" | |
| 4 | SMS to Lead | Twilio SMS | `[CONFIG]` apology + callback offer |
| 5 | Push Notification to Assigned User | Firebase / OneSignal HTTP | `[CONFIG]` push template |
| 6 | Internal SMS to Assigned User | Twilio SMS to staff phone | `[CONFIG]` internal message |

---

### WF12: Customer Reactivation Campaign

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Contact Tag Added | Webhook on tag change | `[CONFIG]` tag name ("reactivate") |
| 1 | Free Whitening Offer SMS | Twilio SMS | `[CONFIG]` offer copy |
| 2 | Wait Until Reply or 1h | SW1 with `timeout=3600` | |
| 3 | IF replied within 1h | IF node | |
| 4a | (Yes) Sentiment check | SW2 | |
| 5a | IF positive → Positive Reply SMS (next steps) | Twilio SMS | `[CONFIG]` next-steps copy |
| 5b | ELSE → Follow-up SMS | Twilio SMS | `[CONFIG]` neutral follow-up copy |
| 4b | (No reply) 2nd Attempt SMS | Twilio SMS | `[CONFIG]` 2nd attempt copy |
| 5 | Wait for reply | SW1 (longer timeout) | |
| 6 | Sentiment check → Positive/Follow-up paths same as above | | |

---

### WF13: Instant Lead Response (Speed-to-Lead)

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Form Submitted | Form/Webhook trigger | |
| 1 | Internal Notification | SMTP / Slack | `[CONFIG]` alert template |
| 2 | SMS (initial touch) | Twilio SMS | `[CONFIG]` initial SMS copy |
| 3 | Wait 30 Min | Wait (1800s) | |
| 4 | IF Qualified (tag check) | IF: `tags.includes("qualified")` | |
| 5a | (Qualified) Qualified Email | Email | `[CONFIG]` qualified template |
| 6a | Wait 24 Hours | Wait (86400s) | |
| 7a | IF Appointment Booked | IF: `nextAppointment != null` | |
| 8a-yes | → End | | |
| 8a-no | SMS → Wait 48h → SMS → Wait 48h → Tag "Nurture" | Linear sequence | `[CONFIG]` 2 SMS copies |
| 5b | (Not Qualified) Not Qualified Email | Email | `[CONFIG]` nurture template |

---

### WF14: New Lead Nurture (Fast 5) — Most Complex

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T1 | FB Lead Form Submission | FB Lead Ads Trigger | `[CONFIG]` form ID |
| T2 | Form Submitted (Claim Offer) | Webhook / Form Trigger | `[CONFIG]` form ID |
| 1 | Create Opportunity in New Lead stage | SW4 | |
| 2 | Add to Long Term Nurture Workflow | Execute Workflow (background) | `[CONFIG]` decide which nurture |
| 3 | Conversational Email | Email | `[CONFIG]` email template (conversational tone) |
| 4 | Conversational SMS | Twilio SMS | `[CONFIG]` SMS copy |
| 5 | Wait for reply (2 min timeout) | SW1 with `timeout=120` | |
| 6 | IF replied | IF | |
| 7a | (Replied) Update Opportunity to Hot Lead | SW4, stage="hot-lead" | |
| 8a | Sentiment check → Switch (3-way) | SW2 + Switch | |
| 9a-pos | Booking Link SMS | Twilio SMS | `[CONFIG]` Cal.com link copy |
| 9a-neg | Survey Link SMS | Twilio SMS | `[CONFIG]` survey link copy |
| 9a-none | End | | |
| 7b | (No reply) Call Connect | SW5 with `goal="nurture-callback"` OR Twilio Voice | `[CONFIG]` call script |
| 8b | Voicemail drop | Twilio Voice with TwiML | `[CONFIG]` voicemail mp3 URL |
| 9b | Wait 1 day | Wait (86400s) | |
| 10b | "Any questions?" SMS | Twilio SMS | `[CONFIG]` final nudge |

---

### WF15: New Sale Review Request

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Opportunity Status Changed to "won" | Webhook / DB trigger | `[CONFIG]` pipeline filter |
| 1 | Remove from Workflow | Cancel pending executions for this contact | Custom |
| 2 | Review Request Email | Email | `[CONFIG]` review email + Google review link |
| 3 | Review Request SMS | Twilio SMS | `[CONFIG]` review SMS + link |
| 4 | Wait 3 Days | Wait (259200s) | |
| 5 | Internal Notification | SMTP / Slack | `[CONFIG]` internal alert |

---

### WF16: Stale Leads

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T1-3 | 3 triggers: stale 7d in New Lead / Booked / Hot Lead | Schedule Trigger (cron `0 * * * *`) + DB query filter by stage + age | Handled by SW6 |
| 1 | Update Opportunity Status to Abandoned | SW4 with `status="abandoned"` | |

---

### WF17: Review Request (4-5 Stars Only)

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Contact Tag Added ("send-review-request") | Webhook | |
| 1 | Wait 24 Hours | Wait (86400s) | |
| 2 | Review SMS | Twilio SMS asking for star rating 1-5 | `[CONFIG]` SMS copy |
| 3 | Wait 2 Days (for reply) | SW1 with `timeout=172800` | |
| 4 | Switch on reply | Switch node | |
| 5a | Reply contains "4" or "5" | Send Google review link SMS | `[CONFIG]` link SMS copy |
| 5b | Reply contains "1","2","3" | Internal notification + apology SMS | `[CONFIG]` templates |
| 5c | Not replied | Follow-up SMS | `[CONFIG]` nudge copy |
| | *(5a/5b nodes off-canvas — re-capture before build)* | | |

---

### WF18: Simple Review Request

| # | GHL Node | n8n Node | Configuration |
|---|----------|----------|---------------|
| T | Contact Tag Added ("job-complete") | Webhook | |
| 1 | SMS 1 — check-in (no link) | Twilio SMS | `[CONFIG]` check-in copy |
| 2 | Wait 2 Hours or Reply | SW1 with `timeout=7200` | |
| 3 | IF replied | IF | |
| 4a | (Replied) Sentiment check | SW2 | |
| 5a-pos | Review link SMS | Twilio SMS | `[CONFIG]` review link |
| 5a-neg | Complaint path SMS | Twilio SMS | `[CONFIG]` apology template |
| 4b | (Timeout) SMS 2 follow-up | Twilio SMS | `[CONFIG]` copy |
| 5b | Wait 48 Hours | Wait (172800s) | |
| 6b | Final follow-up SMS | Twilio SMS | `[CONFIG]` copy |

---

## Pre-Go-Live Checklist

Before flipping any workflow to production:

### Canvas Re-Capture (items flagged `[CONFIG]` or "off canvas")
- [ ] **WF02** — confirm exact branch conditions on `Call Reason` (the 6 custom value IDs and their expected values)
- [ ] **WF03** — capture nodes below row 5 (SMS reminder + shorter wait sequence)
- [ ] **WF08** — capture FB Interactive Messenger downstream nodes
- [ ] **WF13** — capture Qualified Yes/No email templates
- [ ] **WF17** — capture 4-5 Star and 1-3 Star branch action nodes

### Message Content
- [ ] Every node marked `[CONFIG]` has its copy filled in (SMS, email, push notification text)
- [ ] All merge tags (`{{first_name}}`, `{{appointment_date}}`) mapped to n8n expressions
- [ ] Links (Cal.com booking, Google review, contract URLs) set and tested

### Integration Credentials
- [ ] Twilio account SID + auth token + phone number(s) working
- [ ] SMTP/email provider sender domain verified (SPF/DKIM/DMARC passing)
- [ ] OpenAI/Anthropic API key with sufficient quota
- [ ] FB/IG Graph API app reviewed + long-lived page access token
- [ ] Vapi/Retell API key + voice agent configured
- [ ] E-sign provider API key + webhook secret
- [ ] CRM backend (Supabase/HubSpot) schema matches SW3/SW4 expectations

### Testing
- [ ] Each workflow fired at least once in a staging environment with a test contact
- [ ] Error paths tested (bad input, timeout, API failure)
- [ ] Twilio webhook signatures verified
- [ ] Rate limits considered (FB/IG comment API, Twilio outbound SMS)

### Cutover
- [ ] DNS / webhook endpoints repointed from GHL to n8n
- [ ] GHL workflows set to "Draft" (do not delete for rollback safety)
- [ ] Monitoring + alerting (n8n execution errors → Slack)
- [ ] On-call rota for first 72h post-cutover

---

## Open Decisions

These need your input before Phase 1:

1. **CRM backend** — Supabase (full control, need to build simple admin UI) vs HubSpot (paid, pre-built UI) vs Airtable (quick but limited)?
2. **Voice AI provider** — Vapi, Retell, or Bland? All three integrate via webhook; Vapi is usually the default choice for agency use cases.
3. **Hosting** — n8n Cloud (managed, simpler) or self-hosted (cheaper at scale, more control)? For 18 workflows and ~1000 executions/day, Cloud's $20-50/mo plan is fine.
4. **Calendar** — Cal.com (self-hostable, modern) or Google Calendar (familiar, free)?
5. **E-sign** — PandaDoc (best API), DocuSign (enterprise), Dropbox Sign (cheapest)?

---

**Document version:** v1 (canvas-level build spec)
**Next revision:** after side-panel content is captured from the 5 workflows flagged above, fill in the `[CONFIG]` blanks for message templates and exact condition operators.
