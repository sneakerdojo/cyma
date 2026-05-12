---
title: 10 · Operational plan
description: How the company runs day-to-day — solo-founder mechanics, decision-making cadence, hiring trigger thresholds.
---

> **Iteration 10 of 10 (part 2 of 3)**

## The honest operational picture

Octio is a one-person company for the first 6 months. The plan needs to be operationally specific about how one person operates four products + a service business + a sales motion. If we can't run it, we shouldn't sell it.

## Founder's weekly rhythm

### Monday — strategy + planning

| Time block | Activity |
|---|---|
| 06:30–08:00 | Personal: workout, breakfast, no work |
| 08:00–09:00 | Weekly metrics review (every product Patient Zero data + customer dashboard) |
| 09:00–10:00 | Patient Zero ops: review weekend AI outputs (Voice Agent escalations, Lead Gen sessions, Drafter queue) |
| 10:00–12:00 | Engineering: fix top customer-reported issue from previous week |
| 12:00–13:00 | Lunch |
| 13:00–15:00 | Sales: review pipeline, follow up on warm leads, send 5 cold-outreach DMs |
| 15:00–17:00 | Content: write 1 LinkedIn post manually (founder voice), review Social Manager queue |
| 17:00–18:00 | Wind-down + planning tomorrow |

### Tuesday — engineering + customer onboarding

