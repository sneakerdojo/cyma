# Google Workspace Integration — Octio Agent Booking & Post-Call Automation

**Created:** 2026-04-11
**Status:** Planned, not yet implemented
**Owner:** Hand-off to next agent

---

## TL;DR for the next agent

Octio's frontend (this repo) has a fully-working Octio AI wizard that collects project intake, books discovery calls, and unlocks a free-form RAG chat. **Everything currently uses canned dev-mode responses — there is no backend yet.** Your job is to build the backend on the `gen4` server so the wizard actually creates Google Calendar events, sends Gmail confirmations, and (phase 2) auto-summarises post-call transcripts.

The user has Google Workspace. They picked the **Google Meet native API** path (free, 45-min transcript delay, requires manual "Start transcription" click). They want this deployed on the **gen4 server** (SSH access: `ssh gen4`).

---

## Current frontend state (do not re-do this)

The wizard is fully built and works in dev mode. Key files:

- `src/components/Hero.tsx` — hero section, holds the 3D orb + wizard context
- `src/features/octo/OctoConversation.tsx` — orchestrates the 6-step wizard
- `src/features/octo/useWizardState.ts` — reducer/state machine
- `src/features/octo/octoApi.ts` — **this is where canned responses live, replace with real API calls**
- `src/features/octo/OctoTimeSlot.tsx` — calendar picker (generates fake slots currently)
- `src/features/octo/OctoTextInput.tsx` — voice + file attach for requirements step
- `src/features/octo/OctoFreeChat.tsx` — free-form RAG chat (dev-mode canned responses)
- `src/features/octo/types.ts` — all type definitions including `TimeSlot`, `RequirementsPayload`, `WizardState`, `ChatMessage`

