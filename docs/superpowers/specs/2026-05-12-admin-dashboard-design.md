# Octio Admin Dashboard — Design

**Status:** Draft, awaiting approval
**Author:** Simekani + Claude (Opus 4.7)
**Last updated:** 2026-05-12

---

## 1. Goal

An internal operations cockpit for the Octio team to see what's happening on
`octio.co.za` end-to-end: every inbound lead, every booking, the health of
the AI agent, and the state of background jobs and outgoing email.

Replaces "SSH into prod + tail logs + run SQL queries by hand" as the
day-to-day operational workflow.

## 2. Audience & access

### Phase 1–3 audience

- 2–5 internal Octio team members, all on `@octio.co.za` Workspace accounts
- Day 1: every authenticated `@octio.co.za` user is full admin (no role split)
- Day 30+: introduce `admin / agent / viewer` if/when sensitive actions need gating

### Phase 4 audience (the SaaS reframe)

The dashboard's eventual fate is **the customer-facing admin UI for the
productised Octio platform**. We sell the AI lead-gen / agent / booking stack
to other businesses; each customer is a tenant; the same screens we're
building now will be how they run their own version of `octio.co.za`-style
operations.

This means **every architectural decision in Phase 1–3 must keep the
multi-tenant door open**. We aren't building multi-tenancy today, but we
*are* avoiding decisions that would force a rewrite to add it later.

## 3. High-level architecture

```
┌────────────────────────────────────────────┐
│ octio.co.za (public)                       │  Existing Vite + React + Tailwind app
│   /                                        │
│   /products/:slug                          │
│   /services/:slug                          │
│   /privacy                                 │
│                                            │
│   /admin/login          ◄── NEW            │  Same Vite app, new route group
│   /admin                                   │  Tailwind reused, dark theme reused,
│   /admin/leads                             │  components partially reused.
│   /admin/leads/:id                         │  Lazy-loaded chunk — public visitors
│   /admin/bookings                          │  never download admin JS.
│   /admin/bookings/:id                      │
│   /admin/agent                             │
│   /admin/ops                               │
└────────────────────────────────────────────┘
                  │
                  │ all /api/admin/*  requests
                  ▼
┌────────────────────────────────────────────┐
│ Octio Worker (Hono on Node)                │  Existing worker, new route module
│   /chat/*                                  │
│   /book                                    │
│   /privacy/*                               │
│   /api/admin/auth/login      ◄── NEW       │  New routes file:
│   /api/admin/leads/*                       │  worker/src/routes/admin/*.ts
│   /api/admin/bookings/*                    │
│   /api/admin/agent/*                       │
│   /api/admin/ops/*                         │
│                                            │  All gated by SSO middleware
└────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────┐
│ Postgres                                   │  Existing tables, two new ones
│   conversation_events                      │
│   bookings                                 │
│   emails_sent                              │
│   contacts                                 │
│   ab_test_assignments                      │
│   cron_runs              ◄── NEW           │
│   admin_audit_log        ◄── NEW           │
│   admin_saved_views      ◄── NEW (Phase 2) │
└────────────────────────────────────────────┘
```

No new services, no new infrastructure. Same deploy pipeline, same hosts.

## 4. Authentication & authorisation

> **v1 deliberate shortcut:** username + password against an env-var allowlist.
> Google SSO migration is planned but deferred (see end of section).

### Sign-in flow (v1 — env-creds)

```
Browser                                Worker
   │                                       │
   ├─ GET /admin/login ────────────────────┤
   │   (render React login form)           │
   │                                       │
   ├─ POST /api/admin/auth/login ──────────►
   │   { email, password }                 ├─ Compare against env allowlist
   │                                       │  bcrypt-hashed passwords stored in env
   │                                       │  reject if no match (rate-limited)
   │   ◄── Set-Cookie: session=JWT ────────┤  Issue session JWT, claims:
   │                                       │  { email, name, role: 'admin', iat, exp }
   │                                       │
   ├─ All future /api/admin/* requests ────►
   │   carry the JWT cookie                ├─ Middleware verifies JWT signature
   │   ◄── JSON response ──────────────────┤
   │
   ├─ POST /api/admin/auth/logout ─────────► clears cookie
```

