---
title: 06 · Product roadmap
description: What ships when — day-by-day for the first 7 days, week-by-week for first 30 days, month-by-month for first 12 months.
---

> **Iteration 7 of 10**

## The cadence

Three time horizons matter:

| Horizon | Granularity | Why this granularity |
|---|---|---|
| **Days 1–7** | Day-by-day | Every product ships in this window. Each day is a discrete deliverable. |
| **Days 8–30** | Week-by-week | First-cohort acquisition + product hardening. |
| **Months 2–12** | Month-by-month | Strategic milestones, not daily tasks. |

## Days 1–7 (the build-everything sprint)

The compressed schedule. Lift-and-shift from spec docs already written. This is execution, not planning. Long-form rationale lives in `docs/strategy/2026-05-12-7-day-build-and-launch-plan.md`.

### Day 1 — Audit Tool + Lead Gen multi-tenant scaffold

| Window | Output |
|---|---|
| AM | `octio.co.za/audit` route deployed. Screenshot upload + email-gate + Claude vision audit + AI Studio prompt generation working end-to-end |
| PM | Lead Gen multi-tenant DB schema migration. `tenants`, `chat_widgets`, `chat_sessions` tables with `tenant_id` everywhere |
| Stretch | First public link of audit tool shared on LinkedIn |

**Done when:** a stranger can land on /audit, upload screenshots, get an audit report + AI Studio prompt by email.

### Day 2 — Embeddable chat widget + Voice Agent backend

| Window | Output |
|---|---|
| AM | Embeddable `<script>` widget for Lead Gen agent — works on any third-party site, per-tenant config from URL token |
| PM | Voice Agent: Twilio number provisioned, Deepgram STT + Mastra agent + ElevenLabs Flash TTS wired end-to-end |
| Stretch | Test Voice Agent on a personal phone number — call it, book a fake appointment, verify calendar entry |

**Done when:** a customer's website can embed a Lead Gen widget OR a Twilio call lands on the Voice Agent and books an appointment.

### Day 3 — Voice Agent polish + tenant onboarding flow

| Window | Output |
|---|---|
| AM | Voice Agent: warm transfer, after-hours routing, voicemail-to-email |
| PM | Tenant Onboarding: 15-min wizard at `octio.co.za/start` → business info, brand voice, calendar OAuth, Twilio number provision (SA geographic +27 11 / +27 21 for voice), **Payfast Checkout** (Stripe not available in SA) |
| Stretch | First end-to-end test: founder runs Tenant Onboarding as a brand-new tenant, verifies Lead Gen + Voice both work |

**Done when:** anyone with a credit card can self-onboard and have a working AI Lead Gen + Voice Agent within 30 minutes.

### Day 4 — Content Engine (Social + Newsletter)

| Window | Output |
|---|---|
| AM | `octio-content` repo scaffolded; DB migrations; auth |
| PM | LinkedIn OAuth (`w_member_social` scope on Development tier; **Standard tier requires manual review + screen-recording demo — apply day 1 in parallel, allow 2–4 weeks**) + Strategist agent + Drafter agent + approval queue + Publisher cron |
| Stretch | First LinkedIn post drafted and approved for Octio's own page via the engine |

**Done when:** Octio's own LinkedIn posts are running through the engine, founder-approved.

### Day 5 — Newsletter + Discord curator + Payfast billing

| Window | Output |
|---|---|
| AM | Newsletter Drafter + Gmail sender + unsubscribe page + tracking |
| PM | Discord curator bot live in Octio Discord (no manual verification needed under 75 servers); Payfast Checkout + webhook → tenant.subscription_status |
| Stretch | First newsletter assembled from Discord-curated sources, test-sent to founder, approved, sent to internal beta list |

**Done when:** dropping a URL in `#newsletter-sources` Discord channel appears in the newsletter draft within 5 minutes.

### Day 6 — Admin Dashboard + analytics