**Wizard flow (don't change):**
1. `greeting` — user picks service (AI Agents, Custom App, Modernisation, Mobile App)
2. `requirements` — text + optional voice note (webm Blob) + optional file (PDF/doc/image, max 10MB)
3. `contact` — name, email, company
4. `schedule` — user picks a time slot from a 5-business-day × 4-slots grid
5. `budget` — user picks a budget range (*this is intentionally last — user is already booked before being asked about money*)
6. `complete` — confirmation with the booked slot
7. `freechat` — unlocked "Ask me anything about Octio" free-form chat (uses RAG)

---

## Scope of work

### Phase 1 — Booking API (core value, ship this first)

Build a Node.js backend on `gen4` that:
1. Exposes `POST /api/octo/book` — accepts the full intake payload
2. Authenticates with Google Workspace via OAuth2 (one-time refresh token)
3. Creates a Google Calendar event with a Google Meet link
4. Invites the client and a primary Octio team member
5. Sends a confirmation email via Gmail to the client + the internal team
6. Handles voice note and file upload — store them on disk (or S3-compatible storage later) and link them in the confirmation email
7. Returns `{ ok: true, meetLink, eventId }` to the frontend

### Phase 2 — Post-call summaries (do after Phase 1 is live and stable)

Build a background worker on `gen4` that:
1. Polls the Google Meet REST API (or subscribes to webhooks if available)
2. For each ended meeting, waits for the transcript (~45 min delay — poll every 10 minutes for up to 2 hours)
3. Sends transcript + intake data to Claude API for summarisation
4. Generates two outputs:
   - **Client email**: clean recap + next steps
   - **Internal email**: same recap + a draft proposal based on the call + intake
5. Sends both via Gmail API
6. Updates a local DB row with status (summary sent / failed)

### Phase 3 — RAG chat backend (lowest priority, after phase 1+2)

Replace the dev-mode `askOctio()` canned responses with a real RAG pipeline. Frontend already hits `POST /api/octo/rag` — we just need the backend. Options:
- Embed Octio company docs (team bios, case studies, approach, pricing) in a vector DB (Supabase pgvector, Pinecone, or local sqlite-vss)
- On query: embed question → retrieve top 3 chunks → pass to Claude with prompt
- Return plain text answer

---

## Phase 1 — Detailed implementation plan

### Architecture

```
Frontend (this repo)
  ↓ POST /api/octo/book  (multipart form-data with JSON + optional voice blob + optional file)
┌──────────────────────────────────────────┐
│ gen4 server                              │
│  Node.js + Express (or Fastify)          │
│  ├─ /api/octo/book handler               │
│  ├─ googleapis SDK (OAuth2 client)       │
│  ├─ Calendar API → create event + Meet   │
│  ├─ Gmail API → send confirmation        │
│  └─ File storage (local /var/octio/      │
│     uploads or S3)                       │
│                                          │
│  nginx reverse proxy                     │
│  → octio.co.za/api/octo/* → :PORT        │
└──────────────────────────────────────────┘
```

### Backend tech stack

- **Node.js 20** + **TypeScript**
- **Fastify** (faster than Express, better TS support) or Express if you prefer
- **googleapis** npm package (official Google client) — `npm install googleapis`
- **@fastify/multipart** for handling voice note + file uploads
- **zod** for payload validation
- **dotenv** for secrets
- **pino** for structured logging
- **Docker + docker-compose** for deployment (gen4 already runs Docker)

### Directory structure to create

```
backend/                              ← new directory in this repo
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .env.local                        ← gitignored
├── src/
│   ├── server.ts                     ← Fastify app bootstrap
│   ├── routes/
│   │   ├── book.ts                   ← POST /api/octo/book handler
│   │   ├── rag.ts                    ← POST /api/octo/rag (phase 3, stub for now)
│   │   └── health.ts                 ← GET /api/health
│   ├── services/
│   │   ├── google-auth.ts            ← OAuth2 client factory
│   │   ├── calendar.ts               ← createDiscoveryCallEvent()
│   │   ├── gmail.ts                  ← sendBookingConfirmation()
│   │   ├── storage.ts                ← saveVoiceNote(), saveAttachment()
│   │   └── intake-db.ts              ← persistIntake() (sqlite for simplicity)
│   ├── types.ts                      ← shared types (mirror frontend types.ts)
│   ├── config.ts                     ← env var loading + validation
│   └── logger.ts
└── README.md                         ← setup + run instructions
```

### API contract

**Endpoint:** `POST /api/octo/book`
**Content-Type:** `multipart/form-data`

**Fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `intake` | JSON string | yes | Full wizard state serialised |
| `voiceNote` | File (audio/webm) | no | Voice note blob from MediaRecorder |
| `attachment` | File (pdf/doc/image) | no | Project spec file |

**Intake JSON shape** (matches `src/features/octo/types.ts::WizardState` minus the animation fields):
```typescript
{
  selectedService: "AI Agents & Automations" | "Custom Application" | "Modernisation" | "Mobile App",
  budget: "Under R50K" | "R50K-R150K" | "R150K-R500K" | "R500K+",
  requirements: string,
  contact: { name: string, email: string, company: string },
  selectedSlot: {
    id: string,
    dateLabel: string,     // "Mon 14 Apr"
    time: string,          // "09:00"
    label: string          // "Mon 14 Apr · 9:00 AM"
  }
}
```

**Response 200:**
```json
{
  "ok": true,
  "meetLink": "https://meet.google.com/abc-defg-hij",
  "eventId": "google-calendar-event-id",
  "calendarLink": "https://calendar.google.com/..."
}
```

**Response 400 / 500:**
```json
{ "ok": false, "error": "Human-readable error message" }
```

### Google OAuth setup (the user must do this)

The user needs to do these steps once. Provide them as a checklist in README.md:

1. Go to https://console.cloud.google.com → create project "Octio Agent"
2. Enable APIs:
   - Google Calendar API
   - Gmail API
   - Google Meet REST API (for phase 2)
3. **OAuth consent screen**:
   - User type: External (or Internal if they have a Workspace)
   - Scopes needed:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/meetings.space.created` (phase 2)
     - `https://www.googleapis.com/auth/meetings.space.readonly` (phase 2)
4. **Create OAuth 2.0 credentials** → Application type: "Desktop app" (easiest for a one-time refresh token flow) or "Web application" (if you want browser-based re-auth)
5. Download the client credentials JSON
6. **Get a refresh token** — run a one-time script:
   ```bash
   cd backend
   npm run get-refresh-token
   ```
   This script should open a browser, do the OAuth dance, and print the refresh token to the terminal.
7. Add to `.env.local` on gen4:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REFRESH_TOKEN=...
   GOOGLE_SENDER_EMAIL=hello@octio.co.za
   OCTIO_TEAM_EMAIL=team@octio.co.za  # gets CC'd on every booking
   PORT=4001
   ```

Write `scripts/get-refresh-token.ts` in the backend directory — it should:
- Use `googleapis` OAuth2 client
- Generate auth URL with the required scopes + `access_type: 'offline'` + `prompt: 'consent'`
- Open the URL in the user's browser
- Spin up a temp local server on port 3000 to catch the redirect
- Exchange code for refresh token
- Print the refresh token

### Google Calendar event creation logic

In `src/services/calendar.ts`:

```typescript
async function createDiscoveryCallEvent(intake: IntakeData): Promise<CalendarEventResult> {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });

  // Parse the slot date/time from selectedSlot
  // NOTE: OctoTimeSlot.tsx uses the local browser timezone. The slot.id is
  // `${day.toISOString()}-${time}` — you can parse the date from that.
  const startDateTime = parseSlotToISO(intake.selectedSlot);
  const endDateTime = new Date(new Date(startDateTime).getTime() + 30 * 60 * 1000); // 30 min

  const event = {
    summary: `Octio Discovery Call — ${intake.contact.company || intake.contact.name}`,
    description: buildEventDescription(intake),
    start: {
      dateTime: startDateTime,
      timeZone: 'Africa/Johannesburg',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Africa/Johannesburg',
    },
    attendees: [
      { email: intake.contact.email, displayName: intake.contact.name },
      { email: process.env.OCTIO_TEAM_EMAIL! },
    ],
    conferenceData: {
      createRequest: {
        requestId: `octio-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const result = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all', // sends calendar invites to attendees
  });

  return {
    eventId: result.data.id!,
    meetLink: result.data.hangoutLink!,
    calendarLink: result.data.htmlLink!,
  };
}

function buildEventDescription(intake: IntakeData): string {
  return `
Discovery call booked via the Octio website.

**Service of interest:** ${intake.selectedService}
**Budget range:** ${intake.budget}
**Company:** ${intake.contact.company || '(not provided)'}

**Project details:**
${intake.requirements}

${intake.voiceNoteUrl ? `**Voice note:** ${intake.voiceNoteUrl}` : ''}
${intake.attachmentUrl ? `**Attachment:** ${intake.attachmentUrl}` : ''}

---
This event was auto-generated by the Octio booking agent.
  `.trim();
}
```

**Critical:** `conferenceDataVersion: 1` is required for Google Meet link generation. `sendUpdates: 'all'` makes Google email the attendees automatically.

### Gmail confirmation email logic

In `src/services/gmail.ts`:

```typescript
async function sendBookingConfirmation(intake: IntakeData, calendarResult: CalendarEventResult) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });

  const emailSubject = `Your Octio discovery call is locked in — ${intake.selectedSlot.label}`;
  const emailBody = buildClientEmailHtml(intake, calendarResult);

  const message = [
    `From: Octio <${process.env.GOOGLE_SENDER_EMAIL}>`,
    `To: ${intake.contact.email}`,
    `Cc: ${process.env.OCTIO_TEAM_EMAIL}`,
    `Subject: ${emailSubject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    emailBody,
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  });
}
```

The email HTML should be warm and on-brand (orange accents, Syne font vibe). Include:
- Confirmation of the slot with the Meet link
- A brief recap of what they told the agent
- What to expect on the call
- An "add to calendar" link (the calendar invite already handles this, but belt and braces)

### File upload handling

Voice notes and attachments come in as multipart. Store them on disk at `/var/octio/uploads/{year}/{month}/{uuid}-{originalName}`. In Phase 1, just return the local path. For Phase 2 or prod, upgrade to S3-compatible storage (Cloudflare R2, Backblaze B2, or minio on gen4).

```typescript
async function saveUpload(file: MultipartFile, type: 'voice' | 'attachment'): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const dir = `/var/octio/uploads/${year}/${month}`;
  await fs.mkdir(dir, { recursive: true });

  const ext = type === 'voice' ? 'webm' : path.extname(file.filename);
  const filename = `${randomUUID()}-${type}${ext}`;
  const fullPath = `${dir}/${filename}`;

  await fs.writeFile(fullPath, await file.toBuffer());

  // Return a URL accessible by gmail recipients (requires serving /var/octio/uploads via nginx)
  return `https://octio.co.za/uploads/${year}/${month}/${filename}`;
}
```

**Important:** Configure nginx on gen4 to serve `/var/octio/uploads/` at `octio.co.za/uploads/` as static files with long cache headers. Restrict to GET only.

### Intake persistence

Store every booking in a local sqlite DB on gen4 so we don't lose data if email sending fails. Use `better-sqlite3` — simple, fast, zero config.

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  intake_json TEXT NOT NULL,
  slot_start TEXT NOT NULL,
  calendar_event_id TEXT,
  meet_link TEXT,
  email_sent INTEGER DEFAULT 0,
  summary_sent INTEGER DEFAULT 0,  -- phase 2
  status TEXT DEFAULT 'pending'
);
```