### Env-var allowlist format

```
# worker/.env additions
ADMIN_SESSION_SECRET=64-byte-random-hex-string     # signs the JWT
ADMIN_USERS=email1:bcrypt-hash,email2:bcrypt-hash,…  # comma-separated entries
```

Example with realistic values:

```
ADMIN_USERS=simekani@octio.co.za:$2b$12$abc…hash1,accounts@octio.co.za:$2b$12$def…hash2
```

- Passwords are **bcrypt-hashed** before being put in the env (cost factor 12). We never store plaintext, even in env.
- The hashes are generated locally with a helper script (see Section 10 build sequence) — `pnpm tsx worker/scripts/hash-password.ts`
- Each user has their own email + hash, so per-user audit trail is preserved (the JWT `email` claim drives `actor_email` in `admin_audit_log`)
- Adding a user = appending one entry to the env file + redeploying. Removing = removing the entry. No DB write.

### Implementation notes

- Worker reads `ADMIN_USERS` once at startup into an in-memory map `{ email → bcryptHash }`
- Login route: rate-limited to 5 attempts per IP per 15 min (uses existing rate-limit middleware)
- Issue session JWT signed with `ADMIN_SESSION_SECRET`, 7-day expiry, claims: `email`, `role: 'admin'`, `iat`, `exp`
- Cookie: `httpOnly`, `secure`, `sameSite=lax`, scoped to `octio.co.za`
- Middleware on `/api/admin/*` verifies signature + expiry, attaches `req.adminUser = { email, role }`
- Audit log writes use `req.adminUser.email` as `actor_email`

### Failure modes

| Scenario | Response |
|---|---|
| Wrong password / email | 401, generic "Invalid credentials" (no email enumeration) |
| Rate-limit hit | 429, "Too many attempts" |
| Missing / expired JWT | 401, frontend redirects to `/admin/login` |
| Forged JWT | Signature check fails → 401 |
| `ADMIN_USERS` env missing or empty | Worker boot logs ERROR, all `/api/admin/*` return 503 |

### Honest trade-offs vs Google SSO

| Aspect | Env creds (v1) | Google SSO (deferred) |
|---|---|---|
| Setup time | 30 min (hash + paste env, ship) | 4–6 hours (OAuth client, consent screen, callbacks) |
| New-user onboarding | Edit env + redeploy | Add to Workspace, instant access |
| Offboarding | Remove env entry + redeploy | Suspend Workspace user, instant cutoff |
| Password rotation | Manual + redeploy | Google forces it automatically |
| Single password reuse risk | Yes — each user picks their own, hopefully strong | No — Google enforces 2FA etc. |
| Audit trail | Per-user (email in JWT) | Same |
| Phase 4 multi-tenant | Doesn't generalise — would need rebuild | Cleanly extends to tenant-scoped SSO |

### Migration path to Google SSO (later)

When env-creds become painful (3+ users churning, or before Phase 4 SaaS):

1. Wire `/api/admin/auth/google` endpoint behind a feature flag
2. Login page shows both options for one release
3. After everyone's logged in via Google once, remove env-cred path
4. JWT shape stays the same — only auth mechanism changes

The session JWT design (in §4 below) is deliberately auth-mechanism-agnostic
so this swap doesn't ripple.

## 5. Data model changes

### New table: `cron_runs`

Track when background jobs run + their outcomes.

```sql
CREATE TABLE cron_runs (
  id              BIGSERIAL PRIMARY KEY,
  job_name        TEXT NOT NULL,         -- 'abandonment-recovery' | 'follow-up-sequence'
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  status          TEXT NOT NULL,         -- 'running' | 'success' | 'failed'
  error           TEXT,                  -- null on success
  items_processed INTEGER DEFAULT 0,
  items_failed    INTEGER DEFAULT 0
);
CREATE INDEX cron_runs_job_started_idx ON cron_runs (job_name, started_at DESC);
```

