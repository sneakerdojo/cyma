---
title: 11 · Risks & mitigations
description: Where we'd break, what we'd do — risk register with detection signals and response playbooks.
---

> **Iteration 10 of 10 (part 3 of 3)**

## How to read this chapter

For each risk we list:

- **Risk** — what could go wrong
- **Likelihood** (Low / Medium / High) and **Impact** (Low / Medium / High / Existential)
- **Leading indicator** — the signal we'd see before damage compounds
- **Mitigation** — what we've already built in
- **Response** — what we'd do if it materialises

Risks are ordered by **(Likelihood × Impact)**.

## Tier 1 — Existential

### R1.1 Founder burnout

- **Likelihood:** Medium
- **Impact:** Existential
- **Leading indicator:** Founder consistently > 60h/week for 4 consecutive weeks, sleep < 6h/night, declining decision quality
- **Mitigation:** Discipline rules (Saturday off, no Sunday deploys); 47h productive week target; capacity cap of 3-4 active customer engagements until automation reduces load
- **Response:** Pull forward Hire #1 by 30–60 days, deprioritise non-essential workstreams (cut content cadence to 3×/week, suspend cold outreach, defer Phase 1b features), 1-week complete break, then resume with tighter rules

### R1.2 Customer churn > 8%/month

- **Likelihood:** Medium
- **Impact:** Existential (kills LTV math)
- **Leading indicator:** Month-2 churn for first cohort exceeds 4% (industry average is 3%; >4% suggests product gap)
- **Mitigation:** 14-day money-back pilot, founder hand-onboarding for first 30 customers, weekly check-ins for first 60 days
- **Response:** Pause new customer acquisition. Spend 30 days on retention/product polish. Re-engage churned customers for feedback. Fix top 3 churn reasons. Resume sales only after net retention > 95%.

### R1.3 Capital depletion before product hits R150k MRR

- **Likelihood:** Low (Conservative case still EBITDA-positive by month 2)
- **Impact:** Existential
- **Leading indicator:** Month-2 MRR < R30k AND OPEX overrun > 50%
- **Mitigation:** Bootstrap-mode discipline, conservative OPEX, hiring deferred until revenue justifies
- **Response:** Drop OPEX to minimum (cut all tools to free tiers, kill paid ads, defer all subscriptions), founder takes zero salary, focus exclusively on closing 3 customers. If 90 days at < R30k MRR, evaluate strategic options (channel-partner JV, bridge loan, pivot product mix)

## Tier 1.5 — Newly identified threats (from May 2026 research pass)

### R1.4 Lindy AI (or similar US VC-backed agent builder) lands in SA

- **Likelihood:** Medium-High (next 12 months)
- **Impact:** High
- **Leading indicator:** Lindy or similar VC-backed AI-agent platform launches SA-targeted marketing, ZAR pricing, or local sales hires
- **Mitigation:** SA-local moat (POPIA, ZAR pricing, accent-trained voice, local references); founder is hands-on which platforms can't replicate; bundle pricing creates switching cost
- **Response:** Run price-point arbitrage publicly — Lindy Business $299.99/mo ≈ R4,900 — undercut on Lead Gen entry. Triple down on local references + Patient Zero proof. Co-marketing with SA-only channel partners.

### R1.5 Outcome-pricing collapse (Intercom Fin AI at $0.99/resolution)

- **Likelihood:** Medium
- **Impact:** High (kills R/month retainer math if buyers adopt the comparison)
- **Leading indicator:** Sales conversations start with "your competitor charges per resolution / per booking — why are you a monthly retainer?"
- **Mitigation:** Pre-emptive reframe — sell "AI operator running your inbound" not "AI chat tool"; emphasise bundle stickiness; Patient Zero proof bypasses pricing-model conversations
- **Response:** Phase 2 product addition — outcome-priced SKU at R10/booking for very small customers. Doesn't replace the retainer; protects against the comparison.

### R1.6 Twilio AI Assistants going GA (Dev Preview at $0.07/min)

