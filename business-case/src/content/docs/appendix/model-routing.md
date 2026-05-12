---
title: Cost-optimised model routing
description: Per-task model selection. Cheapest sufficient model — only pay for frontier capability where the quality gap is decisive.
---

> **Verified May 2026.** Pricing below is grounded in vendor docs as of 2026-05-12. Sources in [appendix/verification-status.md](./verification-status.md). Refresh quarterly.

## The principle

Don't pay Opus prices for Gemma work.

Octio's margin compounds when every task runs on the cheapest model that still passes the quality bar for that task. Frontier models (Opus 4.7, Gemini 2.5 Pro, GPT-5) earn their premium only where capability is decisive — coding, complex multi-step reasoning, vision-heavy analysis. Everything else routes to mid or budget tiers.

This is not a cost-cutting exercise; it's a portfolio decision. Spending R3 of margin to get R2 of quality lift is a bad trade. Spending R0.30 to get R2 of quality lift is the trade we want.

## Capability tiers (verified May 2026)

| Tier | Representative model | Input ($/1M) | Output ($/1M) | Speed | Use when |
|---|---|---|---|---|---|
| **Frontier** | Claude Opus 4.7 (released 16 Apr 2026) | $5.00 | $25.00 | Slow | Coding, novel multi-step reasoning |
| **Frontier (vision)** | Gemini 2.5 Pro | $1.25 | $10.00 | Medium | Vision-heavy audits, long-context analysis |
| **Workhorse** | Claude Sonnet 4.6 | $3.00 | $15.00 | Medium (~60-90 t/s) | Hard chat, content drafting, code review |
| **Workhorse (fast)** | Llama 3.3 70B on Groq | $0.59 | $0.79 | Very fast (250+ t/s) | Voice-agent reasoning, sub-1s chat |
| **Mid (cheap)** | Claude Haiku 4.5 | $1.00 | $5.00 | Fast | Templated drafts, light agents |
| **Mid (cheaper)** | Gemini 2.5 Flash | $0.30 | $2.50 | Very fast | Creative drafting, multimodal cheap |
| **Mid (alt)** | GPT-4o-mini | $0.15 | $0.60 | Fast | Cheap fallback if Anthropic outage |
| **Cheap classifier** | Gemma 3 4B via Together | ~$0.04 | ~$0.08 | Very fast | Intent classification, routing |
| **Cheap drafter** | Gemma 3 27B via Together | ~$0.08 | ~$0.16 | Fast | Bulk drafting, summarisation |
| **Self-host** | Gemma 3 27B on Hetzner GPU | $0 | $0 (~R3,500/mo box) | Variable | High-volume, POPIA-sovereign |
| **STT** | Deepgram Nova-3 streaming | $0.0077/min (PAYG) or $0.0065/min (Growth) | — | <300ms | Voice transcription |
| **TTS** | ElevenLabs Flash (API direct) | $0.05/1k chars | — | ~75ms TTFB | Voice agent output |
| **Voice** | Twilio Programmable Voice SA inbound | $0.010/min + $1.50–4/mo per number | — | — | SA phone numbers |

> Pricing as of May 2026. Note Opus 4.7's new tokenizer can inflate effective cost ~35%; budget accordingly when planning Opus workloads.

## Task-by-task routing

### AI Lead Gen (chat agent)

| Sub-task | Recommended | Rationale | Fallback |
|---|---|---|---|
| Greeting + small-talk | Gemma 3 27B (self-hosted on Hetzner) OR Haiku 4.5 | Latency matters more than depth here | Sonnet if Gemma quality slips |
| Qualification reasoning | Sonnet | Needs to follow multi-step logic and reference brand voice | Opus only if Sonnet hallucinates |
| Booking confirmation drafts | Haiku 4.5 OR Kimi K2 Turbo | Templated, low complexity | — |
| Tool routing (intent classifier) | Gemma 3 12B or smaller | Pure classification | Haiku |

**Why not Opus end-to-end:** chat agents need <2s response time. Opus is the slowest tier and the marginal quality lift is invisible to a plumber chatting at midnight.