### Frontend integration

Update `src/features/octo/octoApi.ts`:

1. Add a new function `submitBooking(state: WizardState): Promise<{ meetLink: string }>`
2. It should:
   - Build a FormData
   - JSON.stringify the intake data, append as `intake` field
   - If `state.voiceNote` is set, append as `voiceNote` field
   - If `state.attachedFile` is set, append as `attachment` field
   - POST to `/api/octo/book`
   - Return the meet link on success
3. Set `DEV_MODE = false` once the backend is live

Update `src/features/octo/useWizardState.ts`:

In `transitionToStep`, when the action is `SELECT_SLOT`, after getting the AI response, call `submitBooking(state)` and store the result. The AI canned response for `complete` step should then reference `state.meetLink`.

Alternative: submit on the 'budget' step (last step) so the backend has the complete intake including budget before creating the calendar event. **This is cleaner** — do it this way.

### Deployment to gen4

```bash
# On gen4:
cd /srv
git clone https://github.com/simekani/octio-backend.git  # or wherever this repo lives
cd octio-backend/backend
cp .env.example .env.local  # fill in Google creds
docker compose up -d --build
```

`docker-compose.yml` should:
- Expose port 4001 (internal, behind nginx)
- Mount `/var/octio/uploads` for file storage
- Mount `/var/octio/data` for sqlite DB
- Auto-restart on failure
- Connect to the existing gateway nginx network (see other services on gen4 for the pattern, e.g. `fleximobile-qa-*`)

