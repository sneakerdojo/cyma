# Lead Gen — User stories v4 (performance, latency, cost)

**Source spec:** `docs/superpowers/specs/2026-05-12-lead-gen-superseded.md`
**Iteration:** 4 of 5 — adds performance SLAs, latency budgets, cost guardrails. Cumulative.

---

## v1 + v2 + v3 stories carried forward

US-LG-001 through US-LG-024 remain in scope. v4 adds performance + cost criteria that constrain HOW any prior story is implemented.

---

## US-LG-025 — Bot response latency p50 / p95

**As a** website visitor in conversation
**I want** the bot to reply within ~2 seconds
**So that** the conversation feels alive, not broken

### Acceptance criteria

**Scenario: Bot-response timing distribution under normal load**
- **Given** at least 100 sessions over the last 24h
- **When** measuring `bot_first_token_ms` (from inbound visitor message to first token of bot reply)
- **Then** p50 ≤ 1,500ms
- **And** p95 ≤ 2,500ms
- **And** p99 ≤ 4,000ms
- **And** the dashboard alerts if p95 > 3,000ms for 15 minutes

**Scenario: Bot-response timing under simulated load (CI gate)**
- **Given** a Vitest load harness running 50 concurrent sessions on a staging worker
- **When** the harness completes
- **Then** p95 ≤ 3,000ms (with allowance for staging being slower than prod)

**Scenario: Bot-response timing during cold-start**
- **Given** the worker has been idle for 5+ minutes
- **When** a new session arrives
- **Then** the first message round-trip is ≤ 5,000ms (cold-start tax acknowledged)
- **And** subsequent messages in the same session match the steady-state SLA

---

## US-LG-026 — WhatsApp handoff round-trip ≤ 10s

**As a** visitor who shared a WhatsApp number
**I want** the WhatsApp message to arrive within 10 seconds
**So that** the handoff feels seamless

### Acceptance criteria

**Scenario: Meta Cloud API latency**
- **Given** the bot called `send_whatsapp` after qualification
- **When** measuring `whatsapp_delivery_ms` (from worker call to Meta-confirmed delivery webhook)
- **Then** p95 ≤ 10,000ms (10 seconds)
- **And** if Meta returns >5,000ms for any single call, the worker logs `slow_whatsapp_delivery` with the breakdown

---

## US-LG-027 — Per-tenant LLM token budget

**As a** founder operating the system
**I want** each tenant to have a configurable monthly LLM token budget
**So that** a runaway session doesn't blow the cost model

### Acceptance criteria

**Scenario: Tenant has consumed 80% of monthly budget**
- **Given** Tenant A's budget is 5M tokens/month
- **And** they have consumed 4M tokens this month
- **When** the next message arrives
- **Then** the worker continues to serve it normally
- **And** an alert fires to the founder's Slack: "Tenant A at 80% LLM budget"

**Scenario: Tenant has consumed 100% of monthly budget**
- **Given** Tenant A's budget is 5M tokens/month
- **And** they have consumed 5M tokens
- **When** the next message arrives
- **Then** the worker switches to a degraded mode: shorter system prompt, smaller context window, Haiku-only (no Sonnet fallback)
- **And** the founder receives a Slack alert: "Tenant A budget exhausted; in degraded mode"
- **And** if usage exceeds 120%, the worker returns a static message + auto-pauses new sessions for that tenant

---

## US-LG-028 — Model routing decisions log

**As a** founder reviewing cost reports
**I want** every LLM call to record which model was chosen and why
**So that** I can verify the router is doing what it should

### Acceptance criteria

**Scenario: Every LLM call writes a routing-decision record**
- **Given** the bot processes a message
- **When** the model router selects a model
- **Then** a row is written to `llm_routing_log`: `(tenant_id, session_id, message_id, model, reason, input_tokens, output_tokens, cost_usd, latency_ms)`
- **And** the monthly cost report aggregates these for per-tenant + per-task-type breakdowns

**Scenario: Reason codes are stable**
- **Given** the router can choose between Haiku 4.5 and Sonnet 4.6
- **When** routing decisions are logged
- **Then** the `reason` is one of a closed set: `greeting`, `classifier`, `qualify`, `book`, `escalate`, `fallback`, `budget_degraded`
- **And** unit tests verify all router branches map to documented reasons

---

## US-LG-029 — Hallucination rate gate

**As a** founder running Patient Zero
**I want** to measure hallucination rate from a weekly sample
**So that** I catch quality regressions before they hit customers

### Acceptance criteria

**Scenario: Weekly hallucination review (manual)**
- **Given** 50 sessions randomly sampled from the prior week
- **When** the founder reviews each
- **Then** zero session contains a hallucinated pricing / service-area / hours / capability claim
- **And** if any session contains a hallucination, the prompt + retrieval + tool config is changed before the next week's review

**Scenario: Automated hallucination signal (best-effort)**
- **Given** a deterministic facts list per tenant (configured: pricing, hours, service area, services offered)
- **When** the bot's responses are post-processed
- **Then** any response that contradicts the deterministic facts is flagged
- **And** the flag rate is part of the weekly review

---

## US-LG-030 — Concurrent sessions per worker instance

**As a** founder scaling toward 30 customers
**I want** confidence in worker concurrency
**So that** load doesn't degrade response time

### Acceptance criteria

