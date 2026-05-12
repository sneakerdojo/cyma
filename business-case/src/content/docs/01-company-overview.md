---
title: 01 · Company overview
description: Who Octio is, where we came from, what we believe, and how we operate.
---

> **Iteration 2 of 10**

## What Octio is

Octio is a pure-play AI company headquartered in Pretoria, South Africa, founded in 2023. We build, deploy, and operate autonomous AI agents that take over discrete, repeatable functions of a small or mid-sized service business — lead capture, phone reception, content production, customer follow-up.

We are deliberately not:
- A web design agency
- A marketing agency
- A consultancy with "AI capabilities"
- A no-code automation shop

We are an AI products company that productises the work an agency would do manually, then operates those products as a SaaS subscription.

## Founding thesis

Three observations from 2023–2026 led to Octio:

1. **The AI capability gap is closing fast for SMBs.** What cost R200,000 in custom dev to build for an enterprise in 2022 — a chatbot that books appointments, an after-hours phone agent that takes messages, an AI that drafts a newsletter — now costs R200 in API tokens. The cost collapse is permanent.

2. **SMBs cannot operationalise this themselves.** They have neither the engineering hours nor the prompt-engineering instinct to wire OpenAI/Anthropic/Twilio/Stripe/Gmail/LinkedIn into a working system. Even with tools like HighLevel and Lovable, the gap between "the demo works" and "this runs my business for six months without me touching it" is wider than it looks.

3. **Marketing agencies are commoditised, but operating agencies aren't.** Anyone can run Facebook ads. Far fewer can run, monitor, and tune a fleet of AI agents for a customer's business and keep the leads flowing every day. The defensibility is in the operating, not the building.

Octio's wedge: we build the products small businesses need but can't build, and we operate them as a service so the business owner doesn't have to think about it.

## Patient Zero positioning

Every product Octio sells, Octio runs first — on octio.co.za itself.

- The **AI Lead Generation** product is Octo, the chat agent that qualifies visitors and books discovery calls on this site
- The **Voice & Chat Agents** product will run as the inbound number for Octio's own line (day 3 of the 7-day plan)
- The **Newsletter Engine** runs Octio's own weekly newsletter
- The **AI Social Media Manager** runs Octio's own LinkedIn presence

This isn't marketing copy — it's the operating principle. Before we sell a product, we use it. Before we charge for an AI agent, we trust it with Octio's own pipeline. The dogfooding produces three benefits at once:

1. **Quality:** if it's broken, we feel it before a customer does
2. **Credibility:** every sales conversation can reference "this is the same thing running our pipeline right now"
3. **Demo:** the prospect interacts with the product before they pay — the chat on this site, the audit tool, the newsletter — is the live demo

## What we believe (the operating principles)

These show up in everything from the marketing copy to the codebase. They're not negotiable.

### 1. Senior-led, no junior handoffs

Octio's first dozen customers will be hand-delivered by the founder. Every conversation, every onboarding, every escalation, every prompt tuning is done by someone who could go build it themselves. The first sign Octio loses its edge is the day a customer talks to someone who can't explain how the AI agent decides what to do.

### 2. Three-to-four active engagements at a time

We deliberately cap the customer count per founder until automation eats the operational load. A bad customer experience kills a referral; a slow growth curve doesn't.

### 3. Transparent pricing

Every price is on the marketing site. No "contact sales for pricing." SMB buyers don't want sales conversations until they've made the buying decision; we respect that by being honest about cost upfront.

### 4. Compliance by default

POPIA + GDPR + ISO 42001. Most of our market is in regulated industries (medical, legal, financial). Compliance isn't a feature, it's a baseline.

### 5. BYOK pricing

Customers can supply their own AI API keys for transparent, scaling-with-usage cost. This is unusual in the agency space and a hedge against AI price wars eroding our margin.

### 6. Local-first

