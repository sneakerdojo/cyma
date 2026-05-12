# Octio Tenant Onboarding & Billing — Design

**Status:** Draft, awaiting approval. Day 5 of the 7-day build plan.
**Author:** Simekani + Claude (Opus 4.7)
**Last updated:** 2026-05-12
**Powers:** the customer signup → payment → provisioned-account flow for all 4 SaaS products
**Builds in:** existing `cyma` repo, new `/start` route + worker endpoints

---

## 1. Goal

15-minute end-to-end: anyone on the internet can visit octio.co.za, pick a plan, pay, and have working AI products (chat widget, voice agent, social manager, newsletter) running for their business — no human intervention required.

## 2. Plans (day 1 launch)

Single-product plans + a bundle:

| Plan | Includes | Price (ZAR) |
|---|---|---|
| Lead Generation | Chat widget + booking calendar integration | R8,500/mo |
| Voice & Chat | Voice agent (Twilio number) + chat widget | R6,500/mo |
| Social Manager | LinkedIn drafter + approval queue | R4,500/mo |
| Newsletter Engine | Newsletter drafter + Gmail sender | R3,500/mo |
| **Octio Suite** | All 4 products | **R18,500/mo** (saves R4,500) |

All plans:
- 14-day free pilot (full refund if cancel within 14 days)
- ZAR billing via Stripe, monthly recurring
- Cancel anytime
- BYOK option for LLM keys (Phase 2 — 20% discount)

## 3. Signup flow

```
1. octio.co.za/start
   ↓
2. Plan picker (4 single + 1 bundle, big visible "Try free for 14 days")
   ↓
3. Business details (5 fields, ~30 sec to complete)
     • Business name
     • Industry (dropdown of common SA service businesses)
     • Website URL
     • Brand colour (colour picker, default Octio orange)
     • Brand voice — pick from 5 presets OR paste 3 sample posts/messages
   ↓
4. Connect channels (skippable, run inline)
     • Lead Gen / Voice & Chat plans: Google Calendar OAuth
     • Voice & Chat plan: Twilio number (auto-provisioned, SA preferred)
     • Social Manager plan: LinkedIn OAuth (Community Management API)
     • Newsletter plan: nothing — uses Octio's Gmail send by default
   ↓
5. Stripe Checkout
     • Stripe Checkout session opens
     • Card capture + first month charge
   ↓
6. Welcome — tenant provisioned in DB, redirected to /admin/welcome
     • Shows embed script to paste on their site (Lead Gen / Voice & Chat plans)
     • Shows Twilio number to forward to (Voice & Chat plan)
     • Shows draft queue link (Social / Newsletter plans)
     • Email sent with same info + admin dashboard link + getting-started checklist
```

## 4. Data model

```sql
CREATE TABLE tenants (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,           -- url-safe, used in widget embed
  business_name   TEXT NOT NULL,
  industry        TEXT,
  website_url     TEXT,
  brand_voice     JSONB NOT NULL DEFAULT '{}',    -- merged from setup wizard
  plan            TEXT NOT NULL,                  -- 'lead_gen' | 'voice_chat' | 'social' | 'newsletter' | 'suite'
  status          TEXT NOT NULL DEFAULT 'trialing', -- trialing | active | past_due | cancelled
  trial_ends_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Stripe linkage
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- Owner contact
  owner_email     TEXT NOT NULL,
  owner_name      TEXT,
  owner_phone     TEXT
);
CREATE INDEX tenants_status_idx ON tenants (status);

CREATE TABLE tenant_users (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'admin',  -- admin | editor | viewer
  password_hash   TEXT,                           -- bcrypt; null if SSO-only
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ,
  UNIQUE (tenant_id, email)
);

CREATE TABLE billing_events (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
  stripe_event_id TEXT UNIQUE NOT NULL,
  kind            TEXT NOT NULL,                  -- 'subscription.created' | 'invoice.paid' | ...
  amount_cents    INTEGER,
  occurred_at     TIMESTAMPTZ NOT NULL,
  raw             JSONB
);

-- channel_accounts + tenant_agent_config already exist from earlier specs
```

