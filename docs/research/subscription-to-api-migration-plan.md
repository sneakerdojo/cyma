# Subscription-Testing → Production-API Migration Plan

**Date:** 2026-09-10
**Status:** Testing/POC phase only. This plan is the trigger list for switching to production-legitimate auth — nothing in it is optional at prod, all of it is deferred by explicit choice until then.
**Context:** [model-agnostic-harness-overview.md](./model-agnostic-harness-overview.md)

---

## The line, stated once

- **Allowed during testing:** a human manually driving Claude Code / ChatGPT-Codex interactively, on their own subscription, on their own machine. Anthropic's consumer terms explicitly exempt this; the equivalent OpenAI exemption is assumed but not independently verified — re-check before relying on it past casual testing.
- **Not allowed, not built, not planned:** a service/proxy that takes a subscription's login session and re-exposes it as a programmatic API for `dsh`, tmux orchestration, or any other automated caller. Anthropic's Agent SDK technically blocks OAuth/subscription tokens outright — API keys are mandatory at the SDK level, not just at the ToS level. This plan does not include building that proxy, at any phase.
- **Cheapest correct path for POC-scale automated testing today:** pay-as-you-go API keys (Anthropic + OpenAI) wired directly into `dsh`'s built-in provider slots. Low-volume POC traffic costs very little on either platform's metered tier and is the exact same auth path production will use — the "migration" at prod is a budget/volume change, not an architecture change, if this path is taken from the start.

## Phase 0 — Now (playing around)

- Human-interactive testing only, on personal subscriptions, for prompt/behavior exploration (e.g. "how does Astra plan vs. Opus" comparisons like the ones already done in this conversation).
- If/when automated multi-agent testing through `dsh` or tmux orchestration is needed (not just interactive poking), switch that specific test to pay-as-you-go API keys rather than any subscription-backed automation path. This can happen immediately — it's not blocked on anything else in this plan.
- No client, demo, or shared environment touches subscription-backed anything, ever, at any phase.

## Phase 1 — Trigger: first automated / unattended run

The moment a test stops being "a person watching and driving it" and becomes "leave it running, check back later" (scheduled runs, multi-hour tmux sessions, anything unattended):

- [ ] Anthropic: obtain an API key under Commercial Terms (console.anthropic.com), set spend limits/alerts.
- [ ] OpenAI: obtain an API key, confirm current consumer-vs-API terms language for automated use (unresolved open question from the prior research — resolve here before this phase, not after).
- [ ] Point every `dsh` custom-provider entry used in automated tests at the API key, not a subscription-backed proxy.
- [ ] Delete/never build the "subscription as API" shortcut — if it was prototyped ad hoc anywhere, remove it before this phase closes.

## Phase 2 — Trigger: first client-visible or demo environment

Anything a client, prospect, or anyone outside the immediate testing group can see or trigger:

- [ ] All model access is API-key/Commercial-Terms only — no exceptions, regardless of traffic volume.
- [ ] Confirm DeepSeek Harness's stability posture at this point — it was developer-preview with breaking changes as of Sept 2026; re-check release notes before it's in anything client-facing.
- [ ] Decide whether a LiteLLM/OpenRouter layer is warranted yet (centralized spend tracking, cross-provider fallback) — optional per the architecture research, add only if the need is concrete by this point, not preemptively.
- [ ] Rate limits, spend alerts, and a kill switch per provider are in place before any client traffic flows.

## Phase 3 — Trigger: production rollout to paying clients

- [ ] Full Commercial Terms review with whoever handles contracts for Octio — not just "we have an API key," but confirming the account tier matches actual usage (Anthropic's Commercial Terms cover Work/Enterprise/API; picking the wrong tier for volume is a cost problem, not just a compliance one).
- [ ] Per-client cost attribution wired up (this determines whether you bill clients metered or flat — needs real usage data from Phase 1/2 to price correctly).
- [ ] Re-verify GPT-6 Astra's actual API pricing/model ID against OpenAI's live platform docs — the September 2026 research was launch-week coverage, not confirmed API pricing, and it will be stale by production time regardless.

## What does NOT change between phases

The `dsh` custom-provider mechanism, the provider-agnostic design, and the tmux orchestration pattern are the same shape at every phase — per the architecture research, "one provider swap changes the whole product" is the whole point. Nothing architectural is deferred here; only the *auth method* changes, and only because Phase 0 is deliberately using the cheap/manual path while the automated pieces are still being shaken out.

## Open items carried from the architecture research

- OpenAI's current consumer ToS wording on automated/business use — resolve before Phase 1.
- Exact GPT-6 Astra API model string, pricing, rate limits — resolve before Phase 1 budget planning.
- `dsh` plugin-API stability for headless/scripted use (vs. Web-UI-only) — the custom-provider mechanism is confirmed to work via Settings → Models today; whether it's scriptable/config-file-driven for CI-style automated testing wasn't separately confirmed and should be checked before Phase 1's automated runs are built.
