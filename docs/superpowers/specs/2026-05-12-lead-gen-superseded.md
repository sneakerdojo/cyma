# Lead Gen (Octo on octio.co.za) — Spec v2

**Status:** Active. Supersedes `2026-05-12-embeddable-chat-widget-design.md`.
**Last verified:** 2026-05-12 via 8-agent Reddit + Medium + vendor-docs research pass.
**Patient Zero:** Octio's own `octio.co.za`.

## Goal

A website chat agent that:

- Greets every visitor proactively
- Qualifies via Need → Service → Urgency → Location → Authority (not classic BANT)
- Captures **WhatsApp** number (not email) — handoff to WhatsApp BEFORE booking ask
- Books discovery call in-thread (NOT via emailed Calendly link)
- Escalates to founder on Slack within 2 seconds on signal

Patient Zero metrics: **conversion rate, qualification accuracy, calendar misses, abandonment rate at turn 3**.

## Funnel reality (correcting earlier optimism)

Operator-verified benchmarks from r/SaaS, Drift case-study data, ZoomInfo, Velaro, AfriSpeech context. Vendor claims discounted.

| Stage | Realistic range | Vendor claim |
|---|---|---|
| Visitor → chat engagement | **3–7%** (service biz) | 20–30% |
| Engagement → qualified lead | **25–40%** | 55–67% |
| Qualified → booked discovery call | **30–50%** | 60%+ |
| **End-to-end visitor → booked** | **0.4–1.4%** | 5–10% |

Net lift over form-only baseline: **20–35%**, not "30–60% lift" vendor pitch. At Octio's projected ~500 visitors/month/customer (typical SA service site), expect **2–7 booked calls/month/customer** — not the 8/mo earlier financial draft assumed. The economic case still works because of margin and bundle stickiness; the math now matches reality.

## The single highest-leverage decision: WhatsApp BEFORE booking

In SA, WhatsApp has 96% monthly reach + 90–98% open rates (vs 20% email). Every site we deploy on captures the visitor's WhatsApp number BEFORE asking for the discovery-call booking. The qualification flow ends in WhatsApp, not in email. This is the single biggest delta vs. US-templated chat funnels.

## Qualification script (turn-by-turn)

Hard rule: **booking ask must land by turn 6**; turn 3 is the abandonment cliff (45% drop after three failed turns).

| Turn | Goal | Sample copy | Failure recovery |
|---|---|---|---|
| 1 | Proactive greet + open Need | "Hey — what brings you to [Customer]?" | If silent 30s, repeat once. Don't loop. |
| 2 | Confirm service match | "Got it. So you need [restated need] — is that right?" | If mismatch, ask "what would help most right now?" |
| 3 | Urgency | "Is this urgent or planning ahead?" | Branch: urgent → faster escalation; planning → normal flow |
| 4 | Location / service area | "What suburb or city?" | If outside service area, capture for waitlist + close gracefully |
| 5 | Authority (non-confrontational) | "Is this for you, or are you helping someone else decide?" | Capture both contacts if proxy |
| 6 | WhatsApp capture | "Cool — what's the best WhatsApp number to keep you in the loop?" | If pushback, fall back to email but flag in CRM |
| 7 | Hand off to WhatsApp | (Send WhatsApp template w/ booking link) "Sent a message — open WhatsApp, pick a time?" | If no WhatsApp open in 2 min, show inline calendar in chat |
| 8 | In-thread booking confirmation | Show 3 slots inline; confirm; send calendar invite | If all slots rejected, ask "what's your week look like?" → human follow-up |

Budget is asked **last and only as a fallback** if the call doesn't book — never first.

## Architecture

```
┌─────────────────┐                ┌──────────────────┐
│  Visitor browser│ ── WS chat ─→  │  Hono worker     │
│  (React widget) │ ← stream ──── │  (Cloudflare)    │
└─────────────────┘                └──────┬───────────┘
                                          │
                       ┌──────────────────┼────────────────────┐
                       ▼                  ▼                    ▼
                 ┌──────────┐      ┌─────────────┐      ┌──────────────┐
                 │ Mastra v1│      │  Drizzle +  │      │ Outbound     │
                 │  agent   │      │  Postgres   │      │ integrations │
                 │ (Haiku/  │      │  (per-tenant│      │ - Meta Cloud │
                 │  Sonnet  │      │   config)   │      │   API (Wapp) │
                 │  routed) │      │             │      │ - Calendar   │
                 └────┬─────┘      └─────────────┘      │ - Slack push │
                      │                                  └──────────────┘
                      ▼
              ┌─────────────────┐
              │ Model providers │
              │  - Anthropic    │
              │    (EU region)  │
              │  - Groq fallback│
              └─────────────────┘
```