- **Likelihood:** High in 12 months (currently Dev Preview)
- **Impact:** Medium-High (commoditises voice-agent infra; every Twilio partner becomes potential competitor)
- **Leading indicator:** Twilio announces GA pricing OR a local SA agency starts reselling Twilio AI Assistants
- **Mitigation:** Differentiate on SA-localised prompts + accent training (Speechmatics + Lelapa AI Inkuba); bundle voice with Lead Gen + Newsletter so customers buy the operator not the dialer
- **Response:** If GA undercuts our marginal cost meaningfully, consider building ON Twilio AI Assistants for our own voice infra (cost reduction) rather than competing with it

## Tier 2 — High likelihood × High impact

### R2.1 LinkedIn algorithm change kills founder distribution

- **Likelihood:** High (platforms change)
- **Impact:** High (LinkedIn is primary content channel)
- **Leading indicator:** Founder + page reach drops 50%+ over 30 days
- **Mitigation:** Diversify by month 3 — newsletter (owned channel), YouTube (compounding), audit funnel (owned)
- **Response:** Lean into owned channels (newsletter, audit). Shift content effort to YouTube + podcast appearances. Consider Substack-style direct publishing platform alternative.

### R2.2 AI API costs spike (e.g., Claude pricing 2x)

- **Likelihood:** High (vendor pricing is volatile)
- **Impact:** High (gross margin compression)
- **Leading indicator:** Vendor announcement OR cost-per-customer trending up > 20% MoM
- **Mitigation:** Model-agnostic Mastra agents (can swap models per task); BYOK tier already designed; per-tenant token-bucket caps
- **Response:** Migrate cost-sensitive prompts (audit, classifier, drafter) to Kimi K2 Turbo or Gemini Flash. Push high-cost tenants to BYOK tier (no margin shift for us). Negotiate volume commits with primary vendor for discount.

### R2.3 SA market doesn't adopt at projected rate

- **Likelihood:** Medium
- **Impact:** High (revenue plan fails)
- **Leading indicator:** Month-3 customer count < 10 AND audit-to-customer conversion < 5%
- **Mitigation:** Conservative case already planned for 50% slower; bowling alley strategy lets us iterate niche-by-niche
- **Response:** Re-segment by industry (move from "service businesses generally" to deeper niche — e.g., dentists-only). Re-price if necessary. Test UK/AU expansion 6 months earlier than planned.

### R2.4 POPIA violation / data incident

- **Likelihood:** Low-Medium
- **Impact:** High (legal + reputation)
- **Leading indicator:** Audit finding, customer report, security scan alert
- **Mitigation:** POPIA-by-default architecture (data retention, customer data isolation, DPA per tenant); ISO 42001 alignment in product design; quarterly compliance review
- **Response:** Activate incident response: notify Information Regulator within 72h if reportable; transparent customer comm; root-cause + fix within 7 days; post-mortem public if appropriate

### R2.5 Patient Zero credibility breaks

- **Likelihood:** Medium (one bad week of Octio AI output)
- **Impact:** High (the moat IS the credibility)
- **Leading indicator:** Octio's own AI agents produce visibly bad output (chat hallucination, voice agent books wrong slot, newsletter sends with broken links)
- **Mitigation:** Patient Zero is the gate before public release; daily review by founder of all AI outputs
- **Response:** Pause public-facing AI for affected product. Roll back. Diagnose. Public mea culpa if customer-visible. Don't ship to customer-facing until 7 consecutive clean days.

## Tier 3 — High likelihood × Medium impact

### R3.1 First hire takes too long to ramp

- **Likelihood:** Medium-High
- **Impact:** Medium
- **Leading indicator:** First hire books 0 deals (SDR) or has >1 customer churn (CS) in first 90 days
- **Mitigation:** Detailed onboarding playbook; founder shadow-trains for first 2 weeks
- **Response:** Re-evaluate hire fit at 60 days. If trajectory wrong, mutual exit. Take 30 days to find better fit. Founder absorbs role until replacement.

### R3.2 Channel partner relationships stall