Cron modules write to this table on each invocation. The ops dashboard reads
the last N rows per job.

### New table: `admin_audit_log`

Every mutation through `/api/admin/*` writes a row here.

```sql
CREATE TABLE admin_audit_log (
  id           BIGSERIAL PRIMARY KEY,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_email  TEXT NOT NULL,          -- from JWT claims
  action       TEXT NOT NULL,          -- 'lead.status.changed' | 'email.retried' | ...
  target_kind  TEXT,                   -- 'lead' | 'booking' | 'email' | null
  target_id    TEXT,                   -- session_id, booking_id, email_id
  diff         JSONB                   -- { before, after } for updates; freeform for actions
);
CREATE INDEX audit_actor_idx ON admin_audit_log (actor_email, occurred_at DESC);
CREATE INDEX audit_target_idx ON admin_audit_log (target_kind, target_id, occurred_at DESC);
```

### New table: `admin_saved_views` (Phase 2)

```sql
CREATE TABLE admin_saved_views (
  id            BIGSERIAL PRIMARY KEY,
  owner_email   TEXT NOT NULL,
  surface       TEXT NOT NULL,         -- 'leads' | 'bookings' | 'agent' | 'ops'
  name          TEXT NOT NULL,
  filters       JSONB NOT NULL,        -- serialized filter state
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX saved_views_owner_idx ON admin_saved_views (owner_email, surface);
```

### Additions to existing tables

- `bookings.status` — add `'cancelled'` to the existing enum if not present
- `bookings.notes` — add `TEXT` nullable column for team notes
- `contacts.lifecycle_status` — add `TEXT` with values `'new' | 'contacted' | 'qualified' | 'won' | 'lost'` (Phase 2 Kanban)

## 6. Sitemap

```
/admin/login                          Public, renders sign-in
/admin                                Overview — 4 cards summary
/admin/leads                          Lead inbox (table + filters)
/admin/leads/:sessionId               Lead detail (transcript + actions)
/admin/bookings                       Bookings list (Phase 1) / calendar (Phase 3)
/admin/bookings/:id                   Booking detail (call brief)
/admin/agent                          Agent observability (funnel + recent + anomalies)
/admin/agent/conversations/:id        Specific conversation deep-dive
/admin/ops                            Cron runs + email log
/admin/audit                          Audit log read view (Phase 3)
```

## 7. API design

### Conventions

- All routes under `/api/admin/*`, all JSON request/response
- All require valid SSO session cookie; 401 if absent/invalid
- All mutations (`POST` / `PATCH` / `DELETE`) write to `admin_audit_log`
- All list endpoints support pagination: `?page=1&perPage=50`, return `{ data, pagination: { total, page, perPage } }`
- All timestamps are ISO 8601 UTC strings
- Errors: `{ error: string, code: string, details?: any }`, HTTP status `4xx/5xx`

### `POST /api/admin/auth/login`

Exchange email + password against env-var allowlist for a session JWT.

```typescript
// Request
{
  email: string,
  password: string
}

// Response 200
// Sets httpOnly cookie `octio_admin_session`
{
  user: { email: string, role: 'admin' }
}

// Response 401
{ error: "Invalid credentials", code: "BAD_CREDENTIALS" }

// Response 429
{ error: "Too many attempts", code: "RATE_LIMITED", retryAfter: 900 }

// Response 503
{ error: "Admin auth not configured", code: "NO_ADMIN_USERS" }
```

### `GET /api/admin/me`

Whoami — used by frontend on every load to verify session.

```typescript
// Response 200
{ email: string, role: 'admin' }
// Response 401 if no/expired session
```

### `POST /api/admin/auth/logout`

Clears the session cookie. Always returns 204.

### `GET /api/admin/leads`

Lead inbox.