| Window | Output |
|---|---|
| AM | Admin dashboard: tenants, subscriptions, usage metrics, billing status |
| PM | Per-tenant analytics: chat sessions, voice calls, posts published, newsletter opens |
| Stretch | First "100 audit submissions" mark hit, surfaced in dashboard |

**Done when:** founder has a single page that shows every tenant's status, usage, and revenue.

### Day 7 — Marketing site refresh + soft launch

| Window | Output |
|---|---|
| AM | Marketing site: new homepage with single CTA "Chat with Octio", product detail pages, pricing page with ZAR + bundle anchoring |
| PM | Soft launch post on LinkedIn from founder. Launch newsletter to existing list. Audit tool promoted. |
| Stretch | First three discovery calls booked via Octo chat |

**Done when:** Octio's own website operates entirely on Octio's own products, and the first paying customer has been onboarded OR is in discovery.

## Days 8–30 (first cohort)

### Week 2 — Customer 1–3 onboarded

- Hand-deliver onboarding for first three customers
- Tune Lead Gen prompts per industry
- Tune Voice Agent voice + escalation rules per customer
- Document every gap found → product backlog

**KPI targets:**
- 3 paying customers
- 100+ audit submissions
- 500+ LinkedIn followers (combined founder + page)

### Week 3 — Customer 4–6 + first iteration on findings

- Onboard customers 4–6
- Ship the top-3 fixes from week 2 customer feedback
- Run first weekly newsletter via Newsletter Engine

**KPI targets:**
- 6 paying customers
- R45k MRR
- 200+ audit submissions

### Week 4 — Customer 7–10 + first case study

- Onboard customers 7–10
- Write/record first case study (probably ourselves: "How Octio's Lead Gen handles octio.co.za's pipeline")
- Publish case study via newsletter + LinkedIn + dedicated landing page

**KPI targets:**
- 10 paying customers
- R65k–R85k MRR
- 1 case study live

### Week 5 (overlap into month 2) — first cohort review

- Honest retrospective: what works, what doesn't
- Decide: do we double down or pivot
- Plan month 2 against actuals

## Months 2–12

### Month 2 — refinement + content cadence + CEO PA Patient Zero build

| Workstream | Output |
|---|---|
| Product | Phase 1b features land: TikTok briefs, Beehiiv ESP adapter, basic engagement analytics |
| **New product** | **Agentic CEO PA v0.1 built (1-week focused sprint). Patient Zero: founder uses it for own inbox + calendar starting week 2 of month 2. No customer-facing release.** |
| Sales | Customer 11–20 onboarded; 30-min discovery → 60-min close → 15-min Tenant Onboarding standardised |
| Content | LinkedIn daily, newsletter weekly, first YouTube video published |
| Engineering | Real customer feedback drives backlog; founder ships fixes daily |
| **MRR target** | R130k |

### Month 3 — first paid ads + case studies + CEO PA SMB SKU launch

| Workstream | Output |
|---|---|
| Product | Phase 2 begins: image gen for Social, basic engagement agent, multi-language voice (Afrikaans first) |
| **New product** | **Agentic CEO PA SMB SKU launches IF Patient Zero metrics held (>90% email triage accuracy, >5h/week saved, >60% drafts sent as-is). Bundle add-on enabled (+R5,000 on Suite).** |
| Sales | Customer 21–30; first Google Ads test campaign; CEO PA cross-sell offered to existing customers |
| Content | 5 case studies live; quarterly industry-benchmark report published; one case study specifically on Octio founder's CEO PA Patient Zero experience |
| Engineering | Performance + observability hardening; SLO targets defined |
| **MRR target** | R195k |

### Month 4 — channel partners pilot

