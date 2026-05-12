# Octio Website Audit Tool — Design

> ⚠️ **SUPERSEDED on 2026-05-12.** This spec has been replaced by [`2026-05-12-audit-tool-claude-code.md`](./2026-05-12-audit-tool-claude-code.md). The new spec replaces the AI Studio prompt-output path with a server-side **headless Claude Code agent** that generates a working Astro site rebuild on Octio infrastructure (preview URL + repo download) — a strictly better wedge. The new spec also flags the critical ToS gate: a dedicated `ANTHROPIC_API_KEY` under Commercial Terms is mandatory; routing visitor traffic through the founder's Max subscription is a ban risk. Read the new spec.

**Status:** Draft, awaiting approval
**Author:** Simekani + Claude (Opus 4.7)
**Last updated:** 2026-05-12
**Lives in:** existing `cyma` repo, new `/audit` route on octio.co.za + new worker endpoints
**Positioning:** Top-of-funnel lead magnet for Octio's AI agency offerings. Free, instant, demonstrates AI capability before any sales conversation.
**Methodology source:** Adam Erhart's "I Sell $2,000 High-Converting Websites in 5 Minutes" workflow (YouTube `4S7BXgpIDGk` — transcript extracted 2026-05-12, key learnings in §0 below). Same two-prompt pipeline (CRO audit → AI Studio rebuild prompt). Adam sells the resulting website builds for $1,000–$2,000 one-time + $297/month recurring HighLevel subscriptions. **We're flipping the play:** instead of selling the website, we use the audit as free value to capture leads for Octio's AI products (Lead Gen, Voice & Chat, Social Media Manager, Newsletter Engine).

---

## 0. Key insights from Adam Erhart's video transcript

Direct learnings that change how we build the Octio version:

| Insight | What Adam does | Octio adaptation |
|---|---|---|
| **"You're not selling them a website, you're solving a specific problem"** — the framing matters more than the offer | Pitches "your current site is losing you customers" | Audit results lead with the *problems found*, not "here's a free audit". E.g. landing copy → "Your website might be losing you customers. Find out in 60 seconds." |
| **The 2-step pipeline** | Step 1: ChatGPT analyses screenshots. Step 2: Output → HighLevel AI Studio | Same. We use Claude Sonnet for Step 1 (better at vision + structured output than GPT-4o in 2026 per our previous research). Output is HighLevel-compatible prompt. |
| **Screenshot capture is the friction point** | Uses [GoFullPage Chrome extension](https://chrome.google.com/webstore/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl) — captures entire scrolled page as one PNG | v1: provide a "How to capture your page" instructions panel that recommends GoFullPage. Phase 3: add server-side headless-browser capture so user only pastes a URL. |
| **Captures Google reviews separately** | Screenshots positive reviews, pastes them alongside the page screenshot for the audit prompt | v1: optional separate "Reviews screenshot" upload slot. Auditor agent uses these for the Trust & Proof section. |
| **The ROI math is the closer** | "Your average job is $1,500. One extra job per month = $18,000/year. This $2k website pays for itself in two months." | Auto-generate the math at the bottom of every audit. We ask for "average customer value" in the email-gate form, then say: "We estimate this rebuild could recover X calls/month based on your CRO score. At your avg ticket of $Y, that's $Z/year recoverable." Strongest CTA fuel. |
| **Outreach script** — short, gift-framed message | "Hey {name}, I was searching for {niche} in {city} and came across your site. I found a few things that might be costing you leads, so I went ahead and put together a new website for you that's optimized for more calls and customers. Would it be okay to send you the link so you can check it out?" | We use this verbatim shape in TWO places: (a) the post-audit email subject + opener ("We ran some checks on {site} — found a few things costing you calls"), (b) Phase 2 "outreach mode" where Octio team members generate audit + outreach copy in one click for prospects we're approaching. |
| **Niches that all work** | Plumbers, roofers, electricians, cleaners, HVAC, dentists, contractors, attorneys, accountants, salons | v1: dropdown of these in the email-gate form. Auditor prompt is templated to inject niche-specific examples. |
| **The recurring revenue ladder** | $2k one-time website → $197–297/month reputation management (Google Reviews) | Octio's ladder is different — and better for us. The audit pitches Octio's recurring AI products (Lead Gen R8.5k/mo, Voice & Chat R6.5k/mo, etc.). Reputation management could be Phase 3 add-on if it fits Octio's positioning. |
| **5-step client journey** (post-sale) | Pay → onboard call → site live → monthly check-ins → upsell reputation | Octio's funnel is simpler: audit → chat with Octo → discovery call → AI product subscription. We don't sell the website. |
| **"Don't build websites for prospects pre-emptively"** | Wait for "yes, send me the link" before doing the work — only 5 minutes per prospect but still | Doesn't apply to us — Octio's audit is self-serve, so prospects run it themselves. Saves Octio team time. |
| **Multi-niche prompt re-use** | One prompt template, works across niches | Mirror this — single auditor prompt with niche-aware variation via the system prompt, no hand-tweaking per audit. |

---

## 1. Goal

Let a small local service business upload screenshots of their current website and receive — in ~60 seconds — a complete CRO audit + an "AI Studio (HighLevel / Lovable) Build Prompt" they can paste into their no-code tool to rebuild a better-converting site.

Two outputs per audit:
1. **CRO Audit Report** — human-readable analysis with clarity, messaging, offer, CTA, trust, layout, and conversion-killer breakdown, plus a concrete improvement plan and rebuilt homepage structure
2. **AI Studio Build Prompt** — a single clean prompt the user can copy-paste into HighLevel AI Studio (Lovable) to regenerate their site as a high-converting homepage

The CRO audit prompt + AI Studio build prompt the user provided live verbatim in §11 — they ARE the system prompts driving each agent.

## 2. Why this is strategically valuable for Octio

| Why it works |
|---|
| **Lead magnet** — captures email + business info from prospects who self-identify as having a marketing problem (the exact buyer profile for AI Lead Generation / Voice & Chat / Social Manager) |
| **Proof-of-AI** — every audit IS an example of what Octio can do. Visitor experiences our work before they pay. Builds trust faster than testimonials. |
| **Octo follow-up** — the existing chat agent can engage every auditor with personalised next steps based on what the audit found |
| **Patient Zero** — Octio uses the same tool internally to audit prospect sites before discovery calls |
| **Distribution** — the AI Studio prompt is shareable (people will paste it into HighLevel / Lovable / Replit and the prompt itself credits Octio) |

## 3. Audience & scope

### v1 audience
Small local service businesses with a current website: plumbers, electricians, dentists, lawyers, salons, contractors, accountants, consultants. The kind of business Octio's AI Lead Generation product is built for.

### What we are building (v1)
- Public `/audit` landing page on `octio.co.za` (no auth required to start)
- Drag-and-drop upload (1–6 screenshots; mobile + desktop welcome)
- Email-gate before analysis runs (lead capture)
- Vision-LLM-powered audit (Claude Sonnet — strongest vision + creative writing combo at price point)
- Two outputs delivered: CRO audit (rich HTML page) + AI Studio prompt (copy-button code block)
- Both also emailed to the user (so they can come back to them)
- Audit stored in DB so the user has a permanent shareable URL
- "Want Octio to build this for you?" CTA at the bottom of every audit → routes into existing chat with `intent='onboard'` and `prefilledService='lead-generation'`

### What we are explicitly NOT building (v1)
- Account system — users get a magic-link to retrieve their audit, no signup
- Multi-page audit (homepage only in v1; service-page audits Phase 2)
- Mobile vs desktop side-by-side (single audit per site, Phase 2)
- White-label / agency multi-tenant (Phase 4 — agencies could resell)
- A/B testing of audit copy
- Direct integration with HighLevel — we generate the prompt, user pastes it themselves
- Automated competitor benchmarking — out of scope
- Video walkthrough of the audit (could be Phase 2 add-on with ElevenLabs)

## 4. User flow

```
1. Visitor lands on octio.co.za/audit
   ↓
2. Hero pitch: "Free AI-powered website audit + rebuild prompt for local businesses.
   Upload your site, get a CRO report + AI Studio prompt in 60 seconds."
   ↓
3. Upload widget — drag-and-drop 1–6 screenshots (PNG/JPG, ≤5MB each)
   Mobile + desktop both welcome. Optional URL field.
   ↓
4. Email gate — enter name, email, business name + type
   (Single small form before analysis runs. We use the captured fields to enrich the audit.)
   ↓
5. "Analysing..." state — ~45–60s. Show:
     - "Reading your homepage..."   ✓
     - "Auditing CRO signals..."    ✓
     - "Drafting improvement plan..." ✓
     - "Building AI Studio prompt..." (in progress)
   Real progress driven by the worker pushing status events via SSE.
   ↓
6. Results page — split into 4 tabs:
     - Audit Report (CRO breakdown, scored 1–10 per axis)
     - Improvement Plan (section-by-section actions)
     - Rebuilt Homepage Structure (the new content blueprint)
     - AI Studio Prompt (single code block, copy button)
   ↓
7. Bottom CTA:
     "Want Octio to do this for you? We build AI-powered websites that convert.
      Book a free 20-min call with the team →"
     Opens existing chat with intent='onboard' + prefilled context
```

Same audit also emailed to the operator from `support@octio.co.za` (subject: "Your Octio audit for {businessName}"). Email contains: TL;DR scores, link to the live results page, the AI Studio prompt as a code block, the CTA to chat with Octio.

## 5. Architecture

```
┌──────────────────────────────────────────────────────┐
│ octio.co.za (existing Vite + React app)              │
│                                                      │
│   /audit                                              │  NEW page
│   /audit/upload     screenshot upload + email form    │
│   /audit/analysing  progress UI (SSE)                 │
│   /audit/:auditId   public results page (unguessable id) │
│                                                      │
└──────────────────────────────────────────────────────┘
                       │
                       ▼  /api/audit/*
┌──────────────────────────────────────────────────────┐
│ octio-worker (existing Hono + Mastra)                │
│                                                      │
│   POST /api/audit                  create audit row   │
│   POST /api/audit/:id/screenshots  upload one image   │
│   POST /api/audit/:id/analyse      kick off agent run │
│   GET  /api/audit/:id/stream       SSE progress       │
│   GET  /api/audit/:id              fetch full result  │
│                                                      │
│   Agents:                                             │
│     WebsiteAuditor (Mastra agent, Claude Sonnet)      │
│     AIStudioPromptBuilder (Mastra agent, Kimi K2)     │
│                                                      │
└──────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│ Postgres (existing octio-website DB)                 │
│   audits                                              │  NEW tables
│   audit_screenshots                                   │
└──────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│ External APIs                                        │
│   Anthropic Claude — vision + audit analysis          │
│   Kimi K2 Turbo — AI Studio prompt synthesis (cheaper)│
│   Gmail (existing) — deliver audit by email           │
│   Cloudflare R2 — store uploaded screenshots          │
└──────────────────────────────────────────────────────┘
```

**Hosting:** same `infra-01` host, no new infrastructure. Just adds routes + agents to the existing worker.

## 6. Agentic architecture

Two Mastra agents in series. Single sequential workflow — no human-in-the-loop because the audit IS the product, not a draft.

### 6.1 WebsiteAuditor agent

**Model:** Claude Sonnet (vision-capable; strong at structured output + creative writing combo).

**System prompt:** the **Step 1 — Website Audit Prompt** the operator provided (full text in §11 below). Loaded from `worker/src/prompts/website-auditor.md`.

**Inputs:**
- Array of screenshot URLs (R2 signed URLs valid for the agent run)
- Business context captured at email gate: businessName, industry, websiteUrl, additionalNotes (free text optional)

**Tools (Mastra):**
- `propose_audit_section(section, score, body)` — emits one analysis section. Sections: business_info, branding, page_structure, cro_clarity, cro_messaging, cro_offer, cro_cta, cro_trust, cro_layout, cro_killers, improvement_plan, rebuilt_homepage_structure
- `save_audit_complete(auditId, sections)` — writes assembled audit to `audits` row

**Output:** populated `audits.audit_content JSONB` keyed by section, plus per-section scores (1–10 where applicable).

**Cost estimate:** ~$0.10–0.20 per audit at Claude Sonnet's vision pricing for 4 screenshots + ~3k tokens of structured output.

**Runtime:** ~30–45 seconds.

### 6.2 AIStudioPromptBuilder agent

**Model:** Kimi K2 Turbo (text-only; the audit already has the visual analysis done, we just need to compose the prompt cleanly).

**System prompt:** the **Step 2 — AI Studio Build Prompt** template the operator provided (full text in §11 below).

**Inputs:**
- The completed audit from §6.1 (sections, scores, improvement plan, rebuilt structure)
- Business context (name, industry, location, etc.)
- Extracted branding (colours, fonts, design style — from audit section `branding`)

**Tools (Mastra):**
- `compose_prompt(blocks)` — emits the final HighLevel AI Studio prompt body as a single string

**Output rules (from the operator's brief):**
- Output ONLY the final AI Studio prompt
- No explanations, no commentary
- Clean and structured, ready to copy-paste
- Label nothing

**Runtime:** ~10–15 seconds.

**Cost estimate:** ~$0.02 per run at Kimi rates.

## 7. Data model

```sql
CREATE TABLE audits (
  id              TEXT PRIMARY KEY,                  -- nanoid, unguessable, in URL
  tenant_id       BIGINT NOT NULL DEFAULT 1,         -- Phase 4 multi-tenant ready
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Lead capture fields
  contact_email   TEXT NOT NULL,
  contact_name    TEXT,
  business_name   TEXT NOT NULL,
  business_type   TEXT,                              -- 'plumber', 'dentist', 'lawyer', etc.
  website_url     TEXT,
  city            TEXT,                              -- for outreach copy + niche localisation
  avg_customer_value_zar INTEGER,                    -- drives the ROI math at the end of the audit
  monthly_lead_target INTEGER,                       -- optional — "want N more calls/month?"
  additional_notes TEXT,
  -- Agent run state
  status          TEXT NOT NULL DEFAULT 'pending',
                                                     -- pending | analysing | complete | failed
  status_message  TEXT,                              -- human-readable progress for SSE
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  -- Outputs
  audit_content   JSONB,                             -- WebsiteAuditor output (all sections + scores)
  ai_studio_prompt TEXT,                             -- AIStudioPromptBuilder output
  roi_estimate    JSONB,                             -- { recoverableCallsPerMonth, annualValue, paybackMonths }
  -- Outputs (continued)
  -- Lifecycle
  email_sent_at   TIMESTAMPTZ,
  cta_clicked_at  TIMESTAMPTZ,                       -- did they click "talk to Octio" at the end?
  chat_session_id TEXT,                              -- link to conversation_events if they engaged
  -- Cost tracking
  audit_cost_cents INTEGER DEFAULT 0,                -- claude + kimi tokens for this run
  -- Multi-tenant readiness
  CONSTRAINT audits_email_check CHECK (contact_email ~ '^[^@]+@[^@]+\.[^@]+$')
);
CREATE INDEX audits_tenant_created_idx ON audits (tenant_id, created_at DESC);
CREATE INDEX audits_email_idx ON audits (contact_email);

CREATE TABLE audit_screenshots (
  id              BIGSERIAL PRIMARY KEY,
  audit_id        TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL DEFAULT 'page',     -- 'page' | 'review' | 'service-page'
  position        INTEGER NOT NULL,                  -- order shown to the auditor
  r2_key          TEXT NOT NULL,
  r2_url          TEXT NOT NULL,
  content_type    TEXT,
  bytes           INTEGER,
  width           INTEGER,
  height          INTEGER,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX audit_screenshots_audit_idx ON audit_screenshots (audit_id, position);
```

Multi-tenant readiness rules apply: `tenant_id` column from day 1, scope every read by it, etc. (Phase 4 lets agencies white-label this tool for their own customers.)

## 8. API design

All endpoints under `/api/audit/*`, JSON unless noted. No auth required to create an audit (lead magnet) — rate-limited by IP.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/audit` | Create audit row with contact + business info. Returns `{ auditId, uploadUrls }` (pre-signed R2 upload URLs for screenshots) |
| POST | `/api/audit/:id/screenshots/:position` | Multipart upload of one screenshot (multipart) OR client uploads direct to R2 using pre-signed URL, then POSTs metadata here |
| POST | `/api/audit/:id/analyse` | Kicks off the WebsiteAuditor + AIStudioPromptBuilder run. Returns immediately; progress via SSE. |
| GET | `/api/audit/:id/stream` | Server-Sent Events stream of progress: `{ status, message, percent }` |
| GET | `/api/audit/:id` | Fetch the full audit JSON (used by the results page) |
| POST | `/api/audit/:id/email` | Re-send the audit email (operator can hit this from internal tools) |
| GET | `/api/audit/:id/openai-prompt.txt` | Plain-text download of just the AI Studio prompt (for the copy-paste button) |

**Public-page sitemap additions:**

```
/audit                  Landing — pitch + start-audit form
/audit/:id              Live results page (also where the email link goes)
```

**Rate limits** (using existing rate-limit middleware):
- Create audit: 3 audits per IP per 24h
- Analyse: 1 in-flight analyse job per audit; cannot re-trigger if `status='analysing'`

## 9. The two prompts (verbatim from operator)

These are stored as the literal system prompts for the two agents. Saved to `worker/src/prompts/website-auditor.md` and `worker/src/prompts/ai-studio-builder.md`.

### 9.1 WebsiteAuditor system prompt — Step 1

```
You are a world-class conversion rate optimization (CRO) expert,
direct-response copywriter, and web designer specializing in local
service businesses.

I am going to upload screenshots of a business website.

Your job is to audit the site and create a clear plan to improve it
for more phone calls and leads.

STEP 1 — ANALYZE & EXTRACT

Carefully review all screenshots and extract:

Business Information
- Business type / industry
- Target customer
- Core services offered
- Geographic area (if visible)
- Primary goal (assume: generate phone calls and leads)

Branding
- Logo style (describe it)
- Primary colors (approximate hex if possible)
- Secondary colors
- Font styles (approximate if unknown)
- Overall design style (modern, outdated, cluttered, minimal, etc.)

Page Structure
- Sections on the page in order
- Navigation / menu structure
- CTA placements (buttons, phone numbers, forms)
- Key messaging and headlines

STEP 2 — CRO AUDIT

Perform a detailed CRO audit focused on increasing phone calls and
leads.

Break into:

1. Clarity
- Is it immediately clear what the business does?
- Is the value proposition obvious within 3 seconds?

2. Messaging
- Headline effectiveness
- Emotional appeal vs generic language
- Specificity vs vagueness

3. Offer Strength
- Is there a compelling reason to act now?
- Is there a risk reversal (free quote, guarantee, etc.)?

4. Call-to-Action (CTA)
- Visibility of phone number
- CTA clarity and frequency
- Mobile friendliness

5. Trust & Proof
- Reviews, testimonials, ratings
- Before/after examples
- Case studies
- Certifications or badges

6. Layout & UX
- Visual hierarchy
- Section flow
- Readability and spacing
- Likely mobile experience

7. Conversion Killers
- Confusion points
- Friction
- Anything reducing trust or urgency

STEP 3 — IMPROVEMENT PLAN

Provide a clear, actionable improvement strategy.

Include:
- New positioning angle
- Improved offer
- Phone-first CTA strategy
- Trust-building additions
- Section-by-section improvements

STEP 4 — REBUILT HOMEPAGE STRUCTURE

Write a complete, optimized homepage designed to increase phone calls.

Include:
- Hero section (headline, subheadline, CTA, phone emphasis)
- Services section
- Simple 3-step "How it Works"
- Proof/testimonials section
- About/trust section
- Strong final CTA section

Use:
- Clear, simple language
- Local service positioning
- Phone-driven CTAs (Call Now, Get a Free Quote, etc.)

IMPORTANT:
- Prioritize clarity over cleverness
- Assume the visitor is a busy local customer
- Focus everything on generating calls and leads
```

### 9.2 AIStudioPromptBuilder system prompt — Step 2

```
You are an expert AI website builder using HighLevel AI Studio
(Lovable).

Using the audit, branding, and homepage structure provided above,
your job is to create a complete AI Studio prompt that will rebuild
this website as a high-converting homepage.

Your output must be a single clean prompt that can be pasted directly
into AI Studio.

INCLUDE:

Business Context
- Business type
- Services offered
- Target customer
- Location (if known)

Branding
- Colors (use extracted or improved versions)
- Font style (approximate if needed)
- Visual style (modern, clean, trustworthy, local service focused)

Homepage Structure
- Hero section (strong headline, subheadline, phone CTA)
- Services section
- 3-step "How it Works"
- Testimonials / proof section
- About / trust section
- Final CTA section

Copywriting
- All headlines, subheadlines, and body text
- Strong, clear, benefit-driven language
- Phone-first CTAs throughout

Design Instructions
- Mobile-first layout
- Sticky header with phone number
- Clear CTA buttons throughout
- Clean spacing and visual hierarchy

Optimization Focus
- Designed to increase phone calls
- Fast to understand
- Trust-building
- Simple and direct

OUTPUT RULES:
- Output ONLY the final AI Studio prompt
- No explanations
- No extra commentary
- Clean and structured
- Ready to copy and paste

Label nothing. Just output the prompt.
```

## 10. Frontend pages

Same Vite + React + Tailwind stack as the rest of `octio.co.za`. Reuses the dark theme. New components under `src/features/audit/`.

### `/audit` — landing

- Hero: "Free AI Website Audit for Local Businesses — Get a CRO report + AI Studio rebuild prompt in 60 seconds"
- Subhead: explains the two outputs in plain English
- 3-step explainer: Upload → Email → Get audit
- Below the fold: a strip of "what we look at" (the 7 CRO axes)
- One CTA: "Start my audit →" (scrolls to or routes to the upload form)
- Social proof if available — "Used by 100+ local service businesses" (counter; falls back to "Built by Octio, a pure-play AI company in South Africa")

### `/audit/upload` — start the audit (could be modal on landing, simpler as a route)

- Drag-and-drop screenshot uploader (uses `react-dropzone`)
- 1–6 images, mobile + desktop welcome, ≤5MB each, PNG/JPG
- Email-gate form below the uploader: name, email, business name, business type (dropdown), website URL (optional), notes
- "Run my audit →" submit

### `/audit/analysing/:id` — progress

- Stays on the same conceptual screen; URL is `audit/:id`
- SSE-driven progress messages mirroring the agent's state
- Subtle animation; the reactive 3D Octo orb from the chat could appear here for brand continuity
- ETA badge: "Usually takes 60 seconds"

### `/audit/:id` — results

Four tabs, all rendered from `audit_content` JSON:
1. **Audit Report** — Per-axis breakdown with scores. Each axis has a 1–10 score, an emoji indicator, and a 2–3 paragraph analysis.
2. **Improvement Plan** — Numbered action list, "do this / fix that".
3. **Rebuilt Homepage Structure** — Section-by-section blueprint with sample copy.
4. **AI Studio Prompt** — Single big code block with a prominent copy button. "Paste this into HighLevel AI Studio (Lovable) to regenerate your site."

Floating CTA bottom-right: "Want Octio to build this for you?" → opens chat with `intent='onboard'` + `prefilledService='lead-generation'` + `metadata.fromAuditId={id}`.

## 10.5. Marketing positioning & launch plan

### The flip

Adam Erhart's video teaches freelancers to *sell* the AI-generated website
for $2k. We *give the audit + rebuild prompt away for free*. Why this is
strictly better for Octio:

| Adam's play | Octio's play |
|---|---|
| Sell the website ($2k one-time + $297/mo HighLevel) | Give audit + prompt away free |
| Customer pays for the build | Customer can self-build with the prompt OR have Octio build (upsell) |
| Recurring revenue = HighLevel subscription | Recurring revenue = AI Lead Generation + Voice & Chat + Newsletter Engine subscriptions ($3,500–$8,500/mo) |
| Selling to freelancers / agencies | Selling to local businesses directly |
| Front door = video / DMs | Front door = octio.co.za/audit + organic + paid |

Our funnel:

```
Free audit (instant value)
     │
     ▼
Audit results page + AI Studio prompt + Octio chat CTA
     │
     ▼
Octo asks: "I see {businessName} scored {X}/10 on Trust signals. We
have a product that fixes exactly that — want to see how it'd work
for you?"
     │
     ▼
Discovery call booked → sells AI Lead Gen / Voice & Chat / Newsletter
     │
     ▼
Recurring revenue $3.5k–$8.5k/month per customer
```

### Why this beats the "build them a website" play

1. **We don't want to be a web agency.** Octio sells pure-play AI. Building websites is commoditised (anyone with HighLevel can do it). AI lead gen + voice agents + social automation is harder to replicate and stickier (customers can't easily switch).
2. **The audit is portable proof.** Even if the prospect takes the AI Studio prompt and builds the website elsewhere (HighLevel themselves, a freelancer, Lovable directly), they got value from us and we got their email + business profile. They remember us when their lead-gen problem becomes the next obvious pain.
3. **Scale economics.** A $2k website sale takes 1–2 sales conversations and you ship one project. An AI Lead Gen subscription needs ~half a sales conversation and recurs forever. Audits at-scale produce *thousands* of leads for the subscription products without any sales effort per lead.
4. **Trojan horse for AI-agency narrative.** The audit demonstrates AI capability. Local businesses see that and think "if they can audit my site this well, imagine what their AI products do."

### Landing-page copy (draft)

**Hero headline:** "Free AI Website Audit for Local Businesses"
**Subheadline:** "Get a CRO report + a copy-paste AI rebuild prompt in 60 seconds. No signup. No agency call. Just upload screenshots."
**Sub-subhead:** "Built by Octio — the AI company that runs lead generation, voice agents, and social media for businesses like yours."
**Primary CTA button:** "Start my free audit →"
**Secondary line:** "Used by local plumbers, dentists, lawyers, and electricians across South Africa."

### Promotion plan (Phase 1 launch week)

- **LinkedIn post** from `simekani@` walking through one real audit (anonymised) end-to-end. Embed the AI Studio prompt at the end so anyone reading can use it.
- **Octio newsletter** (once Content Engine Phase 1a ships): "Want to see what AI thinks of your website? Free audit at octio.co.za/audit"
- **Free directory listings** in local-SEO directories — "Free website audit for small businesses"
- **SEO-targeted blog post**: "I let AI audit 10 local business websites — here's what it found" with permission-marketed before/after examples
- **Cold outreach hook**: when reaching out to a prospect, run the audit first, send the result as the first message ("ran your site through our AI auditor — here's what came out, no obligation")

### Pricing add-on (Phase 2+)

While the audit stays free forever, Phase 2 introduces optional paid services *triggered from the audit results*:
- **"Octio implements the rebuild for you"** — flat fee, we do the HighLevel build (~R8k–R15k one-time). Acts as a "warm-up project" before the AI subscription pitch.
- **Premium audit** — adds competitor benchmarking, mobile vs desktop, conversion-funnel sketch (R1.5k one-time). Catches the "I'm not ready for the products yet but want to pay you something" segment.

Both are Phase 2 — Phase 1 keeps the audit purely free to maximise top-of-funnel volume.

### Where this fits in Octio's product page hierarchy

Add a new top-level surface at `/audit` (the tool itself). Cross-link from:
- Homepage Hero — "Try the free audit" as a tertiary action (after main CTA + FAB)
- `/products/lead-generation` page — "Not sure your site is ready for more leads? Run the audit first →"
- `/products/social-media` page — "See how your site is converting before you invest in social →"

Do NOT add the audit to the main `/products/*` carousel — it's a lead magnet, not a product Octio sells. It belongs in a "Free Tools" section if we ever add one, otherwise just a high-prominence link in the homepage hero area.

## 11. Lead capture + CRM hand-off

Every audit creates a contact record. The pipeline:

```
Audit created → audits.contact_email captured
   ↓
WebsiteAuditor runs (Claude Sonnet)
   ↓
Email sent from support@octio.co.za:
  Subject: "Your Octio audit for {businessName}"
  Body: TL;DR scores + link to /audit/:id + the AI Studio prompt
   ↓
[user clicks CTA in audit or in email]
   ↓
Existing chat opens with intent='onboard' + prefilledService='lead-generation'
   metadata.fromAuditId=:id passed through so Octo can reference the audit:
   "I saw the audit you ran for {businessName}. Want to talk about how
    we'd fix the conversion gaps?"
   ↓
Standard discovery flow + booking
```

For prospects who DON'T click the CTA, a 48-hour follow-up email goes out (existing follow-up-sequence cron, new template "audit_followup") with: a one-line recap of their lowest score + an offer to chat.

## 12. Phase breakdown

### Phase 1 — Public audit tool live on octio.co.za (~6–7 days)

- DB migrations: `audits`, `audit_screenshots`
- R2 bucket + signed-URL upload flow
- Worker routes (§8) including SSE stream
- WebsiteAuditor agent (Mastra + Anthropic SDK + Claude Sonnet vision)
- AIStudioPromptBuilder agent (Mastra + Kimi)
- Frontend pages (§10): landing, upload, analysing, results
- Audit email template (existing Gmail send infra)
- Chat hand-off integration (extend `WizardContext` with `fromAuditId` metadata path)
- Rate limiting + abuse guards
- Audit page indexed in sitemap.xml; meta tags + JSON-LD as a SoftwareApplication

### Phase 2 — Quality + retention layer (~4 days)

- Mobile vs desktop side-by-side audit (uploader takes both, agent compares)
- Service-page audit (audit a specific service / inner page, not just home)
- "Email me a PDF" — render audit as a clean PDF (via @react-pdf/renderer in the worker)
- 48-hour follow-up email template (audit-specific)
- Score-progression: re-run audit later, see deltas
- Audit shareable as a public-with-token link (current `/audit/:id` is already unguessable, but add a "share" button that copies a UTM-tagged URL)

### Phase 3 — Reach + virality (~5 days)

- Submit-URL flow: user pastes a URL, we screenshot the site headless-Chrome-style (Browserless / Playwright) and run the audit on those screenshots. Removes manual upload friction.
- Competitor audit — paste 2 URLs, get a comparison report
- Embeddable audit widget (other sites can embed "Audited by Octio")
- White-label / agency mode (Phase 4 segment — agencies resell the tool with their branding)

### Phase 4 — Productisation as standalone SaaS (~4–6 weeks separate effort)

Same Phase 4 productisation pattern as the other internal tools:
- Multi-tenant tenants table
- Per-tenant branding on the audit page
- BYOK LLM keys for agencies
- Stripe subscriptions: free → 5 audits/month / unlimited / agency
- Public marketing site `audit.octio.app` separate from `octio.co.za`

## 13. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Existing Vite + React + Tailwind + Framer Motion |
| Backend | Existing Hono worker + Mastra |
| Vision LLM | Anthropic Claude Sonnet (vision + creative writing combo). Set up via `@ai-sdk/anthropic` |
| Text LLM (AI Studio prompt) | Kimi K2 Turbo (existing in worker config) |
| Image upload | Direct browser → R2 via pre-signed URLs (worker mints the URLs) |
| Image storage | Cloudflare R2 (S3-compatible) — same bucket strategy as the future Content Engine |
| Email delivery | Existing `support@octio.co.za` Gmail send infrastructure |
| SSE | Native `EventSource` on FE, Hono SSE on BE |
| Rate limiting | Existing rate-limit middleware |
| Audit IDs | `nanoid` 16-char (~url-safe, unguessable) |

## 14. Multi-tenant readiness

Per admin dashboard spec §9.5, applied here:
- `audits.tenant_id BIGINT NOT NULL DEFAULT 1`, indexed
- All read queries scope by tenant via shared helper
- Agent prompts loaded from `worker/src/prompts/*.md`, ready to become tenant-configurable in Phase 4 (e.g. agencies override the audit prompt to match their CRO methodology)
- Audit branding (colours, logo on the page) ready to become per-tenant
- `audits.contact_email` will get a `tenant_id` scope check at lookup time

## 15. Risks

| Risk | Mitigation |
|---|---|
| Claude Sonnet vision rate limits | Anthropic Tier 1 is 50 req/min — plenty at v1. Queue requests in worker if we exceed. Plus: cache audits forever, so refresh of `/audit/:id` doesn't re-run the agent. |
| Audit quality is inconsistent | Per-section scoring + structured output schema constrain Claude's variance. Worst case we add a second-pass "quality check" agent in Phase 2. |
| LLM cost runs away | ~$0.12 per audit average. At 100 audits/month = $12/month. Hard global daily cap in worker env (`AUDIT_DAILY_COST_CAP_CENTS=500`). |
| Prompt injection in user-uploaded screenshots | Treat all extracted text as untrusted; never execute or echo it unprocessed. Claude is reasonably robust to text-in-image injection but we still sandbox the system prompt + user content cleanly. |
| Abuse: people running 500 audits to scrape data | IP-based rate limit (3/24h). Per-email rate limit (5/24h). CAPTCHA gate at upload if abuse detected. |
| AI Studio prompt copies Octio's name in a way that hurts brand | Lower the "credits Octio" footer to soft mention only. Quality matters more than attribution. |
| Audit page indexed by Google = leak of customer URLs | Audit pages use `noindex` robots meta tag. Search engines never see `/audit/*`. The marketing landing `/audit` IS indexable. |
| GDPR / POPIA: holding contact data | Existing `/privacy/delete` flow already supports email-based deletion. Audit results auto-purged after 90 days unless the contact has booked a discovery call. |
| User uploads malware / scary content | R2 bucket is private; images served via signed URLs only; Claude refuses malicious image content; we cap at 5MB per image. |

## 16. Open questions

1. **CTA wording at the end of the audit:** "Want Octio to build this for you?" vs "Let's talk about your AI lead-gen strategy" vs "Book a 20-min review with the team". Recommendation: A/B test across cohorts in Phase 2.
2. **Should we render the AI Studio prompt inline or also as a downloadable `.txt`?** Recommendation: both — inline copy button + `/api/audit/:id/openai-prompt.txt` download URL.
3. **Should the audit URL be on octio.co.za or audit.octio.co.za?** Recommendation: `octio.co.za/audit` for v1 (SEO + simplicity); split to subdomain in Phase 4 when productised.
4. **Multilingual support?** Recommendation: English-only v1. The CRO copywriting heuristics are most validated in English. Add isiZulu / Afrikaans in Phase 3 if SA market traction shows it matters.
5. **Should the "rebuilt homepage structure" output be marketing copy OR HTML/JSX?** Recommendation: marketing copy only (the AI Studio prompt handles the HTML side). Avoid the trap of becoming a website builder ourselves — that's what HighLevel does.
6. **HighLevel AI Studio specifics — should our prompt include any HighLevel-specific syntax?** Need to verify in research pass before launch.

## 17. Approval checklist

- [ ] Goal & strategic positioning (§1, §2) → approved
- [ ] Architecture: new routes in cyma repo, new worker endpoints, Claude vision → approved
- [ ] User flow (§4) including email-gate placement → approved
- [ ] Two-agent design (§6) with verbatim system prompts in §9 → approved
- [ ] Data model (§7) → approved
- [ ] API surface (§8) → **needs explicit approval per global rule**
- [ ] CTA hand-off to existing chat funnel (§11) → approved
- [ ] Cost budget (~$0.12/audit, ~$12/100-audits/month) → approved
- [ ] Phase 1 scope and 6–7 day estimate → approved
- [ ] Phase 2 / 3 / 4 backlog → approved as direction
- [ ] Open questions in §16 — answered before scaffold

Once all checked, implementation starts at Phase 1, day 1.
