# Discovery Call Enhancement — Pre/Post Questions, WhatsApp Reminders & Freechat Context

**Created:** 2026-04-12
**Status:** Planned, not yet implemented
**Owner:** Hand-off to next agent

---

## TL;DR

Enhance the Octio wizard and post-booking experience with:
1. **Pre-discovery call questions** baked into the wizard flow (between schedule/budget and complete)
2. **Post-discovery call questionnaire** sent via email/WhatsApp after the meeting
3. **WhatsApp reminders** at 24h and 2h before the call
4. **All collected data feeds into freechat** so the AI has maximum context when answering questions

---

## Part 1: Pre-Discovery Call Questions

### Why
The wizard currently collects: service type, requirements (text/voice/file), contact info, time slot, budget. That's enough to book, but not enough for the Octio team to run a productive 30-minute call. The best discovery calls happen when you already know the client's situation, urgency, and decision-making structure.

Research shows 11-14 well-placed questions close 74% higher than calls with fewer than 7. The client has already done 80% of their homework before talking to you — the call should be diagnostic, not educational.

### Where in the flow

Current wizard order:
```
greeting → requirements → contact → schedule → budget → complete → freechat
```

New wizard order — add a `qualifying` step between `budget` and `complete`:
```
greeting → requirements → contact → schedule → budget → qualifying → complete → freechat
```

### Questions to ask (qualifying step)

These should be presented as a multi-part form, not one question at a time. Group them logically. All optional except #1.

**Situation (understand where they are now):**
1. "What's your current setup?" (required)
   - Options: `No existing system` | `Spreadsheets / manual` | `Off-the-shelf tool` | `Custom-built system` | `Legacy system we've outgrown`

2. "How many people will use this?"
   - Options: `Just me` | `2-10` | `10-50` | `50-200` | `200+`

**Urgency & Timeline:**
3. "How soon do you need this?"
   - Options: `Exploring — no rush` | `This quarter` | `This month` | `Yesterday (urgent)`

4. "Is there a hard deadline driving this?" (text input, optional)
   - Placeholder: "e.g. investor demo, regulatory compliance, contract date..."

**Decision-making:**
5. "Who else is involved in this decision?"
   - Options: `Just me — I'm the decision maker` | `My team — I'll present options` | `Executive/board — needs sign-off` | `Procurement process required`

6. "Have you spoken to other agencies about this?"
   - Options: `No, you're the first` | `Yes, comparing a few` | `Yes, but looking for a better fit`

**Context (helps the team prepare):**
7. "Anything specific you want us to cover on the call?" (text input, optional)
   - Placeholder: "e.g. security requirements, specific integrations, team structure..."

### Implementation

**New file:** `src/features/octo/OctoQualifying.tsx`
- Multi-part form with the 7 questions above
- Mix of choice pills (like OctoChoices) and optional text inputs
- Submit sends all answers as a single payload
- Visually: card-based layout, grouped by section headers

**Type changes in `types.ts`:**
```typescript
interface QualifyingData {
  currentSetup: string;
  userCount: string | null;
  urgency: string | null;
  hardDeadline: string;
  decisionMaker: string | null;
  competitorTalks: string | null;
  callTopics: string;
}

// Add to WizardState:
qualifying: QualifyingData | null;

// Add to WizardAction:
| { type: 'SUBMIT_QUALIFYING'; payload: QualifyingData }
```

**State machine changes in `useWizardState.ts`:**
- Add `'qualifying'` to STEP_ORDER (after 'budget', before 'complete')
- Add reducer case for `SUBMIT_QUALIFYING`

**Canned response in `octoApi.ts`:**
```typescript
qualifying: (ctx) =>
  `${ctx.budget} — noted. A few quick questions so we can make the most of our ${ctx.slot?.label || ''} call.`,
complete: (ctx) =>
  ctx.slot
    ? `All set. See you ${ctx.slot.label}. We'll come prepared based on everything you've shared. You'll get a calendar invite and a WhatsApp reminder before the call.`
    : "All set. We'll be in touch shortly.",