### Voice & Chat Agents (voice reasoning)

| Sub-task | Recommended | Rationale |
|---|---|---|
| STT (transcription) | Deepgram Nova-2 | Sub-200ms streaming; SA accents acceptable. Alternative: Whisper Large self-hosted if Deepgram fails on local accents |
| Turn reasoning | Sonnet (with prompt-cached system prompt to cut 90% of token cost) | Voice needs sub-1s; Sonnet hits this; cheaper models break on multi-turn voice |
| TTS | ElevenLabs Flash | Sub-300ms with natural prosody. Alternative: Cartesia Sonic if Eleven costs spike |
| Escalation classifier | Kimi K2 Turbo | "Should this go to a human?" is a one-shot question |

**Why not Gemma here:** voice cannot tolerate hallucination. Booking the wrong time is a critical incident.

### AI Social Media Manager (drafter)

| Sub-task | Recommended | Rationale |
|---|---|---|
| Weekly strategy (next-week plan) | Sonnet | Low frequency (1/week), high stakes for tone |
| Per-post drafting | Kimi K2 Turbo OR Gemini Flash | Templated, brand-voice-driven; the brand-voice JSON does most of the work |
| Image concept generation (Phase 2) | Gemini Flash | Multimodal at the right price |
| Engagement / reply suggestions (Phase 2) | Haiku 4.5 | Short, fast |

**Why not Opus:** social posts have a quality ceiling at the medium tier — going frontier doesn't make a LinkedIn post measurably better, but doubles cost-per-post.

### The Newsletter Engine

| Sub-task | Recommended | Rationale |
|---|---|---|
| Source curation (URL fetch + summary) | Firecrawl + Kimi K2 Turbo | Cheap structured extraction |
| Issue assembly (multi-section draft) | Sonnet | Long-form coherence matters here; weekly cadence makes cost manageable |
| Subject-line A/B generation (Phase 3) | Haiku 4.5 | Throwaway candidates |
| Engagement classifier (which links converted) | Gemma 3 (self-host) | Reads tracking events, simple binary |

### Website Audit Tool (vision + reasoning)

| Sub-task | Recommended | Rationale |
|---|---|---|
| Screenshot OCR + layout extraction | Claude Sonnet (vision) or Gemini 2.5 Pro (vision) | Frontier vision quality is decisive here — bad audit = lost lead |
| Audit reasoning (CRO scoring across 7 axes) | Sonnet | Structured reasoning |
| AI Studio rebuild prompt generation | Kimi K2 Turbo OR Haiku | Templated; brand-voice-driven |

**The one place we pay frontier:** audit quality is the top-of-funnel weapon. A bad audit kills the entire conversion path. Spending an extra R1.50 per audit to get visibly-better output pays for itself in conversion lift.

### Agentic CEO PA (Phase 2)

| Sub-task | Recommended | Rationale |
|---|---|---|
| Email triage classifier (priority labels) | Gemma 3 self-host or Haiku | Volume is high; classifier task |
| Reply drafts | Sonnet | Tone matters; founder approval gate means quality > speed |
| Calendar conflict detection | Gemma or rule-based code | Trivial logic — no LLM needed for most cases |
| Daily brief assembly | Sonnet | Synthesis across multiple data sources |
| Meeting prep (deep context pull) | Sonnet → Opus if context is genuinely complex | Frontier-tier escalation justified for high-value meetings only |

### Internal coding (founder + future engineer)

| Sub-task | Recommended | Rationale |
|---|---|---|
| New feature implementation | Opus 4.7 | The one place frontier pays back unambiguously — coding quality compounds into product velocity and reduces customer-visible bugs |
| Bug fixes | Sonnet | Usually well-scoped; Sonnet sufficient |
| Code review | Opus 4.7 | Same as implementation — quality matters |
| Documentation drafting | Haiku 4.5 | Throwaway-style first draft |

**This is the user's stated philosophy in action:** Gemma is "good enough for agentic workflows but not good enough to code like Opus 4.7." We apply that asymmetrically — Opus for code, cheaper tiers everywhere else.

## Self-hosted Gemma economics