```typescript
// Query params
{
  intent?: 'general' | 'contact' | 'ask' | 'onboard',
  status?: 'new' | 'contacted' | 'qualified' | 'won' | 'lost',
  from?: string,                  // ISO date
  to?: string,
  search?: string,                // free text on name/email/last message
  page?: number,
  perPage?: number
}

// Response 200
{
  data: Array<{
    sessionId: string,
    contact: { email: string|null, name: string|null, phone: string|null },
    intent: string,
    entryPath: string,
    selectedService: string|null,
    firstSeenAt: string,
    lastEventAt: string,
    eventCount: number,
    bookingId: string|null,
    lifecycleStatus: 'new'|'contacted'|'qualified'|'won'|'lost',
    summary: string|null          // last user answer truncated
  }>,
  pagination: { total: number, page: number, perPage: number }
}
```

### `GET /api/admin/leads/:sessionId`

```typescript
// Response 200
{
  sessionId: string,
  contact: { ... },
  intent: string,
  entryPath: string,
  events: Array<{
    occurredAt: string,
    action: 'session_start'|'step_view'|'step_answer'|'step_skip'|'session_complete'|'followup_question',
    stepId: string|null,
    value: string|null,
    metadata: Record<string, unknown>|null
  }>,
  booking: BookingSummary|null,
  lifecycleStatus: string,
  notes: string|null
}
```

### `PATCH /api/admin/leads/:sessionId`

```typescript
// Request
{
  lifecycleStatus?: 'new'|'contacted'|'qualified'|'won'|'lost',
  notes?: string
}

// Response 200 — updated record
// Audit log: action='lead.updated', target_kind='lead', target_id=sessionId, diff={before, after}
```

### `GET /api/admin/bookings`

```typescript
// Query params
{
  range?: 'today'|'week'|'month'|'all',
  status?: 'pending'|'confirmed'|'cancelled',
  page?: number,
  perPage?: number
}

// Response 200
{
  data: Array<{
    id: string,
    slotStartAt: string,
    slotEndAt: string,
    contact: { email: string, name: string|null, company: string|null },
    selectedService: string|null,
    meetLink: string|null,
    calendarLink: string|null,
    status: 'pending'|'confirmed'|'cancelled',
    sessionId: string,
    prepEmailSent: boolean,
    reminderEmailSent: boolean,
    feedbackEmailSent: boolean
  }>,
  pagination: { ... }
}
```

### `GET /api/admin/bookings/:id`

Full call brief — joins lead conversation, project blueprint if generated,
emails sent.

```typescript
// Response 200
{
  booking: { ... },
  callBrief: {
    summary: string,
    agenda: string[],
    contactBackground: string,
    keyAnswers: Record<string, string>
  } | null,
  emailHistory: Array<{ kind: string, sentAt: string, status: string }>,
  followUpStatus: { prep: boolean, reminder: boolean, feedback: boolean }
}
```

### `PATCH /api/admin/bookings/:id`

```typescript
// Request
{ status?: 'pending'|'confirmed'|'cancelled', notes?: string }
```

### `GET /api/admin/agent/funnel`

Conversion funnel across all sessions.

```typescript
// Query params
{
  from?: string, to?: string,
  intent?: string,
  variant?: 'A'|'B'
}

// Response 200
{
  totalSessions: number,
  stepStats: Array<{
    stepId: string,
    views: number,
    answers: number,
    skips: number,
    dropoffPct: number          // % of visitors who didn't progress past this step
  }>,
  bookingRate: number,           // % of sessions that booked
  variantBreakdown: {
    A: { sessions: number, bookings: number, conversionRate: number },
    B: { sessions: number, bookings: number, conversionRate: number }
  } | null
}
```

### `GET /api/admin/agent/recent`

```typescript
// Query params: ?limit=50
// Response 200
{
  data: Array<{
    sessionId: string,
    startedAt: string,
    endedAt: string|null,
    duration: number|null,        // seconds
    stepCount: number,
    intent: string,
    bookingCompleted: boolean,
    lastError: string|null,
    contactPreview: string|null   // 'sa****@octio.co.za' style
  }>
}
```