| Workstream | Output |
|---|---|
| Product | Channel-partner-tier pricing + dashboard live; agency-friendly onboarding |
| Sales | First 3 channel-partner agreements signed (existing SA marketing agencies) |
| Content | YouTube channel hits 100 subs; founder speaking at one SA SMB event |
| Engineering | Mastra agent depth improvements (long-context customer memory) |
| **MRR target** | R260k |

### Month 5 — first non-founder hire conversations

| Workstream | Output |
|---|---|
| Product | First customer-segment-specific prompt library (plumbers, dentists, attorneys) |
| Sales | Customer 50–60; first channel partner brings in first 2 customers |
| Content | Newsletter at 1,500 subs; LinkedIn at 3,000 followers |
| Hiring | SDR job spec drafted, sourcing begins |
| **MRR target** | R325k |

### Month 6 — solo-founder mid-point review

| Workstream | Output |
|---|---|
| Product | Phase 3 starts: Instagram + X content publishing; reputation management v1 |
| Sales | Customer 70–80; SDR hired and onboarded |
| Content | First industry benchmark report has 1,000+ downloads; podcast appearances begin |
| Engineering | Mid-point architecture review; pay-down accumulated tech debt |
| **MRR target** | R390k |

### Month 7–9 — scaling motion

| Workstream | Output |
|---|---|
| Product | LinkedIn Company Page posting; advanced ESP adapters (Mailchimp + Klaviyo); voice in zu/xh/st |
| Sales | Customer 100–150; SDR running weekly cadence; first Suite (bundle) sales |
| Content | Daily LinkedIn, weekly YouTube, monthly podcast |
| Hiring | 2nd hire (probably customer success/agent operator) |
| **MRR target (M9)** | R650k |

### Month 10–12 — entrenchment + planning Year 2

