# Octio Content Engine — Design

**Status:** Approved (brainstorm 2026-05-12). Phase 1a plan at `~/.claude/plans/staged-marinating-quill.md`.
**Author:** Simekani + Claude (Opus 4.7)
**Last updated:** 2026-05-12
**Repo:** new — `octio-content` (to be scaffolded as the first implementation step)
**SKUs powered by this codebase:** **AI Social Media Manager** + **The Newsletter Engine** (the two products on `octio.co.za/products/*` that share content-distribution mechanics)

## Locked decisions (2026-05-12 brainstorm)

1. **Phase 1 is sliced into 1a + 1b.** Phase 1a ships LinkedIn + Newsletter. Phase 1b adds TikTok briefs after 1a has been used by Octio for ~2 weeks.
2. **LinkedIn API:** Community Management API, posts on `simekani@octio.co.za`'s personal profile. Scopes `r_liteprofile w_member_social`. Company Page support deferred to Phase 3.
3. **Newsletter sender:** DIY via Octio's existing Gmail API + `support@octio.co.za` Send-as alias. `NewsletterSender` interface from day 1 so `BeehiivNewsletterSender` / `MailchimpNewsletterSender` are drop-in alternatives in Phase 1b / Phase 4. **No Beehiiv/Mailchimp dependency in Phase 1a.**
4. **Source curation:** Discord bot listening on `#newsletter-sources` (configured per tenant). URL in any message → scrape via Firecrawl → insert into `content_sources`. No bookmarklet / Slack / web-form day 1.
5. **First newsletter ESP for Octio:** N/A in Phase 1a (we use our own Gmail sender). Beehiiv chosen as the first paid-ESP adapter to build in Phase 1b when we cross 500 subscribers OR start the SaaS productisation.

> **Why one engine for two products:** the Strategist → Drafter → Approval
> → Publisher pipeline is identical. Only the channel adapter changes
> (LinkedIn / TikTok / Mailchimp / Beehiiv / Substack / native SMTP).
> Customers can buy either SKU separately or both bundled — the codebase
> doesn't know or care which plan they're on.

---

## 1. Goal

Build the two content-distribution products Octio already markets:

- `octio.co.za/products/social-media` — AI Social Media Manager
- `octio.co.za/products/newsletter` — The Newsletter Engine

One repo, one approval queue, one brand-voice config, one analytics
view, multiple channel adapters. Octio is Tenant 0 — we use it for our
own LinkedIn / TikTok / Newsletter, prove the loop, then sell it.

Replaces "open LinkedIn, stare at blank composer; open Mailchimp,
panic-draft a newsletter at 11pm on Friday" with "AI plans a week of
content (social + newsletter), drafts each piece in your brand voice,
human approves, system publishes at the right time across every
channel."

## 2. Audience & scope

### Phase 1–3 audience
Internal Octio team. The 2–5 people who'd use the admin dashboard also
use this for our own social. Hardcoded "Octio" brand voice in v1.

### Phase 4 audience
Customers signing up for the AI Social Media Manager product. Each is a
tenant with their own brand voice, channels, calendar, approval queue.

### What we are building (v1)

**Shared across all channels:**
- Content calendar — every drafted, scheduled, published item across all channels in one view
- Approval queue — one inbox of drafts awaiting human review
- Brand voice config — single source of truth, used by all drafter agents
- Analytics dashboard — per-channel and aggregated

**Social channels (v1):**
- LinkedIn — agent drafts text + optional image concept; posts directly via API after approval
- TikTok — agent drafts script + shot list + caption + hashtags as a production brief (not raw video — see §10); human shoots/edits/uploads; agent ingests the URL for analytics

