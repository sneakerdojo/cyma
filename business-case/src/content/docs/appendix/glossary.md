---
title: Glossary
description: Terms used throughout the business case — defined.
---

## Octio-specific terms

**Patient Zero** — Octio's principle that every product is used internally to run Octio's own operations before it's sold. The first "patient" to receive the medicine is the doctor. Used as both an internal discipline and a sales credibility lever.

**Octo** — Octio's mascot AI agent. The instance of the AI Lead Gen product that runs on `octio.co.za`. Refers either to the character (an orange jellyfish-like figure) or the specific agent instance.

**Octio Suite** — the bundle SKU containing all four autonomous products (Lead Gen + Voice & Chat + Social Manager + Newsletter Engine) at R18,500/mo, a 19% discount on the single-buy total.

**The Audit Tool** — Octio's free lead magnet at `octio.co.za/audit`. Allows any visitor to upload screenshots of a website, receive a CRO audit report and an AI-Studio rebuild prompt within ~60 seconds. The funnel entry for the four paid products.

**Tenant** — a single customer organisation in Octio's multi-tenant SaaS. Every database table has `tenant_id`; every agent runs scoped to a tenant; every brand-voice config is per-tenant.

**Recursive sales** — the practice of using one's own products to acquire customers for those products. For Octio: the LinkedIn post you read was drafted by Social Manager; the chat that's responding is Lead Gen; the newsletter is Newsletter Engine.

## Product / framework terms

**ACV (Annual Contract Value)** — the value of a customer over a single year. Used to distinguish PLG (product-led growth, ACV < $5k) from SLG (sales-led growth, ACV > $50k) motions.

**ARR (Annual Recurring Revenue)** — MRR × 12. The "headline number" for SaaS company valuation.

**ARPU (Average Revenue Per User)** — total revenue / number of customers. For Octio, mix-weighted across product tiers.

**Bowling alley** — Geoffrey Moore's strategy for post-chasm growth: dominate one niche (the lead pin), then knock down adjacent niches (subsequent pins) in sequence.

**BYOK (Bring Your Own Key)** — pricing tier where the customer supplies their own AI API keys. Octio passes through cost, charges only for the orchestration layer.

**CAC (Customer Acquisition Cost)** — total acquisition spend divided by customers acquired. For Octio, target < R6,500 even in Phase 3.

**Cold outreach** — emailing, DMing, or calling strangers. One of Hormozi's Core Four lead channels.

**Containment rate (chat)** — the percentage of chat sessions that resolve without needing human escalation. Industry benchmark: 50–60%. Octio target: > 70%.

**Crossing the Chasm** — Geoffrey Moore's framework for moving from early adopters to mainstream-market customers. See [appendix/frameworks-reference.md](./frameworks-reference.md#3-crossing-the-chasm--the-bowling-alley).

**DPA (Data Processing Agreement)** — contract between Octio and a customer defining how Octio processes the customer's data on the customer's behalf. POPIA + GDPR requirement.

**EBITDA (Earnings Before Interest, Taxes, Depreciation, Amortization)** — a measure of profitability. For solo-founder businesses, approximates "cash left after monthly costs."

**Engagement Monitor** — Phase 2 feature: an AI agent that watches for replies on published social posts and drafts reply suggestions for the operator to approve.

**ESP (Email Service Provider)** — third-party email-sending service (e.g., Beehiiv, Mailchimp, Klaviyo). Octio's Newsletter Engine integrates with multiple ESPs as adapters; default is Gmail at small scale.

**ICP (Ideal Customer Profile)** — the precise customer description we sell to. For Octio Phase 1: SA service businesses, owner-operated, R20k–R500k/month revenue, high inbound dependency.

**LTV (Lifetime Value)** — total revenue from a single customer over their lifetime. Calculated as ARPU × gross margin × average tenure.

**MRR (Monthly Recurring Revenue)** — total subscription revenue per month. Excludes one-time fees and project work.

**Net retention** — (revenue at end of period from existing cohort) / (revenue at start). > 100% means upsells outweigh churn. Octio target: > 105%.

