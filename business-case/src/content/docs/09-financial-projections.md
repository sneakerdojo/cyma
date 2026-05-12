---
title: 09 · Financial projections
description: Revenue, cost, unit economics, runway — the numbers, conservative case and base case.
---

> **Iteration 10 of 10 (part 1 of 3)**

## Caveats up front

These projections are **planning documents, not promises**. They assume:

- Solo-founder mode for first 6 months
- First non-founder hire at month 7 (SDR or customer success)
- Bootstrap-funded; no outside capital
- ZAR pricing, conservative customer-count ramps
- Customer churn flat at industry average (3%/month gross logo churn for B2B SMB SaaS)

We track two scenarios: **Base case** (likely path) and **Conservative case** (50% slower customer ramp). We do not present an aggressive/best-case scenario — it's misleading for solo-founder planning.

## Unit economics per product

### Per-customer cost structure (Lead Gen example, verified May 2026)

Assumes ZAR/USD = R16.45 and routed model selection (Gemma classifier, Haiku for templated drafts, Sonnet only for hard reasoning). See [appendix/model-routing](/appendix/model-routing/).

| Cost | Monthly variable cost (avg customer) |
|---|---|
| Claude Sonnet 4.6 (chat reasoning, ~500 sessions × 25 turns avg, with prompt caching) | ~R280 |
| Claude Haiku 4.5 (templated drafts, confirmations) | ~R40 |
| Gemma 3 (classifier / intent routing) | ~R8 |
| Postgres + Hetzner Cloud server share | ~R55 |
| **Subtotal Lead Gen only** | **~R383** |
| Voice tier additions: | |
| Twilio number rental (per SA inbound number) | ~R55 |
| Twilio per-minute SA inbound ($0.010/min × 200 min) | ~R33 |
| Deepgram Nova-3 STT (200 min × $0.0077) | ~R26 |
| ElevenLabs Flash TTS (~80k chars × $0.05/1k) | ~R65 |
| Llama 3.3 70B on Groq (voice reasoning, sub-1s requirement) | ~R45 |
| **Voice tier subtotal** | **+R224** |
| Payment processor fee: | |
| Payfast (3.5% of R8.5k) | ~R298 |
| **Total variable cost per customer/month** | **~R680 Lead Gen / ~R905 Voice-attached** |
| **Gross margin** | **92% (Lead Gen R8.5k) / 86% (Voice-attached R6.5k)** |

The original draft assumed Stripe (not available in SA), Deepgram Nova-2 (deprecated), Kimi K2 Turbo at half its true price, and Twilio at $0.013/min (actual $0.010/min). Net: margins are slightly more conservative than originally claimed but still healthy.

### Bundle economics (Suite, R18,500/mo) — verified May 2026

| Cost | Monthly |
|---|---|
| All API (Sonnet + Haiku + Gemma + Llama on Groq, routed) | ~R580 |
| Hetzner infra share (4 products on one tenant) | ~R85 |
| Twilio voice ($0.010/min + number) | ~R88 |
| Deepgram + ElevenLabs (voice STT/TTS) | ~R91 |
| Meta WhatsApp Cloud API direct (30–60% cheaper than via Twilio) | ~R45 |
| Payfast (3.5% of R18,500) | ~R648 |
| **Total variable cost** | **~R1,537** |
| **Gross margin on R18,500** | **92%** |

Suite is the highest-margin SKU. Pricing logic: bundle discount + economies of customer (same prospect → 4 products + same infra share). WhatsApp goes through Meta Cloud API directly (not Twilio) to cut messaging cost ~40%.

## Cost structure (operating expenses)

### Months 0–6 (solo founder)

| Category | Monthly cost (R) |
|---|---|
| Founder salary (founder draws as profit emerges; placeholder for accounting) | R0–R40,000 |
| Tools (Cursor Pro, Claude Pro × 1.5, GitHub, Linear, Slack) | ~R3,500 |
| Infrastructure base cost (Hetzner Cloud + Postgres + monitoring) | ~R2,500 |
| Marketing (LinkedIn Pro, Beehiiv, Apollo trial, Smartlead test) | ~R1,500 |
| Legal / accounting (POPIA registration + monthly bookkeeping) | ~R3,500 |
| Bank fees + Stripe base | ~R500 |
| Compliance (POPIA officer fee, ICO equivalents) | ~R800 |
| Contingency (5%) | ~R600 |
| **Total fixed (excl. founder salary)** | **~R13,000/month** |