- **Likelihood:** Medium-High
- **Impact:** Medium (Phase 3 plan depends on it)
- **Leading indicator:** First 3 partner agreements signed but 0 deals attributed after 90 days
- **Mitigation:** Partner-friendly terms (25% rev-share, 24-month duration); white-label option; clear partner enablement materials
- **Response:** Direct outreach to partner's customers WITH partner's permission. Co-marketing campaigns. If still no traction, deprioritise partner channel and reinvest in paid ads.

### R3.3 Specific industry vertical doesn't match product

- **Likelihood:** Medium
- **Impact:** Medium (forces re-segmentation)
- **Leading indicator:** Customer feedback in one vertical (e.g., plumbers) consistently mentions same product gap
- **Mitigation:** Bowling alley approach lets us slide pins; per-industry prompt tuning planned for Month 5
- **Response:** Build industry-specific prompt library + onboarding playbook. If gap is structural (not promptable), drop that vertical for now.

### R3.4 Mastra framework breaking changes

- **Likelihood:** Medium
- **Impact:** Medium (refactor cost)
- **Leading indicator:** Mastra major version bump with breaking changes
- **Mitigation:** Abstraction layer in our worker; Mastra is open source so we can fork if needed
- **Response:** Stay on previous version for 30 days; assess upgrade path; allocate engineering sprint to migration if value justifies

### R3.5 Spam / deliverability penalty on newsletter

- **Likelihood:** Medium
- **Impact:** Medium (newsletter reach degrades)
- **Leading indicator:** Open rate drops below 20%; bounce rate > 5%; spam complaint rate > 0.3%
- **Mitigation:** RFC 8058 one-click unsubscribe baked in; DKIM/SPF/DMARC clean; per-day send caps; warm-up sequence for new lists
- **Response:** Pause sends for 7 days; review content for spam triggers; consider Beehiiv adapter migration (better deliverability than Gmail at scale); add dedicated newsletter sender alias

## Tier 4 — Medium-Low likelihood × Medium-High impact

### R4.1 Well-funded US competitor enters SA market

- **Likelihood:** Low (first 12 months)
- **Impact:** High
- **Leading indicator:** Specific competitor announces SA expansion OR job postings in JHB/CT
- **Mitigation:** Patient Zero moat + local presence + ZAR pricing + first-mover advantage
- **Response:** Triple down on local references + brand. Public "Octio is the SA AI brand" campaign. Consider strategic partnerships with local agencies before competitor can.

### R4.2 Mastra-specific vulnerability disclosed

- **Likelihood:** Low (mature framework but agentic AI is new)
- **Impact:** Medium-High
- **Leading indicator:** Mastra GH security advisory OR CVE on dependent library
- **Mitigation:** Quick-patch pipeline (we can deploy a hotfix < 1 hour); customer data is isolated per tenant
- **Response:** Patch within hours. Customer notification if data risk. Public communication if vulnerability is novel.

### R4.3 Stripe SA payment processing issues

- **Likelihood:** Low
- **Impact:** Medium-High (revenue collection)
- **Leading indicator:** Stripe outage OR SA-specific payment rejection rate spike
- **Mitigation:** Payfast as backup processor (Phase 2 integration); offer EFT for high-value customers
- **Response:** Manual EFT invoicing for affected period. Migrate to Payfast if Stripe SA proves unreliable.

### R4.4 Twilio number gets flagged / blocked

- **Likelihood:** Low
- **Impact:** Medium (Voice product offline)
- **Leading indicator:** Customer reports calls not connecting OR Twilio account warning
- **Mitigation:** Per-tenant number isolation (one tenant's issue doesn't affect others); call-quality monitoring
- **Response:** Replace number; investigate root cause (typically misuse complaint, easy to resolve)

### R4.5 Cloud infrastructure outage (Hetzner)

- **Likelihood:** Low
- **Impact:** Medium
- **Leading indicator:** Hetzner status page warning OR our monitoring
- **Mitigation:** Daily DB backups to S3-compatible storage outside Hetzner; deployment scripts can re-create infrastructure anywhere
- **Response:** Failover to alternative provider within 2-4 hours. Customer communication during outage.

