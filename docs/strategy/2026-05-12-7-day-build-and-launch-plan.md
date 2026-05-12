# Octio — 7-Day Build & Launch Plan

**Dates:** 2026-05-12 → 2026-05-19
**Goal:** Ship every product Octio markets on `octio.co.za` from "page on the site" → "actually works for a paying customer". Plus the website-audit lead magnet. After day 7 we have an operational SaaS portfolio + a working audit funnel.

**Author:** Simekani + Claude (Opus 4.7)
**Status:** Plan — start of day 1 = 2026-05-13 (or as agreed)

---

## 1. Where we are vs where we need to be

### What Octio currently markets (per octio.co.za/products/*)

| SKU | Marketed price | Public status |
|---|---|---|
| AI Lead Generation & Pipeline | R8,500/mo entry | Live (Octo on octio.co.za is exactly this — for Octio's own pipeline) |
| Voice & Chat Agents | R6,500/mo entry | **Chat exists for Octio only; voice doesn't exist at all; neither is sellable to a customer yet** |
| AI Social Media Manager | R4,500/mo entry | Specced (Content Engine, Phase 1a), not built |
| The Newsletter Engine | R3,500/mo entry | Specced (Content Engine, Phase 1a), not built |
| Agentic Web & App Development | R85k–R220k | Service offering — delivery is human-led, no "product" to build |
| Custom Agentic Workflows | R35k–R150k | Service offering |
| Corporate AI Advisory | R125k–R450k | Service offering |

**Honest gap:** out of the 4 autonomous AI products we sell, **only Lead Gen is genuinely operational** — and only for Octio itself. Selling tomorrow without building means delivering manually for first cohort, which works but doesn't scale.

### What we have in our specs already

| Doc | Phase 1 estimate | Status |
|---|---|---|
| `2026-05-12-content-engine-design.md` (Social + Newsletter) | 12 days | Approved + research-validated |
| `2026-05-12-admin-dashboard-design.md` | 6 days | Draft awaiting sign-off |
| `2026-05-12-website-audit-tool-design.md` | 6–7 days | Draft awaiting sign-off |
| **NEW — needed:** Voice Agent design | tbd | Not yet specced |
| **NEW — needed:** Embeddable Chat Widget (multi-tenant) | tbd | Not yet specced (covered as Phase 4 in admin dashboard spec but not its own doc) |
| **NEW — needed:** Tenant onboarding + Stripe billing | tbd | Phase 4 of admin dashboard spec |

### What 7 days realistically delivers

We compress every spec's Phase 1 into a **strict MVP** — the smallest working version that lets us:
1. Demo it on a sales call as "this is your version"
2. Onboard a paying customer manually (Wizard-of-Oz for the parts not automated yet)
3. Iterate without re-architecting

Anything past MVP — observability dashboards, charts, polish, Phase 2 features — comes in week 2+ from real customer feedback.

---

## 2. 7-day execution plan

Each day ends with a deployed-to-prod surface that a customer could see / use / pay for. We sequence by *what unlocks the next day's work*.

### Day 1 (Tue) — Multi-tenancy foundation + Website Audit Tool MVP

**Why first:** every other product depends on multi-tenancy. The audit also drops emails into the pipeline, so day-1 audit traffic feeds days 2–7.

**Morning — Multi-tenancy core (4h)**
- Migration: `tenants` table, `tenant_id BIGINT NOT NULL DEFAULT 1` on every existing table that doesn't have it
- Helper: `getCurrentTenant(req)` middleware — resolves tenant from subdomain `{tenant}.octio.app` OR query param OR (default) returns tenant 1 = Octio
- Worker auth context now carries `tenant_id`
- One read-helper that EVERY query goes through: `scoped(query, tenantId)` adds the `WHERE tenant_id = $1` predicate. If we forget on a new query, the helper makes it impossible.

**Afternoon — Website Audit Tool MVP (4h)**
- New routes on existing Vite app: `/audit` (landing), `/audit/upload`, `/audit/:id` (results)
- Worker: `POST /api/audit`, `POST /api/audit/:id/analyse`, `GET /api/audit/:id`, `GET /api/audit/:id/stream` (SSE)
- WebsiteAuditor agent (Mastra + Anthropic SDK + Claude Sonnet vision)
- AIStudioPromptBuilder agent (Mastra + Kimi K2)
- DB: `audits` + `audit_screenshots` tables (per spec, with `tenant_id`)
- Email delivery: reuse existing Gmail send via `support@octio.co.za`
- **Cut from spec for MVP:** R2 storage (use base64 + temp DB column instead — fine for v1), niche dropdown (free-text), ROI math (manual in copy), Google reviews upload (Phase 2)
- Deploy to prod by end of day

**Acceptance:** simekani@ can run an audit on a real local business's site and the result lands in their inbox in <2 min.

---

### Day 2 (Wed) — Embeddable Chat Widget (multi-tenant Octo for customers)

**Why second:** "Chat agent" is half of the Voice & Chat Agents product. We can sell this immediately if it works. Reuses ~80% of existing Octo code.

**Build:**
- New worker route: `GET /widget/:tenantId/embed.js` — returns minified IIFE that mounts the chat in any host page via postMessage iframe bridge
- New worker route: `GET /widget/:tenantId/iframe` — server-renders a stripped-down chat page (no 3D orb, just CSS 2D orb for lightness; ~30 kB gzipped total vs octio.co.za's 900 kB Three.js bundle)
- DB: `tenant_agent_config` (system prompt template overrides, brand colour, opening message, knowledge base URL, escalation email/phone)
- Step engine in `/chat/step` already exists — resolve tenant config from `tenantId` instead of hardcoded Octio
- Customer pastes one `<script>` tag on their site; chat appears bottom-right
- All leads flow into the same `conversation_events` table tagged with `tenant_id`

**Cut for MVP:** customer dashboard (day 5), advanced theming, voice input on the embed, file upload

**Acceptance:** simekani@ can paste a `<script>` tag on a fake test site, the chat appears with a different tenant's brand colour, and a lead captured shows up under that tenant's row.

---

### Day 3 (Thu) — Voice Agent MVP (Twilio + Kimi + ElevenLabs)

**Why third:** the other half of the Voice & Chat Agents product. New infrastructure but well-trodden territory with Twilio.

**Build:**
- Buy a Twilio number for Octio (R150/month base)
- New worker routes:
  - `POST /api/voice/twilio/incoming` — Twilio webhook on inbound call. Returns TwiML that starts a `<Stream>` to our worker WebSocket.
  - WebSocket handler: streams audio chunks to Deepgram or OpenAI Whisper for live STT
  - On each partial transcript: pipe to Kimi/Claude agent with conversation context, get response
  - On response: stream TTS audio (ElevenLabs Flash v2.5 — sub-300ms latency) back to Twilio
  - Conversation ends → save full transcript to DB, optionally book a discovery call via existing booking flow
- DB: `voice_calls` table (id, tenant_id, from_number, to_number, started_at, ended_at, transcript_json, booking_id?, status)
- Each tenant configures: which Twilio number forwards to them, voice ID (ElevenLabs voice), opening line, escalation rules ("transfer to {humanNumber} if caller says X")

**Cut for MVP:** outbound calling, voicemail transcription email, advanced IVR menus, multi-language (English only day 1), warm transfer to human

**Acceptance:** simekani@ calls Octio's Twilio number → AI greets in Octio's voice → asks why they're calling → books a discovery call if they want → email confirmation sends. Test recording end-to-end.

**Risks:** Twilio + STT + LLM + TTS latency budget is ~1.5s per turn. If we miss this, conversation feels broken. Have a fallback: pre-recorded fall-back voice line ("let me grab the team for you — leaving a message?") if any leg of the pipeline blows past 3s.

---

### Day 4 (Fri) — Content Engine MVP (LinkedIn + Newsletter for Octio's own marketing)

**Why fourth:** Octio uses this for our own marketing starting week 2 — the audit tool will need a content engine pumping out distribution. Also: Social Manager + Newsletter SKUs come live for sale.

**Build:**
- New repo `octio-content` scaffolded with `npm create mastra@latest` (per spec §17.3)
- Or, given 7-day pressure: **collapse into cyma repo as `content/` workspace** — saves the new-repo overhead, splits later if we outgrow
- Three agents: ContentStrategist (weekly cron), LinkedInDrafter, NewsletterDrafter
- LinkedIn OAuth flow (Community Management API, scopes `openid profile email w_member_social`)
- LinkedIn publish via `POST /rest/posts`
- Newsletter sender: DIY via existing Gmail (Tier A from content spec). `NewsletterSender` interface so Beehiiv adapter slots in later.
- Source curation: web form day 1 (Discord bot deferred to week 2 per content spec's brainstorm — too much for 1 day)
- Brand voice JSON in `tenant_agent_config.brand_voice`
- Approval queue at `/admin/content/queue` (lightweight; full admin dashboard comes day 5)

**Cut for MVP:** TikTok briefs, image generation, full analytics dashboard, Discord integration, multi-section newsletter editor (single-textarea inline edit instead)

**Acceptance:** Octio's first LinkedIn post drafted by AI, approved by simekani@, posted to LinkedIn. Octio's first newsletter assembled from 3 manually-added sources, sent via Gmail to a test list of 3 people.

---

### Day 5 (Sat) — Admin Dashboard MVP + Tenant onboarding

**Why fifth:** with 4 products running for customers, we need a place to see everything. Also: the onboarding flow gates everything for the public launch.

**Build morning — Admin Dashboard MVP (4h):**
- New route group `/admin/*` in cyma app, env-var auth (per admin dashboard spec §4)
- 4 surfaces:
  - `/admin/leads` — list, status update, link to conversation
  - `/admin/bookings` — today/this week, call brief
  - `/admin/calls` (NEW for voice) — recent voice calls + transcript
  - `/admin/content` — queue + approve drafts (reuse from day 4)
  - `/admin/ops` — cron run history, email send log
- All scoped by `tenant_id` from JWT — internal Octio operators see all tenants if they have the `super_admin` claim
- **Cut for MVP:** charts, saved views, cmd-K search, audit log read view, bulk actions

**Build afternoon — Tenant onboarding flow (4h):**
- Public signup at `octio.app/start` (or octio.co.za/start for now)
- Step 1: pick plan (Lead Gen / Voice & Chat / Social / Newsletter or bundle)
- Step 2: business details (name, industry, brand colour, brand voice samples)
- Step 3: connect channels (LinkedIn OAuth, Calendar OAuth for bookings, Twilio forwarding number if Voice)
- Step 4: Stripe Checkout for subscription
- On successful Stripe webhook → provision tenant row, send welcome email with embed script + dashboard link
- **Cut for MVP:** complex plan permutations (just 4 single-product plans + 1 bundle), free trial, in-app onboarding tutorial

**Acceptance:** new tenant can sign up + pay + receive working setup in 15 minutes end-to-end. Their chat widget works on a test page, their voice number works, their LinkedIn drafts appear in the queue.

---

### Day 6 (Sun) — Polish + load test + content engine for Octio's own ramp

**Why sixth:** everything works in isolation; today we make it survive real traffic and prep for paid acquisition.

**Build:**
- Load test the audit tool (simulated 100 concurrent uploads — Claude API rate limits worth checking)
- Load test the voice agent (5 concurrent calls — Twilio + Deepgram + ElevenLabs concurrent stream limits)
- Postmaster Tools verification for `octio.co.za` (for newsletter deliverability — per content spec §0)
- LinkedIn app approval status check (apply day 1 → usually instant for personal `w_member_social`)
- Octio's own Content Engine setup: import historical Octio LinkedIn posts as "sample posts" for brand voice training; add 10 curated sources to seed first newsletter
- End-to-end smoke test of full sales flow: audit → chat → discovery call booked → call happens → invoice sent
- Production deploy of every change from days 1–5

**Acceptance:** five fictional customers signed up, all four products run for each one without operator intervention for 24h.

---

### Day 7 (Mon) — Launch

**Morning:**
- LinkedIn announcement post from simekani@: "We just shipped four AI products + a free website audit tool. Here's what each one does." (draft + post via the Content Engine we built day 4, dogfooding)
- Send Octio's first newsletter to the existing email list announcing the products + the free audit tool
- Email outreach to a curated list of 50 SA local businesses with their site's audit pre-run (the Adam Erhart play — show up with a gift)

**Afternoon:**
- Monitor: signup conversion, audit completion, support tickets
- Hot-fix anything broken
- Triage first 10 incoming leads personally to build the playbook

**Evening:**
- Retro: what worked, what broke, what's the next sprint

**Acceptance:** week 1 ends with at least 1 paying customer signed up via the audit funnel OR clear data on where the funnel is leaking.

---

## 3. What MVP means vs production-grade

For each product, MVP = "we can demo it and bill for it." Production = "10 customers on it without operator intervention." MVP is days 1–7; production is week 2–4 of iteration.

### MVP shortcuts we'll take (and accept as tech debt)

| Product | MVP shortcut | When we pay it back |
|---|---|---|
| Audit Tool | Screenshots stored as base64 in DB instead of R2 | Week 2 if storage costs > R200/mo |
| Audit Tool | No niche-specific prompt variants — one prompt for all | Week 3 once we see prompt failures per niche |
| Embed widget | Tenant config edited via SQL, not UI | Day 5 (admin dashboard) covers this |
| Embed widget | 2D CSS orb only, no Three.js | Permanent — embed should stay light |
| Voice Agent | English only, no multi-lingual | Phase 2 — when we onboard a customer who needs Afrikaans/Zulu |
| Voice Agent | No warm transfer to human | Week 2 — Twilio `<Dial>` verb is straightforward |
| Voice Agent | No call recording → S3 (only transcripts saved) | Week 2 if customers request audio |
| Content Engine | No Discord bot — web form for sources | Week 2 per content spec |
| Content Engine | No TikTok, no image gen, no Beehiiv adapter | Per content spec Phase 1b/2 |
| Admin Dashboard | No charts, no saved views | Per admin spec Phase 2 |
| Tenant onboarding | 4 single-product plans + 1 bundle, no usage-based pricing | Week 3 once we have data on usage patterns |

### Wizard-of-Oz for the first 5 customers per product

Things we'll fake until we automate:
- **Voice Agent:** if STT/TTS pipeline breaks for a customer's call, founder gets a Slack alert + can take the call manually
- **Newsletter:** founder eyeballs every issue for the first month (the approval queue exists; we use it religiously)
- **Social Manager:** same — approve every LinkedIn post manually until trust in agent's output is high
- **Lead Gen (Octo):** founder reviews every booking confirmation before it sends (toggle in admin dashboard)

This is fine — it's the same "Patient Zero / Wizard-of-Oz" the marketing site already says we do for first cohort.

---

## 4. Go-to-market strategy (saved from earlier brainstorm)

The audit tool is **not a product we sell** — it's a customer-acquisition machine for the four products we *do* sell. Six concrete plays:

### 4.1 Make distribution > tool quality
Quality is table stakes; who runs it is the lever. Place the audit everywhere a local business is already looking:
- Homepage primary tertiary CTA on octio.co.za (day 1)
- Chrome extension ("Audit this site") — installs once, audits any site you visit, captures lead every time (week 2)
- Embed widget partners can put on their sites (web designers, marketing agencies, HighLevel affiliates) — we share leads
- LinkedIn posts dropping anonymised audit findings as content
- SEO play: rank for "free website audit", "small business CRO audit South Africa", local-niche variants
- Cold outreach: audit a prospect first, send results as the first message — Adam Erhart's hook, applied to lead-gen instead of selling websites

### 4.2 The audit IS the product demo
Every audit demonstrates Octio's AI capability live. Two implications:
- Be visibly good at the audit — Claude Sonnet vision, structured scoring, ROI math at the bottom
- Layer in a live preview of one of our actual products mid-audit. E.g. while audit runs, show: "We also drafted what a Lead Gen chat agent would say to your visitors. Here's the first message →"

### 4.3 Personalise the AI-product pitch based on audit data
The audit captures: business type, avg customer value, current conversion gaps. Use these in the chat that follows:
- "Your site scored 4/10 on Trust signals. We have a Voice & Chat agent that catches every inbound call within 1 second and qualifies the lead — fixes exactly that gap."
- ROI math at the close: "We estimate this rebuild + Voice & Chat would recover 8 calls/month. At your avg ticket of R5,000 that's R480,000/year. Voice & Chat is R6,500/month."

### 4.4 Position against AI website agencies
Most agencies in this game sell websites. Octio's wedge: we don't. **"We do what comes after the website — the AI agents that convert your traffic to customers."** The audit even surfaces this — "your CRO score is X. But even a perfect site loses Y% of visitors who land outside business hours. Here's what catches them."

### 4.5 Build the "Octio Audit Score" as a referenceable metric
Like Lighthouse / PageSpeed but for *conversion*. After 1,000 audits we can publish industry benchmarks ("SA plumbing sites average 4.2/10 on Trust"). Becomes a content-marketing flywheel.

### 4.6 Cheap retargeting funnel
Every audit drops a contact into our DB:
- 48hr follow-up email referencing their lowest-scoring axis
- Re-audit reminder at 90 days
- LinkedIn ad audience: upload every audit email, retarget with "We audited your site. Want to fix it?" creative

---

## 5. Internal validation plan (saved from earlier brainstorm)

Before public launch (day 7), we eat our own dog food in widening circles.

### Stage 1 — Closed alpha on prospects we know (day 1–2 evenings, 10 audits)
- Pick 10 local businesses we'd target as customers (plumbers + dentists in Pretoria + Joburg)
- Run audit ourselves, no public access
- Compare AI output vs what we (as humans) think the issues are
- **Go/no-go signal:** AI catches >70% of what we'd manually flag, AND surfaces ≥1 thing we missed per audit
- **Outcome:** prompt tuning + niche-template library before opening to anyone else

### Stage 2 — Sales-team alpha (day 3–5, ~30 audits)
- Use it as free value-add in current sales conversations: "Before we talk pricing, mind if I run our AI auditor on your site?"
- Measure: does it shorten sales cycles? Does it open doors that were stalled?
- **Go/no-go signal:** 3+ prospects say "wait, you could just sell this audit"

### Stage 3 — Soft public launch (day 6, target 30 audits)
- Audit lives at octio.co.za/audit but unpromoted
- Drive only org/direct traffic
- Measure the funnel: land → start → complete → CTA click → discovery booked

### Stage 4 — Hard public launch (day 7+)
- LinkedIn post series, paid SA-targeted ads
- Affiliate / partnership invites to web designers + marketing agencies

### Funnel targets at month 3
- 200+ audits run
- ≥20% audit → chat-CTA click rate
- ≥5% audit → discovery-call booked
- ≥1 customer closed via audit
- Cost per closed customer via audit < R1,500 (vs SA SMB paid-ads CAC R3k–R10k)

---

## 6. What's explicitly NOT in 7 days

We will resist scope creep. Things we'll defer to week 2+:

- TikTok briefs (Content Engine Phase 1b)
- Image generation tool (Content Engine §16.2)
- Avatar video / HeyGen (Content Engine §16.3)
- ElevenLabs voice for non-call use cases (newsletter audio, supervisor agent)
- Marketing Team Voice Agent (Content Engine §16.6)
- Customer dashboard polish (admin dashboard Phase 2)
- Charts on agent observability
- Per-tenant data export / POPIA self-serve
- Multi-language voice agent
- Discord source curation for newsletter
- Phase 4 "full multi-tenant SaaS marketing site" at octio.app
- Stripe webhook reconciliation edge cases
- A/B testing infrastructure
- Bulk subscriber CSV import for newsletter
- Embed widget customer dashboard with per-tenant analytics

These are real, valuable, and known. They're not in 7 days because shipping is more important than polish.

---

## 7. Day-by-day verification checklist

Each day's "acceptance" criteria from §2 written out as a checkbox. We do this every evening — if a day's box isn't ticked, we either work late or move scope to a buffer day at the end of the week.

- [ ] **Day 1:** simekani@ runs an audit on a real local business site, results in inbox <2 min
- [ ] **Day 2:** Test site shows a working chat widget for a non-Octio tenant; lead lands under correct tenant row
- [ ] **Day 3:** Live phone call to Octio's Twilio number → AI greets → books discovery call → confirmation email arrives
- [ ] **Day 4:** First AI-drafted LinkedIn post posted to simekani@'s LinkedIn after approval; first newsletter sent to 3-person test list
- [ ] **Day 5:** New tenant signs up via /start, pays via Stripe, receives working setup in 15 min
- [ ] **Day 6:** 5 fictional customers running all 4 products for 24h without operator intervention
- [ ] **Day 7:** Public launch posts go out + first 24h metrics captured

---

## 8. What needs new specs before day 1

Right now we have specs for: audit tool, content engine, admin dashboard. We're MISSING specs for:

1. **Voice Agent (Twilio + STT + LLM + TTS pipeline)** — biggest gap, brand new infra
2. **Embeddable Chat Widget (multi-tenant Octo for customer sites)** — covered conceptually in admin dashboard Phase 4 but needs its own design doc
3. **Tenant onboarding + Stripe billing** — Phase 4 of admin dashboard spec, but compressed to day 5

I'll write all three specs before day 1 starts. Each is ~1–2 hours of spec work, captures the design enough to execute cleanly day-of.

---

## 9. Risks specific to the 7-day plan

| Risk | Mitigation |
|---|---|
| Voice Agent latency above 1.5s/turn ruins UX | Day 3 morning is the "spike test" — if latency budget blows, immediately pivot to Twilio's built-in `<Gather>` (push-to-talk) instead of streaming, ship that, fix streaming in week 2 |
| LinkedIn API approval drags past day 4 | Apply day 1. If still pending day 4, queue posts in approval state and ship the post-via-API on day 5 when it lands |
| Twilio number provisioning for SA delays | If we hit a delay, use a US/UK number for the first cohort + add SA later when approved |
| Claude vision rate limit / cost spike during alpha | Hard global daily cap from day 1 (`AUDIT_DAILY_COST_CAP_CENTS=1000`) |
| Multi-tenancy bugs leak customer A's leads to customer B | The `scoped()` helper is mandatory; ESLint rule + Drizzle middleware enforces it. Manual audit before day 7 launch — every list endpoint reviewed. |
| Founder fatigue at 7-day pace | Days 2 + 5 are flexible — if behind, that day's MVP can shrink. Days 1, 3, 4 are blockers. |
| Customer signs up day 7 and finds bug | Day 7 launch is *soft* — invite-only or rate-limited to 5 signups. Day 8–14 are the real-customer wave. |

---

## 10. Decision required before day 1 starts

1. **Plans + pricing:** keep current pricing (R3.5k–R8.5k/mo per product)? OR launch at lower "founding customer" rate for first cohort? Recommendation: launch at marketed prices but bundle a free 14-day pilot ("if it doesn't work for you in 2 weeks, cancel + we refund").
2. **Where does multi-tenant `octio.app` live?** Same `infra-01` host? Same Postgres? Or new infrastructure? Recommendation: same infra-01, new Postgres database `octio_saas` to keep marketing-site queries isolated from tenant data.
3. **Stripe account:** does Octio have an active Stripe account on ZAR? If not, this is a day-0 action (Stripe SA verification typically takes 1–3 days, so it must start now).
4. **Twilio account:** active? SA verified? Same — day-0 action.

Tell me which of these are blockers and I'll start ticking them off in parallel with the spec writing.