### Months 7–12 (with first hire)

| Category | Monthly cost (R) |
|---|---|
| All of the above | ~R13,000 |
| First hire salary (SDR, R25k base + commission, ~R5k/mo on commission est) | ~R30,000 |
| Tools for second person (Claude Pro, comms) | ~R1,500 |
| Marketing (paid ads ramp) | R25,000–R150,000 (scales with proven CAC) |
| **Total fixed (excl. ads)** | **~R44,500/month** |

## Revenue projections — Base case

| Month | Customers (count) | MRR | Cum. revenue (12mo running) | Variable cost | Gross profit | OPEX (fixed) | EBITDA |
|---|---|---|---|---|---|---|---|
| 1 | 3 | R20k | R20k | R3k | R17k | R13k | R4k |
| 2 | 8 | R55k | R75k | R8k | R47k | R13k | R34k |
| 3 | 18 | R120k | R195k | R20k | R100k | R13k | R87k |
| 4 | 30 | R200k | R395k | R34k | R166k | R13k | R153k |
| 5 | 45 | R300k | R695k | R50k | R250k | R13k | R237k |
| 6 | 65 | R430k | R1.13M | R75k | R355k | R13k | R342k |
| 7 | 85 | R565k | R1.69M | R100k | R465k | R45k | R420k |
| 8 | 110 | R730k | R2.42M | R130k | R600k | R55k | R545k |
| 9 | 140 | R930k | R3.35M | R165k | R765k | R75k | R690k |
| 10 | 170 | R1.13M | R4.48M | R200k | R930k | R100k | R830k |
| 11 | 200 | R1.33M | R5.81M | R235k | R1.10M | R130k | R965k |
| 12 | 240 | R1.6M | R7.41M | R285k | R1.31M | R165k | R1.15M |

**Year 1 Base Case: R7.4M revenue, R1.15M/month EBITDA at month 12.**

### Base case assumptions

- 3 customers in month 1 (warm network conversions)
- Customer count compounds ~50% MoM for first 4 months
- Slows to ~25% MoM by month 6 as paid acquisition saturates
- Average revenue per account = R6,650 (mix-weighted: heavy on single-product Starter, some Growth, ~15% Suite)
- Churn at 3%/month gross — net retention positive due to upsells

## Revenue projections — Conservative case (50% slower)

| Month | Customers | MRR | EBITDA |
|---|---|---|---|
| 1 | 2 | R13k | R-3k |
| 3 | 9 | R60k | R32k |
| 6 | 33 | R220k | R155k |
| 9 | 70 | R465k | R287k |
| 12 | 120 | R800k | R535k |

**Year 1 Conservative: R3.8M revenue, R535k/month EBITDA at month 12.**

Even in conservative case, EBITDA-positive from month 2 (solo founder; minimal OPEX).

## Runway analysis

**Starting capital:** R150k personal runway (assumption — adjust to actual).

| Month | Net Cash burn (Conservative) | Cum. cash |
|---|---|---|
| 0 | – | R150,000 |
| 1 | –R3k | R147,000 |
| 2 | +R5k | R152,000 |
| 3 | +R32k | R184,000 |
| 6 | +R155k | R585,000 |

Bootstrapped operations turn cash-flow-positive by **month 2 conservative / month 1 base case**. R150k initial bank balance is sufficient to weather even the conservative-case month 1 dip.

## Customer acquisition cost (CAC) targets

| Phase | Channel mix | CAC budget per customer | Payback period |
|---|---|---|---|
| Months 0–3 | Warm + audit funnel only | R1,500 | 0.5 months |
| Months 4–6 | + Content + small paid ads | R3,500 | 1.5 months |
| Months 7–12 | + SDR + scaled paid + partners | R6,500 | 3 months |

These targets are kept deliberately conservative. Actual CAC will be measured monthly and triangulated against LTV.

## Lifetime value (LTV) targets

LTV calculation using simple cohort retention assumptions:

