# Audit Tool — User stories v4 (performance, cost, quality)

**Source spec:** `docs/superpowers/specs/2026-05-12-audit-tool-claude-code.md`
**Iteration:** 4 of 5 — adds performance + cost guardrails + quality gates.

---

## v1 + v2 + v3 stories carried forward

US-AT-001 through US-AT-029 remain in scope.

---

## US-AT-030 — Audit p50 + p95 timing

**As a** visitor expecting a ~60s audit
**I want** consistent timing
**So that** I trust the "60 seconds" claim

### Acceptance criteria

**Scenario: Audit duration distribution**
- **Given** at least 100 audits in the past 30 days
- **When** measuring `audit_duration_ms`
- **Then** p50 ≤ 45,000ms (45 seconds)
- **And** p95 ≤ 75,000ms (75 seconds)
- **And** p99 ≤ 120,000ms (cancel anything over)

---

## US-AT-031 — Rebuild p50 + p95 timing

**As a** visitor expecting a ~5 minute rebuild
**I want** rebuilds to feel timely
**So that** I stay engaged on the loading page

### Acceptance criteria

**Scenario: Rebuild duration distribution**
- **Given** at least 50 rebuilds in the past 30 days
- **When** measuring `rebuild_duration_ms`
- **Then** p50 ≤ 240,000ms (4 minutes)
- **And** p95 ≤ 360,000ms (6 minutes)
- **And** anything > 600,000ms (10 minutes) is hard-killed by the sandbox lifecycle

---

## US-AT-032 — Prompt cache hit-rate

**As a** founder watching cost
**I want** the rebuild prompt's skill + system prompt cached
**So that** repeat input charges are cut ~90%

### Acceptance criteria

**Scenario: Cache hit rate across rebuild jobs**
- **Given** 100 rebuild jobs in the past 7 days
- **When** the prompt-cache report renders
- **Then** at least 80% of jobs report cache hits on the skill+system prompt
- **And** the median repeat-input-token-cost is ≤ 10% of the gross figure

---

## US-AT-033 — Per-day cost budget

**As a** founder
**I want** a daily Anthropic API budget cap
**So that** even one bad day doesn't drain the budget

### Acceptance criteria

**Scenario: Daily budget threshold**
- **Given** the audit-tool daily budget is R600 (~$36)
- **When** rolling 24-hour spend exceeds R600
- **Then** new rebuild jobs are queued, not dispatched
- **And** the audit-only path (no rebuild) continues normally
- **And** a Slack alert fires
- **And** budget resets at 00:00 SAST daily

---

## US-AT-034 — Rebuild quality gate (manual review)

**As a** business owner running Patient Zero
**I want** weekly quality review of rebuilds
**So that** the public rebuild output stays good

### Acceptance criteria

**Scenario: Weekly 10-rebuild review (founder)**
- **Given** the prior week's rebuilds
- **When** the founder reviews 10 random samples
- **Then** each is scored 0-10 on: visual fidelity, content accuracy, brand match, technical correctness (build succeeds + no Astro errors)
- **And** the weekly average must be ≥ 7
- **And** if the average drops below 6 for any week, public rebuilds are paused until the skill is iterated

---

## US-AT-035 — Latency alerting

**As a** founder operating the system
**I want** alerts when audit or rebuild p95 regresses
**So that** I catch slowdowns

### Acceptance criteria

**Scenario: Audit p95 regressed**
- **Given** the dashboard tracks audit p95 over rolling 15-min buckets
- **When** p95 exceeds 90 seconds for 3 consecutive buckets
- **Then** Slack alert fires
- **And** the alert links to the regressed batch

**Scenario: Rebuild p95 regressed**
- **Given** the dashboard tracks rebuild p95
- **When** p95 exceeds 7 minutes for 2 consecutive buckets
- **Then** Slack alert fires

---

## US-AT-036 — Concurrent rebuild capacity

**As a** founder scaling
**I want** the rebuild capacity to handle bursts
**So that** queueing doesn't spiral

### Acceptance criteria

**Scenario: 5 concurrent rebuilds dispatched**
- **Given** 5 rebuild jobs queued at once
- **When** the dispatcher fires
- **Then** all 5 sandboxes are provisioned within 30 seconds
- **And** all 5 complete normally (or fail individually with their own error path)
- **And** no two rebuilds interfere with each other's sandbox state

**Scenario: 20 concurrent rebuilds (capacity limit)**
- **Given** 20 rebuild jobs queued
- **When** the dispatcher fires
- **Then** the first 10 dispatch immediately (configurable concurrency cap)
- **And** the next 10 stay queued until slots free
- **And** the visitor UI shows "Position 5 in queue, estimated wait 10 min" honestly

---

## US-AT-037 — Cost per visitor / per booked-call

**As a** founder reviewing unit economics
**I want** to know what a paying customer costs through the audit funnel
**So that** the marketing ROI is real

### Acceptance criteria

**Scenario: Audit funnel cost report**
- **Given** 30 days of audit + rebuild + Lead Gen data
- **When** the funnel-cost report renders
- **Then** it shows:
  - Avg cost per audit (ZAR)
  - Avg cost per rebuild (ZAR)
  - Avg cost per discovery-call-booked-through-audit (ZAR)
  - Avg cost per paying-customer-acquired-through-audit (ZAR)
- **And** the report flags the funnel as profitable if `cost-per-acquired-customer < 30% of first-month MRR`

---

## US-AT-038 — Provider fallback (Gemini for vision)

**As a** founder running the system
**I want** vision-audit path resilience
**So that** a Gemini outage doesn't kill audits

### Acceptance criteria

**Scenario: Gemini 2.5 Pro vision returns 503 for 60+ seconds**
- **Given** the primary vision provider is down
- **When** the audit dispatcher fires
- **Then** the worker fails over to Claude Sonnet 4.6 vision (more expensive but works)
- **And** the failover is logged in the job record
- **And** the visitor sees no error (audit completes on the fallback)
- **And** a Slack alert fires for ops

---

## US-AT-039 — Rate-limit retry strategy for Anthropic 429

**As a** founder
**I want** 429s handled gracefully
**So that** rate-limit windows don't burn jobs

### Acceptance criteria

**Scenario: Anthropic returns 429 mid-job**
- **Given** the worker is mid-rebuild
- **When** Anthropic returns 429
- **Then** the worker reads the `Retry-After` header
- **And** exponentially backs off (jittered)
- **And** retries up to 3 times
- **And** if still failing, queues the job to retry after the rate-limit window
- **And** never silently fails the job

---

## US-AT-040 — Rebuild artifact size cap

**As a** founder
**I want** rebuilt project zips bounded in size
**So that** R2 storage doesn't explode

### Acceptance criteria

**Scenario: Project workspace exceeds 50MB**
- **Given** the agent's workspace post-job
- **When** post-process measures it
- **Then** if > 50MB, the worker fails the job (the agent over-generated)
- **And** alerts ops for skill review
- **And** the visitor sees the "we'll email within an hour" fallback

---

## Definition of done for v4

All 40 stories pass. Audit p95 ≤ 75s. Rebuild p95 ≤ 6 min. Quality average ≥ 7/10. Daily cost cap at R600 enforced. Fallback path verified.