Self-hosting Gemma 3 27B on a Hetzner GPU box (e.g., RTX 4090-equivalent, ~R3,500/month) gives:

- **Throughput:** ~60 tokens/second at fp16
- **Effective cost at 1M tokens/day usage:** ~R0.12 per 1M tokens (electricity + amortised GPU)
- **Break-even vs Kimi K2 Turbo:** ~4M output tokens/day
- **Privacy benefit:** data never leaves SA infrastructure (POPIA-friendly story)

**When to flip to self-host:**

| Trigger | Action |
|---|---|
| Customer count > 50 AND high-volume classifier work | Stand up Gemma box |
| BYOK tier requests > 5 | Offer self-host Gemma as a privacy option |
| Vendor pricing rises > 2x | Migrate classifier workload first |

Until then, vendor API is cheaper and operationally simpler.

## Routing implementation

In code, this is a thin wrapper in the worker:

```typescript
// pseudocode — actual implementation lives in worker/src/services/model-router.ts
const modelFor = (task: TaskKind): ModelChoice => {
  switch (task) {
    case 'chat-greeting': return cheap('gemma-3-27b');
    case 'chat-qualify': return mid('claude-sonnet');
    case 'voice-reason': return mid('claude-sonnet', { cache: true });
    case 'audit-vision': return frontier('claude-sonnet-vision');
    case 'classifier':   return cheap('kimi-k2-turbo');
    case 'code':         return frontier('claude-opus-4-7');
    // ...
  }
};
```

Per-tenant overrides allow BYOK customers to pin specific models. Per-task overrides allow A/B testing newer models against incumbents without code changes.

## The "ladder up" rule

If a cheap model fails quality on a specific tenant or task pattern, the router promotes one tier — not all the way to frontier. Example:

- Customer's plumbing-firm chat: Gemma works for 95% of greetings
- Edge case: customer asks an esoteric "what's the chemical name for the pipe paste" question
- Cheap model hallucinates; ladder up to Sonnet
- If Sonnet ALSO struggles consistently, only THEN consider Opus

This prevents the "Opus everywhere just to be safe" anti-pattern.

## Quarterly model-roster review

Every quarter we re-evaluate:

1. Is the cheap-tier model still hitting quality?
2. Did anyone release a new model that obsoletes our current choice?
3. Did vendor pricing change enough to flip our build-vs-buy on Gemma self-host?
4. Are any tasks consistently failing one tier and silently escalating?

Output: an updated `model-router.ts` config + this appendix file.

## What this saves

Rough envelope at 100 customers, mix of chat + voice + content + audit:

| Scenario | Monthly API spend |
|---|---|
| Opus for everything (the lazy default) | ~R420,000 |
| Sonnet for everything | ~R85,000 |
| Routed (this strategy) | ~R22,000 |
| Routed + Gemma self-host for classifiers | ~R15,000 |

**Difference between lazy default and routed: ~R400k/month** at 100 customers. That's two engineering hires of margin recovered just by routing.

## Key assumptions

| # | Assumption | What disproves it |
|---|---|---|
| 1 | Cheap-tier models hit quality on the tasks we route them to | A/B testing shows Gemma fails > 20% of intended uses |
| 2 | Vendor pricing remains roughly stable for 12 months | A frontier vendor doubles prices (Opus 2x increase happens) |
| 3 | Self-host Gemma is worth it past 50 customers | Operational overhead (GPU monitoring, model updates) exceeds vendor cost savings |
| 4 | The router itself doesn't become a bottleneck | Latency added by routing exceeds 50ms |

## Open questions

1. Should we expose model choice to the customer (BYOK + tier choice)? Pros: transparency, customer control. Cons: complexity. Hypothesis: only at Suite tier and above, by month 6.
2. Should the audit tool always use frontier vision, or is mid-tier vision now good enough? Hypothesis: re-test quarterly; mid-tier vision is closing the gap fast.
3. What's the right escalation rule for a customer's voice agent — when should it route to Opus mid-call? Hypothesis: never; voice latency rules out frontier. The escalation path is human-handoff, not Opus.