| Avg. monthly retention | Avg. tenure | LTV (avg ARPU R6,650, 88% gross margin) |
|---|---|---|
| 90% (10% monthly churn) | 10 months | R58,500 |
| 95% (5% monthly churn) | 20 months | R117,000 |
| 97% (3% monthly churn) | 33 months | R193,000 |

Plan target: 95% gross retention, which is industry average for B2B SMB SaaS. With upsells to bundle and growth tiers, NET retention > 100% (revenue per customer grows).

## LTV/CAC ratio targets

| Phase | LTV | CAC | LTV/CAC ratio |
|---|---|---|---|
| Months 0–3 | R58,500 | R1,500 | **39x** (early-cohort math) |
| Months 4–6 | R85,000 | R3,500 | **24x** |
| Months 7–12 | R117,000 | R6,500 | **18x** |

For comparison: B2B SaaS norm is 3–4x; PLG companies hit 10–20x at maturity. Octio's projected 18–24x is achievable because of:

1. High gross margin (88%+)
2. Low CAC during patient-zero/audit-funnel-led phase
3. Bundle upsells inflating LTV

## Reinvestment policy

Every Rand of profit through month 12 goes back into one of:

1. **Marketing** (paid ads, content, events) — primary lever
2. **Hires** (SDR → CS → engineer #1)
3. **Product** (engineering capacity beyond founder)
4. **Runway** (build cushion against revenue dips)

**Founder draw:** modest — R25k–R40k/month from month 4, sized to fixed costs only. The compounding is in the business, not in the founder's bank account, for first 12 months.

## What kills the financial model

| Risk | Threshold | Action |
|---|---|---|
| Customer churn > 8%/month | LTV drops 40%+ | Pause new sales; fix product gaps before scaling further |
| CAC > R10k/month | LTV/CAC < 8x | Cut paid ads; lean back into warm + content for 2 months |
| API costs > 25% of revenue | Margin drops below 60% | BYOK tier mandatory for high-volume customers; renegotiate vendor contracts |
| Founder time on customer ops > 30h/week | Solo capacity exhausted | Pull forward CS hire by 60 days |
| ZAR weakens 20%+ vs USD | API costs spike disproportionately | Hedge by repricing in R; pass through to BYOK tier |

## Comparison to alternative paths

For sanity-check, what does the "service-only" alternative look like? If we skipped autonomous products and only delivered services:

| Metric | Service-only | Autonomous + service (plan) |
|---|---|---|
| Month-12 revenue | ~R650k/mo | ~R1.6M/mo |
| Month-12 EBITDA | ~R150k | ~R1.15M |
| Founder hours/week | 50+ (delivery-bound) | 40–45 (productised) |
| LTV/CAC | 2–3x (project-based) | 18–24x (subscription) |
| Defensibility | Low (services are commodity) | High (product portfolio + Patient Zero) |

The autonomous-products bet is the correct one. Services are the bridge revenue; products are the company.

## Key assumptions

| # | Assumption | What disproves it |
|---|---|---|
| 1 | Customer count compounds ~50% MoM in first 4 months | Month 3 customer count <10 |
| 2 | Average ARPU stays at R6,650 (mix-weighted) | New cohorts buy only Starter tier; ARPU drops below R5k |
| 3 | Gross margin stays > 85% | API price increase or product cost change drops margin below 70% |
| 4 | OPEX stays under R165k/month even with 1 hire by month 7 | Engineering or marketing spend exceeds budget by 50%+ |
| 5 | First hire (SDR) productive within 60 days | SDR doesn't book a single deal in first 90 days |

## Open questions

1. Should we offer annual prepay discount of 20% in month 1 to accelerate cash? Pro: improves working capital. Con: complicates revenue recognition and we don't need the cash. Hypothesis: yes from month 3 onwards, when first customers want to lock in current pricing.
2. At what MRR do we hire engineer #1 (vs continuing CS-led growth)? Hypothesis: month 9–10, R900k–R1M MRR. Below that, founder is enough engineering. Above that, founder is the bottleneck.
3. Do we ever raise capital? Hypothesis: only if a strategic offer arrives (e.g., regional expansion partner). Default = bootstrap to R30M ARR.

## Citations

- B2B SaaS gross margin norms: standard industry data, ~75–85% gross margin
- B2B SMB SaaS churn norms: ~3–8% monthly logo churn
- LTV/CAC ratio target ranges: SaaS benchmarks
