---
title: 04 · Product portfolio
description: Every product Octio sells — in depth. What it does, who it's for, how it's priced, where it stands today.
---

> **Iteration 5 of 10**

## Portfolio at a glance

| # | Name | Category | Entry price (ZAR) | Status | Spec |
|---|---|---|---|---|---|
| 0 | Website Audit Tool | Lead magnet | Free | Specced, ships day 1 | [website-audit-tool-design.md](https://github.com/sneakerdojo/cyma/blob/main/docs/superpowers/specs/2026-05-12-website-audit-tool-design.md) |
| 1 | AI Lead Generation & Pipeline | Autonomous product | R8,500/mo | Live for Octio; multi-tenant ships day 1–2 | (uses existing chat + embeddable widget specs) |
| 2 | Voice & Chat Agents | Autonomous product | R6,500/mo | Chat live for Octio; voice + multi-tenant ship days 2–3 | [voice-agent-design.md](https://github.com/sneakerdojo/cyma/blob/main/docs/superpowers/specs/2026-05-12-voice-agent-design.md) + [embeddable-chat-widget-design.md](https://github.com/sneakerdojo/cyma/blob/main/docs/superpowers/specs/2026-05-12-embeddable-chat-widget-design.md) |
| 3 | AI Social Media Manager | Autonomous product | R4,500/mo | Specced, ships day 4 | [content-engine-design.md](https://github.com/sneakerdojo/cyma/blob/main/docs/superpowers/specs/2026-05-12-content-engine-design.md) |
| 4 | The Newsletter Engine | Autonomous product | R3,500/mo | Specced, ships day 4 | content-engine-design.md (same repo) |
| 5 | Octio Suite (bundle) | Autonomous bundle | R18,500/mo | Auto-available once all 4 ship | tenant-onboarding-and-billing-design.md |
| 6 | Agentic Web & App Development | Service | R85k–R220k project | Always available — human-led | (delivery framework, not a built product) |
| 7 | Custom Agentic Workflows | Service | R35k–R150k project | Always available | (delivery framework) |
| 8 | Corporate AI Advisory & Adoption | Service / programme | R125k–R450k programme | Always available | (delivery framework) |

---

## 0. Website Audit Tool (FREE — the lead magnet)

### Goal

Anyone can upload screenshots of their existing website at `octio.co.za/audit` and receive — within 60 seconds — a complete CRO audit report + a copy-pastable AI Studio (HighLevel/Lovable) build prompt that rebuilds their homepage better.

### Why it exists

It's NOT a product we sell. It's the top-of-funnel for the four products we *do* sell. Every audit captures an email + business profile from someone who self-identifies as having a marketing/conversion problem — exactly the AI Lead Gen / Voice & Chat / Social / Newsletter buyer profile.

### How it works

1. Visitor lands on /audit, drag-drops 1–6 screenshots
2. Email-gate captures contact + business info (name, industry, website URL, avg customer value)
3. Claude Sonnet vision agent runs the CRO audit (7 axes scored 1–10)
4. Kimi K2 builds the AI Studio rebuild prompt
5. ~60 sec later: results page with 4 tabs (audit, improvement plan, rebuilt homepage structure, AI Studio prompt to copy)
6. Email delivered from `support@octio.co.za`
7. Bottom CTA: "Want Octio to deploy AI agents on your site? Book a call →"

### Why it works strategically

Adam Erhart's methodology ([YouTube transcript extracted](https://www.youtube.com/watch?v=4S7BXgpIDGk)) sells the rebuild for $2k + $297/mo HighLevel. Octio inverts: we *give the audit + rebuild prompt away free* because:

- We don't sell websites. We sell AI agents that operate on whatever website you have
- The audit demonstrates AI quality before any sales conversation
- Captures emails for the four products that ARE our revenue
- Even if the customer takes the prompt and builds elsewhere, we got their info + brand awareness

### Status

Specced ✅. Ships **day 1 of the 7-day plan**.

---

## 1. AI Lead Generation & Pipeline — R8,500/mo

### What the customer gets

A conversational AI agent embedded on their website that:

- Greets every visitor within 1 second
- Qualifies leads through context-aware conversation (not a rigid form)
- Books discovery calls into the customer's Google Calendar
- Sends confirmation emails + reminders + post-call follow-ups
- Routes urgent enquiries to the human via Slack / email / SMS
- Records every conversation into the customer's lead inbox

### Patient Zero proof

This product is live right now as Octo on `octio.co.za`. Every prospect who books a discovery call with Octio is doing it through this exact product. We use it as our demo.

### Why customers buy this first

Highest pain × most legible ROI. Service businesses lose 30–60% of inbound leads to slow response time. Lead Gen catches every one. ROI math:

- Customer's average job value: R5,000
- Their current site traffic: 100 visitors/month
- Current conversion: 2 leads/month (most just leave)
- With Lead Gen: 8 leads/month (4x lift typical in service businesses)
- Extra revenue: 6 extra leads × 50% close × R5,000 = R15,000/month new revenue
- Cost: R8,500/month → 76% net margin

### Tier structure

| Tier | Price (ZAR/mo) | Includes |
|---|---|---|
| Starter | R8,500 | 1 site, up to 500 chat sessions, 1 calendar, basic prompts |
| Growth | R18,500 | 3 sites/brands, up to 2,000 sessions, A/B prompts, CRM push |
| Scale | Custom (R30k+) | Multi-location, custom integrations, dedicated success manager |

### Status

- Live for Octio ✅
- Multi-tenant embeddable widget: ships **day 1–2 of the 7-day plan**
- Customer onboarding flow: ships **day 5**

### Spec link

- [embeddable-chat-widget-design.md](https://github.com/sneakerdojo/cyma/blob/main/docs/superpowers/specs/2026-05-12-embeddable-chat-widget-design.md)
- [tenant-onboarding-and-billing-design.md](https://github.com/sneakerdojo/cyma/blob/main/docs/superpowers/specs/2026-05-12-tenant-onboarding-and-billing-design.md)

---

## 2. Voice & Chat Agents — R6,500/mo

### What the customer gets

A 24/7 AI phone receptionist + chat agent:

- Inbound calls answered within 1 second
- Natural conversation (sub-1.5s turn latency)
- Qualifies caller, books appointments into customer's calendar
- Takes messages if appointment not available, emails to operator
- Warm transfer to human operator when escalation rules trigger
- Multi-channel: phone + web chat + WhatsApp (Twilio)
- Per-tenant voice (ElevenLabs voice IDs)
- English Day 1; Afrikaans, Zulu, Xhosa, Sesotho on Enterprise tier (Phase 2)

### Why this is the second-biggest seller

"Voice & Chat" picks up what Lead Gen doesn't — the calls that come in despite your website conversion. Together with Lead Gen this is the complete inbound funnel.

### Tier structure

| Tier | Price (ZAR/mo) | Includes |
|---|---|---|
| Starter | R6,500 | 1 SA number, up to 200 calls/mo + 500 chats |
| Growth | R12,500 | 3 numbers, up to 1,000 calls + 2,000 chats, after-hours handoff |
| Enterprise | Custom (R20k+) | Multi-language (zu/af/xh/st), call recording + sentiment analysis, custom IVR |

### Status

- Chat half live for Octio ✅
- Voice agent: ships **day 3 of the 7-day plan**
- Multi-tenant: ships day 2–3

### Spec link

- [voice-agent-design.md](https://github.com/sneakerdojo/cyma/blob/main/docs/superpowers/specs/2026-05-12-voice-agent-design.md)

### Honest constraints day-1

- English only at launch
- No call recording at launch (transcript only)
- No outbound dialling (inbound only)
- Warm transfer is basic blind transfer; full context-handoff is Phase 2

---

## 3. AI Social Media Manager — R4,500/mo

### What the customer gets

A weekly content cadence on LinkedIn (TikTok added Phase 1b) without the customer writing a word:

- AI plans a week of content from goals + brand voice
- Drafts every post in customer's brand voice
- Optional image-concept generation (Phase 2 adds actual image gen)
- Human approves every draft via a queue
- Posts at optimal times via LinkedIn Community Management API
- Engagement analytics rolled into a weekly digest

### Patient Zero proof

Octio's own LinkedIn presence will run through this from day 4. Every post on `simekani@octio.co.za`'s feed will be Drafter-generated, founder-approved.

### Tier structure

| Tier | Price (ZAR/mo) | Includes |
|---|---|---|
| Starter | R4,500 | 1 channel (LinkedIn), up to 12 posts/mo, approval queue |
| Growth | R9,500 | 2 channels (+TikTok briefs), up to 30 posts/mo, image gen |
| Scale | R18,500 | All channels (LinkedIn, TikTok, IG, X), engagement agent, A/B testing |

### Status

- Specced as part of Content Engine ✅
- Ships **day 4 of the 7-day plan** (LinkedIn only — TikTok Phase 1b, IG/X Phase 3)

### Spec link

- [content-engine-design.md](https://github.com/sneakerdojo/cyma/blob/main/docs/superpowers/specs/2026-05-12-content-engine-design.md)

### Phase 1a constraints

- LinkedIn only (TikTok briefs in Phase 1b, IG/X in Phase 3)
- Text-only posts; image generation Phase 2
- No engagement / reply agent yet (Phase 2)

---

## 4. The Newsletter Engine — R3,500/mo

### What the customer gets

A weekly newsletter, curated + drafted + sent:

- Sources curated by customer via Discord channel listener + `/source` slash command
- AI assembles a multi-section issue with intro, 2–3 main sections, link round-up, signoff
- Customer approves draft in queue, sends test to themselves first
- Sends via customer's choice of ESP (Beehiiv, Mailchimp) OR Octio's Gmail (default, no ESP setup)
- Engagement metrics (open, click, unsubscribe) tracked and surfaced

### Patient Zero proof

Octio's own weekly newsletter runs through this. Same product, no shortcut.

### Tier structure

| Tier | Price (ZAR/mo) | Includes |
|---|---|---|
| Starter | R3,500 | Up to 4 issues/mo, 1 channel (Gmail or Beehiiv), up to 1,000 subscribers |
| Growth | R6,500 | Up to 8 issues/mo, ESP integration, up to 5,000 subs, segments |
| Scale | R12,500 | Unlimited issues, multi-ESP, A/B subject lines, broadcast + automation flows |

### Status

- Specced as part of Content Engine ✅
- Ships **day 4 of the 7-day plan** (Gmail sender; Beehiiv adapter Phase 1b)

### Spec link

- [content-engine-design.md](https://github.com/sneakerdojo/cyma/blob/main/docs/superpowers/specs/2026-05-12-content-engine-design.md)

### Day-1 constraints

- Gmail sender only (Beehiiv/Mailchimp adapters Phase 1b)
- Single tenant ESP credential per tenant
- No subscriber import (manual add v1)
- RFC 8058 one-click unsubscribe + 48-hour unsub processing baked in from day 1 (Gmail bulk-sender compliance)

---

## 5. Octio Suite — R18,500/mo (BUNDLE)

### What the customer gets

All four products (Lead Gen + Voice & Chat + Social Manager + Newsletter Engine) at a R4,500/month discount vs single-buy total (R23,000/mo broken out).

### Why bundle pricing

| Reason | Detail |
|---|---|
| Higher per-customer revenue | R18,500/mo vs R8,500 for single-product |
| Lower CAC per dollar of ARR | Same sales conversation closes 4 products |
| Higher retention | More integrated touchpoints → harder to churn |
| Cleaner upsell story | "You're already paying for some — add the rest" |
| Strategic signal | Buyer adopts Octio as their AI platform, not a single tool |

### Tiering

The Suite has a single starting tier (R18,500/mo) covering all four Starter-tier products. Upgrade paths to per-product Growth or Scale tiers are independent.

### Status

Bundle pricing surfaces automatically once all 4 single products ship (**day 5 of the 7-day plan**).

---

## 6. Agentic Web & App Development (SERVICE)

### What it is

When a customer needs a custom AI application — not one of our 4 products — we build it. AI-accelerated production with senior engineers.

### Examples

- A property management firm needs a custom tenant-portal with AI lease analysis
- A logistics company needs an AI-driven dispatch system on top of their existing CRM
- A clinic needs an AI symptom-checker for patient intake

### Delivery model

| Engagement | Price | Timeline | Output |
|---|---|---|---|
| MVP Sprint | From R85,000 | 2–3 weeks | Production-deployed v1 |
| Production Build | From R220,000 | 6–10 weeks | Full custom application |
| Custom | Quote | Variable | Defined per project |

### Why this exists in the portfolio

- Captures the "we love your AI products but we need something custom" prospect (~10% of inbound)
- High-margin revenue that funds the autonomous-product business
- Generates IP that can become future autonomous products (today's custom build is tomorrow's productisation)

### Constraints

- Senior-led only, no junior hand-offs
- 3–4 active engagements at any time (capacity cap)
- AI-flavoured projects only (we politely decline "build me a generic CRUD app")

### Status

Always available. No new build needed. Delivery framework documented in service-detail page on octio.co.za.

---

## 7. Custom Agentic Workflows (SERVICE)

### What it is

Connect disjointed tools (CRM, calendar, support desk, project tracker) into AI-driven workflows that route, decide, and act without humans in the middle of every step.

### Examples

- "When a customer support ticket mentions 'pricing', auto-route to sales and draft an upsell reply"
- "When a deal closes in Pipedrive, kick off onboarding tasks in Asana + send branded welcome packet"
- "When a Calendly meeting books, enrich the contact via Apollo + draft a pre-call brief"

### Delivery model

| Engagement | Price | Output |
|---|---|---|
| Audit + Plan | From R35,000 | Workflow map + ROI estimate + technical design |
| Build | From R150,000 | Deployed workflow + monitoring + handover |
| Retainer | R8k–R25k/mo | Ongoing tuning + new workflows |

### Status

Always available.

---

## 8. Corporate AI Advisory & Adoption (SERVICE)

### What it is

AI strategy + governance + execution for mid-market and enterprise. POPIA / GDPR / ISO 42001 compliant. The strategic upsell when an SMB customer scales OR an enterprise initiates contact.

### Engagement model

| Engagement | Price | Timeline | Output |
|---|---|---|---|
| AI Audit | From R125,000 | 3 weeks | Strategic AI roadmap + governance framework |
| Adoption Programme | From R450,000 | 90 days | Roadmap + 2–3 deployed pilot agents + change-management plan |
| Ongoing Fractional CTO/AI | R30k–R75k/mo | Open-ended | Embedded executive-level AI leadership |

### Why this exists

- The high-price-tag offering for prospects who need strategy before products
- The bridge between our SMB autonomous products and enterprise sales
- The "long-tail" path for ex-corporate customers we've onboarded as SMB and who scale

### Status

Always available. Currently delivered manually by founder; productisation of artefacts (governance templates, compliance kits) is Phase 4+.

---

## Cross-product dynamics

How the portfolio works together — not just a list of products but a system.

### Acquisition flow

```
Audit Tool (FREE)
    ↓ captures email + audit results
AI Lead Gen (R8.5k)         ← first paid product (most legible ROI)
    ↓ shipping leads, customer trusts us
Voice & Chat (R6.5k)        ← add second product (covers off-hours)
    ↓ all inbound captured
Social Manager (R4.5k)      ← grow top-of-funnel
    ↓ more visitors arriving
Newsletter Engine (R3.5k)   ← convert long-tail
    ↓ full funnel covered
Octio Suite (R18.5k)        ← all four bundled
    ↓ for the rare strategic engagement
Corporate Advisory (R125k+)
```

### Cross-sell timeline

Average customer journey based on first-cohort thinking:

| Month | Typical state |
|---|---|
| 0 | Runs audit. Captures contact info. Maybe pings chat. |
| 1 | Signs up for Lead Gen, founder onboards. R8.5k/mo. |
| 3 | After-hours calls keep coming. Adds Voice & Chat. R15k/mo total. |
| 5 | Wants to grow inbound. Adds Social Manager. R19.5k/mo total. |
| 8 | Asks "what about email?". Adds Newsletter Engine. R23k/mo. |
| 9–12 | Upgrades to Suite bundle for R18.5k/mo (saves R4.5k). |

This isn't theoretical — it's the price ladder we design for. Bundle pricing punishes piecemeal buying (saving by bundling) which structurally pulls accounts toward higher ARPU.

### Defensibility from portfolio depth

Each additional product the customer takes raises switching cost:
- Replacing Lead Gen alone: medium pain (config + history)
- Replacing Lead Gen + Voice & Chat: high pain (two channels to migrate + Twilio number)
- Replacing all four: very high pain (entire marketing operations rebuild)

This is why portfolio bundling matters more than per-product feature depth at our stage.

## Key assumptions

| # | Assumption | What disproves it |
|---|---|---|
| 1 | Customers want a bundle, not just one product | <10% of customers upgrade beyond their entry product in 12 months |
| 2 | Patient Zero proof for each product is recognisable by buyers | A/B test of "we run this ourselves" claim shows no lift |
| 3 | R18.5k/mo bundle is the right anchor price | Buyers consistently push for sub-R12k bundles or won't go above R10k single-buy |
| 4 | Service offerings (App Dev, Workflows, Advisory) bring in 30%+ of revenue while consuming <30% of capacity | Service work eats more than half of founder time |

## Open questions

1. Should we add a usage-based pricing tier (per-conversation, per-call) for very small businesses? Hypothesis: not in v1 — fixed-price is simpler and aligns customer cost with predictability. Re-evaluate at month 6 if we lose deals to "I only do 20 calls a month, fixed seems expensive."
2. Should reputation management (Google Reviews) be a standalone product or bundled into Voice & Chat? Hypothesis: bundled in Phase 2; standalone if customers ask for it as a separate offering.
3. Is the Suite bundle the right discount %? 19% off. Hormozi's $100M Offers framework would say "your bundle should be obviously the better deal at first glance." Test: do new customers choose Suite > 40% of the time? If not, deepen the discount.

## Citations

- Hormozi value equation (used implicitly in pricing logic): [PowerMoves summary](https://thepowermoves.com/100-million-offers-summary-review/) (see frameworks appendix)
- HighLevel reference pricing for adjacent SaaS comparisons: [GoHighLevel](https://www.gohighlevel.com)
- Per-product specs (linked above): see `docs/superpowers/specs/`