Octio sells to South African SMBs first. The local market has the right combination of:
- Buyers educated enough to understand AI's value
- Underserved enough that competition is light
- Currency we can quote in
- Compliance we can navigate (POPIA)
- Time-zone overlap with where we live

International expansion is a 12+ month decision, not a day-1 hedge.

## How we operate (the team shape today)

**Solo founder phase (now → month 6):**
- One person: Simekani (founder)
- One AI collaborator: Claude (Opus 4.7, in-IDE pair programmer)
- Three engagement slots active at any time

The team shape changes only when:
- Product quality starts slipping under load (signal: customer-perceived bugs > 1/week)
- Sales cadence breaks (signal: leads stack up faster than we can close)
- Founder bandwidth is the bottleneck for revenue (signal: leaving R50k+ MRR on the table monthly)

First hire is most likely a **customer success / agent-operator** role — someone who can run the day-to-day for installed customers without being a full engineer. Estimated month 7–9 if the 12-month numbers track.

## Brand essentials

- **Visual identity:** dark theme, orange accent (#E8862A), Manrope display font, custom "Octo" mascot (jellyfish-derived). See `src/styles/octo.css` for tokens.
- **Voice:** consultative authority. Direct, specific, never vague. No "Great question!" filler. We sound like the person who actually built it because we did.
- **Story angle:** the AI company that built itself. We talk about how every product runs Octio first, then sell that same product to customers.

## Where we're located + legal

- **Pretoria, South Africa**
- Octio (Pty) Ltd — registered company
- POPIA registered with the Information Regulator
- VAT registered (when revenue clears threshold)

## What we're not (the deliberate excludes)

- **We are not a generalist dev shop.** "Can you build a custom CRM for us?" gets routed to the Agentic App Development service or politely declined.
- **We are not consultants.** Advisory engagements are deliberately framed as 90-day Adoption Programmes with shipped artefacts, not deck-and-Powerpoint deliverables.
- **We are not an outsourced marketing team.** We don't run ads, write SEO articles, or manage campaigns. We deploy agents that do specific functions; marketing is downstream of that.

## Key assumptions

These are the things that, if disproved, would force us to rewrite this chapter:

| # | Assumption | What disproves it |
|---|---|---|
| 1 | SA SMBs in service industries will pay R3.5k–R8.5k/month for AI products | First 10 sales calls all close at <R3k OR all push back on price entirely |
| 2 | Solo founder can hand-deliver first 10 customers without quality collapse | Customer churn in first 90 days >40% |
| 3 | AI products can deliver consistent value without per-customer prompt-tuning | Prompt drift requires >2h/week per customer to maintain |
| 4 | Patient Zero positioning resonates with buyers vs. agency pitch | A/B testing pitch in cold outreach shows no lift from Patient Zero framing |
| 5 | South Africa is the right starting beachhead, not US/UK | First-cohort customer acquisition cost is >2x the comparable US benchmark |

## Open questions

1. Should we register Octio in a US-friendly jurisdiction (Delaware) for future fundraise? Decided no for v0.1; revisit at month 6 if we cross R5M ARR.
2. At what revenue do we hire the first non-founder? Working hypothesis: R200k MRR or "founder hits 60h/week consistently for 4 weeks", whichever comes first.
3. Do we ever take outside capital? Working hypothesis: no for first 18 months; bootstrap to profitability, decide from a position of strength.

## Citations

- South Africa SMME economic contribution: [SAP Africa News Center](https://news.sap.com/africa/2026/03/the-essential-tech-trends-for-african-smes/) (34% GDP, 60% employment)
- SMB AI adoption pattern: [Small Business & Entrepreneurship Council](https://sbecouncil.org/2026/04/25/the-ai-tools-small-businesses-are-using/) (76% using or exploring, 2026)
- ROI-focused adoption trend: [The Small Business Site](https://www.thesmallbusinesssite.co.za/ai-adoption-realities-for-smbs-how-to-move-past-fear-to-measurable-impact/)