## Tier 5 — Low likelihood, low impact (track but don't over-mitigate)

### R5.1 Domain renewal lapses

- Mitigation: Auto-renew on domain.com + Cloudflare; calendar reminder 60 days out

### R5.2 Stripe webhook event loss

- Mitigation: Idempotency keys + reconciliation script run weekly

### R5.3 Discord bot rate-limit hit

- Mitigation: Backoff + retry; alert founder

### R5.4 Founder's laptop fails

- Mitigation: All code in GitHub; all docs in Notion/Astro; new laptop fully reproducible in 4 hours via dotfiles

## Risk-to-revenue mapping

What's the financial impact if each Tier 1 risk lands?

| Risk | If unmitigated, impact on Year-1 revenue |
|---|---|
| Founder burnout (R1.1) | 30–60% reduction; potential business failure |
| 8%+ churn (R1.2) | 40% lower MRR by month 12; LTV cut in half |
| Capital depletion (R1.3) | Business stops; full mitigation through bootstrap discipline |

## Pre-emptive vs reactive ratio

Of the 20+ risks listed, ~80% have **preventive mitigations already in the product/operational design**:

- Compliance built into architecture (not bolted on)
- Multi-vendor model layer (not single-vendor lock)
- Patient Zero gate (no public AI without internal validation)
- Capacity caps (no overcommitment)
- Discipline rules (no Friday afternoon deploys)
- Risk reversal in offer (14-day pilot)

We do not believe in unlimited optionality — we believe in well-chosen defaults that prevent most failures.

## What we monitor (the dashboard)

Single internal dashboard ("North Star + Risk Radar") shows daily:

| Metric | Target | Alert threshold |
|---|---|---|
| MRR | growing | dropped 2 days in row |
| Customer count | growing | -1 within month |
| Gross margin | > 85% | < 75% |
| API cost as % of revenue | < 12% | > 18% |
| Voice agent error rate | < 2% | > 5% |
| Chat session containment | > 70% | < 50% |
| Newsletter open rate | > 30% | < 20% |
| Founder hours/week (self-tracked) | < 50 | > 60 |
| Customer churn (rolling 30d) | < 4% | > 6% |
| Outstanding production incidents | 0 | > 1 for > 48h |

This is the operating dashboard. Anything red triggers a same-day action.

## Final note: the risk we accept

We accept the risk that **bootstrapped solo-founder growth is slower than VC-backed competitors**. We don't try to mitigate this — we choose it. The trade-off:

| What we give up | What we gain |
|---|---|
| Faster scale | Higher equity ownership |
| Outside capital | Pricing discipline (no growth-at-all-costs) |
| Marketing budget | Earned-distribution discipline |
| Headcount | Operational simplicity |
| Aggressive timelines | Patient Zero quality bar |

This is the strategic risk we run. If a well-funded competitor moves faster, we lose the speed race. But Octio's bet is that **patience + product depth + Patient Zero credibility > speed**. The next 12 months will tell.

## Key assumptions

| # | Assumption | What disproves it |
|---|---|---|
| 1 | Most identified risks can be detected via leading indicators before they compound | A Tier 1 risk hits without leading-indicator warning |
| 2 | Bootstrapped pace is fast enough vs. competitive timing | Well-funded competitor surpasses Octio MRR within 12 months |
| 3 | Existing mitigations are sufficient | A risk in this register materialises despite mitigation |

## Open questions

1. Do we ever pre-fund insurance against any of these risks (e.g., cyber-liability policy)? Hypothesis: yes, but minimal — basic professional indemnity + cyber-liability at ~R12k/year is cheap.
2. Should we run a quarterly "red team" review of the risk register with an external advisor? Hypothesis: yes, by month 6 — find someone in SA AI ecosystem to stress-test our thinking.
3. What's the one risk we'd most likely miss? Hypothesis: customer concentration — if any one customer becomes >10% of revenue, that's a hidden risk. Track from day 1.