```

**Freechat context boost:**
Pass `qualifying` data into the freechat system prompt so the AI knows:
- Their current tech setup (can recommend migration paths)
- Their urgency (adjusts tone and suggestions)
- Their decision-making structure (knows who to address)
- Whether they're comparing with other agencies (competitive positioning)

---

## Part 2: Post-Discovery Call Questionnaire

### Why
After the call, both sides need alignment. The questionnaire:
- Confirms what was discussed (prevents "I thought you said..." later)
- Captures details that emerged during the call but weren't written down
- Gives the client a chance to add things they forgot to mention
- Signals professionalism — most agencies don't do this

### When
Sent **2 hours after the call** (not immediately — give them time to decompress). If no response within 48h, send one gentle reminder.

### Delivery method
- Email (primary) with a link to a simple form
- WhatsApp (secondary) with a direct link to the same form

### Questions (post-call)

**Recap confirmation:**
1. "Did the call cover everything you needed?" — `Yes` | `Mostly` | `No, I still have questions`

2. "Based on the call, what's your confidence level in moving forward?"
   - `Ready to go` | `Interested but need to think` | `Need to discuss internally` | `Not the right fit`

**Details that emerged:**
3. "Anything you thought of after the call that you'd like to add?" (text, optional)

4. "Any technical constraints we should know about?" (text, optional)
   - Placeholder: "e.g. must run on Azure, needs to integrate with SAP, POPIA compliance..."

5. "Do you have existing documentation, wireframes, or specs to share?" (file upload)

**Next steps alignment:**
6. "What would make a proposal from us feel like a 'yes'?" (text, optional)
   - This is gold — lets the team tailor the proposal to what actually matters to the buyer

### Implementation

This should be a **standalone page** (not part of the wizard), accessible via a unique link sent in the post-call email/WhatsApp. Something like `/feedback/{bookingId}`.

**New file:** `src/pages/PostCallPage.tsx`
- Form with the 6 questions above
- Receives `bookingId` from URL params
- Submits to `POST /api/octo/post-call-feedback`
- Shows a thank-you screen on success

**Backend:**
- `POST /api/octo/post-call-feedback` — validates bookingId, stores responses in sqlite, triggers an internal email to the Octio team with the client's answers
- Cron job sends the post-call email 2 hours after `slot_start + 30min`
- Reminder cron 48h later if `post_call_feedback_received = 0`

---

## Part 3: WhatsApp Reminders

### Why
Research shows layered WhatsApp reminders reduce no-shows by 30-70%. Email reminders get lost. WhatsApp gets read within minutes.

### Reminder schedule
| When | Channel | Message |
|------|---------|---------|
| Immediately after booking | Email + WhatsApp | Confirmation with Meet link, prep tips |
| 24 hours before call | WhatsApp | Reminder with Meet link + "Any questions before tomorrow?" |
| 2 hours before call | WhatsApp | Final reminder with one-tap Meet link |
| 2 hours after call | Email + WhatsApp | Post-call questionnaire link |
| 48 hours after call (if no feedback) | WhatsApp | Gentle reminder for questionnaire |

### Tech stack options

**Option A: Twilio WhatsApp API (Recommended)**
- Most mature, best docs, reliable delivery
- Pricing: ~$0.005 per message (practically free)
- Requires WhatsApp Business account verification (~2-3 days)
- Supports rich messages: buttons, links, media
- Node.js SDK: `npm install twilio`

**Option B: WhatsApp Cloud API (Meta direct)**
- Free tier: 1000 conversations/month
- More complex setup (Meta Business verification)
- No third-party dependency

**Option C: WAPI.js / WASender**
- Unofficial — can get your number banned
- Not recommended for production

### Implementation

**Recommended: Twilio**

1. Sign up for Twilio account
2. Set up WhatsApp Sandbox (for dev) or register a WhatsApp Business number (for prod)
3. Create message templates (WhatsApp requires pre-approved templates for outbound messages):

**Template: `octio_booking_confirmation`**
```
Hey {{1}}! 👋