**Scenario: 100 concurrent sessions on one worker instance**
- **Given** a staging worker
- **When** 100 simulated sessions each send a message simultaneously
- **Then** p95 response time stays under 4,000ms
- **And** zero sessions are dropped (no 503s)
- **And** memory usage stays under 80% of allocated

**Scenario: 500 concurrent sessions (autoscaling kicks in)**
- **Given** Cloudflare Worker / Hetzner autoscaler config
- **When** 500 concurrent sessions arrive
- **Then** additional worker instances spin up within 30 seconds
- **And** no message is dropped during the scale event

---

## US-LG-031 — Calendar query caching (with sane invalidation)

**As a** visitor offered booking slots
**I want** the slots to be accurate and fresh
**So that** the slot I pick is actually available

### Acceptance criteria

**Scenario: Slot offer uses fresh availability**
- **Given** the visitor reaches the booking step
- **When** the bot calls `lookup_availability`
- **Then** the worker queries Google Calendar Free/Busy with a max-stale of 30 seconds
- **And** the response is cached for at most 30 seconds per tenant calendar
- **And** the `book_appointment` call always re-validates (no stale-cache booking)

---

## US-LG-032 — Cost per conversation telemetry

**As a** founder reviewing unit economics
**I want** the cost per completed conversation (greeting → booking) tracked
**So that** I can confirm the spec's margin math holds

### Acceptance criteria

**Scenario: Aggregate cost-per-conversation report**
- **Given** the past 30 days of sessions
- **When** the cost dashboard renders
- **Then** it shows the median, p75, p95 cost-per-conversation in USD and ZAR
- **And** a separate report shows cost-per-booked-call
- **And** the report flags any conversation that cost more than 3x the median (outlier review)

---

## US-LG-033 — Session timeout and resource cleanup

**As a** founder operating the system
**I want** abandoned sessions to release their resources
**So that** memory, DB connections, and LLM cache entries don't leak

### Acceptance criteria

**Scenario: Session idle 15 minutes is closed**
- **Given** a session with no inbound message in 15 minutes
- **When** the idle-sweeper cron runs (every 60s)
- **Then** the session is marked `status = closed_idle`
- **And** any in-flight tool calls for that session are cancelled
- **And** the LLM context cache for that session is evicted

**Scenario: Session resources are freed on close**
- **Given** a closed session
- **When** the next memory snapshot runs
- **Then** the session's WS connection (if any) is closed
- **And** the session's row count in `active_sessions` decrements

---

## US-LG-034 — Graceful degradation when Anthropic is down

**As a** visitor in conversation
**I want** the bot to acknowledge service issues gracefully
**So that** I don't think I broke something

### Acceptance criteria

**Scenario: Anthropic API returns 503 for 30+ seconds**
- **Given** the LLM provider is having an outage
- **When** the bot tries to respond
- **Then** the bot attempts a fallback: Gemini 2.5 Flash OR Llama 3.3 70B on Groq
- **And** if BOTH fallbacks fail, the bot responds with a static message: "I'm having a moment — can I get your WhatsApp and have [Customer] reach out?"
- **And** the session is tagged `degraded = true` and flagged for human follow-up

---

---

## Profile-system performance stories (see `docs/superpowers/specs/2026-05-13-profile-system.md`)

## US-LG-045 — Profile lookup latency cap

**As a** visitor expecting fast first-message response
**I want** profile lookup to NOT add perceptible latency
**So that** profile recognition doesn't slow down the chat

### Acceptance criteria

**Scenario: profile.lookup p95 ≤ 100ms**
- **Given** a chat session is starting
- **When** `profile.lookup(tenantId, identity)` is called
- **Then** p50 ≤ 50ms; p95 ≤ 100ms; p99 ≤ 250ms
- **And** the lookup runs in parallel with the greeting render (not in series)
- **And** if lookup hasn't returned by greeting-render time, the bot falls back to generic greeting + personalises on next turn (graceful degrade)

**Scenario: Postgres + pgvector under load**
- **Given** 100 concurrent profile lookups
- **When** the load test runs
- **Then** p95 stays ≤ 100ms
- **And** pgvector index hit rate remains > 95%

---

## US-LG-046 — Profile summary token-cost cap

**As a** founder managing LLM cost
**I want** profile context bounded in size
**So that** profile recognition doesn't bloat per-message token cost

### Acceptance criteria

**Scenario: Profile summary ≤ 300 tokens**
- **Given** any profile in the system
- **When** the nightly summary job runs
- **Then** the generated `profile.summary` is ≤ 300 tokens
- **And** the truncation point (if reached) is logged for tuning
- **And** the summary preserves the highest-confidence facts first (preferences > identity > history > off_topic)

**Scenario: Per-session profile overhead < R0.02**
- **Given** a chat session is started with profile context loaded
- **When** measuring the marginal token cost vs no-profile baseline
- **Then** the incremental cost is < $0.001 per session (≤ ~R0.02)
- **And** the cost-report dashboard shows profile overhead as a separate line item

---

## What we deliberately still leave for v5

- Concrete Vitest unit test signatures (.spec.ts file stubs)
- Concrete Playwright E2E test signatures
- Test data fixtures
- Mock helpers
- Coverage gates in CI

## Definition of "done" for v4

All 36 stories (34 original + 2 profile-performance) pass with performance SLAs measured. Cost-per-conversation tracked. Founder has reviewed weekly hallucination samples for 4 consecutive weeks with zero critical findings. Load test at 100 concurrent sessions passes. Profile-system per-tenant isolation verified by red-team test. Ready for v5: turn these into runnable failing tests.