Then add to gen4's nginx config:
```nginx
location /api/octo/ {
    proxy_pass http://octio-backend:4001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 20M;  # for voice note + file upload
}

location /uploads/ {
    alias /var/octio/uploads/;
    autoindex off;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

## Phase 2 — Post-call summary plan (for later)

### Key constraints to know

1. **Google Meet transcripts are delayed ~45 min** after a meeting ends
2. **Manual trigger required**: Someone in the Meet UI must click "More → Turn on transcription". There is **no API to start it programmatically**.
3. **Workspace-domain only**: The native API only returns transcripts for meetings where at least one participant is in your Workspace domain. For external client calls, the Octio team member on the call counts, so this is fine.
4. **Requires Workspace Business Standard or higher** for Meet transcripts to be available at all.

### Worker architecture

```
┌──────────────────────────────────────┐
│ Cron every 15 minutes                │
│   ↓                                  │
│ Query sqlite for bookings where:     │
│   - slot_start < now - 30min         │
│   - summary_sent = 0                 │
│   - status != 'failed'               │
│   ↓                                  │
│ For each booking:                    │
│   1. Fetch conference record from    │
│      Google Meet API                 │
│   2. If transcript_available: fetch  │
│   3. Send to Claude API with system  │
│      prompt + intake + transcript    │
│   4. Parse response → client email   │
│      + internal email + proposal     │
│   5. Gmail send both                 │
│   6. Mark summary_sent = 1           │
│   7. If 2hr after call and no        │
│      transcript yet: mark failed,    │
│      send fallback "please write     │
│      notes manually" email           │
└──────────────────────────────────────┘
```

### Google Meet API endpoints needed

- `spaces.list` or `conferenceRecords.list` — find the record for the call
- `conferenceRecords.transcripts.list` — get transcript ID
- `conferenceRecords.transcripts.entries.list` — fetch the actual transcript entries
- Scopes: `https://www.googleapis.com/auth/meetings.space.readonly`