Your discovery call with Octio is locked in:
📅 {{2}}
🔗 {{3}}

Before the call, it helps if you can think about:
• What you're trying to solve
• Any existing tools/systems involved
• Who else needs to be in the loop

See you soon!
— Octio
```

**Template: `octio_24h_reminder`**
```
Hi {{1}}, just a heads-up — your Octio discovery call is tomorrow:
📅 {{2}}
🔗 {{3}}

Any questions before we chat? Just reply here.
```

**Template: `octio_2h_reminder`**
```
{{1}}, your Octio call starts in 2 hours.

Join here: {{3}}

See you shortly!
```

**Template: `octio_post_call_feedback`**
```
Hey {{1}}, thanks for the call today!

We'd love your quick feedback — takes 2 minutes:
{{2}}

This helps us put together a proposal that's exactly right for you.
```

4. **Backend service (`backend/src/services/whatsapp.ts`):**

```typescript
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const WHATSAPP_FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  variables: string[]
) {
  return client.messages.create({
    from: WHATSAPP_FROM,
    to: `whatsapp:${to}`,
    contentSid: templateName, // or use body with template variables
    contentVariables: JSON.stringify(
      Object.fromEntries(variables.map((v, i) => [String(i + 1), v]))
    ),
  });
}
```

5. **Scheduler (`backend/src/services/reminder-scheduler.ts`):**

On booking creation, schedule 3 jobs:
- Immediate: send confirmation (WhatsApp + email)
- `slot_start - 24h`: send 24h reminder
- `slot_start - 2h`: send 2h reminder
- `slot_start + 2.5h`: send post-call questionnaire

Use a simple cron that polls sqlite every 5 minutes:

```sql
CREATE TABLE reminders (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL,
  type TEXT NOT NULL,  -- 'confirmation' | '24h' | '2h' | 'post_call' | 'post_call_nudge'
  send_at TEXT NOT NULL,
  sent INTEGER DEFAULT 0,
  error TEXT
);
```

Cron query:
```sql
SELECT * FROM reminders
WHERE sent = 0 AND send_at <= datetime('now')
ORDER BY send_at ASC
LIMIT 10;
```

### Phone number collection

The wizard's contact form currently collects: name, email, company.

**Add a phone number field** to `OctoContactForm.tsx`:
- Label: "WhatsApp number (optional)"
- Input type: `tel`
- Placeholder: "+27 XX XXX XXXX"
- Store in `ContactInfo.phone`
- If provided: send WhatsApp reminders
- If not: fall back to email-only reminders

**Type change in `types.ts`:**
```typescript
export interface ContactInfo {
  name: string;
  email: string;
  company: string;
  phone: string; // new — WhatsApp number, optional
}
```

---

## Part 4: Feeding Everything Into Freechat

### Current freechat context
The freechat currently has access to: `selectedService`, `budget`, `requirements`, `contact`, `meetLink`, `calendarLink`.

### Enhanced context (after implementing parts 1-3)
Add to the freechat system prompt:

```
## Client Context (from intake)
- Service: {selectedService}
- Budget: {budget}
- Requirements: {requirements}
- Current setup: {qualifying.currentSetup}
- Team size: {qualifying.userCount}
- Urgency: {qualifying.urgency}
- Hard deadline: {qualifying.hardDeadline}
- Decision maker: {qualifying.decisionMaker}
- Comparing with others: {qualifying.competitorTalks}
- Specific call topics requested: {qualifying.callTopics}