| Time block | Activity |
|---|---|
| 08:00–09:00 | Patient Zero ops (Newsletter Engine draft, approve current week's issue) |
| 09:00–12:00 | Customer onboarding (if any scheduled) OR engineering deep work |
| 12:00–13:00 | Lunch |
| 13:00–15:00 | Discovery calls (if any scheduled — typically 2–3 in a week) |
| 15:00–17:00 | Engineering: ship the next feature/fix from backlog |
| 17:00–18:00 | LinkedIn presence (engage, comment, DM responses) |

### Wednesday — engineering + sales

| Time block | Activity |
|---|---|
| 08:00–09:00 | Patient Zero ops |
| 09:00–12:00 | Engineering deep work |
| 12:00–13:00 | Lunch |
| 13:00–14:00 | Mid-week sales pipeline review |
| 14:00–16:00 | 1–2 discovery calls + follow-ups |
| 16:00–18:00 | Engineering OR content (depending on week's priority) |

### Thursday — newsletter day + ops

| Time block | Activity |
|---|---|
| 08:00–09:00 | Patient Zero ops |
| 09:00–11:00 | Newsletter Engine: review Drafter output, edit, approve, schedule for noon send |
| 11:00–12:00 | Post-newsletter: engage with reply traffic, share newsletter on LinkedIn |
| 12:00–13:00 | Lunch |
| 13:00–16:00 | Customer onboarding OR engineering OR discovery calls |
| 16:00–18:00 | Admin: financial review, expense management, send invoices |

### Friday — close-out + content

| Time block | Activity |
|---|---|
| 08:00–09:00 | Patient Zero ops |
| 09:00–12:00 | Engineering: ship and deploy any open work; weekend should be stable |
| 12:00–13:00 | Lunch |
| 13:00–15:00 | Content batch: record 1 YouTube video, write next week's LinkedIn post seeds |
| 15:00–17:00 | Sales: send weekend follow-ups; warm up next week's pipeline |
| 17:00–18:00 | Weekly retrospective: what worked, what didn't, what to change |

### Saturday — engineering catch-up (only if needed)

If there's urgent customer-facing work or a planned deploy, Saturday morning is the buffer. Otherwise: off.

### Sunday — Patient Zero + planning

| Time block | Activity |
|---|---|
| 18:00–19:00 | Patient Zero: Strategist agent runs for next week's content. Founder reviews calendar. |
| 19:00–20:00 | Quick scan of upcoming Monday's customer schedule. Mental prep. |

## Founder capacity math

| Activity | Hours/week |
|---|---|
| Engineering | 18h |
| Customer onboarding | 6h (per customer, ~1 onboarding/week) |
| Discovery + sales calls | 8h (4 calls × 2h prep + execution) |
| Content (founder voice) | 4h |
| Patient Zero ops | 6h (1h/day) |
| Newsletter review | 2h |
| Admin + finance | 3h |
| **Total productive work** | **47h** |

Within a 5-day work week, this is sustainable. Pushes into Saturday when customer count rises faster than expected.

**Trigger to hire #1:** founder consistently >60h/week for 4 weeks AND > R150k MRR. Likely hits at month 6–7.

## Decision-making cadence

### Daily (10 min, EOD)

- Is anything broken in production? If yes, fix tomorrow morning before anything else.
- Are any customer-facing AI agents misbehaving? Log issue, batch-fix in weekly engineering window.
- Are any sales conversations stalled > 7 days? Re-engage or close-lost.

### Weekly (Friday afternoon, 30 min)

- Did we hit MRR target?
- Did we onboard the customers we expected?
- Where is each in-flight engineering work item?
- What's the top retention / activation risk for current customers?
- What's one thing to change next week?

### Monthly (last Friday of month, 2 hr)

- Full P&L review
- Customer churn analysis: who left, why, what's the pattern?
- Patient Zero metrics: still credible? Anything degrading?
- 60-day forward planning: what's the next big thing?
- Hiring trigger check: have we hit thresholds?

### Quarterly (every 3 months, 1 day)

- Strategy review against this business case document
- What assumptions held? What broke?
- Revise plan for next 3 months
- Update business case file with learnings

## Hiring plan

### Hire #1 — SDR or Customer Success (month 6–8)

**Profile:** mid-career SA-based (Pretoria/Joburg/Cape Town), ideally:
- 3–5 years in SMB sales or onboarding
- Comfortable with software (doesn't need to code)
- Strong English written + verbal
- POPIA-aware

**Two paths considered:**

| Path | When to choose |
|---|---|
| SDR-first | If pipeline volume is the bottleneck (founder has time for discovery + close, but no time to fill funnel) |
| CS-first | If retention is the bottleneck (first cohort customers are churning or needing too much hand-holding) |

**Default assumption:** SDR-first, because by month 6–7 the audit funnel should be producing volume that exceeds founder's discovery-call capacity.

**Compensation:** R25k base + 5% commission on closed deals + 1% override on customer retention past 6 months. Year-1 OTE ~R450k.

### Hire #2 — second of the above pair (month 9–11)

The role we didn't hire first. Whichever bottleneck is now urgent.

### Hire #3 — Engineer (month 12+)

When founder's engineering capacity is the constraint. Profile: senior full-stack TypeScript engineer, ideally with Mastra or LangChain experience. R65k–R85k/month for senior-level SA talent.

### Org chart at month 12 (target)

```
Founder (Simekani) — CEO + product + senior eng
├── SDR (Hire #1)
├── Customer Success / Agent Operator (Hire #2)
└── Engineer #1 (Hire #3)
```

4 people. R1.6M MRR target. Lean by design.

## Operational tools (Octio's stack, internally)

| Function | Tool |
|---|---|
| Code | Cursor + Claude Code |
| Version control | GitHub (private repos) |
| Project management | Linear (or Notion lists if Linear feels heavy) |
| Comms | Discord (internal) + Slack (channel partners + customer 1:1) |
| Calendar | Google Calendar (also our product integration target) |
| Email | Gmail (Google Workspace) |
| Docs | Notion (long-form) + this Astro Starlight site for business artefacts |
| CRM | Pipedrive ($14/mo) + our own Lead Gen for top-of-funnel |
| Accounting | Xero (R750/mo) + monthly bookkeeper |
| Banking | First National Bank Business Zero |
| Payments | Stripe SA (3.5% + R2 per txn) |
| Infra | Hetzner Cloud (Frankfurt) + Cloudflare (CDN/DNS) |
| Monitoring | Better Stack (Uptime + logs) + Grafana for product metrics |
| Voice | Twilio SA + Deepgram + ElevenLabs |

Total tool subscription cost (excluding API spend): ~R3,500/month. Cheap by design.

## Customer onboarding playbook

### Phase 1 — pre-call (automatic)

- Prospect books discovery via Octo
- Lead Gen sends reminder email + brief survey
- Audit Tool result attached if available

### Phase 2 — discovery call (founder, 30 min)

- Confirm pain
- Map products to pain
- Quote pricing (transparent, from website)
- Handle objections
- Send Stripe checkout link
- Promise: live in 24 hours

### Phase 3 — onboarding (Tenant Onboarding wizard, 15 min)

- Customer self-serves via `octio.co.za/start`
- Wizard collects: company info, brand voice, calendar OAuth, Twilio number (provisioned automatically), Stripe subscription
- AI agents auto-tune to brand voice on first run

### Phase 4 — go-live (founder, 30 min if needed)

- Confirm everything works
- Run 1 test session (test chat, test call, test approval queue)
- Customer dashboard tour
- Set expectations: how to escalate, how to give feedback

### Phase 5 — first 30 days (mostly automated)

- Day 1: founder check-in via Slack
- Day 7: automated email summarising week
- Day 14: founder personal call (relationship-building)
- Day 30: founder personal call + customer feedback ask

### Phase 6 — ongoing (CS Hire post-month-6)

- Monthly automated performance digest
- Quarterly personal CSM call
- Quarterly account expansion conversation (upsells to bundle)

## Founder discipline rules

These exist to protect the operation:

1. **Don't take on customers we can't onboard within 5 business days.** If pipeline outruns capacity, queue them politely, set expectations, focus on existing customers.
2. **Don't take a service engagement over 4 weeks of work** until month 6+. Service is a side stream; we don't let it eat product time.
3. **Don't ship product features without Patient Zero validation.** Period.
4. **Don't promise custom features to close a deal** unless they're already on the roadmap. We sell what we run, not what we promise.
5. **Don't drop newsletter cadence or content cadence**, even during heavy engineering weeks. Distribution compounding requires consistency.
6. **Friday is the deploy gate.** No major deploys Friday after 16:00 SAST. No deploys Sunday. Saturday morning is reserved for the rare urgent fix.
7. **One hour of founder time per day on engineering deep work**, minimum, even when other things are urgent. Otherwise product velocity dies.

## Crisis playbooks

### "Production is down"

1. Check Better Stack alert + Grafana metrics
2. If customer-impacting: notify in Octio status channel + Slack to affected customers within 15 min
3. Roll back the most recent deploy first; debug second
4. Post-mortem within 24 hours; share with customers if user-visible

### "Customer is leaving"

1. Don't try to save with discount. Ask why.
2. If product gap: log in backlog, prioritise. If still leaving, refund pro-rated.
3. Post-mortem after exit: what would have kept them? Fix it for next time.

### "Founder is sick / out for 1 week"

1. Pre-built automation should hold most operations
2. Customer Slack channels say "Founder out this week; AI agents fully operational; escalate to support@octio.co.za for urgent"
3. Discovery calls: reschedule, don't cancel
4. Newsletter: send a 1-line "out this week, normal cadence next week" or pre-write 2 weeks ahead

### "API vendor goes down (Anthropic / Twilio / etc.)"

1. Pre-built fallback: Mastra agent can route to alternative model (Gemini for Claude, etc.)
2. Voice fails over to traditional voicemail
3. Customer-facing communication: "AI receiver is temporarily offline. Leave message at support@."

## Compliance + legal cadence

| Cadence | Item |
|---|---|
| Daily | None — automated logs |
| Weekly | Review POPIA registry status |
| Monthly | Customer DPA renewal (anyone whose contract is up) |
| Quarterly | POPIA audit, GDPR review (for any EU traffic), data-retention review |
| Yearly | ISO 42001 alignment check, security policy review, financial accounts |

## Key assumptions

| # | Assumption | What disproves it |
|---|---|---|
| 1 | Founder can sustain 47h productive week for first 6 months | Founder regularly works 60+ hours, burnout signals appear |
| 2 | Patient Zero ops fit in 1h/day | Founder spends >2h/day on PZ ops for 4 consecutive weeks |
| 3 | First hire is productive within 60 days | First hire produces zero bookings (SDR) or has multiple customer churn (CS) in 90 days |
| 4 | The discipline rules can be enforced (especially deploy gate, deep work block) | Production incidents traceable to weekend/late deploys recurring |

## Open questions

1. Should we use Notion or just Markdown files for internal docs? Hypothesis: Markdown in this repo for engineering + business case; Notion for short-form ops docs (playbooks, onboarding scripts). Re-evaluate at month 3.
2. Do we ever use external consultants (POPIA officer, marketing strategist) vs hiring fractional? Hypothesis: external for compliance (specialised, infrequent); hire fractional for marketing if growth stalls.
3. Office vs fully-remote? Hypothesis: fully remote for first 12 months. Pretoria home office + co-working day passes when needed.

## Citations

- Solo-founder operational benchmarks: standard B2B SaaS heuristics
- Hiring trigger thresholds: Geoffrey Moore-style scaling patterns + Lenny Rachitsky operational scaling