| Workstream | Output |
|---|---|
| Product | Phase 4: tenant onboarding wizard polish; full white-label option for channel partners; enterprise-tier feature set (SSO, audit logs, custom retention) |
| Sales | Customer 200–300; bundle is 30%+ of new sales |
| Content | Octio is recognised as the SA AI brand in SMB segment |
| Hiring | 3rd hire (engineer #1); founder transitions to pure CEO time |
| **MRR target (M12)** | R1.3M (R15.6M ARR) |

## The killable items

If we're behind on revenue mid-year, things we cut without breaking the core:

| Item | Why it's cuttable |
|---|---|
| TikTok content publishing | Phase 1b; Octio doesn't need TikTok itself yet |
| Voice in zu/xh/st | English is enough for first 200 customers |
| LinkedIn Company Page | Personal profile works fine until brand is established |
| Mailchimp + Klaviyo adapters | Gmail sender + Beehiiv covers 95% of newsletter use cases |
| Custom CRM integrations | Native integrations to top 3 (HubSpot, Pipedrive, Bitrix) are enough |
| YouTube channel | Slow-compounding; if MRR is good, we'd prefer fewer marketing channels operating |

## The non-negotiables (ship even if behind)

| Item | Why we don't cut it |
|---|---|
| Audit tool | It's the top-of-funnel for everything else. Don't kill the funnel. |
| Payfast billing | No billing = no revenue. Must work. (Stripe SA unavailable; Payfast is primary.) |
| POPIA compliance | Legal requirement. Non-negotiable. |
| Multi-tenancy on every product | Single-tenant = no scale path. We don't ship "single-tenant first, refactor later." |
| Patient Zero proof for each product | The credibility moat. If we don't run our own products, we don't sell them. |

## Compliance gates (must-pass before each milestone)

These are non-negotiable for legal/operational reasons. Don't go live with a customer until each is green.

| Gate | When | Specifics |
|---|---|---|
| Information Officer registered with POPIA Regulator | Before customer 1 | Via Regulator's eServices Portal. Founder is the default IO. |
| Gmail bulk-sender compliance | Before newsletter to any list > 100 | RFC 8058 List-Unsubscribe + List-Unsubscribe-Post + visible body link; SPF + DKIM + DMARC. **Nov 2025 enforcement is PERMANENT REJECTION** (not delay) for non-compliant senders to Gmail. |
| Workspace 2,000/day cap | Before subscriber count > 1,500 | Hard cap newsletter sends; alert at 1,500. Plan migration to dedicated ESP (Beehiiv) past 2,000. |
| LinkedIn Standard tier approval | Before Social Manager for any external customer (not just Patient Zero) | 2–4 week approval cycle with screen-recording demo. Apply day 1; runs in parallel with build. |
| POPIA breach-reporting readiness | Continuously | Online eServices portal flow rehearsed. 72-hour notification guideline. |
| Payment processor live (Payfast) | Day 5 | Stripe is NOT available in SA. Payfast subscription billing tested end-to-end before first customer. |
| Twilio number type correct | Day 2 | SA geographic (+27 11 / +27 21) for VOICE; SA mobile number for WhatsApp (geographic numbers are NOT WhatsApp-eligible). Or skip Twilio-WhatsApp entirely and use Meta Cloud API direct. |

## Risk mitigation by milestone

| Risk | Mitigation built into the roadmap |
|---|---|
| First 30 customers churn | Risk-reversal: 14-day money-back. Founder hand-delivery. Weekly check-ins for first 60 days. |
| Product quality slips under load | Solo-founder capacity cap: 3–4 active engagements until automation lifts. SDR + onboarding hire by month 6–9. |
| LinkedIn algorithm change kills audience | Diversify by month 3 (newsletter + YouTube + audit funnel running). |
| Paid ad CAC explodes | Test budgets only. R15k/month cap until 4× MRR/CAC proven. |
| API costs explode | Per-tenant rate limits + token-bucket cap. BYOK option for outliers. Monthly cost review. |

## What we explicitly defer beyond month 12

| Item | Why |
|---|---|
| US market entry | Different regulatory + payment + sales motion; would dilute SA focus |
| Enterprise sales motion (SOC2, contracts, RFPs) | Wrong shape for solo + small-team era |
| Mobile app for tenants | Web is enough; mobile is a Phase 5 nice-to-have |
| Marketplace for third-party agents | Premature platform play; we need our agents to dominate first |
| Outside capital | Bootstrap to R15M ARR; THEN evaluate from a position of strength |
| Founder sabbatical | At R650k+ MRR with 2 hires in place, the founder can take 2 weeks off. Not before. |
| Law tech vertical (client intake for law firms) | Noted as a Phase 3+ candidate — reuses 80%+ of Voice & Chat stack but adds compliance overhead. Re-evaluate at month 9 if SMB beachhead has saturated. |
| CEO PA — Executive tier (mid-market) | SMB tier ships month 3; Executive tier (R12,500) waits for product depth signals and isn't promised in year 1. |

## Key assumptions

| # | Assumption | What disproves it |
|---|---|---|
| 1 | All 4 products MVP-shippable in 7 days | Day 7 hits with major product unshipped (means need to extend timeline) |
| 2 | First-cohort customers tolerate rough edges if founder is hands-on | Churn in first 90 days > 30% |
| 3 | MRR doubles roughly every 60 days from month 2 to month 6 | Growth stalls or reverses for 2 consecutive months |
| 4 | Channel partners can be operationalised by month 4 | First 3 partners produce 0 deals in their first 90 days |
| 5 | SDR can be productive by 30 days after hire | First SDR hire still under productivity-floor at 60 days |

## Open questions

1. Should the 7-day plan have buffer days built in or is the pressure productive? Working hypothesis: no buffer; pressure shipping is the point. If we genuinely miss, days 8–14 absorb the slip.
2. Should we hire a CTO before customer success? Hypothesis: no — founder is the technical leader and first ops hire is more leveraged. CTO at month 12+ if at all.
3. Is "ship daily" sustainable? Hypothesis: yes for first 90 days, then we shift to "ship 3x/week" as customer obligations grow.
