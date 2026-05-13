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

## Goal

Ship a working in-browser voice agent on `octio.co.za` in approximately **6 days** (managed LiveKit Cloud path) or **8 days** (self-host SFU). The agent:

- Captures the visitor's microphone audio in the browser via WebRTC
- Streams it to a LiveKit Agents Node.js worker that runs STT → Mastra brain → TTS
- Plays the agent's spoken reply back through the browser speakers
- Hits **mouth-to-ear p50 < 1.3s, p95 < 2.0s** (foreground tab, working network)
- Reuses the existing voice-agent orchestrator + mock tools (and the production tools when wired)
- Works on iOS Safari foreground tab (out of scope: lock-screen, PWA standalone background)
- Phase 2 (telephony) lands via LiveKit SIP plugin — same agent code, additional ingress.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser (octio.co.za/voice-sim, foreground tab only)      │
│  - livekit-client (TypeScript)                              │
│  - WebRTC: Opus, native AEC / NS / AGC                      │
│  - One persistent <audio> element unlocked on Start tap     │
│  - Silero VAD already shipped in LiveKit client for barge-in│
└─────────────────────┬──────────────────────────────────────┘
                      │ WebRTC (Opus over RTP) → LiveKit SFU
                      ▼
┌────────────────────────────────────────────────────────────┐
│  LiveKit SFU                                                │
│  Phase 1: LiveKit Cloud (managed, $0.005/participant-min)  │
│  Phase 2 / Phase 3 self-host: livekit-server in Docker     │
└─────────────────────┬──────────────────────────────────────┘
                      │ Agent joins room as a participant
                      ▼
┌────────────────────────────────────────────────────────────┐
│  LiveKit Agents Node.js worker (TypeScript)                 │
│  - @livekit/agents + @livekit/agents-plugin-deepgram        │
│  - @livekit/agents-plugin-cartesia                          │
│  - @livekit/agents-plugin-silero                            │
│  - Custom LLM that POSTs to our Bun /api/voice-agent/turn   │
└─────────────────────┬──────────────────────────────────────┘
                      │ HTTPS POST /api/voice-agent/turn
                      │ body: { sessionId, transcript, tenantBrand }
                      │ response: { reply, toolCalls[] }
                      ▼