## Post-Call Feedback (if available)
- Call coverage: {postCallFeedback.coverageRating}
- Confidence level: {postCallFeedback.confidenceLevel}
- Additional notes: {postCallFeedback.additionalNotes}
- Technical constraints: {postCallFeedback.technicalConstraints}
- What makes a proposal a 'yes': {postCallFeedback.proposalCriteria}
```

This means the AI can:
- Reference their specific urgency ("You mentioned you need this by end of quarter...")
- Adjust recommendations based on their current setup ("Since you're migrating from a legacy system...")
- Handle competitive positioning ("You mentioned you're comparing a few options — here's why clients choose us...")
- Give relevant answers about timeline ("Given your team size of 10-50, here's how we'd phase this...")

### Backend RAG enhancement
When the RAG endpoint receives a question, include the qualifying + post-call data in the prompt context alongside the retrieved knowledge base chunks. This gives the AI both company knowledge AND client-specific context.

---

## Environment variables needed

Add to `backend/.env.example`:
```
# Existing
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_SENDER_EMAIL=hello@octio.co.za
OCTIO_TEAM_EMAIL=team@octio.co.za
PORT=4001

# New — WhatsApp via Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=+1415XXXXXXX

# New — Post-call page
PUBLIC_URL=https://octio.co.za
```

### Twilio setup steps (user must do)
1. Sign up at twilio.com
2. Get Account SID + Auth Token from the dashboard
3. Go to Messaging → Try it out → Send a WhatsApp message
4. For dev: use the Sandbox (instant, free)
5. For prod: register a WhatsApp Business number (takes 2-3 days for Meta approval)
6. Submit message templates for approval (use the templates in Part 3 above)

---

## New files to create

### Frontend
```
src/features/octo/OctoQualifying.tsx     — multi-part qualifying form
src/pages/PostCallPage.tsx                — standalone post-call feedback form
```

### Frontend files to modify
```
src/features/octo/types.ts               — add QualifyingData, phone to ContactInfo
src/features/octo/useWizardState.ts       — add 'qualifying' step, SUBMIT_QUALIFYING action
src/features/octo/octoApi.ts             — add qualifying canned response
src/features/octo/OctoConversation.tsx    — render OctoQualifying at qualifying step
src/features/octo/OctoContactForm.tsx     — add phone number field
src/features/octo/OctoStepIndicator.tsx   — update step map (now 6 steps)
src/App.tsx                               — add /feedback/:bookingId route
```

### Backend
```
backend/src/services/whatsapp.ts          — Twilio WhatsApp message sending
backend/src/services/reminder-scheduler.ts — cron-based reminder dispatch
backend/src/routes/post-call.ts           — POST /api/octo/post-call-feedback
backend/src/routes/post-call-page.ts      — GET /api/octo/post-call/:bookingId (returns form data)
```

### Backend files to modify
```
backend/src/routes/book.ts                — on booking, insert reminder rows into sqlite
backend/src/services/intake-db.ts         — add reminders table, post_call_feedback table
backend/src/server.ts                     — mount new routes, start reminder cron
```

---

## Priority order

1. **Phone number field in contact form** (5 min — enables everything else)
2. **Qualifying questions step** (2-3 hours — highest value for call quality)
3. **WhatsApp confirmation on booking** (2 hours — needs Twilio account)
4. **WhatsApp 24h + 2h reminders** (1 hour — once Twilio is set up, this is just scheduling)
5. **Post-call feedback page** (2-3 hours — standalone page + backend route)
6. **Post-call WhatsApp/email trigger** (1 hour — cron addition)
7. **Feed qualifying + post-call data into freechat** (1 hour — prompt engineering)

---

## Things NOT to change
- The wizard step order up to budget (greeting → requirements → contact → schedule → budget) — user approved this
- The 3D orb, entrance animation, or visual design — all approved
- The existing canned response voice/tone — user likes it
- OctoChoices, OctoContactForm, OctoTimeSlot, OctoTextInput bugfixes that were already applied (double-click guards, maxLength, trim validation)