### `GET /api/admin/ops/crons`

```typescript
// Query params: ?job=&limit=50
// Response 200
{
  data: Array<{
    id: number,
    jobName: string,
    startedAt: string,
    finishedAt: string|null,
    status: 'running'|'success'|'failed',
    durationMs: number|null,
    itemsProcessed: number,
    itemsFailed: number,
    error: string|null
  }>
}
```

### `GET /api/admin/ops/emails`

```typescript
// Query params: ?kind=&status=&limit=50
// Response 200
{
  data: Array<{
    id: number,
    contactEmail: string,
    kind: 'booking_confirmation'|'abandonment_recovery'|'prep'|'reminder'|'feedback'|'resources'|'project_blueprint',
    sessionId: string|null,
    sentAt: string,
    status: 'sent'|'failed',
    error: string|null,
    messageId: string|null      // Gmail API response ID
  }>
}
```

### `POST /api/admin/ops/emails/:id/retry`

Re-fires the original send. Useful when `status === 'failed'`.

```typescript
// Response 200: { newSentId: number }
// Audit log: action='email.retried', target_kind='email', target_id=id
```

### Phase 2 additions

- `GET/POST/DELETE /api/admin/saved-views/:surface` — saved filter combinations
- `POST /api/admin/leads/bulk` — bulk action endpoint
- `GET /api/admin/export/:resource.csv` — CSV downloads
- `GET /api/admin/events/stream` — Server-Sent Events for realtime updates

### Phase 3 additions

- `GET /api/admin/audit` — audit log read view
- `GET /api/admin/bookings/calendar` — calendar-shaped response (events grouped by day)
- `POST /api/admin/leads/:id/assign` — assignment / per-row owner
- `POST /api/admin/webhooks/:provider` — external triggers (e.g. n8n inbound)

## 8. UI components & libraries

Single dependency policy: prefer existing libs over new ones, prefer headless
over styled (we have Tailwind).

| Need | Library | Why |
|---|---|---|
| Table | `@tanstack/react-table` v8 | Headless, full-featured, used everywhere |
| Form | `react-hook-form` + `zod` + `@hookform/resolvers` | Already in app stack |
| Modal / Drawer | `@radix-ui/react-dialog` | Already implied by aesthetic — fits dark theme |
| Toasts | `sonner` | Tiny, beautiful out-of-box, headless |
| Date picker | `react-day-picker` | Lightweight, theme-friendly |
| CSV export | `papaparse` | 14kb, single dep |
| Charts | `recharts` | Composable, themeable, smaller than echarts |
| Global search | `cmdk` | Spotlight-style search palette |
| Drag-drop (Phase 3) | `@dnd-kit/core` + `@dnd-kit/sortable` | Modern, accessible, smaller than react-dnd |
| Calendar (Phase 3) | `react-big-calendar` | Bonkers feature set, drop-in, accepts custom theme |
| SSE / realtime | Native `EventSource` | No lib needed |

Bundle impact: roughly +180kb gzipped across all the above when fully loaded. Admin
JS is a separate lazy chunk; public visitors never download it.

## 9. Phase breakdown

### Phase 1 — v1 baseline (≈ 6 days)

Ship the operational cockpit with all four surfaces, light filtering, no
realtime, no Kanban. Confirms the architecture and proves the value before
investing more.

**Includes:**

- SSO + JWT middleware + login page
- Admin layout shell (sidebar nav, topbar, protected route wrapper)
- `/admin` overview with 4 summary cards
- `/admin/leads` — table, search, intent filter, date filter
- `/admin/leads/:id` — full transcript view, status update, notes
- `/admin/bookings` — table grouped by date, status filter
- `/admin/bookings/:id` — call brief view
- `/admin/agent` — funnel chart, recent sessions table, basic anomaly callouts
- `/admin/ops` — cron run history, email send log, single-row retry
- Toast notifications for actions
- Audit log writes (no read view yet)
- `cron_runs` table + cron modules wired to write to it
- `admin_audit_log` table

