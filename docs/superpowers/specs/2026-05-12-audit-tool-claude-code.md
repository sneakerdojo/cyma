# Audit Tool with Claude Code rebuild — Spec v2

**Status:** Active. Supersedes `2026-05-12-website-audit-tool-design.md`.
**Last verified:** 2026-05-12 via 8-agent research pass (Claude Code headless agent included).
**Patient Zero:** Octio audits `octio.co.za` weekly; rebuild is dogfooded on Octio's own site updates first.

## What's changing vs v1

The original spec output an "AI Studio prompt" the visitor copy-pasted into HighLevel/Lovable to rebuild their site themselves. This version replaces that with a **server-side headless Claude Code agent that generates a working Astro site rebuild on Octio infrastructure** — delivered as a preview URL + downloadable repo. The visitor never installs anything.

This is a strictly better wedge:
- Visitor experiences real AI capability (not "go run this elsewhere")
- The output is a working site, not a prompt
- Captures intent to convert (preview-URL view → "Want us to deploy this?" → Lead Gen)
- Demonstrates Octio's craft

## Goal

A 3-stage funnel:

1. **Audit (free, ~60 seconds)** — visitor uploads 1–6 screenshots, email-gated → CRO audit (7-axis score + specific findings) returned immediately.
2. **Rebuild (free, ~3–5 minutes)** — optional CTA: "Want us to rebuild this in 5 minutes?" → headless Claude Code generates a working Astro/React site → preview URL + downloadable repo.
3. **Convert** — visitor sees their rebuilt site → CTA: "Want us to deploy this for you? Book a call" → Lead Gen funnel.

Patient Zero metrics: audit submission rate, audit→rebuild conversion %, rebuild→discovery-call conversion %, rebuild cost per visitor, rebuild quality (founder review of 10/week).

## The critical ToS gate

