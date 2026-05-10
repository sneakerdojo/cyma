# Stat sources for product/service detail pages

Every claim with a specific number used on the offering pages should have a source. This document tracks them so we can update with fresher data over time, and so a sceptical visitor (e.g. an enterprise buyer doing due diligence) can verify.

---

## AI Lead Generation

| Claim used on page | Source | Date |
|---|---|---|
| 74% of B2B companies miss the 5-minute response window | [Blazeo 2026 benchmark study, 573 businesses](https://greetnow.com/blog/lead-response-time-statistics) | 2026 |
| Average B2B response time is 42 hours | [Workato lead-response-time study](https://www.workato.com/the-connector/lead-response-time-study/) | 2024–25 |
| After 5 minutes, lead quality drops 80% | [Harvard Business Review 15K-lead study](https://caseyresponse.com/blog/lead-response-time-statistics) | Original Oldroyd / Lead Response Mgmt 2007, validated at scale by HBR |
| Conversion rates jump 391% when response time is under one minute | Same HBR study | — |
| Companies waiting 24h+ are 60× less likely to qualify | Same HBR study | — |

**Soft / experiential claims** (not pulled from a single citable source — based on Octio audit work or industry norms):
- "Round-trip booking emails take an average of 4 round-trips" — common sales-ops observation, no peer-reviewed source.
- Lead score weighting (50% behaviour / 30% fit / 20% intent) is a Octio-specific composition — different vendors weight differently.

---

## Voice & Chat Agents

| Claim used on page | Source | Date |
|---|---|---|
| Only 37.8% of business calls actually get answered | [411 Locals study, 85 businesses, 58 industries](https://www.numa.com/blog/22-business-phone-statistics) | 2024 |
| 85% of callers don't leave a voicemail | [Multiple sources cited](https://schedulingkit.com/statistics/missed-call-statistics) | 2024–25 |
| 62% of callers contact a competitor when they can't reach you | [Aira / SchedulingKit](https://www.getaira.io/blog/missed-business-calls-statistics) | 2024 |
| <20% of voicemails get a callback in time to convert | [Phonely / business phone stats](https://www.phonely.ai/blogs/19-business-phone-statistics) | 2025 |
| Average cost of missed calls: $126,000/year per business | [Aira / Phonely](https://www.getaira.io/blog/missed-business-calls-statistics) | 2024 |

**Soft claims:**
- "Sub-1s pickup time" — technically achievable with current TTS + STT stacks (Vapi, Retell, OpenAI Realtime), but quoting it as a guaranteed metric should come with caveats. Octio commits to <1s on average, not every single call.

---

## AI Social Media Manager

**Soft / experiential claims** — most stats here are operational (40+ posts/month, 50+ sources scanned weekly) rather than industry citations. These are tunable per Octio's actual capacity.

What we removed:
- "8× engagement lift in 90 days" — couldn't substantiate with a peer-reviewed source. Replaced with "50+ sources scanned weekly" which is operationally true.

What stays:
- 41% average open rate (industry baseline) — [beehiiv State of Newsletters 2025](https://www.beehiiv.com/blog/2025-state-of-newsletters)

---

## Newsletter Engine

| Claim used on page | Source | Date |
|---|---|---|
| Average industry open rate is 41% | [beehiiv State of Newsletters 2025](https://www.beehiiv.com/blog/2025-state-of-newsletters) | 2025 |

**Softened claims:**
- "Most newsletters started this year will stop publishing within 6 months" — replaced earlier "84% within 3 months" claim that we couldn't substantiate. Subscription fatigue + industry churn (~23% per beehiiv) supports the qualitative claim, but no specific 6-month survival rate is published.

---

## Agentic Web & App Development

**All claims here are operational/experiential**, not industry citations:
- "MVP shipped in 3 weeks" — Octio's standard MVP Sprint scope.
- "4× faster than typical agency timelines" — based on comparing our own delivery against typical agency quotes we've seen for the same scope.
- "100% code ownership" — operational guarantee.
- "30 days post-launch support" — included in pricing tiers.

The "R600K–R1.5M agency quote" comparison is anchored in real quotes Octio clients have shared with us — defensible but anecdotal. The "70% boilerplate" claim was softened to qualitative phrasing ("most of the build is repetitive scaffolding").

---

## Custom Agentic Workflows

**Operational claims, not industry citations:**
- "4+ hrs/day reclaimed per ops person" — based on Octio audit findings across multiple clients. Range (4–6 hrs) is conservative.
- "100+ pre-built integrations" — operational truth, growing.
- "30-day pilot" — standard project methodology.

The audit findings sample (R5.8M annualised cost of post-demo handoff gap) is illustrative — the math is realistic but the specific numbers are not from a published case study. Marked as anonymised in the page copy.

---

## Corporate AI Advisory

| Claim used on page | Source | Date |
|---|---|---|
| 80% of AI projects fail to deliver business value | [RAND Corporation 2025 analysis](https://www.pertamapartners.com/insights/ai-project-failure-statistics-2026) | 2025 |
| 88% of agent pilots fail to graduate to production | [Joget / IDC research, Q1 2026](https://joget.com/ai-agent-adoption-in-2026-what-the-analysts-data-shows/) | 2026 |
| Average abandoned AI initiative cost: $7.2M | [Same Joget aggregation](https://joget.com/ai-agent-adoption-in-2026-what-the-analysts-data-shows/) | 2026 |
| 95% of GenAI pilots fail to scale | [MIT Sloan 2025 research](https://writer.com/blog/enterprise-ai-adoption-2026/) | 2025 |
| 83% of Fortune 500 procurement plan ISO 42001 alignment by 2027 | [Insight Assurance / ISO 42001 industry research](https://insightassurance.com/insights/blog/iso-iec-42001-the-2026-gold-standard-for-ai-governance-and-trust/) | 2026 |
| 15–25% lower AI liability insurance premiums for ISO 42001-certified companies | [AI Governance Today](https://www.aigovernancetoday.com/news/iso-42001-redefining-ai-governance-2026) | 2026 |
| 5.8× ROI on AI investment within 14 months (production deployment) | [McKinsey 2025–26 report cited via Writer](https://writer.com/blog/enterprise-ai-adoption-2026/) | 2025 |

This is the page with the strongest stat-backing — every major number has a citable source.

---

## Updating sources

When a stat ages out, we should:
1. Find a fresher version of the same data (or a fresher equivalent claim).
2. Update both this file AND the relevant entry in `src/data/products.ts`.
3. If a stat is no longer defensible and we can't find a replacement, soften it (see the Newsletter "84% within 3 months" → "most within 6 months" pattern above).

Stats with specific year-anchored numbers (e.g. "2026") should be reviewed annually. Stats grounded in long-running studies (e.g. HBR 5-minute rule, originally 2007) are stable.