## 5. API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/start/plan-quote` | Validate plan choice + compute pricing (handles bundle math) |
| POST | `/api/start/provisional-tenant` | Create tenant in `trialing` state, return `{ tenantId, slug, stripeCheckoutUrl }` |
| POST | `/api/start/stripe-webhook` | Stripe webhook (subscription.created, invoice.paid, payment_failed, etc.) |
| POST | `/api/start/connect/google-calendar` | OAuth init for Calendar |
| POST | `/api/start/connect/google-calendar/callback` | OAuth callback — store token in `channel_accounts` |
| POST | `/api/start/connect/linkedin` | LinkedIn OAuth init |
| POST | `/api/start/connect/linkedin/callback` | LinkedIn OAuth callback |
| POST | `/api/start/connect/twilio/provision` | Buy a Twilio number for the tenant + wire webhook |
| POST | `/api/start/complete` | Marks tenant onboarded, sends welcome email |
| GET | `/api/admin/billing/status` | Check current subscription status for admin dashboard |
| POST | `/api/admin/billing/cancel` | Cancel subscription (Stripe API) |
| POST | `/api/admin/billing/portal` | Open Stripe billing portal session |

## 6. Stripe integration

- Use Stripe Checkout (hosted, less PCI surface for us)
- Products + prices configured in Stripe dashboard, IDs in env: `STRIPE_PRICE_LEAD_GEN`, etc.
- Trial period: 14 days, automatic
- Webhook secret: `STRIPE_WEBHOOK_SECRET` in env
- On `customer.subscription.deleted` → mark tenant `cancelled`, keep data 30 days for resurrection
- On `invoice.payment_failed` → mark tenant `past_due`, send dunning email; disable channels after 3 fails
- SA VAT: Stripe handles based on tenant address; we set rate to 15%

## 7. Day-5 MVP scope

**In:**
- 5 plan tiers visible at /start
- Setup wizard (business + brand + channel-connects)
- Stripe Checkout + webhook (subscription.created, invoice.paid, payment_failed)
- Twilio number auto-provisioning for Voice & Chat plans (SA numbers preferred; fallback to UK if not available)
- Google Calendar + LinkedIn OAuth flows
- Welcome email with embed script + dashboard link
- Tenant lands in trialing state, has 14 days before first charge

**Out (week 2+):**
- Self-serve plan changes (week 2 — for now, email support to upgrade)
- Add/remove team members
- Per-channel pause / pricing modifiers (BYOK discount)
- Usage-based pricing
- Annual plans / discounts
- Affiliate tracking
- Customer-facing usage dashboard (Phase 2 of admin dashboard)

## 8. Day-0 dependencies

These have to be set up before day 5 starts. Need verification status by day 1:

| Dependency | Owner | Lead time |
|---|---|---|
| Stripe SA account active | Simekani | 1–3 business days for verification |
| Twilio account verified for SA numbers | Simekani | 1–3 days |
| Anthropic API key with sufficient quota | Simekani | Instant |
| Deepgram account | Simekani | Instant |
| ElevenLabs Pro account | Simekani | Instant |
| LinkedIn Developer app reviewed | Simekani | Usually instant for personal scopes |

## 9. Estimate (day 5 of 7-day plan, afternoon half)

~4 hours:
- 1h: Plan picker UI + plan-quote endpoint
- 1h: Setup wizard UI (5-step form) + provisional-tenant endpoint
- 1h: Stripe Checkout integration + webhook handler
- 30min: Twilio + LinkedIn OAuth wiring
- 30min: Welcome email template + end-to-end test

## 10. Approval checklist
- [ ] Plan structure (§2) — 4 single + 1 bundle → approved
- [ ] Signup flow (§3) — 5 steps, 15 min total → approved
- [ ] Data model (§4) → approved
- [ ] API surface (§5) — **needs explicit approval per global rule**
- [ ] Stripe integration (§6) — Checkout-hosted, 14-day trial → approved
- [ ] MVP scope (§7) → approved
- [ ] Day-0 dependencies (§8) checked + started → required before day 1
- [ ] 4h estimate for day 5 afternoon → approved
