# Audit Tool — User stories v2 (edge cases + error paths)

**Source spec:** `docs/superpowers/specs/2026-05-12-audit-tool-claude-code.md`
**Iteration:** 2 of 5 — failure paths for vision + Claude Code rebuilds.

---

## v1 stories carried forward

US-AT-001 through US-AT-007 remain in scope.

---

## US-AT-008 — Non-website screenshots / gaming the tool

**As a** founder operating the system
**I want** the tool to reject non-website submissions gracefully
**So that** we don't waste tokens auditing random images

### Acceptance criteria

**Scenario: Visitor uploads photos of a cat / sunset / spreadsheet**
- **Given** the visitor submits 3 screenshots
- **When** the first stage (cheap classifier on Haiku 4.5) examines them
- **And** classifies them as `not_website` with confidence > 0.8
- **Then** the audit job rejects with a friendly message: "These don't look like website screenshots — try again?"
- **And** the email is still captured (so we know who tried)
- **And** no expensive vision call is made

---

## US-AT-009 — Audit job fails partway through

**As a** visitor whose audit job errored
**I want** to not be left wondering
**So that** I'm not stuck on a loading spinner forever

### Acceptance criteria

**Scenario: Vision model returns 5xx mid-job**
- **Given** Gemini 2.5 Pro returns 500 during audit generation
- **When** the worker exhausts 2 retries (with backoff)
- **Then** the audit page shows: "Something went wrong on our side — we'll email your audit within an hour"
- **And** the job is queued for the founder to manually re-run
- **And** the visitor's email is logged for retry follow-through

**Scenario: Audit job times out (>120s)**
- **Given** an audit job is taking longer than 120 seconds
- **When** the timeout monitor fires
- **Then** the worker cancels the job
- **And** posts a Slack alert to the founder
- **And** the visitor sees the same fallback message

---

## US-AT-010 — Rebuild job fails partway through

**As a** visitor whose rebuild errored
**I want** to still get the audit, even if the rebuild didn't finish
**So that** I get value

### Acceptance criteria

**Scenario: Sandbox provisioning fails**
- **Given** the rebuild dispatch tried to provision a Cloudflare Sandbox
- **When** provisioning fails (rate limit, quota, transient error)
- **Then** the audit page shows: "Our rebuild oven is busy — we'll email your rebuild within an hour"
- **And** the job is queued for retry
- **And** the visitor's audit (already complete) stays usable

**Scenario: Claude Code agent runs over `maxTurns`**
- **Given** the agent has run 40 turns without completing
- **When** the `maxTurns` cap triggers
- **Then** the worker fails the job
- **And** logs `outcome = max_turns_exceeded`
- **And** alerts the founder for prompt/skill review
- **And** the visitor sees the same fallback

**Scenario: Sonnet returns rate-limit (429)**
- **Given** the worker's API key has exceeded its tier RPM
- **When** Sonnet returns 429
- **Then** the worker exponentially backs off + retries up to 3 times
- **And** if still failing, queues the job for after the rate-limit window
- **And** alerts ops if 429s exceed 10% of jobs for any 5-minute window

---

## US-AT-011 — Rebuilt site has broken markup

**As a** business owner running Patient Zero
**I want** rebuilds with malformed output flagged automatically
**So that** I don't deliver broken sites to visitors

### Acceptance criteria

**Scenario: Output Astro project doesn't build**
- **Given** the agent wrote files to the sandbox
- **When** the post-process step runs `astro build`
- **Then** if the build fails, the job is marked `outcome = build_failed`
- **And** no preview URL is published
- **And** the visitor gets the "we'll email within an hour" path
- **And** the build failure logs are surfaced to ops for prompt iteration

**Scenario: Output passes build but has 0 visible content (blank page)**
- **Given** `astro build` succeeded
- **When** the post-build smoke test fetches the homepage
- **And** the rendered HTML has < 200 chars of visible text
- **Then** the job is marked `outcome = blank_output`
- **And** the same fallback path applies

---

## US-AT-012 — Visitor uploads adult / disallowed content

**As a** business owner operating the system
**I want** to never process disallowed content
**So that** we stay aligned with provider AUPs and our own ethics

### Acceptance criteria

