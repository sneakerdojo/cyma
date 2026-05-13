# Browser Voice Agent (LiveKit Agents + Cartesia + Deepgram + Mastra) — spec

**Status:** Draft — awaiting approval before code.
**Date:** 2026-05-13.
**Supersedes:** `2026-05-13-browser-voice-agent-pipecat.md` (same day, replaced after research evidence reversed the framework choice).
**Patient Zero target:** "Talk to our AI receptionist" demo on `octio.co.za` — visitor clicks a CTA on the marketing page, full voice conversation in-browser, no telephony.

## Why this supersedes the Pipecat spec

A second research pass (production-failure stories + named scale deployments) reversed the call. Summary of decisive evidence:

| Signal | Effect |
|---|---|
| OpenAI Advanced Voice Mode + Character.AI + ~25% of U.S. 911 routing + Retell AI's backend all run on LiveKit | Largest production base, by a wide margin |
| Pipecat has documented architectural failure modes (3 GB/min memory leak, mandatory 1s aggregation latency floor, audio-pipeline regressions across minor versions) | Wrong shape of bug for a solo-founder operator |
| Pipecat is still 0.0.x; LiveKit Agents is 1.5.8 with stabilized API since 1.0 GA | Pipecat reserves the right to break things; LiveKit has absorbed its one breaking migration already |
| Pipecat docs explicitly recommend "dedicated platform/infra engineering" for production | Wrong fit for solo-founder ops; LiveKit "transport just works" per operator consensus |
| LiveKit raised $100M at $1B valuation Jan 22 2026 | Multi-year governance runway |
| Pipecat → LiveKit migration is the dominant direction in 2026; the reverse barely exists | Pre-empting a future rewrite |
| Vapi is NOT on LiveKit (uses own WebSocket transport); Retell IS on LiveKit | Half the category; OpenAI Voice locks in the other half |

Full evidence trail in commit `9f883ae` research transcripts and the comparison synthesis in the prior chat. The decision is final unless the pre-flight gates surface a blocker.

## Delivery shape: v0 (mocks, days) → v1 (real services, ~1 week)

**v0 — everything mocked, browser-native audio I/O.** Validate the architecture + UX + flow on the existing octio.co.za demo with no external provisioning required. iOS Safari real-device testing happens here. Patient Zero IS this v0.

| v0 component | What it actually uses | Cost |
|---|---|---|
| Browser audio capture | **Web Speech API** (`webkitSpeechRecognition` / SpeechRecognition) | $0 |
| Browser audio playback | **`SpeechSynthesisUtterance`** | $0 |
| Backend STT | Mock — accepts transcript, adds 220ms latency stub | $0 |
| Backend TTS | Mock — returns "audio ready" signal, 140ms stub | $0 |
| Brain | Existing `mockBrain` (FSM); `OctoBrainAdapter` seam in place | $0 |
| Tools | Existing mock tools (lookup_availability, book_appointment, route_to_human) | $0 |
| Transport | HTTPS POST per turn (no WebRTC, no livekit-server) | $0 |
| `/api/voice-agent/turn` endpoint | v1-shape contract — what the LiveKit worker will call later | $0 |
| `/api/voice-agent/token` endpoint | Stub that documents the contract (returns fake LiveKit JWT) | $0 |
| Orb UI states | Real (idle / listening / thinking / speaking) | — |
| iOS Safari unlock UX | Real "Tap to talk" gesture | — |

**v0 total cost to operate:** $0 (no external services).
**v0 effort:** 2–3 days.
**v0 purpose:** prove the shape; surface iOS Safari quirks; validate Mastra-brain → tool → reply loop with real(-ish) audio I/O; show real prospects "Talk to our AI" on the marketing site without paying providers yet.

---

**v1 — real services swapped in.** Each swap is a single-module change because the seams are already in v0.

| v1 swap | v0 → v1 change | Effort |
|---|---|---|
| STT | Web Speech API → Deepgram Nova-3 streaming WebSocket | 1 day |
| TTS | SpeechSynthesisUtterance → Cartesia Sonic-3 streaming | 1 day |
| Transport | HTTPS POST → WebRTC via livekit-client | 1.5 days |
| SFU | (none) → self-hosted livekit-server on Octio infra | 1 day pre-flight + 0.5 day deploy |
| Brain | `mockBrain` → real Mastra Octo agent (Kimi K2 Turbo) | 0.5 day (OctoBrainAdapter swap) |
| Tools | Mock tools → production Google Calendar + WhatsApp + Slack | 1–2 days (already specced) |

