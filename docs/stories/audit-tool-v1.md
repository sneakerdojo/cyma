# Audit Tool — User stories v1 (happy path)

**Source spec:** `docs/superpowers/specs/2026-05-12-audit-tool-claude-code.md`
**Iteration:** 1 of 5 — happy path: upload → audit → optional rebuild → preview.

---

## US-AT-001 — Visitor submits screenshots

**As a** website visitor curious about my site's conversion
**I want** to upload 1-6 screenshots through a simple form
**So that** I get an audit without installing or signing up

### Acceptance criteria

**Scenario: Visitor uploads valid screenshots**
- **Given** the visitor is on `octio.co.za/audit`
- **When** they drag-and-drop 3 PNG/JPG/WebP files (each <5MB)
- **And** enter their email + business name + website URL
- **Then** the form accepts the submission
- **And** the visitor sees a "Generating your audit..." progress UI

---

## US-AT-002 — AI-driven CRO audit returns within 60s

**As a** visitor who submitted screenshots
**I want** my audit report within ~60 seconds
**So that** I get instant value, not a "we'll email you tomorrow" experience

### Acceptance criteria

**Scenario: Audit completes within 60s p95**
- **Given** valid screenshots in the queue
- **When** the audit job processes
- **Then** the vision model (Gemini 2.5 Pro) generates a 7-axis CRO audit
- **And** the audit page renders within 60 seconds (p95) from submission
- **And** the visitor sees: overall score / 100, 7 axes scored 1-10, top-3 prioritised fixes

---

## US-AT-003 — Audit report is also emailed

**As a** visitor who saw the audit on screen
**I want** a copy in my email
**So that** I can refer back to it later

### Acceptance criteria

**Scenario: Email delivery after audit**
- **Given** the audit completed and the visitor's email was captured
- **When** the audit-result page renders
- **Then** an email is sent from `support@octio.co.za` within 60 seconds
- **And** the email subject is "Your Octio audit for [domain]"
- **And** the email body contains the full audit in readable HTML + Markdown attachment

---

## US-AT-004 — CTA: "Want us to rebuild this for you?"

**As a** visitor who just saw their audit
**I want** an obvious next step
**So that** I can experience the rebuild offering

### Acceptance criteria

**Scenario: Rebuild CTA appears on audit page**
- **Given** the audit page has rendered
- **When** the visitor scrolls to the bottom (or after 30 seconds)
- **Then** a CTA card appears: "Want us to rebuild this homepage in ~5 minutes? Free preview, no signup needed."
- **And** clicking the CTA confirms intent + starts the rebuild job

---

## US-AT-005 — Headless Claude Code rebuild executes

**As a** visitor who clicked rebuild
**I want** Octio to actually generate a working site, not just promise one
**So that** I see real AI output

### Acceptance criteria

**Scenario: Rebuild job runs to completion**
- **Given** the visitor clicked rebuild
- **When** the worker dispatches the job to a Cloudflare Sandbox
- **Then** the Claude Code agent (Sonnet 4.6, `--bare`, `permissionMode: 'acceptEdits'`, `maxTurns: 40`) runs the Astro-rebuild skill
- **And** writes a working Astro project to the sandbox workspace
- **And** completes within 5 minutes (p95)
- **And** returns a `total_cost_usd` per job

---

## US-AT-006 — Preview URL + repo download delivered

**As a** visitor whose rebuild completed
**I want** to see the result live AND download the code
**So that** I have something tangible

### Acceptance criteria

**Scenario: Rebuild artifacts delivered**
- **Given** the rebuild job completed successfully
- **When** the post-job hook fires
- **Then** the Astro project is built and deployed to a Cloudflare Pages preview URL (e.g. `audit-<id>.pages.dev`)
- **And** the project workspace is zipped and uploaded to R2
- **And** a signed URL for the zip is generated (TTL 7 days)
- **And** the visitor's audit page updates with both URLs

---

## US-AT-007 — CTA: "Want us to deploy this?"

**As a** visitor who likes their rebuild
**I want** a clear path to engage Octio
**So that** the funnel converts to a discovery call

### Acceptance criteria

**Scenario: Conversion CTA on preview**
- **Given** the visitor is viewing the rebuild preview
- **When** they scroll OR after 30 seconds
- **Then** a CTA appears: "Like what you see? Want us to deploy this on your domain? Book a 15-min call →"
- **And** clicking the CTA opens Octo (Lead Gen chat) with the audit + rebuild already in context

---

## Definition of done for v1

All 7 happy-path stories run end-to-end on `octio.co.za/audit`. Patient Zero: Octio audits + rebuilds its OWN site weekly for 2 weeks before any external launch.