**Scenario: Adult / explicit content detected**
- **Given** the cheap classifier examines the screenshots
- **When** Haiku classifies them as `adult_content` with confidence > 0.7
- **Then** the audit is rejected: "We can't audit that — try a public homepage."
- **And** the submission is logged with `flag = disallowed_content`
- **And** the email is NOT captured (don't store adult-content submitter info)

**Scenario: Suspected illegal content**
- **Given** screenshots contain content the classifier tags `illegal_or_extremist`
- **When** detected
- **Then** the audit is silently rejected (no helpful error message back to attacker)
- **And** the founder is alerted out-of-band

---

## US-AT-013 — Visitor tries to upload massive files

**As a** founder protecting the system
**I want** strict size + file-count limits
**So that** we don't burn R2 storage or vision token budget

### Acceptance criteria

**Scenario: Single file >5MB**
- **Given** the visitor drops a 12MB file
- **When** the form validates
- **Then** the upload is rejected client-side with "Max 5MB per image"
- **And** the worker enforces the same limit server-side (defence in depth)

**Scenario: More than 6 files**
- **Given** the visitor selects 8 files
- **When** the form validates
- **Then** only the first 6 are accepted
- **And** a message clarifies "Max 6 screenshots — keep it focused"

**Scenario: Non-image MIME**
- **Given** the visitor drags a PDF
- **When** the form validates
- **Then** the upload is rejected with "Images only (PNG, JPG, WebP)"

---

## US-AT-014 — Rate limiting + abuse protection

**As a** founder protecting LLM costs
**I want** the audit endpoint protected against scraping / abuse
**So that** the bill stays predictable

### Acceptance criteria

**Scenario: 3 audits per email per 24h**
- **Given** an email has already triggered 3 audits in the past 24 hours
- **When** they submit a 4th
- **Then** the worker rejects with "You've hit your daily limit — try again tomorrow"
- **And** the cap can be raised manually by an operator

**Scenario: 1 rebuild per email per 24h**
- **Given** an email has triggered 1 rebuild in the past 24 hours
- **When** they request a 2nd
- **Then** the worker rejects with "Rebuild limit reached"

**Scenario: Per-domain rate limit on rebuild**
- **Given** the visitor's `website` URL has triggered 3 rebuilds in 7 days (from any email)
- **When** they request another
- **Then** the worker rejects to prevent same-domain abuse

---

## US-AT-015 — Email validation + bounce

**As a** founder
**I want** to not waste sends on fake or unreachable emails
**So that** we keep our sender reputation

### Acceptance criteria

**Scenario: Email is malformed**
- **Given** the visitor enters "notanemail"
- **When** the form submits
- **Then** the input is rejected client + server side

**Scenario: Email bounces post-send**
- **Given** the audit was sent
- **When** Gmail bounce webhook fires
- **Then** the email is flagged in the lead record
- **And** the bounce signals "fake email" or "do not retry" in the lead disposition

---

## US-AT-016 — Multiple audits for the same domain

**As a** repeat visitor running monthly audits on their site
**I want** the tool to handle me as a returning user
**So that** I don't have to re-enter everything

### Acceptance criteria

**Scenario: Same email + same domain, 30 days later**
- **Given** a returning email + same `website` URL
- **When** the form is filled
- **Then** the form pre-fills business name + brand voice from the prior submission
- **And** the audit report includes a "what changed since [date]" section (when prior audit exists)

---

## US-AT-017 — Rebuild preview is intentionally non-permanent

**As a** founder
**I want** preview URLs to be temporary
**So that** old previews don't accumulate forever on Cloudflare Pages

### Acceptance criteria

**Scenario: Preview URL TTL**
- **Given** a rebuild preview was deployed
- **When** 14 days pass
- **Then** the Cloudflare Pages project is deleted
- **And** the preview URL returns 404
- **And** the database `expired_at` flag is set
- **And** the visitor's audit page still works (audit report doesn't depend on preview)

---

## US-AT-018 — Cost circuit-breaker

**As a** founder
**I want** the rebuild path to auto-pause if monthly cost exceeds R10k
**So that** runaway usage is contained

### Acceptance criteria

**Scenario: Monthly rebuild spend exceeds R10,000**
- **Given** the running cost log
- **When** the daily cost cron sums month-to-date `total_cost_usd` × ZAR-to-USD and exceeds R10,000
- **Then** new rebuild jobs are GATED (queued, not dispatched)
- **And** founder alert fires
- **And** founder can either raise the cap, manually approve specific queued jobs, or let them expire

---

## Definition of done for v2

All 18 stories pass. Cost circuit-breaker verified in staging. Rebuild quality gate at 6/10 in founder review enforced.