Docs: https://developers.google.com/workspace/meet/api/guides/transcripts

### Claude prompt for summarisation

System prompt (draft — tune in practice):
```
You are an expert AI assistant at Octio, a tech consultancy that builds agentic AI, custom applications, and modernisation.

You've been given a transcript of a discovery call between an Octio team member and a potential client, plus the intake form data the client submitted before the call.

Generate TWO outputs:

1. CLIENT EMAIL — A warm, professional recap for the client. Include:
   - Thanks for the call
   - 3-5 bullet points of what was discussed
   - Clear next steps with owners and dates
   - Contact info
   - Tone: confident, human, not corporate

2. INTERNAL EMAIL — A brief for the Octio team. Include:
   - Client context (who they are, what they need)
   - Key points from the call the client might not have said explicitly
   - Scope estimate (rough: S/M/L/XL based on what was discussed)
   - Draft proposal outline with sections: scope, approach, timeline, deliverables
   - Red flags or opportunities

Return as JSON: { "clientEmail": { "subject": "...", "body": "..." }, "internalEmail": { "subject": "...", "body": "..." } }
```

Use `@anthropic-ai/sdk` from Node. Set temperature to 0.4 for consistency.

---

## Phase 3 — RAG for free chat (lowest priority)

Current `/api/octo/rag` is a stub with canned regex-matched responses in `src/features/octo/octoApi.ts::askOctio()`. To replace:

1. Collect Octio content: team bios, case studies, services, pricing tiers, blog posts, FAQs. Markdown files in a `content/` directory.
2. Chunk into ~500 token pieces
3. Embed with OpenAI `text-embedding-3-small` or Voyage AI
4. Store in Supabase pgvector or local sqlite-vss
5. On query: embed → top 3 chunks → pass to Claude with:
   ```
   You are Octio's website AI assistant. Answer the user's question using ONLY the context below.
   If the answer isn't in the context, say "That's best answered on our discovery call — I'll make sure the team addresses it."

   Context:
   {retrieved_chunks}

   Question: {user_question}
   ```
6. Return the plain text answer

---

## Testing plan

### Phase 1 testing

1. **Local dev**:
   - Run backend with `npm run dev`
   - Use a curl script in `backend/scripts/test-booking.sh` that POSTs a fake intake
   - Verify calendar event created in the dev Google account
   - Verify email received
2. **Frontend integration**:
   - Flip `DEV_MODE = false` in `octoApi.ts`
   - Run through the full wizard locally
   - Verify Meet link comes back and renders in the complete step
3. **Staging (gen4)**:
   - Deploy via docker-compose
   - Test end-to-end with a real client email (use a personal email first)
   - Verify calendar invite arrives on both sides
   - Verify the Meet link works

### Phase 2 testing

- Requires a real meeting. Schedule a fake discovery call with a test client email, join it, turn on transcription, talk for 2 minutes about something specific, end the meeting, wait 45-60 min, check that the summary emails arrive with reasonable content.

---

## Open questions for the user (ask before starting)

1. What's the **primary Octio email** that should be the calendar event organiser and email sender? (probably `hello@octio.co.za`)
2. What's the **internal team email** that should be CC'd on every booking? (could be the same address)
3. Who **owns the Google Cloud project setup** (steps in "Google OAuth setup" section)? The user said they'd do this, but you may need to walk them through it when they're ready.
4. **Domain**: Is `octio.co.za` DNS pointing to gen4 yet? Earlier in the session we discovered it points to `156.38.139.114` via GoDaddy DNS, which is *not* gen4. Either the DNS needs updating or we pick a different subdomain (like `api.octio.local` → gen4, with nginx vhost).
5. What subdomain should the API live on? Options: `octio.co.za/api/octo/*`, `api.octio.co.za`, or a staging subdomain like `staging.octio.co.za/api/*`.