### Why these components

| Component | Choice | Rejected alternatives | Reason |
|---|---|---|---|
| Embedding format | **Inline widget on landing pages** | Modal overlay (secondary), dedicated /chat page (skip) | Operator consensus: embedded inline beats modal for service biz. Dedicated page underperforms — extra click breaks context. |
| Agent framework | **Mastra v1.0** | Vercel AI SDK 6, LangGraph TS, Inngest AgentKit | Mastra wins on TS-native, memory + workflow + voice + RAG in one. Multi-tenant gap (#4050) handled architecturally — see below. |
| Greeting / templated drafts | **Claude Haiku 4.5** ($1/$5 per 1M) | Sonnet, Gemma 4 27B self-host | Fast, brand-coherent. Below self-host break-even (~100 customers / 3M tokens/day). |
| Qualification reasoning | **Claude Sonnet 4.6** ($3/$15) | Opus 4.7, GPT-4o | Sonnet hits qualification quality. Opus is wasteful for chat. |
| Intent classifier | **Gemma 4 27B or Haiku 4.5** | Sonnet, dedicated 0.5B classifier | Cheap & fast. Move to 0.5B distilled classifier past 50 customers. |
| Region | **Anthropic EU** | Anthropic US, Groq US | SA→EU is ~150ms vs SA→US ~260ms RTT. Direct latency win, also POPIA-friendlier story. |
| Persistence | **Postgres + Drizzle** (existing) | New Mongo / Supabase | Reuse existing stack. Multi-tenant via `tenant_id` on every table. |
| WhatsApp | **Meta Cloud API direct** | Twilio WhatsApp, 360dialog, MessageBird | $0 BSP fee, free service-window inbound. Twilio's $0.005/inbound markup hostile to chatty AI. |
| Calendar | **Google Calendar Free/Busy + Insert** | Calendly, Cal.com | Direct OAuth; no third-party fee; embeddable in chat. |
| Observability | **Mastra traces + Better Stack** | LangSmith, Helicone | Mastra-native; cheaper at our volume. |

### Multi-tenant pattern (Mastra workaround for issue #4050)

Mastra v1.0's open issue #4050 means agents are declared at build time, not registered dynamically. Workaround:

- One Mastra agent definition: `octoLeadGen`.
- Per-tenant config (brand voice, qualification script overrides, calendar OAuth tokens, WhatsApp credentials) stored in Postgres `tenants` + `tenant_chat_config` tables.
- On each request, load tenant config from DB → instantiate agent with hydrated system prompt + tools.
- Per-request model selection via routed picker (`model-router.ts`) using verified May 2026 prices.

This sidesteps the limitation without forking Mastra.

## Stack BOM with verified May 2026 prices

| Layer | Provider | Unit price | At 500 sessions/mo |
|---|---|---|---|
| LLM (chat reasoning) | Claude Sonnet 4.6 EU | $3 in / $15 out per 1M | ~R280 |
| LLM (templated/classifier) | Claude Haiku 4.5 EU | $1 in / $5 out per 1M | ~R45 |
| WhatsApp messaging | Meta Cloud API direct | Service $0; utility $0.0076/msg; marketing $0.0379/msg | ~R140 (50 utility + 1 marketing/mo) |
| Calendar | Google Calendar | Free | R0 |
| Postgres + Hetzner | Existing | Shared | ~R55 |
| Cloudflare worker | Free tier OK <10M req/mo | $0 | R0 |
| **Total marginal cost per Lead Gen customer / month** | | | **~R520** |
| **Margin at R8,500/mo Starter** | | | **~94%** |

Margin is healthier than the original draft assumed because we corrected Kimi pricing (wasn't using it anyway) and routed properly.

## Build sequence (7-day, Patient-Zero-first)

**Day 1 (Octo's chat is already live — multi-tenant scaffolding)**
- Migrate `chat_sessions`, `chat_messages` to include `tenant_id`
- Embeddable `<script>` widget on third-party sites
- Per-tenant config tables + admin UI to set brand voice

**Day 2 (WhatsApp wiring)**
- Meta Business Manager: verify, add fresh mobile number, OTP
- Submit 2 templates (welcome utility + booking confirmation)
- Webhook in Cloudflare worker: ack-first pattern → enqueue → LLM → POST reply via Graph API
- Test inbound + outbound on +27 mobile number

**Day 3 (Qualification flow + calendar)**
- Implement turn-by-turn script (Need → Service → Urgency → Location → Authority)
- Hard rules: booking ask by turn 6, abandonment recovery at turn 3
- Inline calendar slot picker (3 slots, fresh fetch on click)
- Slack escalation for "urgent" signal

**Day 4 (Patient Zero validation)**
- Run Octo on Octio's site for 48h
- Tune greeting + flow based on first 50 sessions

**Day 5 (Onboarding wizard)**
- `octio.co.za/start` — 15-min onboarding (business info → brand voice → calendar OAuth → WhatsApp creds → Payfast)

**Day 6 (Metrics + dashboards)**
- Conversion funnel dashboard
- Qualification accuracy: % of "qualified" labels that converted to booked calls
- Calendar misses: % of confirmed bookings that didn't actually happen
- Abandonment rate at each turn

**Day 7 (First customer go-live)**

## Metrics (Patient Zero scorecard)

| Metric | Target Phase A (shadow) | Target Phase B (solo) | Target Phase C (public) |
|---|---|---|---|
| Visitor → engagement | 3% | 5% | 7% |
| Engagement → qualified | 25% | 33% | 40% |
| Qualified → WhatsApp captured | 60% | 75% | 85% |
| WhatsApp captured → booking | 50% | 60% | 70% |
| Booking → actual call held | 75% | 85% | 90% |
| **End-to-end (visitor → call held)** | **~0.2%** | **~0.5%** | **~1.2%** |
| Avg response time (visitor message → bot reply) | <3s | <2s | <1.5s |
| Hallucination rate (founder review of 50 random sessions) | 0 critical | 0 critical | 0 critical |
| Booking ask landed by turn 6 | 80% | 90% | 95% |

These are the numbers we manage to. Any one regressing for 2 weeks = engineering priority.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Mastra multi-tenant agent registration friction | Workaround: tenant config in DB, instantiate agent per request (documented above). Watch issue #4050 for native support. |
| Meta WhatsApp template re-categorisation (utility → marketing surprise bill) | Monitor `template_category_update` webhook; alert founder; resubmit if mis-categorised |
| Meta Jan 15 2026 "no general-purpose AI on WhatsApp" rule | Position as "booking + service" bot. Don't market it as "AI assistant" on WhatsApp |
| Hallucinated pricing/service-area answers (top failure mode) | Pricing + service-area in deterministic tool calls (not LLM completion). LLM only paraphrases |
| Bot can't escalate cleanly to human | Slack channel per customer with @here escalation; SLA: 5 min ack |
| Calendar conflict (booking a slot that's now taken) | Re-fetch fresh availability immediately before insert; rollback + reoffer if 409 |
| Costs spike on a single conversation | Per-session token budget; hard-cap maxTurns at 12 |

## Compliance gates

| Gate | Check |
|---|---|
| POPIA Information Officer registered | Pre-launch |
| WhatsApp Business templates approved | Before first customer onboarding |
| Meta Business verification | Already done |
| Per-tenant data isolation verified | Test: tenant A query returns no tenant B rows |
| Hallucination + escalation rules audited | Founder reviews 50 sessions / week first 60 days |

## Open questions

1. Self-host the chat agent on Gemma 4 27B once we cross 100 customers? Hypothesis: yes (3M tokens/day breakeven) but defer until we have the customer count.
2. Add Afrikaans-language flow before 5 customers ask, or wait? Hypothesis: wait. English first; pivot if 30% of first cohort needs af-ZA.
3. Should we A/B test "WhatsApp first" vs "email first" qualifying? Hypothesis: yes by month 2 — even if WhatsApp wins on engagement, we want the data.

## Citations

- [Drift / Lift AI conversion benchmark](https://www.lift-ai.com/case-studies/drift-9x-conversions)
- [Live Chat Engagement Rate Benchmarks — Which-50](https://which-50.com/live-chat-engagement-rate-benchmarks/)
- [Conversation Drop-off Crisis — Nebuly](https://www.nebuly.com/blog/the-conversation-drop-off-crisis-why-ai-interactions-end-in-frustration)
- [Conversational Commerce in SA — Hubtype](https://www.hubtype.com/blog/conversational-commerce-in-south-africa)
- [Mastra Issue #4050 — Register agents on demand](https://github.com/mastra-ai/mastra/issues/4050)
- [Mastra changelog 2026-02-26](https://mastra.ai/blog/changelog-2026-02-26)
- [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [Flowcall 2026 SA rate card](https://www.flowcall.co/blog/whatsapp-business-api-pricing-2026)
- [Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [BANT alternatives in 2026 — SetSmart](https://setsmart.io/blog/bant-lead-qualification)
