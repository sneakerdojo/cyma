# Voice Agent — User stories v4 (latency, cost, reliability)

**Source spec:** `docs/superpowers/specs/2026-05-12-voice-agent-superseded.md`
**Iteration:** 4 of 5 — voice's brutal physics: SA → cloud LLM is intercontinental. Sub-1s is impossible.

---

## v1 + v2 + v3 stories carried forward

US-VA-001 through US-VA-024 remain in scope.

---

## US-VA-025 — Mouth-to-ear latency p50 + p95

**As a** caller in conversation with the agent
**I want** turn-by-turn response to feel natural
**So that** the call doesn't feel like waiting for a fax

### Acceptance criteria

**Scenario: Latency distribution over 100 calls**
- **Given** at least 100 inbound calls in the past 7 days
- **When** measuring `m2e_latency_ms` (mouth-to-ear; from end-of-caller-speech to start-of-agent-audio)
- **Then** p50 ≤ 1,400ms (target band 1.2–1.5s)
- **And** p95 ≤ 2,000ms (target band 1.8–2.0s)
- **And** p99 ≤ 3,000ms
- **And** dashboard alerts on p95 > 2,500ms for 15 minutes

**Scenario: Latency budget by component**
- **Given** instrumentation traces every call segment
- **When** the breakdown is rendered
- **Then** components match the spec's published budget:
  - Twilio inbound SA→IE1: ≤ 400ms
  - Deepgram Nova-3 streaming: ≤ 300ms
  - Flux eager-EOT: ≤ 250ms
  - Haiku 4.5 EU TTFT: ≤ 350ms
  - Cartesia Sonic-3 TTFB: ≤ 180ms
  - Outbound media to caller: ≤ 300ms

---

## US-VA-026 — Pickup latency p99

**As a** caller dialling the number
**I want** the phone to be picked up within the first ring
**So that** I never wonder if the call connected

### Acceptance criteria

**Scenario: Pickup time across 500+ recent calls**
- **Given** 500 inbound calls in the past 7 days
- **When** measuring `ring_to_greet_ms`
- **Then** p50 ≤ 800ms
- **And** p99 ≤ 2,000ms

---

## US-VA-027 — Per-tenant minute budget + cost circuit-breaker

**As a** founder
**I want** each tenant to have a configurable monthly minutes budget
**So that** a runaway customer doesn't blow margin

### Acceptance criteria

**Scenario: Tenant approaches budget**
- **Given** Tenant A's monthly budget is 1,000 minutes
- **And** they have used 800 minutes
- **When** the next call comes in
- **Then** the call is accepted normally
- **And** an alert fires to the founder: "Tenant A at 80%"

**Scenario: Tenant exhausts budget**
- **Given** Tenant A's monthly budget is 1,000 minutes
- **And** they have used 1,000 minutes
- **When** the next call comes in
- **Then** the agent answers with a polite message and offers a callback OR routes directly to the founder
- **And** logs `over_budget = true`

---

## US-VA-028 — Streaming throughout (no batch waits)

**As a** caller
**I want** the agent to start speaking as soon as it has a first clause
**So that** I never wait for the bot's full thought before hearing anything

### Acceptance criteria

**Scenario: Sentence-boundary TTS chunking**
- **Given** the LLM is generating a response
- **When** the first ~10–15 tokens form a complete clause
- **Then** TTS streaming begins immediately on those tokens
- **And** total mouth-to-ear is bounded by `max(STT, LLM-first-clause, TTS-first-chunk)` not their sum

---

## US-VA-029 — Speculative tool calling + filler speech

**As a** caller waiting for an availability lookup
**I want** the bot to acknowledge it's checking
**So that** I don't think the call dropped

### Acceptance criteria

**Scenario: Calendar lookup expected to take 1–2s**
- **Given** the agent fires `lookup_availability`
- **When** the call starts
- **Then** in parallel with the tool call, TTS streams a filler: "Let me check what's open for you..."
- **And** when the tool returns, the agent transitions seamlessly into reading slots

---

## US-VA-030 — Concurrent calls per tenant

**As a** founder scaling
**I want** confidence that one tenant's spike doesn't degrade other tenants
**So that** SLAs hold

### Acceptance criteria

**Scenario: 20 concurrent calls on one tenant**
- **Given** Tenant A receives 20 simultaneous calls
- **When** all calls connect
- **Then** all are answered (none drop to voicemail)
- **And** p95 mouth-to-ear stays ≤ 2,500ms
- **And** no other tenant's p95 degrades

---

## US-VA-031 — Anthropic outage fallback (voice)

**As a** caller mid-conversation
**I want** the call to keep working if our primary LLM is down
**So that** I don't get cut off

### Acceptance criteria

**Scenario: Haiku 4.5 returns 503 for 30+ seconds**
- **Given** the LLM provider is having an outage
- **When** the agent tries to generate a response
- **Then** Retell's fallback config routes to Gemini 2.5 Flash within 1 turn
- **And** the call continues without the caller noticing (no apology required)
- **And** the call record tags `provider_failover = true`

**Scenario: Both providers down**
- **Given** Haiku + Gemini both return 503
- **When** the agent fires the second fallback
- **Then** the agent says "I'm having a connection issue — can I have someone call you back? What's your number?"
- **And** captures the number + escalates via Slack
- **And** the call ends cleanly

---

## US-VA-032 — Cost-per-call telemetry

**As a** founder reviewing unit economics
**I want** the cost per call tracked
**So that** I confirm margin

### Acceptance criteria

**Scenario: Cost report**
- **Given** the past 30 days of calls
- **When** the cost report renders
- **Then** it shows median, p75, p95 cost-per-call in ZAR
- **And** breaks down by component: Retell platform, Twilio inbound, Deepgram, ElevenLabs/Cartesia, LLM
- **And** the report flags any call costing > 3x the median for review

---

## US-VA-033 — Recording storage cost cap

**As a** founder
**I want** the per-tenant recording storage to be bounded
**So that** R2/S3 bills don't surprise

### Acceptance criteria

**Scenario: Tenant approaches storage limit**
- **Given** Tenant A's monthly recording storage cap is 5 GB
- **And** they are at 4 GB
- **When** the cap-monitoring cron runs
- **Then** alerts fire to the founder and tenant
- **And** at 5 GB, oldest recordings start auto-deletion (FIFO) regardless of retention policy

---

## US-VA-034 — Latency degradation alerting

**As a** founder operating the system
**I want** to know within minutes if latency regresses
**So that** I fix it before customers notice

### Acceptance criteria

**Scenario: p95 alerts fire on regression**
- **Given** the dashboard tracks p95 mouth-to-ear in 5-minute buckets
- **When** p95 exceeds 2,500ms for 3 consecutive buckets
- **Then** a Slack alert fires
- **And** the alert names the regressed component (STT, LLM, TTS, network)
- **And** the alert links to the relevant traces for the 5 worst calls in that window

---

## Definition of done for v4

All 34 stories pass. Latency SLOs measured over a 7-day Patient Zero. Cost-per-call tracked and within budget. Fallback paths tested by chaos-engineering a manual provider blackout.