**Out of v1:**

- Inline editing
- Saved views
- Bulk actions
- CSV export
- Realtime updates
- Calendar view
- Kanban
- Audit log read view

### Phase 2 — productivity layer (≈ 5–6 days, after v1 has soaked)

Productivity wins triggered by real usage pain. Each item independently
shippable.

- Inline cell edit (status changes without opening detail)
- Saved views / saved filters (LocalStorage v1 → `admin_saved_views` v2)
- Bulk actions on leads (multi-select → bulk status / bulk email)
- CSV export from any table
- Recharts on agent observability (funnel, line, sparklines)
- Activity feed (audit log read view, virtual list)
- Global cmd-K search across leads / bookings / contacts
- Realtime updates via SSE for new leads / new bookings

### Phase 3 — scale features (≈ 6–7 days)

Only when team has > 2 admins or > 50 active leads.

- Calendar view (month/week/day) for bookings
- Kanban for lead lifecycle (new → contacted → qualified → won/lost)
- Audit log diff viewer (show before/after on changes)
- Approval gates (e.g. blueprint email needs manager approval before send)
- Per-row permissions (owner-based visibility)
- Webhook listeners (`POST /api/admin/webhooks/n8n`, etc.)
- Embed widget for Notion / Loom in lead detail panels
- Form-from-schema generator for ad-hoc data capture

### Phase 4 — Productise as multi-tenant SaaS (separate ~6–10 week effort)

Take everything we built in Phase 1–3 and turn it into a sellable platform.
Octio becomes Tenant 0 — every screen they use is the same screen our
customers will use.

**The big additions in Phase 4:**

1. **Tenancy**
   - `tenants` table, every row in every existing table gets `tenant_id`
   - Tenant resolution per request (subdomain `{tenant}.octio.app` or path
     `octio.app/t/{tenant}` — TBD in Phase 4 design)
   - DB-level isolation via Postgres Row Level Security policies
   - JWT carries `tenant_id` in addition to user identity

2. **Tenant onboarding wizard**
   - Customer signs up → we provision a tenant record
   - Setup wizard captures: brand (logo, primary colour, font), offerings
     catalogue (replaces hardcoded `services.json`), pricing tiers, Google
     OAuth connection (their calendar + their support@ alias), lead
     notification destination (their Slack / email / webhook), agent prompt
     tone overrides
   - Output: a working AI agent on their own subdomain in < 15 minutes

3. **Configurable AI agent**
   - Octo's prompt becomes a template, populated per-tenant from setup config
   - Knowledge base (services.json equivalent) is editable per-tenant via UI
   - Step engine flows become tenant-configurable
   - BYOK option for AI API keys (customer brings their own Kimi / OpenAI
     / Anthropic key — transparent cost scaling)

4. **Billing**
   - Stripe subscription management with plans (e.g. Starter / Growth /
     Scale) and usage metering on conversations, LLM tokens, bookings
   - Trial period, plan upgrades, invoicing, ZA VAT
   - Per-tenant cost ceilings to prevent runaway LLM bills

5. **Embeddable widget option**
   - Customers can paste a `<script>` tag on their own site
   - Lighter bundle (drop Three.js; 2D CSS orb only)
   - Cross-origin chat experience postMessage-bridged to the worker

6. **Customer dashboard polish**
   - Conversation analytics for customers (funnel, drop-off, conversion)
   - Lead inbox with CRM push (HubSpot / Pipedrive integration)
   - Branded confirmation / follow-up emails

7. **Compliance + ops**
   - DPA template, sub-processor list, per-tenant POPIA/GDPR data export
   - Tenant-scoped audit log (already designed correctly in §5)
   - Rate limiting per tenant
   - Status page