┌────────────────────────────────────────────────────────────┐
│  Bun/Hono worker (existing packages/worker/)                │
│  - Reuses src/services/voice-agent/orchestrator.ts          │
│  - Reuses src/services/voice-agent/mock-brain.ts            │
│    (swap for production Mastra agent on octo.ts when ready) │
│  - Reuses src/services/profile/* for caller recognition     │
│  - Reuses tools (mock now; Google Calendar/WhatsApp later)  │
└────────────────────────────────────────────────────────────┘
```

### Why this shape

- **LiveKit Agents Node.js SDK** (GA late 2025) lets us stay in TypeScript. Less language sprawl; one less runtime to operate.
- **LiveKit Cloud for Phase 1** removes self-host ops entirely. Migration to self-host is a config change, not a rewrite, when scale or cost demands it.
- **Mastra stays intact.** A custom `LLM` subclass posts to our existing Bun endpoint. Octo agent code unchanged.
- **The orchestrator we shipped is reused.** Phase 1 calls `runTurn(...)` per turn via HTTP. Phase 2 (Twilio inbound) hits the same orchestrator from a LiveKit SIP ingress — agent code is identical.

## Stack BOM (verified May 2026)

| Layer | Choice | Verified detail | Cost |
|---|---|---|---|
| Browser transport | **WebRTC** via `livekit-client` | Native Opus + AEC; LiveKit ships Safari-tuned audio constraints | $0 |
| Browser playback | LiveKit-managed audio element (handled by SDK) | Sample-accurate WebRTC playback. Survives turn boundaries. | $0 |
| iOS unlock | **One persistent `<audio>` element + `AudioContext.resume()` on Start tap** | LiveKit's SDK does the unlock dance under the hood. | $0 |
| Barge-in | **Silero VAD via `@livekit/agents-plugin-silero`** | 86% precision / 100% recall (LiveKit data) | $0 (plugin) |
| SFU | **LiveKit Cloud (Phase 1)**; livekit-server self-host (Phase 3) | Phase 1 avoids SFU operation entirely. Documented self-host path for cost optimisation later. | LiveKit Cloud: $0.005/participant-min (~$0.010/call-min) |
| Agent worker runtime | **Node.js 20 + `@livekit/agents`** | TypeScript end-to-end. ~256MB RAM idle. | ~$5–10/mo on Fly.io |
| STT | **Deepgram Nova-3 streaming** via `@livekit/agents-plugin-deepgram` | 150–300ms first-final. ⚠️ SA accent unverified — see Pre-flight gate. | $0.0077/min PAYG |
| STT audio format | **PCM linear16 @ 16kHz mono** | LiveKit handles Opus → PCM conversion before forwarding to Deepgram | — |
| Brain | **Existing Mastra Octo agent** on Bun/Hono, called via custom `LLM` subclass over HTTP | No code rewrite; HTTP wrapper around `runTurn(...)` | ~$0.012/min Haiku 4.5 EU |
| TTS | **Cartesia Sonic-3** via `@livekit/agents-plugin-cartesia`, ElevenLabs Flash fallback | 90ms TTFA; LiveKit aggregates sentence chunks automatically | $0.0105/min |
| Total provider cost | | | **~$0.03/min provider + $0.010/min SFU = ~$0.040/min** |

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

3. **LiveKit Agents hello-world.** Stand up a minimal LiveKit Agents Node.js worker locally, point at a free LiveKit Cloud sandbox, run a single "echo" agent that just plays back the caller's transcript via TTS.
   - **Acceptance:** end-to-end "hello world" works in < 4 hours of setup.
   - **Reject criterion:** blocker found in LiveKit Cloud signup, agent dispatch, or plugin install.

If any pre-flight gate fails, stop and revisit. Specifically: a Nova-3 failure on SA accents reopens the STT decision; an iOS Safari failure reopens the platform-target decision.

## Build sequence (post pre-flight gates)

| Day | Slice | Output |
|---|---|---|
| 0 (Pre-flight) | SA-accent benchmark + iOS Safari real-device test + LiveKit hello-world | Go / no-go on stack |
| 1 | LiveKit Agents Node.js worker scaffolding — VoicePipelineAgent + Deepgram + Cartesia plugins | Worker connects, joins a room, runs a STT → echo → TTS pipeline |
| 2 | Custom `OctioBrain extends LLM` — POST to `/api/voice-agent/turn` | Agent's reply is genuinely the Mastra brain's reply |
| 3 | Token-signing endpoint on Bun worker (`POST /api/voice-agent/token`) + browser client (`livekit-client` + `RoomProvider`) | Browser connects to a real LiveKit room |
| 4 | iOS Safari unlock UX + persistent `<audio>` + start CTA | Works on iPhone Safari foreground |
| 5 | Silero VAD barge-in tuning + orb UI states | Bot stops mid-sentence; visual feedback |
| 6 | Wire to `/voice-sim` page (replace mock-text input with live mic) + Patient Zero soak | Live voice agent on `octio.co.za` |
| (Phase 2, deferred) | LiveKit SIP plugin + Twilio SA SIP trunk | Same agent code answers phone calls |

## Tests

Reuses test signatures from `docs/stories/voice-agent-v1.md` and `voice-agent-v2.md`. Adds browser-specific Playwright tests:

| Story / Test | What's tested | Where |
|---|---|---|
| US-VA-001 pickup | First audio reaches browser ≤ 2s after Start tap | Playwright E2E |
| US-VA-007 barge-in | Bot stops within 200ms of caller speech detected | Manual real-device + unit test on LiveKit-Silero plugin |
| US-VA-025 latency p50/p95 | p50 < 1.3s / p95 < 2.0s over 100 simulated calls | LiveKit load-test client |
| US-VA-031 fallback cascade | Anthropic 503 → Gemini Flash → Groq → static reply | Mocked at brain endpoint |
| US-VA-042 spoken consent | After first qualification turn, agent asks consent; persists decision | Browser E2E |

Pre-existing 29 voice-agent unit tests stay green.

## Privacy + POPIA notes

- **Consent disclosure on Start tap:** "By talking to us, you agree to our [Privacy Notice]. We record this conversation for service quality." Reuses `recordConsent` from profile service.
- **No call recording in v1.** Audio is processed in-flight (STT → discarded). Transcripts stored 90 days per existing retention policy.
- **POPIA Information Officer:** unchanged — founder is the IO; audit log captures every turn via `profileAuditLog`.
- **WebRTC encryption:** SRTP end-to-end between browser and LiveKit SFU, between SFU and agent.
- **LiveKit Cloud region:** request EU residency for POPIA. LiveKit supports per-room region pinning.
- **EU residency for Deepgram + Anthropic + Cartesia:** verified during pre-flight.

## Cost model — what you actually pay

At ~600 demo conversation-mins/day (200 conversations × 3 min avg):

| Item | Per minute | Per day |
|---|---|---|
| LiveKit Cloud (2 participants/call) | $0.010 | $6.00 |
| Deepgram Nova-3 STT | $0.0077 | $4.62 |
| Cartesia Sonic-3 (~7k chars/min) | $0.0105 | $6.30 |
| Mastra brain (Haiku 4.5, ~3k tokens/min) | $0.012 | $7.20 |
| Agent worker (Fly.io 256MB) | — | $0.33 |
| **Total** | **~$0.040/min** | **~$24/day** |

vs Pipecat-self-host (would have been ~$18/day) — **$6/day premium for managed SFU + zero SFU ops.**

Migration to self-host LiveKit SFU later: ~$15–25/mo per livekit-server machine; would cut the LiveKit-Cloud line item to $0. Worth doing once demo proves out; not worth doing on day 1.

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
| LiveKit Cloud outage (May 5 2026 incident remembered) | Low | Medium | Self-host fallback documented; can switch in <1 day if needed. Architectural cost is bounded. |
| iOS Safari quirk breaks demo | Medium | High | Pre-flight real-device test. Foreground-only constraint accepted. |
| Cartesia outage | Low | Medium | ElevenLabs Flash v2.5 fallback configured in LiveKit pipeline |
| Deepgram outage | Low | High | Speechmatics fallback configured in LiveKit pipeline |
| Anthropic API rate limit | Medium | Medium | Existing fallback cascade (Haiku → Gemini → Groq) |
| Cost overrun on demo traffic | Low | Low | Daily cap at $40 spend; auto-disable demo if exceeded |
| LiveKit Agents 1.x → 2.x breaking change | Low (1.0 already shipped May 2025) | Medium | Version-pin SDK; review release notes per minor |

## Open questions

1. **LiveKit Cloud region for Octio.** LiveKit Cloud SFU regions: `us-east`, `eu-west`, `ap-south`. EU west is closest to SA. Expected RTT SA → eu-west: ~150ms (acceptable). If demo latency p50 > 1.5s, evaluate ap-south as a closer hop. **Decision: start eu-west, measure, move if needed.**

2. **Demo brain — mock vs production.** v1 defaults to existing `mockBrain` for safety + determinism. Switch to production Mastra agent on `octo.ts` after 1 week of Patient Zero soak.

3. **Audio quality vs latency trade.** Cartesia `pcm_s16le @ 24kHz` is lower-quality than 44.1kHz but cuts ~20ms decode time. If demo feedback says voice sounds tinny, upgrade to 44.1kHz at the latency cost.

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