**Newsletter channel (v1):**
- Curate → Draft → Approve → Send pipeline for a weekly newsletter
- ESP integrations day 1: **Mailchimp** + **Beehiiv** (covers ~80% of small-business ESP usage by share). Substack via RSS-import only — Substack doesn't have a clean send API.
- Agent drafts a structured newsletter (intro, 2–3 main sections, link round-up, sign-off) from curated source URLs + brand voice
- Subscriber list managed in the ESP, not Octio (we don't store contacts; we just compose + send)
- Open/click/unsubscribe metrics pulled from the ESP API

### What we are explicitly NOT building (v1)
- Auto-generated TikTok video clips (Sora / Veo / HeyGen) — Phase 2
- Engagement bot (auto-replying to comments) — Phase 2
- Instagram, X / Twitter, Threads, Bluesky — Phase 3
- ConvertKit / MailerLite / Klaviyo / ActiveCampaign — Phase 3 (Mailchimp + Beehiiv cover the immediate need)
- Subscriber list management inside Octio — we route to the customer's ESP, not replace it
- A/B testing of subject lines — Phase 3 once we have data
- Real-time trend hijacking — Phase 3
- Influencer outreach — out of scope, separate product
- A separate marketing site at `content.octio.app` — that's Phase 4 (when productised)

## 3. High-level architecture

```
┌──────────────────────────────────────┐
│ octio-content (new repo)             │
│                                      │
│ apps/web      Vite + React + Tailwind │ ── content.octio.co.za (internal)
│   /login                              │
│   /calendar                           │   Cross-channel weekly calendar
│   /queue                              │   Approval queue — drafts of any channel
│   /draft/:id                          │   Single-draft editor + approve/reject
│   /newsletter/:issueId                │   Newsletter issue composer (multi-section)
│   /analytics                          │
│   /settings                           │   Brand voice, channels, ESPs, schedules
│                                      │
│ services/worker                       │   Hono + Mastra (same stack as octio-worker)
│   /api/content/*                      │
│   cron: content planner (weekly)      │
│   cron: publisher (per-minute)        │
│   cron: newsletter assembler (weekly) │   Builds the weekly issue from sources
│   cron: analytics sync (daily)        │   Pulls metrics from LinkedIn + ESPs
│                                      │
│ packages/shared       Zod schemas     │
│ packages/agents       Mastra agents   │   ContentStrategist
│                                      │   LinkedInDrafter, TikTokDrafter
│                                      │   NewsletterDrafter
│                                      │   EngagementMonitor (Phase 2)
│ packages/channels     Channel adapters│   LinkedIn / TikTok / Mailchimp / Beehiiv
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│ Postgres (separate DB)               │   Same Postgres server as octio-website,
│   tenants                            │   different database name `octio_content`
│   channel_accounts  (OAuth tokens)    │   LinkedIn + TikTok + Mailchimp + Beehiiv
│   content_sources    (curated URLs)   │
│   content_calendar                    │
│   drafts                              │
│   newsletter_issues                   │   Newsletter-specific (sections + content)
│   posts                              │   Published items (any channel)
│   post_analytics                      │
│   audit_log                           │
└──────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│ External APIs                        │
│   LinkedIn Marketing API              │   Personal + Page posting
│   TikTok Content Posting API          │   Phase 2 — direct upload
│   Mailchimp API                       │   Campaigns + send + analytics
│   Beehiiv API                         │   Posts + send + analytics
│   OpenAI / Anthropic / Kimi          │   Drafter LLMs
│   Firecrawl                           │   Source URL scraping
│   Cloudflare R2 / S3                 │   Image / video / newsletter asset storage
└──────────────────────────────────────┘
```

Hosts: deploy via the same Ansible playbook that runs `octio-website-prd`.
New stack on the same `infra-01` host, behind Traefik at
`octio-social.octio.co.za` (internal only, WireGuard mesh + basic auth).

## 4. Authentication & authorisation

Same pattern as the admin dashboard spec — **env-var allowlist of email +
bcrypt-hashed password** for v1. Migrate to Google SSO before Phase 4.
JWT-cookie session.

For multi-tenancy (Phase 4), add `tenant_id` to JWT and apply §9.5 of the
admin dashboard spec verbatim. No design re-think needed.

**Channel OAuth** (LinkedIn, TikTok) is separate from admin auth. Stored
in `social_accounts` table:

```
social_accounts
  id            BIGSERIAL PRIMARY KEY
  tenant_id     BIGINT NOT NULL DEFAULT 1
  channel       TEXT NOT NULL          -- 'linkedin' | 'tiktok'
  account_kind  TEXT NOT NULL          -- 'personal' | 'page' | 'business'
  external_id   TEXT NOT NULL          -- LinkedIn URN / TikTok user id
  display_name  TEXT NOT NULL
  access_token  TEXT NOT NULL          -- AES-encrypted
  refresh_token TEXT
  expires_at    TIMESTAMPTZ
  scopes        TEXT[]
  created_at    TIMESTAMPTZ DEFAULT NOW()
```

OAuth flow per channel uses the same primitives we already wrote for the
Google OAuth flow (`google-oauth-flow.ts`) — copy + adapt for LinkedIn /
TikTok.

## 5. Agentic architecture

Three Mastra agents in v1. Each has a focused responsibility and a small
set of tools.

### 5.1 ContentStrategist agent

**Role:** plan a week of content.

**Inputs:**
- Brand voice config (loaded from `tenants.brand_voice` JSONB)
- Content goals for the week (manual input via UI, e.g. "promote new
  Lead Gen product launch, mix in 2 educational posts")
- Past performance (top 5 posts last 30 days from `post_analytics`)
- Last 10 posts to avoid repetition

**Tools:**
- `fetch_brand_voice(tenantId)` — returns brand voice doc
- `fetch_recent_posts(channel, limit)` — for de-duplication context
- `fetch_top_performers(channel, days)` — for "what's worked"
- `propose_calendar_slot(channel, datetime, theme, hook, callToAction)`
  — emits one row to the `content_calendar` table

**Output:** a populated week of `content_calendar` rows in
`status='proposed'`. UI shows them; human can edit slots / themes /
delete / regenerate.

**Runs:** every Sunday evening via cron, OR on-demand via "Plan next
week" button.

### 5.2 LinkedInDrafter agent

**Role:** turn a content calendar slot into a publishable LinkedIn draft.

**Inputs:**
- A `content_calendar` row with theme + hook + CTA
- Brand voice
- Optional: source material (link to article, transcript, screenshot URL)

**Tools:**
- `fetch_source(url)` — Firecrawl-style scrape
- `analyse_content(text)` — extracts the strongest insight / quote
- `draft_post(theme, source, hook, cta)` — emits the post body
- `propose_image_concept(theme)` — describes an image (does NOT generate
  it in v1; image generation deferred)
- `save_draft(slotId, postBody, imageConceptDescription)` — writes to
  `drafts` table

**Output:** one row in `drafts` with `channel='linkedin'`, status
`'awaiting_approval'`.

**Runs:** every time a slot is created or edited via UI. Re-runnable
("Regenerate this draft" button) with optional reviewer feedback string
in the prompt.

### 5.3 NewsletterDrafter agent

**Role:** assemble a weekly newsletter issue from curated sources +
brand voice.

**Inputs:**
- A `newsletter_issue` row with target send date + theme (optional)
- `content_sources` — URLs the team has saved during the week
  (articles, videos, our own posts, customer wins)
- Brand voice
- Last issue (for narrative continuity / avoiding repetition)

**Tools:**
- `fetch_source(url)` — Firecrawl scrape, returns markdown + title +
  author + excerpt
- `summarise_source(text)` — 2-sentence summary + 1-line "why this
  matters"
- `draft_intro(theme, sourceSummaries)` — opens the newsletter with a
  hook tied to the week's overall theme
- `draft_section(source, position)` — one section per featured source
  (typically 2–3 per issue)
- `draft_link_roundup(otherSources)` — short blurb format for sources
  not promoted to full sections
- `draft_signoff(theme)` — brand-voice CTA / closing line
- `save_issue(issueId, sections)` — writes the assembled draft to
  `newsletter_issues` with status `'awaiting_approval'`

**Output:** one row in `newsletter_issues` with a fully assembled
markdown body broken into named sections. The UI's newsletter editor
shows each section editable independently, plus a "Send a test to
yourself" button that pushes the rendered HTML to the ESP as a draft
campaign so the human can preview in their actual mail client.

**Runs:** every Friday afternoon for the upcoming Tuesday send, OR
on-demand via "Build this week's issue" button.

### 5.4 TikTokDrafter agent

**Role:** turn a content calendar slot into a TikTok production brief.

**Inputs:** same shape as LinkedInDrafter.

**Tools:**
- `fetch_source(url)`
- `draft_tiktok_script(theme, source, hook, cta, duration)` — emits
  script with timed segments (e.g. "0–2s: hook", "2–5s: tension",
  etc.)
- `propose_visual_shots(script)` — emits shot list (camera angle, prop,
  on-screen text)
- `propose_audio(script, mood)` — suggests trending sound type / music
  vibe (not specific tracks — those are picked manually in TikTok app)
- `save_draft(slotId, script, shots, audio, caption, hashtags)` —
  writes to `drafts` table

**Output:** one row in `drafts` with `channel='tiktok'`, status
`'awaiting_approval'`. The draft is a **production brief**, not a
video — Octio (or eventually the customer) shoots it themselves.

**Why no auto-video v1:** see §10 — text-to-video at this price point
hasn't crossed quality threshold for B2B brand content. Phase 2
revisits.

## 6. Approval workflow

```
ContentStrategist creates 7 calendar slots
   │
   ▼
Drafter agent generates draft per slot
   │  status='awaiting_approval'
   ▼
Human opens /queue, picks a draft
   │
   ├─ "Approve" → status='approved', schedule_at set, queued for publish
   ├─ "Edit" → inline editor, save → re-runs Drafter with feedback string
   │   OR human edits text directly → status='approved' (manual edit)
   └─ "Reject" → status='rejected', slot freed for regenerate
   │
   ▼
Publisher cron runs every minute
   │
   ├─ For each approved draft where schedule_at <= NOW():
   │    LinkedIn: POST via API; record `post_id`, status='published'
   │    TikTok: notify human "your brief is ready, time to shoot"
   │            (Slack/email; status stays 'awaiting_production')
   │            On human upload via /post/:id, fetch metadata, status='published'
   │
   ▼
Analytics cron (daily)
   │
   └─ Pull engagement metrics per published post → post_analytics
```

The agent **never** publishes without human approval in v1. Approval
records are audit-logged (who + when).

## 7. Data model

```sql
-- Brand voice + tenant settings
CREATE TABLE tenants (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  brand_voice   JSONB NOT NULL DEFAULT '{}',  -- tone, voice samples, do's, don'ts
  channels      TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar of planned content (output of ContentStrategist)
CREATE TABLE content_calendar (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     BIGINT NOT NULL DEFAULT 1,
  channel       TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  theme         TEXT NOT NULL,
  hook          TEXT,
  call_to_action TEXT,
  source_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'proposed',  -- proposed | drafted | published | skipped
  created_by    TEXT NOT NULL,                     -- 'agent:strategist' | email
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX cal_tenant_channel_idx ON content_calendar (tenant_id, channel, scheduled_at);

-- AI-generated drafts (one per calendar slot, regeneratable)
CREATE TABLE drafts (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL DEFAULT 1,
  calendar_slot_id BIGINT REFERENCES content_calendar(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL,
  generation_n    INTEGER NOT NULL DEFAULT 1,      -- 1, 2, 3 if regenerated
  content         JSONB NOT NULL,                  -- channel-specific shape
  status          TEXT NOT NULL DEFAULT 'awaiting_approval',
                                                   -- awaiting_approval | approved
                                                   -- | rejected | awaiting_production | published
  schedule_at     TIMESTAMPTZ,                     -- set on approval
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter issues — channel='newsletter' uses these instead of `drafts`
-- (sections too complex for the generic drafts.content JSONB)
CREATE TABLE newsletter_issues (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL DEFAULT 1,
  calendar_slot_id BIGINT REFERENCES content_calendar(id),
  subject         TEXT,
  preview_text    TEXT,
  sections        JSONB NOT NULL,                  -- ordered array of {heading, body_md, sourceUrl?}
  intro           TEXT,
  signoff         TEXT,
  esp             TEXT NOT NULL,                   -- 'mailchimp' | 'beehiiv'
  esp_campaign_id TEXT,                            -- set after we push the draft into the ESP
  status          TEXT NOT NULL DEFAULT 'awaiting_approval',
                                                   -- awaiting_approval | approved | scheduled
                                                   -- | sent | failed
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  rejected_reason TEXT,
  generation_n    INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Curated sources used by the NewsletterDrafter agent
CREATE TABLE content_sources (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL DEFAULT 1,
  url             TEXT NOT NULL,
  title           TEXT,
  author          TEXT,
  published_at    TIMESTAMPTZ,
  excerpt         TEXT,
  added_by        TEXT NOT NULL,                   -- email
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  used_in_issue_id BIGINT REFERENCES newsletter_issues(id),
  tags            TEXT[]
);
CREATE INDEX sources_tenant_added_idx ON content_sources (tenant_id, added_at DESC);

-- Published posts + their channel-side IDs
CREATE TABLE posts (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL DEFAULT 1,
  draft_id        BIGINT REFERENCES drafts(id),
  channel         TEXT NOT NULL,
  external_id     TEXT NOT NULL,                   -- LinkedIn URN, TikTok post ID
  published_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  url             TEXT,
  raw_response    JSONB
);

-- Engagement metrics over time
CREATE TABLE post_analytics (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL DEFAULT 1,
  post_id         BIGINT REFERENCES posts(id),
  measured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  impressions     INTEGER,
  likes           INTEGER,
  comments        INTEGER,
  shares          INTEGER,
  clicks          INTEGER,
  saves           INTEGER,
  watch_time_secs INTEGER,
  raw             JSONB
);

-- Channel OAuth tokens (see §4)
CREATE TABLE social_accounts ( ... );

-- Audit log for the approval workflow
CREATE TABLE social_audit_log (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id BIGINT NOT NULL DEFAULT 1,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_kind TEXT,
  target_id TEXT,
  diff JSONB
);
```

**Multi-tenant readiness** (per admin spec §9.5): every table has
`tenant_id BIGINT NOT NULL DEFAULT 1`, indexed where it matters. All
read queries scope by `tenant_id` from day 1 via a shared helper.

## 8. API design

All under `/api/content/*`, JSON, SSO session cookie required (same JWT
shape as admin dashboard).

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/content/auth/login` | Email + password against env allowlist (same as admin) |
| GET | `/api/content/me` | Whoami |
| GET | `/api/content/calendar?from=&to=&channel=` | Calendar slots |
| POST | `/api/content/calendar/plan-week` | Trigger ContentStrategist agent for next week |
| POST | `/api/content/calendar` | Create a slot manually |
| PATCH | `/api/content/calendar/:id` | Edit a slot |
| DELETE | `/api/content/calendar/:id` | Cancel a slot |
| POST | `/api/content/calendar/:id/draft` | Trigger Drafter agent for a slot |
| GET | `/api/content/drafts?status=` | List drafts awaiting approval |
| GET | `/api/content/drafts/:id` | Full draft |
| POST | `/api/content/drafts/:id/approve` | Approve, set schedule_at |
| POST | `/api/content/drafts/:id/reject` | Reject with reason |
| POST | `/api/content/drafts/:id/regenerate` | Re-run Drafter with feedback |
| PATCH | `/api/content/drafts/:id` | Manual edit |
| POST | `/api/content/posts/:id/mark-published` | TikTok manual completion |
| GET | `/api/content/posts?from=&to=` | Published post list (all channels) |
| GET | `/api/content/analytics?range=&channel=` | Aggregated engagement (LinkedIn + ESPs) |
| GET/POST/DELETE | `/api/content/accounts/:channel` | OAuth connect / disconnect for any channel |
| GET | `/api/content/audit` | Audit trail |

**Newsletter-specific endpoints:**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/content/newsletter/issues?status=` | List issues |
| GET | `/api/content/newsletter/issues/:id` | Full issue including sections |
| POST | `/api/content/newsletter/issues/:id/draft` | Trigger NewsletterDrafter agent |
| POST | `/api/content/newsletter/issues/:id/regenerate-section` | Regenerate one section with feedback |
| PATCH | `/api/content/newsletter/issues/:id` | Inline edit any field |
| POST | `/api/content/newsletter/issues/:id/test-send` | Push as draft campaign to ESP, fire test send to operator |
| POST | `/api/content/newsletter/issues/:id/approve` | Approve + set scheduled_at |
| POST | `/api/content/newsletter/issues/:id/reject` | Reject with reason |
| GET | `/api/content/sources` | List curated sources |
| POST | `/api/content/sources` | Add a source URL (also via browser bookmarklet) |
| DELETE | `/api/content/sources/:id` | Remove unused source |

**Renaming note:** the spec originally said `/api/content/*`. We now use
`/api/content/*` to reflect the unified scope. SKUs sold externally
keep their marketing names (Social Manager / Newsletter Engine) — the
API namespace is purely internal.

## 9. Sitemap (web app)

```
/login                          Email + password
/calendar                       Weekly calendar grid; click slot → details
/calendar/:id                   Edit slot + view linked draft
/queue                          Drafts awaiting approval
/queue/:id                      Single-draft review + approve/edit/reject
/posts                          Published post timeline + analytics
/analytics                      Aggregated charts
/settings/brand-voice           Edit brand voice JSON / voice samples
/settings/channels              Connect LinkedIn / TikTok
/settings/schedules             Default posting times per channel
/audit                          Audit log
```

## 10. TikTok production strategy

The single biggest design decision in this spec. Three viable paths.

| Option | Description | Cost | Quality | Effort |
|---|---|---|---|---|
| **A. Brief-only** ⭐ (v1 recommendation) | Agent generates script + shot list + caption + hashtags. Human shoots, edits, uploads from phone. | $0 video gen | High (real video) | Low engineering |
| **B. Auto avatar video** | HeyGen / Synthesia generates talking-head avatar reading the script. | $30+/mo per channel, plus per-clip | Medium (uncanny) | Medium |
| **C. Auto text-to-video** | Sora 2 / Veo 3.1 / Runway generate visual from prompt. | $0.50–$2 per clip | Low–medium right now for B2B content | High |

**Why A for v1:**
1. Quality matters more than throughput at v1. Real video shot by Simekani >> AI avatar.
2. TikTok algo favours authentic / native content. Avatars get throttled.
3. Cost: zero LLM video bills.
4. Effort: agent-side is just a prompt template. Phase 1 ships in days.

Phase 2 revisits: once content cadence is proven and ROI is clear, we
add HeyGen or Sora for "background B-roll" type content while keeping
real founder-led video as the lead.

## 11. Phase breakdown

### Phase 1a — LinkedIn + Newsletter for Octio (~12 days) ⭐ FIRST SLICE

Octio's own LinkedIn + weekly newsletter, hardcoded brand voice, full
approval queue. TikTok deferred. Beehiiv/Mailchimp adapters deferred.

Execution plan: `~/.claude/plans/staged-marinating-quill.md`.

### Phase 1b — Add TikTok briefs + first paid-ESP adapter (~5 days)

After 1a soaks for ~2 weeks of real Octio use:
- TikTokDrafter agent (brief-only — script, shot list, caption, hashtags)
- `BeehiivNewsletterSender` adapter (first paid-ESP alternative; ready
  for SaaS productisation, also useful if Octio's subscriber count
  approaches Gmail's daily cap)
- Subscriber CSV import (Octio likely needs this around then anyway)

### Phase 1 (combined original estimate, deprecated by the 1a/1b split above)

Original combined estimate: 12–14 days for LinkedIn + TikTok + Newsletter

**Foundation (~3 days)**
- Repo scaffolding (Vite + Tailwind + Hono + Mastra + Postgres)
- Auth (env-cred allowlist, same as admin)
- DB migrations: all tables in §7
- Shared UI shell + `/calendar` + `/queue`
- ContentStrategist agent + weekly cron

**Social side (~5 days)**
- LinkedIn OAuth + posting via API
- LinkedInDrafter agent
- TikTokDrafter agent (brief-only)
- `/draft/:id` (channel-agnostic editor)
- Publisher cron (LinkedIn auto-post on approval; TikTok notification + manual mark-published)
- Basic LinkedIn analytics pull

**Newsletter side (~4 days)**
- ESP OAuth: Mailchimp + Beehiiv
- `content_sources` table + bookmarklet for adding URLs
- NewsletterDrafter agent (assembly from sources)
- `/newsletter/:issueId` editor (sections, intro, signoff)
- Test-send to operator before approval
- Approval flow → push to ESP as draft campaign → schedule send
- ESP analytics pull (open / click / unsubscribe)

**Settings (~1 day)**
- `/settings/brand-voice` editor (structured JSON + sample-post library)
- `/settings/channels` (LinkedIn / TikTok / Mailchimp / Beehiiv OAuth statuses)
- `/settings/schedules` (default posting times per channel)

### Phase 2 — Productivity layer (~5–6 days)

- Engagement Monitor agent (watch LinkedIn comments, draft replies into a
  reply queue for approval)
- Image generation for LinkedIn posts (OpenAI / Gemini)
- TikTok auto-upload via Content Posting API (still brief-only video,
  but upload is automated after human shoots)
- Saved templates for recurring post types
- Analytics dashboard improvements

### Phase 3 — Multi-channel + scale (~7–10 days)

- Instagram (text + image)
- X / Twitter
- Cross-channel repurposing agent (one source → variants per channel)
- Auto-detect trending topics (manual triggers for now)
- Newsletter integration (link Octio's Newsletter Engine product)

### Phase 4 — Productise as SaaS (~6–8 weeks separate effort)

- Tenant onboarding wizard: brand voice intake, OAuth flows, default
  schedules
- Stripe billing with plans (Starter / Growth / Scale per Octio's
  marketed tiers)
- BYOK option for LLM keys (customer's OpenAI/Anthropic billing)
- Customer-facing dashboard polish + brand white-labelling
- Compliance (GDPR / POPIA per tenant)

## 12. Multi-tenant readiness rules

Same as admin dashboard spec §9.5. Notably:

- Every table has `tenant_id BIGINT NOT NULL DEFAULT 1`
- All read queries scope by tenant via shared helper
- Brand voice + channel auth are tenant-scoped from day 1
- Mastra agent prompts are templates populated from `tenants.brand_voice`,
  no hardcoded "Octio" strings
- CSS variables for branding, `<BrandMark />` component reads from
  `useBrand()` hook

## 13. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 18 + Tailwind v3 + Framer Motion |
| Backend | Hono on Node 20 |
| Agent framework | Mastra (same as octio-website worker) |
| LLM | Kimi K2 Turbo for drafts; Claude Sonnet for editorial polish (we'll test which wins) |
| DB | Postgres (separate DB `octio_social` on same Postgres server) |
| ORM | Drizzle (same as octio-website) |
| Job queue | node-cron for now; BullMQ + Redis if we hit scale |
| Asset storage | Cloudflare R2 (S3 API, cheap egress) |
| LinkedIn | Marketing Developer Platform API, posting via `/rest/posts` |
| TikTok | Content Posting API (Phase 2) — direct upload requires app review |
| Auth | env-cred allowlist v1, Google SSO later |

## 14. Open questions (status updated 2026-05-12)

1. ✅ **LinkedIn API access:** Locked — **Community Management API** on personal profile. Scopes `r_liteprofile w_member_social`. Apply day 1 of Phase 1a foundation work.
2. ⏸ **TikTok Content Posting API:** deferred to Phase 1b. Apply when Phase 1a starts using TikTok briefs (week 3+).
3. ✅ **ESP for Octio's own newsletter:** Locked — **DIY Gmail sender** in Phase 1a. Beehiiv adapter built in Phase 1b as first paid-ESP option.
4. ⏸ **Newsletter cadence:** default weekly Tue 09:00 SAST. Adjust after running 4 issues.
5. ✅ **Brand voice format:** Locked — **structured JSON** (tone adjectives + do's + don'ts + sample posts), used by all drafter agents.
6. ✅ **Source curation workflow:** Locked — **Discord bot** listening on `#newsletter-sources`. URLs in any message are scraped + saved. No web-form / bookmarklet / Slack day 1.
7. ⏸ **Repo name:** still `octio-content` unless brand-side rename arrives. Final call before `pnpm create`.
8. ⏸ **Where deployed:** same `infra-01` as `octio-website-prd` (Traefik label routes `content.octio.co.za` to the new stack). Confirm before deploy.
9. ⏸ **LLM choice:** start with Kimi K2 Turbo (free for us, already in worker). Add Claude Sonnet as second-pass editorial polish if quality is short — measure after first 10 LinkedIn posts.

## 15. Risks

| Risk | Mitigation |
|---|---|
| LinkedIn API approval delay blocks Phase 1 publish | Apply on day 1; pre-approval, Phase 1 still ships approval queue + analytics ingestion; switch on auto-post when approved |
| AI drafts are off-brand or generic | Tight prompt templates with sample posts; iterate with feedback string; structured brand voice JSON |
| Approval bottleneck — drafts pile up unreviewed | Email digest every morning with pending queue; Slack notification on new draft |
| TikTok algorithm penalises AI-tagged content | Brief-only strategy in v1 means real human video; AI never publishes raw TikTok content |
| LLM cost runs away | Per-tenant token caps (Phase 4 actual budget; Phase 1 just a single global cap) |
| Channel OAuth tokens expire silently | Refresh token watcher cron — alert in Slack 7 days before expiry |
| Image gen quality | Phase 2 problem — Phase 1 just describes the image, human picks/creates it |
| ESP API rate limits / send failures | Push as ESP draft + schedule, don't bypass ESP send infrastructure. ESP handles deliverability, bounces, unsubs. We're a content layer, not an email sender. |
| Newsletter spam-trigger words / deliverability | Drafter prompt includes "avoid spam-trigger words". Phase 2: integrate Mail-tester.com check before approval. |
| Source URL drift / 404s | When Drafter scrapes, cache the markdown in `content_sources.excerpt`. If URL 404s later, link disclaimer in newsletter ("originally posted at …"). |
| Multi-tenant ESP credentials | Each tenant's ESP API key lives in `channel_accounts.access_token` (AES-encrypted). Never mix tenants' keys. |

---

## Approval checklist

- [ ] Goal & scope (§1, §2) → covers Social Manager + Newsletter Engine → approved
- [ ] Architecture: separate repo `octio-content`, Vite + Hono + Mastra + Postgres → approved
- [ ] Agentic design — four agents (Strategist, LinkedIn, TikTok, Newsletter), human-in-the-loop approval (§5, §6) → approved
- [ ] Data model including `newsletter_issues` + `content_sources` (§7) → approved
- [ ] API surface (§8) → **needs explicit approval per global rule**
- [ ] TikTok brief-only strategy (§10) → approved
- [ ] Newsletter via Mailchimp + Beehiiv (no other ESPs in v1) → approved
- [ ] Phase 1 scope and 12–14 day estimate (social + newsletter both included) → approved
- [ ] Phase 2 / 3 / 4 backlog → approved as direction
- [ ] Multi-tenant readiness applies from day 1 → approved
- [ ] Tech stack (§13) → approved
- [ ] Open questions §14 answered (esp. LinkedIn API path + ESP choice + source curation flow + repo name + deploy location)
- [ ] Risks (§15) acknowledged

Once all checked, scaffolding the new `octio-content` repo is task 1.