8. **Sales & marketing layer**
   - Marketing site at `octio.app` separate from `octio.co.za`
   - Free-trial signup, demo environment
   - Customer support inbox

**Why Phase 1–3 design supports this:**

- Every API endpoint is already namespaced under `/api/admin/*` — adding a
  `tenant_id` middleware is a one-line change
- Audit log already carries `actor_email`; adds `tenant_id` cleanly
- Email send already uses an env-var sender; Phase 4 replaces env with
  tenant-config lookup
- Calendar OAuth tokens are already stored per-account; Phase 4 stores them
  per-tenant
- Agent prompt is a single Markdown file; Phase 4 makes it a templated row
  in `tenant_agent_config`
- The 4 v1 surfaces (Leads / Bookings / Agent / Ops) are exactly what a
  paying customer wants on day 1

The throughline: **Phase 1–3 builds Octio's internal cockpit; Phase 4 adds
the multi-tenant skin so every other company can have one too.** No
rewrites if we keep the design rules below.

## 9.5. Multi-tenant readiness rules (apply in every phase)

These rules cost nothing today and save weeks of rewriting in Phase 4. Treat
each as a build-time invariant.

| Rule | Why it matters in Phase 4 |
|---|---|
| **Every new table includes `tenant_id BIGINT` from day 1**, even though every row gets `tenant_id = 1` (Octio). Index it. | Adding the column later forces a 30-table migration with downtime. Adding rows with a default is free. |
| **All read queries `WHERE tenant_id = $currentTenant`** through a shared helper. Single-tenant today returns `1`; Phase 4 resolves from JWT. | Forgetting the predicate later = customer A sees customer B's leads. Existential. |
| **No hardcoded Octio strings in agent prompts or system messages**. Move "Octio", "support@octio.co.za", "octio.co.za" into config objects loaded once at startup. | Phase 4 needs to replace those with each tenant's strings. |
| **All Google OAuth tokens are stored in a generic `google_oauth_tokens` table**, not in `.env`. Phase 1 has one row keyed by `tenant_id = 1`. | Phase 4 stores one row per customer. Same code path. |
| **Email send always takes a `senderEmail` parameter** — never reads from `GOOGLE_SENDER_EMAIL` env at the call site. | Phase 4 looks it up from tenant config; today it's `config.googleSenderEmail`. |
| **Calendar service always takes a `calendarId` parameter** — never reads from `BOOKING_CALENDAR_ID` env at the call site. | Same logic. |
| **Agent prompt assembly happens at request time** from named template + tenant config, not by reading a static `.md` file from disk in Phase 4. | Today: load file once, use directly. Tomorrow: same code, but `tenantConfig.promptOverrides` merges in. Build the seam now. |
| **Branding (colours, logo, font) lives in CSS variables**, not hardcoded values in Tailwind config. | One CSS variable swap in Phase 4 = full re-skin per tenant. |
| **Audit log already carries `actor_email`**; design migration to add `tenant_id` cleanly. | One-column ALTER vs schema redesign. |
| **No customer-facing surface assumes "Octio" is the brand**. Use a small `<BrandMark />` component that reads from a `useBrand()` hook. | One Phase 4 swap. |

**Acid test for every PR:** "If I added a `tenant_id` column to every table
tomorrow and switched the JWT to also carry `tenant_id`, what code would
break?" The smaller that surface, the better designed Phase 1–3 is for
Phase 4.

## 10. Build sequence (Phase 1)

| Day | Work |
|---|---|
| 1 AM | Spec review + sign-off |
| 1 PM | Env-cred auth: bcrypt hash helper script, `POST /api/admin/auth/login`, JWT middleware, login page |
| 2 | Admin shell (sidebar nav, topbar, protected route wrapper, `/admin/me`) |
| 3 | `/admin/leads` list + filters + search; `cron_runs` + `admin_audit_log` migrations |
| 4 | `/admin/leads/:id` detail + transcript + status PATCH + audit writes |
| 5 | `/admin/bookings` list + `/admin/bookings/:id` + call brief endpoint |
| 6 AM | `/admin/agent` funnel + recent; `/admin/ops` crons + emails + retry |
| 6 PM | Polish, dark theme alignment, error states, deploy to QA |