**OPEX (Operating Expenses)** — fixed costs of operating the business (excluding variable costs like API spend).

**PLG vs SLG** — Product-Led Growth (self-serve, free trial, < $5k ACV) vs Sales-Led Growth (custom contracts, $50k+ ACV). Octio is PLG-leaning ("self-serve onboarding + transparent pricing") with light human touch on first call.

**POPIA (Protection of Personal Information Act)** — South Africa's data privacy law (analogous to GDPR). Octio is registered with the SA Information Regulator.

**Recursive sales loop** — see "Recursive sales" above.

**Risk reversal** — a guarantee that shifts purchase risk away from the buyer (e.g., 14-day money-back). One of Hormozi's Grand Slam Offer pillars.

**SAM (Serviceable Available Market)** — the slice of TAM that's actually reachable. For Octio: ~250,000 SA service businesses with a website + inbound funnel.

**SDR (Sales Development Representative)** — sales role focused on filling pipeline (qualifying leads, booking discovery calls). Octio's first hire is likely an SDR in month 6–8.

**Send-as alias** — Gmail's feature allowing one Gmail account to send emails appearing to come from another email address. Octio's `support@octio.co.za` is a send-as alias on the founder's Gmail.

**SLO (Service Level Objective)** — internal performance target (e.g., "99.5% chat response within 2 seconds"). Distinct from SLA which is the customer-facing commitment.

**SMME (Small, Medium, and Micro Enterprise)** — South African business classification, roughly equivalent to "SMB" in US/UK terminology.

**SOM (Serviceable Obtainable Market)** — the realistically capturable share of SAM in a given timeframe. For Octio: ~5,000 customers in 24 months.

**TAM (Total Addressable Market)** — the theoretical maximum revenue a product could capture if everyone who could buy it did. For Octio: ~2.5M SA SMMEs (all of them).

**Tier (pricing)** — discrete price points within a single product (Starter / Growth / Scale). Octio uses 3-tier pricing across all four products + a Suite bundle.

**Token bucket** — rate-limiting mechanism. For Octio: per-tenant API spend caps to prevent runaway costs.

**Value Equation** — Hormozi's framework for offer-quality measurement. See [appendix/frameworks-reference.md](./frameworks-reference.md#1-hormozi-100m-offers--the-value-equation).

**Wedge product** — the first product sold to a customer (the entry-point). For Octio: AI Lead Generation is the default wedge.

**Wizard-of-Oz** — a product technique where AI/automation is faked by a human in the loop, used to validate demand before building the real AI. Octio's earliest engagements used some of this; full automation arrived after Patient Zero proof.

## Technical / stack terms

**Astro** — static site generator used for `octio.co.za/business-case` (this docs site). Chosen for build speed + zero JS by default.

**Drizzle** — TypeScript ORM used for database access in Octio's worker + content engine. Type-safe, code-first migrations.

**Deepgram** — speech-to-text API. Used in Voice Agent for inbound call transcription.

**ElevenLabs** — text-to-speech API. Used in Voice Agent for the agent's spoken responses. "Flash" model = sub-300ms response time for natural conversation.

**Firecrawl** — URL-to-Markdown scraping service. Used in Newsletter Engine to extract content from Discord-curated URLs.

**Hetzner** — German cloud-infrastructure provider used to host Octio's worker + databases. Chosen for cost-efficiency (5-10× cheaper than AWS for our profile).

**Hono** — TypeScript web framework (alternative to Express). Used for Octio's worker API routes.

**Kimi K2 Turbo** — Moonshot's LLM. Used in Octio for cost-sensitive tasks (Audit Tool prompt generation, classifier work). Roughly 1/6 the cost of Claude Sonnet.

**Mastra** — TypeScript agent framework. Used for orchestrating AI agents (Lead Gen, Voice Agent, Drafter, Strategist). v1.0 released Jan 2026.

**RFC 8058** — IETF standard for one-click email unsubscribe headers. Required for Gmail bulk-sender compliance from Nov 2025. Octio's Newsletter Engine implements this from day 1.

**Twilio** — programmable telephony provider. Used in Voice Agent for SA phone numbers + WhatsApp Business API.