**Routing visitor traffic through your Max/Pro OAuth subscription is an instant ban risk** ([Anthropic legal](https://code.claude.com/docs/en/legal-and-compliance)): "OAuth authentication... designed to support ordinary use of Claude Code. Anthropic does not permit third-party developers to offer Claude.ai login or to route requests through Free, Pro, or Max plan credentials on behalf of their users."

**Mandatory:** A dedicated `ANTHROPIC_API_KEY` (Console or Bedrock) under Commercial Terms powers the rebuild path. Founder's Max subscription is **only** legal for the CEO PA use case (ordinary individual use). This isn't optional — it's the line between "running a business" and "violating ToS."

## Architecture

```
                  ┌────────────────────┐
                  │ Visitor browser    │
                  │  octio.co.za/audit │
                  └────────┬───────────┘
                           │
                  ┌────────▼───────────┐
                  │ Cloudflare Worker  │
                  │  - email gate       │
                  │  - screenshot upload│
                  │  - queue dispatch   │
                  └────────┬───────────┘
                           │
       ┌───────────────────┼────────────────────┐
       ▼                   ▼                    ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Stage 1:     │  │ Stage 2:         │  │ Postgres + R2     │
│ Vision audit │  │ Claude Code      │  │ - audit results  │
│ (Sonnet 4.6  │  │ rebuild          │  │ - rebuild artif. │
│  vision OR   │  │ (ephemeral       │  │ - cost / token   │
│  Gemini 2.5  │  │  sandbox per job)│  │   accounting     │
│  Pro)        │  │                  │  └──────────────────┘
└──────┬───────┘  └────────┬─────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Audit report │  │ Astro rebuild   │
│ delivered    │  │ → CF Pages       │
│ via web + email│  preview URL +   │
│              │  │ R2 zip download  │
└──────────────┘  └──────────────────┘
```

### Stage 1 — Audit (vision model)

| Decision | Choice | Reason |
|---|---|---|
| Vision model | **Gemini 2.5 Pro** ($1.25/$10 per 1M) | Long context (200k+) for full-DOM analysis; best vision+reasoning per dollar. Sonnet 4.6 vision is fallback. |
| Audit axes (7) | Above-the-fold clarity, value-prop, CTA visibility, social proof, friction signals, mobile responsiveness, brand consistency | Adam Erhart-style framework, refined |
| Output format | Web UI + Markdown email + JSON for downstream | Web for immediate, email for retention |
| Cost per audit | ~$0.05–0.15 in Gemini token cost | At 1,000 audits/mo = ~$50–150 ≈ R820–2,470/mo |

### Stage 2 — Rebuild (Claude Code headless)

| Decision | Choice | Reason |
|---|---|---|
| Compute environment | **Cloudflare Sandboxes** (or Modal/E2B if CF Sandboxes don't yet support arbitrary Bash) | Octio is already on CF. Ephemeral per-job container. |
| Agent SDK | **`@anthropic-ai/claude-agent-sdk`** with `--bare` flag | Skips OAuth/keychain; reads only `ANTHROPIC_API_KEY`. Purpose-built for headless. |
| Model for rebuild | **Sonnet 4.6** (not Opus) | $3/$15 vs $5/$25. Opus's quality lift not worth 67% cost increase for site rebuild. Re-evaluate per-job if Sonnet fails consistently. |
| Permission mode | `acceptEdits` with restricted allowedTools (Read, Edit, Write, Bash(`npm *`, `astro *`)) | No `--dangerously-skip-permissions` outside sandbox. |
| Turn cap | `maxTurns: 40` | Hard cap. Runaway loops on ambiguous screenshots eat tokens. |
| Skill loaded | "Astro rebuild" skill (custom; packaged once, reused per job) | Anthropic's screenshot-to-code skill is reference. |
| Cost per rebuild | **$3–$15 per job on Sonnet** before prompt-cache savings (~90% cut on repeat input via skill+system caching) | At 15 rebuilds/day (50 audits × 30% convert) = $50–225/day worst case, $5–22/day with caching |
| Output | (a) Astro repo zip → R2 + signed download URL; (b) Preview deploy to Cloudflare Pages → live URL | Both delivered to visitor |
| Cost accounting | `--output-format json` → `total_cost_usd` per job stored in Postgres | Per-job billing visibility |
| Rate limits | API-key tier-based; request Tier 2+ pre-launch | At 15 rebuilds/day, each ~200k–800k tokens, well within Tier 2 |

### Anti-patterns explicitly avoided

| Anti-pattern | Why it's banned |
|---|---|
| Routing visitor traffic through founder's OAuth | Instant ban. Use `ANTHROPIC_API_KEY` under Commercial Terms. |
| Running the agent on application server | Agent reads your secrets/code. Always isolate in sandbox. |
| Skipping `maxTurns` | Runaway loops eat tokens until rate-limited. |
| `--dangerously-skip-permissions` outside firewalled sandbox | Self-explanatory. |
| Pooling one API key across tenants without per-job cost tracking | Discover the bill after. Track `total_cost_usd` per job. |
| Forgetting `--bare` in CI | Will pick up whatever's in `~/.claude` on the host. |

## Cost model (verified May 2026)

At realistic volume:

| Volume tier | Audits/mo | Rebuilds/mo (30% of audits) | Marginal cost |
|---|---|---|---|
| Soft launch (month 1) | 100 | 30 | $50–500 |
| Steady state (month 3) | 500 | 150 | $250–2,500 |
| Scale (month 6) | 1,500 | 450 | $750–7,500 |

If prompt-cache hits 90% on repeat input (skill + system prompt + Astro starter), real cost is 30–40% of the gross above. Even worst-case, this is a sub-R150k/mo line item — defensible as marketing spend if the audit→customer conversion holds (target: 1% of audits → paying Lead Gen customer).

## User-facing flow

```
1. Visitor lands on /audit
2. Email + business name + website URL gate
3. Drag-and-drop screenshots (1-6 images, 5MB each)
4. "Generating your audit..." (Gemini 2.5 Pro vision; ~30–60 seconds)
5. Audit page displays:
   - Overall score / 100
   - 7-axis breakdown with specifics
   - Top 3 fixes prioritised
   - CTA: "Want us to rebuild this for you in ~5 minutes? Free preview, no signup."
6. If clicked:
   - "Rebuilding your homepage..." progress UI (~3–5 min)
   - Real-time stream of CC agent decisions (transparency builds trust)
   - On completion: side-by-side compare (their site vs rebuilt) + preview URL + repo download
7. CTA: "Like what you see? Want us to deploy this on your domain? Book a 15-min call →"
   → routes to Octo (Lead Gen chat) with pre-context from audit
```

## Build sequence (within the 7-day plan)

**Day 1 (audit half)**
- Hono worker route `/api/audit/submit` — multipart upload, email gate, queue dispatch
- Gemini 2.5 Pro vision call with 7-axis structured prompt
- Audit results page (React route)
- Email delivery via existing `support@octio.co.za` Gmail
- POPIA-compliant retention: 30 days screenshots, 90 days audit results, then auto-purge

**Day 2 (rebuild half — sandbox setup)**
- Cloudflare Sandbox configuration with `@anthropic-ai/claude-agent-sdk` installed
- Custom Astro-rebuild skill packaged + version-pinned in repo
- `ANTHROPIC_API_KEY` provisioned (separate from any other key — audit-tool-only)
- Cost accounting: per-job `total_cost_usd` → Postgres + dashboard
- Worst-case cost circuit-breaker: if monthly spend > R10k, gate new rebuilds behind manual approval

**Day 3 (rebuild half — execution + delivery)**
- Sandbox spin-up + Astro starter clone
- Stream agent decisions to visitor UI (Server-Sent Events)
- On completion: zip workspace → push to R2; deploy preview to Cloudflare Pages
- 24h preview URL TTL; repo download signed for 7 days

**Day 4 (Patient Zero validation)**
- Run audit + rebuild on `octio.co.za` itself
- Founder reviews output quality
- Tune skill if rebuild quality is poor

**Day 5–7 (other 7-day plan items continue in parallel)**

## Patient Zero metrics

| Metric | Target Phase A | Target Phase B | Target Phase C |
|---|---|---|---|
| Audit submission rate (visitor → audit run) | 5% | 10% | 15% |
| Audit completion rate (started → finished) | 80% | 90% | 95% |
| Audit → rebuild conversion (asked, said yes) | 20% | 30% | 40% |
| Rebuild quality (founder review, 0–10 scale) | 6+ | 7+ | 8+ |
| Rebuild → discovery-call conversion | 3% | 7% | 12% |
| Cost per audit | <R3 | <R2 | <R2 |
| Cost per rebuild | <R250 | <R150 | <R100 (with caching) |
| Audit-tool-driven paying customer / month | 1 | 3 | 8 |

**Hard gate:** rebuild quality < 6 in founder review = pause public rebuilds, fix the skill, re-evaluate.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Visitor uploads non-website screenshots (gaming the tool) | Gemini classifier first: if "not a website," reject gracefully + email gate still captures the lead |
| Hallucinated audit findings (claiming a button doesn't exist) | Structured prompt requires literal quotes from visible text; founder reviews 10/week for hallucination |
| Rebuild quality is bad (looks generic, doesn't capture brand) | Patient Zero gate: founder reviews 10 rebuilds/week; quality score < 6 pauses public flow |
| Visitor expects to OWN the rebuild without paying | Be explicit: free preview + free repo download. We deploy on their domain only for paying customers. |
| Cost explosion (someone runs 100 audits) | Rate limit: 3 audits / email / 24h; 1 rebuild / email / 24h. Per-domain rate-limit on rebuild. |
| Anthropic API rate limits | Request Tier 2+ pre-launch. Queue rebuilds; tell visitor "Estimated 5 min" honestly. |
| ToS violation (using OAuth instead of API key) | Code review checklist: no `claude` CLI invocation without `--bare` + explicit `ANTHROPIC_API_KEY` env. CI lint. |
| POPIA: screenshots may contain customer PII | Auto-delete screenshots after 30 days. DPA disclosure on email gate. No third-party sharing. |
| Sandbox escape (agent reads container secrets) | No secrets in container env beyond the API key. Read-only mount of skill. `permissionMode: 'acceptEdits'` not bypass. |
| Visitor's existing site has copyright / trademark | Disclaimer on rebuild: "This is an example rebuild for your evaluation only. Deploy on production requires your sign-off." |

## Compliance gates

| Gate | Check |
|---|---|
| Dedicated `ANTHROPIC_API_KEY` under Commercial Terms | Pre-launch |
| Tier 2+ API rate limit request submitted | Pre-launch |
| Cost circuit-breaker (R10k/mo cap) configured | Pre-launch |
| POPIA Information Officer documented for audit-tool data | Pre-launch |
| Screenshot retention policy enforced (30 days) | Auto-purge cron |
| Hallucination review (10 audits / week) | First 60 days |
| Rebuild quality review (10 / week) | First 60 days |

## How this connects to the rest of the portfolio

| Product | Connection |
|---|---|
| Lead Gen (Octo chat) | Audit → Rebuild → Octo chat: pre-context (audit findings + rebuild URL) loaded into Octo's system prompt. Visitor walks into a sales conversation already qualified. |
| Voice Agent | Visitor calls Octio's number after audit → voice agent has audit context (caller ID lookup) — "I see you ran an audit yesterday on [domain] — want to talk about that?" |
| Newsletter Engine | Audit completion → drip sequence (3 emails over 7 days): rebuild, case study, "ready to deploy?" |
| Agentic Web & App Development (service) | Rebuild output → "Want this deployed by Octio's senior team? R85k starter project" — service upsell path |

## Open questions

1. Should the rebuild support more than Astro (Next.js? Plain HTML? WordPress)? Hypothesis: no — one stack done well > three stacks done poorly. Astro is the right pick (static-first, good for service biz). Re-evaluate Phase 3.
2. Do we deliver the rebuild as a working preview only, or also a tutorial walkthrough (founder voiceover)? Hypothesis: preview-only Phase 1; tutorial Phase 2 if conversion rate < 5%.
3. Should we charge for "premium rebuild" (e.g., Opus + multi-page) at R250 one-off? Hypothesis: no, keep free Phase 1. The free preview IS the marketing.
4. Self-host the rebuild model (Qwen 3.5 32B or similar)? Hypothesis: no — Claude Code's tool integration + Skills system isn't replicable on open weights without months of work. The Anthropic API spend is acceptable marketing cost.

## Citations

- [Claude Code legal + ToS](https://code.claude.com/docs/en/legal-and-compliance)
- [Claude Code headless mode](https://code.claude.com/docs/en/headless)
- [Hosting the Agent SDK](https://code.claude.com/docs/en/agent-sdk/hosting)
- [Anthropic Q1 2026 update](https://www.mindstudio.ai/blog/claude-code-q1-2026-update-roundup)
- [Anthropic bans third-party subscription auth (The Register)](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/)
- [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Gemini 2.5 Pro pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Cloudflare Sandboxes (relevant container product)](https://developers.cloudflare.com/durable-objects/)
- [screenshot-to-code Claude Code skill](https://fastmcp.me/skills/details/109/screenshot-to-code)
- Original YouTube source for the audit-tool concept: [Adam Erhart `4S7BXgpIDGk`](https://www.youtube.com/watch?v=4S7BXgpIDGk)