After day 6: real-data testing, polish, deploy to production.

## 11. Out of scope

- Editing prompts / pricing / FAQ via UI — still a code deploy in v1+v2
- WhatsApp inbox — deferred; only outbound WA via Twilio integration
- A/B test variant configuration UI — observability only
- Mobile-responsive layouts — internal team uses laptops
- White-label theming — irrelevant until SaaS
- AI-powered "build me a screen" — too brittle for a tool we'll actually rely on
- Customer-facing admin (multi-tenant) — separate product effort

## 12. Risks & open questions

| Risk | Mitigation |
|---|---|
| **Env-cred auth is weaker than SSO** | Bcrypt hashes (cost 12) prevent rainbow-table attacks. Per-user passwords reduce blast radius. Rate-limit login. Migrate to Google SSO before user count grows or before Phase 4 SaaS launch. |
| **Compromised env file = full admin access** | Same risk as today's `GOOGLE_REFRESH_TOKEN` / `KIMI_API_KEY`. Mitigated by Ansible vault encryption + tight SSH access. |
| **Adding/removing users requires a redeploy** | Acceptable at 2–5 users. Trigger to migrate to SSO once it hurts. |
| **JWT secret rotation** breaks all sessions | Phase 1 acceptable (re-login is fine). Phase 3 consider key rotation with grace period. |
| **Postgres write amplification** from audit log | Each mutation writes 1 row to `admin_audit_log` — well under any concern threshold at our volume. |
| **Cron writes to `cron_runs` not atomic with the job itself** | If the job crashes mid-run, we get an "unfinished" row. Add a sweep on boot that marks orphaned `running` rows as `failed`. |
| **Lazy-loaded admin chunk leaks bundle info to public** | Acceptable — admin routes return 401 on data; UI structure being known is not sensitive. |
| **Audit log unbounded growth** | Rotate / archive at 12 months. Cron-job-friendly cleanup task once it matters. |
| **Adding `contacts.lifecycle_status` may conflict with existing status column** | Check existing schema before migration. |
| **react-big-calendar bundle size** | Only loaded when `/admin/bookings/calendar` route is opened, lazy chunk. |

### Open questions for sign-off

1. Should the admin login page be at `/admin/login` (in the SPA) or `/admin/auth/google` (server-rendered redirect to Google)? Latter is more secure but means a flash of non-React content.
2. Do we want the public marketing site to know `/admin/*` exists at all, or should we hide it behind a separate subdomain (`admin.octio.co.za`) for cleanliness? (See Phase 2 of the original gap analysis — currently decided "same domain".)
3. Audit log: write to Postgres only, or also Sentry / similar for real-time monitoring?
4. Cron run records: keep forever or auto-trim at 90 days?

---

## Approval checklist

- [ ] Architecture: same Vite app, /admin route, SSO middleware → approved
- [ ] Data model additions: `cron_runs`, `admin_audit_log`, `admin_saved_views` (P2), `bookings.notes`, `contacts.lifecycle_status` → approved
- [ ] API surface (`/api/admin/*` endpoints in §7) → **needs explicit approval per global rule**
- [ ] Phase 1 scope and 6-day estimate → approved
- [ ] Phase 2 backlog (after v1) → approved
- [ ] Phase 3 backlog → approved
- [ ] Phase 4 = multi-tenant SaaS productisation (separate effort, ~6–10 weeks) → approved as direction
- [ ] Multi-tenant readiness rules in §9.5 — applied to every Phase 1–3 commit → approved
- [ ] Library choices (TanStack, Radix, sonner, recharts, dnd-kit, cmdk) → approved
- [ ] Open questions 1–4 above → answered

Once all checked, implementation starts at Phase 1, day 1.