**v1 total effort post-v0:** ~6 days (matches the build sequence below).

The rest of this spec describes the **v1 end-state**. v0 just stops short of the swaps.

---

## Goal

Ship a working in-browser voice agent on `octio.co.za` in approximately **7 days** running on Octio's existing self-hosted infrastructure (no managed cloud dependency). The agent:

- Captures the visitor's microphone audio in the browser via WebRTC
- Streams it to a self-hosted LiveKit SFU + a Node.js Agents worker that runs STT → **real Mastra Octo brain** → TTS
- Plays the agent's spoken reply back through the browser speakers
- Hits **mouth-to-ear p50 < 1.3s, p95 < 2.0s** (foreground tab, working network)
- Wraps the existing Mastra Octo agent (`packages/worker/src/mastra/agents/octo.ts`) — `mockBrain` stays in the codebase as a dev-mode toggle, not the production default
- Reuses the existing voice-agent orchestrator + production tools (as they're wired)
- Works on iOS Safari foreground tab (out of scope: lock-screen, PWA standalone background)
- Phase 2 (telephony) lands via LiveKit SIP plugin — same agent code, additional ingress.

**Infrastructure decision:** Octio owns the servers. Self-hosting livekit-server from day 1 avoids the $0.005/participant-min Cloud fee, strengthens the POPIA story (audio never leaves Octio infrastructure), and removes vendor-outage exposure. The "managed Cloud first" path in earlier drafts is dropped — going straight to the production shape.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser (octio.co.za/voice-sim, foreground tab only)      │
│  - livekit-client (TypeScript)                              │
│  - WebRTC: Opus, native AEC / NS / AGC                      │
│  - One persistent <audio> element unlocked on Start tap     │
│  - Silero VAD already shipped in LiveKit client for barge-in│
└─────────────────────┬──────────────────────────────────────┘
                      │ WebRTC (Opus over RTP) — TLS via Caddy/
                      │ Traefik on Octio infra
                      ▼
┌────────────────────────────────────────────────────────────┐
│  Self-hosted livekit-server (Octio infra-01 / new VPS)      │
│  - Docker: livekit/livekit-server:v1.8+                     │
│  - WebSocket on 443 (TLS) → wss://livekit.octio.co.za       │
│  - UDP 50000-50100 for RTP                                  │
│  - coturn sidecar on 5349 (TURN-over-TLS) for NAT traversal │
└─────────────────────┬──────────────────────────────────────┘
                      │ Agent joins room as a participant
                      ▼
┌────────────────────────────────────────────────────────────┐
│  LiveKit Agents Node.js worker (TypeScript) — Octio infra   │
│  - @livekit/agents + @livekit/agents-plugin-deepgram        │
│  - @livekit/agents-plugin-cartesia                          │
│  - @livekit/agents-plugin-silero                            │
│  - OctoBrainAdapter — wraps real Mastra agent as LLM        │
└─────────────────────┬──────────────────────────────────────┘
                      │ In-process or HTTPS to Bun brain
                      │ body: { sessionId, transcript, tenantBrand }
                      │ response: { reply, toolCalls[] }
                      ▼
┌────────────────────────────────────────────────────────────┐
│  Bun/Hono worker (existing packages/worker/)                │
│  - Real Mastra Octo agent (mastra/agents/octo.ts)           │
│  - Reuses src/services/voice-agent/orchestrator.ts          │
│  - Reuses src/services/profile/* for caller recognition     │
│  - Reuses production tools (Google Calendar, WhatsApp, etc) │
│  - mockBrain stays in code, gated by NODE_ENV=development   │
│    + VOICE_USE_MOCK_BRAIN=1 (dev-only toggle)               │
└────────────────────────────────────────────────────────────┘
```

### Why this shape

- **LiveKit Agents Node.js SDK** (GA late 2025) lets us stay in TypeScript. Less language sprawl; one less runtime to operate.
- **Self-host livekit-server on Octio infra.** Octio already runs Docker-compose-based production deployments (infra-01). Adding livekit-server is one container + coturn sidecar. No managed-cloud fee, no vendor-outage exposure, audio never leaves Octio infrastructure — strongest POPIA story.
- **Real Mastra brain from day 1.** The OctoBrainAdapter wraps the existing Mastra agent in the LiveKit `LLM` interface. Mock brain stays in the codebase but is gated behind a dev-only env toggle, never the production default.
- **The orchestrator we shipped is reused.** Phase 1 wires the real Mastra Octo agent through the existing `runTurn(...)` orchestration. Phase 2 (Twilio inbound) hits the same code path from a LiveKit SIP ingress — agent code is identical.

## Stack BOM (verified May 2026)

| Layer | Choice | Verified detail | Cost |
|---|---|---|---|
| Browser transport | **WebRTC** via `livekit-client` | Native Opus + AEC; LiveKit ships Safari-tuned audio constraints | $0 |
| Browser playback | LiveKit-managed audio element (handled by SDK) | Sample-accurate WebRTC playback. Survives turn boundaries. | $0 |
| iOS unlock | **One persistent `<audio>` element + `AudioContext.resume()` on Start tap** | LiveKit's SDK does the unlock dance under the hood. | $0 |
| Barge-in | **Silero VAD via `@livekit/agents-plugin-silero`** | 86% precision / 100% recall (LiveKit data) | $0 (plugin) |
| SFU | **Self-hosted livekit-server v1.8+** on Octio infra (Docker) | Docker container on existing infra-01 (or new dedicated VPS if voice load justifies). Includes coturn sidecar for NAT traversal. | ~$15–25/mo VPS amortised (or $0 if reused on infra-01) |
| Agent worker runtime | **Node.js 20 + `@livekit/agents`** on Octio infra | TypeScript end-to-end. ~256MB RAM idle. Co-located with livekit-server for sub-30ms hop. | $0 (shared infra) |
| Brain integration | **OctoBrainAdapter** — small adapter wrapping the existing Mastra Octo agent as `@livekit/agents` `LLM` | Mock brain stays gated behind `NODE_ENV=development && VOICE_USE_MOCK_BRAIN=1` | $0 (code only) |
| STT | **Deepgram Nova-3 streaming** via `@livekit/agents-plugin-deepgram` | 150–300ms first-final. ⚠️ SA accent unverified — see Pre-flight gate. | $0.0077/min PAYG |
| STT audio format | **PCM linear16 @ 16kHz mono** | LiveKit handles Opus → PCM conversion before forwarding to Deepgram | — |
| Brain | **Real Mastra Octo agent** (currently using Kimi K2 Turbo) via OctoBrainAdapter | Matches existing `packages/worker/src/mastra/agents/octo.ts` config. No HTTP hop if co-located; falls back to HTTP if separated. Anthropic added as fallback when the API key is provisioned. | ~$0.014/min Kimi K2 Turbo ($1.15 in / $8 out per 1M, ~3k tokens/min mixed) |
| TTS | **Cartesia Sonic-3** via `@livekit/agents-plugin-cartesia`, ElevenLabs Flash fallback | 90ms TTFA; LiveKit aggregates sentence chunks automatically | $0.0105/min |
| Total provider cost | | | **~$0.032/min providers + ~$0/min SFU = ~$0.032/min** (Cloud option saved; Kimi vs Haiku adds ~$0.005/min) |

## User flow (caller-facing)

1. Visitor lands on `octio.co.za/voice-sim` (or marketing CTA "Talk to our AI receptionist")
2. Page shows a single **Start conversation** button + POPIA-compliant privacy notice
3. Visitor taps Start:
   - Browser prompts for microphone permission
   - `AudioContext.resume()` + silent buffer played → audio unlocked for the session
   - `livekit-client` connects to a LiveKit room (token signed server-side, 1 hour TTL)
   - "Connecting..." UI for ~500ms
4. LiveKit Agents worker auto-dispatches an agent into the room
5. Agent greets: "Hi, you've reached Octio. How can I help today?" (TTS streams via WebRTC)
6. Conversation proceeds turn-by-turn. Visitor can interrupt mid-sentence — Silero VAD signals barge-in, agent stops within ~200ms.
7. Visual UI: an animated orb shows agent state (listening / thinking / speaking). Live transcript below.
8. **End** when: visitor clicks End / tab is closed / 5 minutes idle / `route_to_human` tool fires (in Phase 1 demo, posts to Slack; in Phase 2 production, dial-out via SIP)
9. Post-call: visitor sees a summary card + CTA to book a real discovery call.

## Server-side flow (per turn)

1. LiveKit Cloud routes the WebRTC audio to the room
2. The Node.js agent worker subscribes to the participant's audio
3. Deepgram plugin streams audio to Nova-3 WebSocket; transcripts arrive
4. On `on_user_speech_committed` (end-of-turn): agent's `LLM.chat(messages)` fires
5. Our custom `LLM` subclass POSTs `{ sessionId, transcript, tenantBrand, callerNumber? }` to `https://api.octio.co.za/api/voice-agent/turn`
6. Bun worker:
   - Calls `profileLookup({ tenantId, identity, repo })` — returns `summary` if profile exists with consent
   - Calls `runTurn(...)` with the orchestrator (existing `mockBrain` or production agent)
   - Returns `{ reply, toolCalls, latencyMs }`
7. LiveKit forwards the reply text to Cartesia Sonic-3 streaming; first clause streams immediately
8. Cartesia → Opus chunks → published to the room → browser plays via WebRTC

## Latency budget (p50)

| Stage | Budget |
|---|---|
| Browser → LiveKit SFU WebRTC ingress | 100ms |
| LiveKit SFU → agent worker (same region) | 30ms |
| Deepgram Nova-3 STT first-final | 200ms |
| End-of-turn detection (LiveKit + Silero) | 200ms |
| Agent → Bun brain HTTP RT (EU regions) | 200ms |
| Cartesia Sonic-3 TTFA | 90ms |
| LiveKit SFU → browser playback start | 130ms |
| **Total p50** | **~950ms mouth-to-ear** |
| p95 target | **< 2.0s** |

Comparable to Pipecat's budget; LiveKit Cloud's regional edge actually slightly improves the SFU hop vs self-host.

## Pre-flight gates (mandatory before code)

1. **SA-accent STT benchmark.** Build a 30-sample test set of SA-accented English (founder + 5 friends + 24 public-domain SA speech samples) recorded via browser mic. Run through Deepgram Nova-3 + Speechmatics Ursa 2 streaming.
   - **Acceptance:** chosen provider hits WER ≤ 10% on phone-audio-like SA speech.
   - **Reject criterion:** WER > 15% in both providers — escalate to Lelapa Vulavula pilot before further work.

2. **iOS Safari real-device test.** On a physical iPhone (any 16+/iOS 18+), open `octio.co.za` in Safari, tap Start, verify mic capture + WebRTC handshake + audio playback all work in a foreground tab.
   - **Acceptance:** bot greets, hears the caller, replies within ~1.5s end-to-end.
   - **Reject criterion:** any of mic / WebRTC / playback fails on iOS Safari 18+.

3. **Self-hosted livekit-server hello-world on Octio infra.** Deploy livekit-server (Docker) + coturn to infra-01 (or new VPS). Verify:
   - TLS WebSocket reachable at `wss://livekit.octio.co.za` from outside the network
   - UDP 50000-50100 reachable (or fall back to TURN over 5349)
   - Agents Node.js worker registers + receives a job dispatched into a test room
   - "Echo" agent plays back the caller's transcript via TTS
   - **Acceptance:** end-to-end "hello world" works in < 1 day of setup.
   - **Reject criterion:** firewall / NAT / DNS issue can't be resolved on the existing infra → either provision a dedicated voice VPS or escalate.

If any pre-flight gate fails, stop and revisit. Specifically: a Nova-3 failure on SA accents reopens the STT decision; an iOS Safari failure reopens the platform-target decision; a livekit-server self-host failure forces either dedicated-VPS provisioning or a (regretted) revisit of LiveKit Cloud.

## Build sequence (post pre-flight gates)

| Day | Slice | Output |
|---|---|---|
| 0 (Pre-flight) | SA-accent benchmark + iOS Safari real-device test + self-hosted livekit-server hello-world on Octio infra | Go / no-go on stack |
| 0.5 | Production deploy: livekit-server + coturn Docker containers via existing GitLab CI / Docker compose; `wss://livekit.octio.co.za` TLS via existing reverse proxy | Self-hosted SFU live on Octio infra |
| 1 | LiveKit Agents Node.js worker scaffolding — VoicePipelineAgent + Deepgram + Cartesia plugins; deploy to Octio infra | Worker connects to local SFU, joins a room, runs a STT → echo → TTS pipeline |
| 2 | `OctoBrainAdapter` — wraps real Mastra Octo agent (`mastra/agents/octo.ts`) as `@livekit/agents` `LLM`. `VOICE_USE_MOCK_BRAIN` env gate for dev. | Agent's reply is genuinely from the production Mastra brain |
| 3 | Token-signing endpoint on Bun worker (`POST /api/voice-agent/token`, 1h TTL) + browser client (`livekit-client`) | Browser connects to the self-hosted LiveKit room |
| 4 | iOS Safari unlock UX + persistent `<audio>` + start CTA + POPIA consent surface | Works on iPhone Safari foreground |
| 5 | Silero VAD barge-in tuning + orb UI states (idle / listening / thinking / speaking) | Bot stops mid-sentence; visual feedback |
| 6 | Wire to `/voice-sim` page (replace mock-text input with live mic) + Patient Zero soak | Live voice agent on `octio.co.za` |
| (Phase 2, deferred) | LiveKit SIP plugin + Twilio SA SIP trunk | Same agent code answers phone calls |

**Total: ~7 days** (Day 0 pre-flight + Day 0.5 deploy + 6 dev days).

## Tests

Reuses test signatures from `docs/stories/voice-agent-v1.md` and `voice-agent-v2.md`. Adds browser-specific Playwright tests:

| Story / Test | What's tested | Where |
|---|---|---|
| US-VA-001 pickup | First audio reaches browser ≤ 2s after Start tap | Playwright E2E |
| US-VA-007 barge-in | Bot stops within 200ms of caller speech detected | Manual real-device + unit test on LiveKit-Silero plugin |
| US-VA-025 latency p50/p95 | p50 < 1.3s / p95 < 2.0s over 100 simulated calls | LiveKit load-test client |
| US-VA-031 fallback cascade | Kimi 503 → static reply (v1; no fallback while only Kimi key is configured). Test the static-reply path. After Anthropic key lands: Kimi → Haiku → static. | Mocked at brain endpoint |
| US-VA-042 spoken consent | After first qualification turn, agent asks consent; persists decision | Browser E2E |

Pre-existing 29 voice-agent unit tests stay green.

## Privacy + POPIA notes

Self-hosting strengthens this section significantly. Audio never leaves Octio's infrastructure except for STT/TTS API calls (which go to providers with verified EU/SA residency).

- **Audio data sovereignty:** WebRTC audio terminates on Octio's self-hosted SFU. Never traverses a third-party SFU vendor. POPIA s.72 cross-border transfer obligations only apply to the STT/TTS provider calls.
- **Consent disclosure on Start tap:** "By talking to us, you agree to our [Privacy Notice]. Audio is processed by Octio in real-time, not recorded. Transcripts are processed by AI providers including Moonshot (China) and Deepgram (US)." Reuses `recordConsent` from profile service.
- **No call recording in v1.** Audio is processed in-flight (STT → discarded immediately). Transcripts stored 90 days per existing retention policy.
- **POPIA Information Officer:** unchanged — founder is the IO; audit log captures every turn via `profileAuditLog`.
- **WebRTC encryption:** SRTP end-to-end between browser and SFU. TLS on the WebSocket signalling channel. SFU-to-agent is in-cluster (loopback) when co-located, TLS otherwise.
- **Cross-border transfer disclosure (POPIA s.72):** Audio→STT goes to Deepgram (US). Transcripts→brain go to Moonshot (China) via Kimi K2 Turbo. Text→TTS goes to Cartesia (EU). All three must be explicitly named in the Privacy Notice. When Anthropic Haiku 4.5 EU comes online as fallback, brain transfers move to EU-only — material POPIA improvement.
- **Operator-only access:** livekit-server admin API token kept in env; only founder/operator can dispatch agents or inspect rooms.

## Cost model — what you actually pay

Costs are **variable per second of conversation**. Every figure below derives from per-second rates; daily / monthly totals only show what those rates *would* total at an assumed volume. Real spend tracks real usage.

### Per-second rates (the billing unit)

| Item | Per second | Per minute | Per call (3-min avg) | Notes |
|---|---|---|---|---|
| Deepgram Nova-3 STT | $0.000128 | $0.0077 | $0.0231 | Vendor bills per-second internally; quoted per-minute. |
| Cartesia Sonic-3 TTS | $0.000175 | $0.0105 | $0.0315 | Assumes ~7k chars/min bot output. |
| Mastra brain via Kimi K2 Turbo | $0.000233 | $0.014 | $0.042 | Assumes ~3k tokens/min mixed in+out. Variable per conversation density. |
| Bandwidth (Hetzner egress, estimated) | $0.000014 | $0.00083 | $0.0025 | ~75kbps Opus + signalling. |
| **Marginal variable cost** | **~$0.00055/sec** | **~$0.033/min** | **~$0.099/call** | Only burns while a call is connected. |

### Fixed monthly infra (independent of call volume)

| Item | Monthly | Per second at demo volume | Notes |
|---|---|---|---|
| livekit-server + coturn (shared on infra-01) | $0–$25 | ~$0.000010 | Pre-flight answers if infra-01 absorbs it. Worst case: dedicated CX22 VPS. |
| Agent worker (Node.js, co-located) | $0 | $0 | Shares the same machine. |

Fixed infra cost amortises per second of usage — heavier traffic = lower effective per-second infra cost.

### What this means at different volumes

Volume gets the variable rate; only fixed infra changes the per-second total.

| Daily volume | Daily total (variable + amortised infra) | Effective $/sec |
|---|---|---|
| 1 demo call (3 min) | ~$0.10 + $0.83 = $0.93 | $0.0052 (mostly fixed cost) |
| 50 calls/day (150 min) | ~$5 + $0.83 = $5.83 | $0.00065 |
| 200 calls/day (600 min) | ~$20 + $0.83 = $20.83 | $0.00058 |
| 1 000 calls/day (3 000 min) | ~$99 + $0.83 = $99.83 | $0.00055 |
| 10 000 calls/day (30 000 min) | ~$990 + $0.83 = $990.83 | $0.00055 |

**Reading this:** at any non-tiny volume the variable rate dominates and the marginal per-second cost stays roughly flat (~$0.00055). The earlier "$20/day" figure was 200 calls/day — useful as a reference point, but the truth is "we pay ~$0.033 per minute of conversation, and the meter only runs while a call is connected."

### Comparison points (held constant: variable cost per minute of call)

| Stack | $/min | vs us | Why |
|---|---|---|---|
| **Self-host LiveKit + Kimi (current spec)** | **$0.033** | baseline | Self-hosted SFU; Kimi for brain |
| Self-host + Anthropic Haiku 4.5 EU (when key lands) | $0.028 | -$0.005 | Haiku cheaper than Kimi for our token split |
| LiveKit Cloud + Haiku | $0.038 | +$0.005 | $0.010/call-min Cloud fee |
| Vapi (managed) | $0.07–$0.25 | +$0.04–$0.22 | Orchestration tax + provider passthrough |
| OpenAI Realtime direct | $0.18–$0.46 | +$0.15–$0.43 | Premium speech-to-speech model; Mastra lock-out |

### Spend guardrail

Hard daily cap of **$30 USD variable spend** (≈ 900 mins of conversation ≈ 300 calls) on the demo. Worker tracks rolling 24-hour spend; if hit, voice-sim returns "demo currently at capacity, try later." This protects against runaway loops and abuse, not against legitimate scale.

### Practical answer to "what does this cost"

- **Per second of conversation:** ~$0.00055
- **Per typical 3-min call:** ~$0.10
- **Cost only accrues while someone is on a call.** Idle infra is ~$25/month max.
- **No vendor minimum commitments.** Cancel any time.

Pre-flight gate 3 still answers the only remaining cost question: does infra-01 absorb livekit-server (free), or do we provision a dedicated VPS (~$25/mo)?

## Out of scope (v1)

- iOS PWA standalone mode (cold-launch mic re-prompt + background audio remain WebKit hard blockers)
- Native iOS app
- Multi-party calls (>2 participants) — LiveKit makes this easy in Phase 3+ when warranted
- Recording / playback of past calls — straightforward LiveKit egress later
- Telephony inbound (Phase 2 — adds LiveKit SIP plugin)
- Outbound calling (Phase 3+)
- Languages other than English (Phase 2 — Afrikaans via ElevenLabs v3; Phase 3 — Nguni via Lelapa Vulavula)

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SA-accent STT WER too high | Medium | High | Pre-flight benchmark mandatory. Speechmatics fallback. |
| Self-host livekit-server config wrong (NAT, ports, TLS) | Medium | High | Pre-flight gate 3 forces a real hello-world before any code. Provides clear escape: dedicated VPS or rollback to managed Cloud. |
| Self-host upgrade burden (livekit-server new releases) | Low (1.x is stable) | Low | Version-pin Docker image; review release notes per minor; quarterly upgrade cadence. |
| iOS Safari quirk breaks demo | Medium | High | Pre-flight real-device test. Foreground-only constraint accepted. |
| Cartesia outage | Low | Medium | ElevenLabs Flash v2.5 fallback configured in LiveKit pipeline |
| Deepgram outage | Low | High | Speechmatics fallback configured in LiveKit pipeline |
| Kimi K2 Turbo rate limit / outage | Medium | High | v1 has Kimi as primary, no fallback (single API key today). Add Anthropic Haiku 4.5 EU as fallback when key is provisioned — non-blocker for v1 launch but **must land before any external customer signs up.** |
| Kimi function-calling reliability (`book_appointment`, `route_to_human`) | Medium | Medium | Less battle-tested than Anthropic/OpenAI tool use. Pre-flight smoke-test the 3 production tools end-to-end before launch. If unreliable, fall back to Anthropic earlier. |
| Cross-border PII transfer (Kimi = China) | Medium (compliance, not technical) | Medium | Privacy Notice must explicitly name Moonshot/China. Migration path to Anthropic EU as primary is documented; review at customer-1 onboarding. |
| Cost overrun on demo traffic | Low | Low | Daily cap at $30 spend; auto-disable demo if exceeded |
| LiveKit Agents 1.x → 2.x breaking change | Low (1.0 already shipped May 2025) | Medium | Version-pin SDK; review release notes per minor |
| infra-01 voice load competes with website / chat / worker | Medium | Medium | Monitor CPU + memory during pre-flight. If >50% utilisation under simulated load, provision a dedicated voice VPS (~$15–25/mo Hetzner) — keeps SFU isolated. |

## Open questions

1. **Where does livekit-server live in Octio infra — infra-01 or dedicated VPS?** Pre-flight gate 3 answers this. If infra-01 has capacity headroom (CPU < 50% under simulated load) it's the cheapest option. Otherwise provision a Hetzner CX22 (~€5/mo) dedicated to voice.

2. **Audio quality vs latency trade.** Cartesia `pcm_s16le @ 24kHz` is lower-quality than 44.1kHz but cuts ~20ms decode time. If demo feedback says voice sounds tinny, upgrade to 44.1kHz at the latency cost.

3. **OctoBrainAdapter — in-process or HTTP?** If LiveKit Agents worker is in the same Bun runtime as the Mastra agent, the adapter can be in-process (zero hop, lowest latency). If the worker is a separate Node.js container (likely, since `@livekit/agents` is Node-not-Bun), the adapter POSTs to the Bun brain. Either path is supported — pick based on whether the LiveKit Agents Node SDK is Bun-compatible (verify in pre-flight Day 0.5).

## Citations

- [LiveKit Agents repo (1.5.8 May 5 2026)](https://github.com/livekit/agents)
- [LiveKit Agents v0→1 migration guide](https://docs.livekit.io/agents/v1/start/v0-migration/)
- [LiveKit raises $100M at $1B (SiliconANGLE, Jan 22 2026)](https://siliconangle.com/2026/01/22/livekit-raises-100m-1b-valuation-scale-real-time-ai-media-platform/)
- [LiveKit powers OpenAI Voice Mode (TechCrunch, Apr 2025)](https://techcrunch.com/2025/04/10/livekits-tools-help-power-real-time-communications/)
- [LiveKit Cloud pricing](https://livekit.io/pricing)
- [@livekit/agents-plugin-deepgram](https://www.npmjs.com/package/@livekit/agents-plugin-deepgram)
- [@livekit/agents-plugin-cartesia](https://www.npmjs.com/package/@livekit/agents-plugin-cartesia)
- [@livekit/agents-plugin-silero](https://www.npmjs.com/package/@livekit/agents-plugin-silero)
- [Deepgram Nova-3 streaming pricing](https://deepgram.com/pricing)
- [Cartesia Sonic-3 WebSocket docs](https://docs.cartesia.ai/api-reference/tts/websocket)
- [Matt Montag — Unlock Web Audio in Safari (iOS)](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)
- [iOS Safari WebRTC 2026 (VideoSDK)](https://www.videosdk.live/developer-hub/webrtc/webrtc-safari)
- [LiveKit Status — May 5 2026 incident](https://status.livekit.io/)
- Prior Pipecat-spec research transcripts at `/private/tmp/.../tasks/a*.output` (commit `9f883ae`)