---

## Files the next agent will create

### New files (backend)
```
backend/package.json
backend/tsconfig.json
backend/Dockerfile
backend/docker-compose.yml
backend/.env.example
backend/.gitignore
backend/README.md
backend/src/server.ts
backend/src/config.ts
backend/src/logger.ts
backend/src/types.ts
backend/src/routes/book.ts
backend/src/routes/rag.ts
backend/src/routes/health.ts
backend/src/services/google-auth.ts
backend/src/services/calendar.ts
backend/src/services/gmail.ts
backend/src/services/storage.ts
backend/src/services/intake-db.ts
backend/scripts/get-refresh-token.ts
backend/scripts/test-booking.sh
```

### Frontend files to modify
```
src/features/octo/octoApi.ts          ← replace canned responses with real API calls
src/features/octo/useWizardState.ts   ← call submitBooking on last step
src/features/octo/types.ts            ← add BookingResult type
.env.local                            ← VITE_API_BASE_URL=https://octio.co.za
vite.config.ts                        ← configure API proxy for local dev
```

### New files (frontend)
```
.env.example                          ← documents required env vars
```

---

## Things to NOT change

- The 3D orb (`OctoOrb.tsx`, `OctoEyes.tsx`, `OctoParticles.tsx`, `OctoScene.tsx`) — works great, don't touch
- The wizard state machine logic in `useWizardState.ts` — only add booking submission, don't restructure the step order (user deliberately placed budget last)
- The entrance animation timing in `Hero.tsx` — user approved the current timing
- The design system (`index.css`, `tailwind.config.js`, fonts) — on brand, don't change
- The content copy in `About.tsx`, `Services.tsx`, `Contact.tsx`, `Hero.tsx`, `Footer.tsx` — user spent time getting it right
- The wizard flow order: greeting → requirements → contact → schedule → budget → complete → freechat (budget is intentionally last)

---

## Session context for the next agent

The user is **simekani**, a founder building Octio. They use:
- gen4 server (Debian + Docker + nginx, existing services like fleximobile run there)
- Google Workspace for email
- They're in South Africa (Pretoria), currency is ZAR

The user values:
- Craft and quality over speed
- Asking clarifying questions before building
- SOLID principles
- No emojis in code — use lucide icons instead
- Proper component separation (no monolithic files)
- Using the user's existing infrastructure (gen4) over spinning up new services

Previous commit that has the stable frontend: `6b8d535` — `Rebrand to Octio website with new component architecture`.

The frontend has been rebuilt significantly since then. Everything in `src/features/octo/*` and the new 3D/wizard flow in `src/components/Hero.tsx` was added in this session.

---

## Definition of done for Phase 1

- [ ] Backend deployed on gen4 and reachable via `curl https://<host>/api/health`
- [ ] `POST /api/octo/book` creates a real Google Calendar event with a Meet link
- [ ] Confirmation email arrives at the client's inbox within 10 seconds of submission
- [ ] Frontend `DEV_MODE` flipped to `false` and the wizard creates real bookings in production
- [ ] Voice notes and attachments upload successfully (up to 10MB total)
- [ ] Bookings are logged in the sqlite DB
- [ ] User has received a test booking confirmation email themselves to verify end-to-end
- [ ] README.md in `backend/` explains how to set up Google credentials and run locally

## Definition of done for Phase 2

- [ ] Cron worker deployed on gen4, runs every 15 minutes
- [ ] A real test call with transcription on → summaries arrive within ~90 minutes of the call ending
- [ ] Client gets the warm recap email, Octio team gets the recap + proposal draft
- [ ] Failure case handled: if no transcript after 2 hours, fallback email prompts the team to write manual notes
- [ ] sqlite tracks `summary_sent` state per booking so we never double-send
