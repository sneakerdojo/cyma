# Browser Voice Agent (Pipecat + Cartesia + Deepgram + Mastra) — spec

**Status:** Draft — awaiting approval before code.
**Date:** 2026-05-13.
**Supersedes:** none (extends `2026-05-12-voice-agent-superseded.md` with a browser-first Phase 1 path).
**Patient Zero target:** "Talk to our AI receptionist" demo on `octio.co.za` — visitor clicks a CTA on the marketing page, gets connected to Octo via their browser mic + speaker, full voice conversation, no telephony.

## Goal

Ship a working in-browser voice agent on `octio.co.za` in approximately 6 days that:

- Captures the visitor's microphone audio in the browser
- Streams it to a server-side pipeline (STT → existing Mastra brain → TTS)
- Plays the agent's spoken reply back through the browser speakers
- Hits **mouth-to-ear p50 < 1.3s, p95 < 2.0s** (foreground-tab, working network)
- Reuses the existing voice-agent orchestrator + mock tools (and later the production tools when wired)
- Works on iOS Safari foreground tab (out of scope: lock-screen, PWA standalone background)

This is **Phase 1** of the broader voice-agent product. **Phase 2** (Twilio inbound for paying customers) lands as a different transport plugin into the same Pipecat pipeline — minimal rework.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser (octio.co.za/voice-sim, foreground tab only)      │
│  - pipecat-client-web + SmallWebRTCTransport (or Daily)    │
│  - RTCPeerConnection (Opus, AEC, NS, AGC built in)         │
│  - One persistent <audio> element unlocked on Start tap    │
│  - Silero VAD (ricky0123/vad-web) for barge-in             │
└─────────────────────┬──────────────────────────────────────┘
                      │ WebRTC (Opus over RTP)
                      ▼
┌────────────────────────────────────────────────────────────┐
│  Pipecat bot sidecar (Python, Fly.io machine)              │
│  - Terminates WebRTC via aiortc                            │
│  - DeepgramSTTService (Nova-3 streaming + Flux eager-EOT)  │
│  - Sentence aggregator (TextAggregationMode.SENTENCE)      │
│  - CartesiaTTSService (Sonic-3, pcm_s16le @ 24kHz)         │
│  - Calls our Bun brain endpoint per turn (see below)       │
└─────────────────────┬──────────────────────────────────────┘
                      │ HTTPS POST /api/voice-agent/turn
                      │ body: { sessionId, transcript, tenantBrand }
                      │ response: { reply, toolCalls[] }
                      ▼
┌────────────────────────────────────────────────────────────┐
│  Bun/Hono worker (existing packages/worker/)               │
│  - Reuses src/services/voice-agent/orchestrator.ts          │
│  - Reuses src/services/voice-agent/mock-brain.ts            │
│    (swap for real Mastra agent on octio.ts when ready)     │
│  - Reuses src/services/profile/* for caller recognition    │
│  - Reuses tools (mock now; Google Calendar later)          │
└────────────────────────────────────────────────────────────┘
```

### Why this shape

- **WebRTC for browser↔backend, WebSocket for backend↔providers.** WebRTC is the 2026 default for browser voice (Pipecat, LiveKit, Vapi, OpenAI Realtime all converge here). It hands us AEC + Opus + jitter buffer + packet-loss concealment for free.
- **Python sidecar is unavoidable in 2026.** No production-grade WebRTC media stack exists for Bun. Pipecat's `aiortc` is the canonical reference. We accept one extra container; in exchange we skip ~3 weeks of AEC/jitter/iOS bugs.
- **Mastra stays intact.** Pipecat's LLM step is an HTTP call to our Bun endpoint. The existing `mockBrain` / future production agent on `octo.ts` runs unchanged.
- **The orchestrator we shipped is reused, not replaced.** Phase 1 calls `runTurn(...)` per turn via HTTP. Phase 2 (Twilio inbound) hits the same orchestrator from a different transport.

## Stack BOM (verified May 2026)

| Layer | Choice | Verified detail | Cost |
|---|---|---|---|
| Browser transport | **WebRTC** via `pipecat-client-web` + `SmallWebRTCTransport` (or Daily plugin) | Native Opus + AEC; 60–150ms transport | $0 (SmallWebRTC P2P) or Daily passthrough |
| Browser playback | **Web Audio API + AudioWorklet ring buffer**, raw `pcm_s16le @ 24kHz` from Cartesia | Sub-50ms playback start, sample-accurate scheduling. **Not** MediaSource Extensions. | $0 |
| iOS unlock | **One persistent `<audio>` element + `AudioContext.resume()` on Start tap** | Works for full session. Reused for every turn. | $0 |
| Barge-in | **Silero VAD via `ricky0123/vad-web` in AudioWorklet** | 86% precision / 100% recall. Stops bot mid-sentence on caller speech. | $0 |
| Sidecar runtime | **Python 3.12 + Pipecat + aiortc** in Docker on Fly.io machine | ~256MB RAM idle | ~$5–10/mo |
| STT | **Deepgram Nova-3 streaming** with **Flux eager-EOT** (`eager_eot_threshold=0.4`) | 150–300ms first-final. Saves ~250ms vs hard EOT but 50–70% more LLM calls. ⚠️ SA accent unverified — see Pre-flight gate. | $0.0077/min PAYG |
| STT audio format | **PCM linear16 @ 16kHz mono** | Deepgram's preferred format; sample rate down-converted server-side from WebRTC's 48kHz Opus. | — |
| Brain | **Existing Mastra Octo agent** on Bun/Hono, called via `/api/voice-agent/turn` (new route) | No code rewrite; HTTP wrapper around `runTurn(...)` | ~$0.012/min Haiku 4.5 EU |
| TTS | **Cartesia Sonic-3** primary, ElevenLabs Flash v2.5 fallback | 90ms TTFA; `pcm_s16le @ 24kHz` for raw playback. Sentence-boundary chunking via Pipecat. | $0.0105/min |
| Total provider cost | | | **~$0.03/min** (or ~$18/day at 600 conv-mins) |

## User flow (caller-facing)

1. Visitor lands on `octio.co.za/voice-sim` (or the marketing page CTA "Talk to our AI receptionist")
2. Page shows a single **Start conversation** button + brief explainer + privacy notice
3. Visitor taps Start:
   - Browser prompts for microphone permission (POPIA-compliant disclosure shown)
   - `AudioContext.resume()` + silent buffer played → audio unlocked for the session
   - `pipecat-client-web` initiates WebRTC peer connection to the Pipecat bot
   - "Connecting..." UI for ~500ms
4. Bot greets: "Hi, you've reached Octio. How can I help today?" (TTS streams via WebRTC)
5. Conversation proceeds turn-by-turn. Visitor can interrupt the bot mid-sentence (Silero VAD detects speech, signals barge-in).
6. Visual UI: an animated orb shows agent state (listening / thinking / speaking). Live transcript below.
7. **End** when: visitor clicks End / tab is closed / 5 minutes idle / route_to_human tool fires (in production, transfers to a Twilio number; in demo, posts to Slack).
8. Post-call: visitor sees a summary card + CTA to book a real discovery call ("This was a demo. Want to deploy this on your own number?").

## Server-side flow (per turn)

1. Pipecat bot receives caller utterance via WebRTC
2. Pipecat streams Opus → decodes → resamples to 16kHz mono PCM
3. PCM → Deepgram Nova-3 streaming WebSocket. Flux EOT fires `EagerEndOfTurn` at confidence ≥ 0.4
4. Pipecat hits `POST /api/voice-agent/turn` on the Bun worker with `{ sessionId, transcript, tenantBrand, callerNumber? }`
5. Bun worker:
   - Calls `profileLookup({ tenantId, identity, repo })` — returns `summary` if a profile exists with consent
   - Calls `runTurn(...)` with the orchestrator (using existing `mockBrain` or production agent)
   - Returns `{ reply, toolCalls, latencyMs }`
6. Pipecat passes the reply to Cartesia Sonic-3 streaming (sentence-aggregated, first clause streams immediately)
7. Cartesia → PCM chunks → AudioWorklet ring buffer in browser → speakers

## Latency budget (p50)

| Stage | Budget |
|---|---|
| Browser → Pipecat WebRTC ingress | 80ms |
| Pipecat Opus decode + resample | 30ms |
| Deepgram Nova-3 STT first-final | 200ms |
| Flux eager-EOT signal | 200ms |
| Pipecat → Bun brain HTTP RT | 250ms |
| Cartesia Sonic-3 TTFA | 90ms |
| Pipecat → browser playback start | 120ms |
| **Total p50** | **~970ms mouth-to-ear** |
| p95 target | **< 2.0s** |

This beats the original phone-receptionist spec's 1.35–1.55s p50 budget. Browser-voice has fewer intercontinental hops than SA-Twilio-IE1-cloud.

## Pre-flight gates (do these before writing code)

1. **SA-accent STT benchmark.** Build a 30-sample test set of SA-accented English (founder + 5 friends + 24 public-domain SA speech samples) recorded via browser mic. Run through Deepgram Nova-3 + Speechmatics Ursa 2 streaming. Pick whichever beats 10% WER. If both fail, escalate to Lelapa Vulavula pilot.
   - Acceptance: chosen provider hits WER ≤ 10% on phone-audio-like SA speech.
   - Reject criterion: WER > 15% in either provider; revisit STT choice.

2. **iOS Safari real-device test.** On a physical iPhone (any 16+/iOS 18+), open `octio.co.za` in Safari, tap Start, verify mic capture + WebRTC handshake + audio playback all work in a foreground tab.
   - Acceptance: bot greets, hears the caller, replies within ~1.5s end-to-end.
   - Reject criterion: any of mic / WebRTC / playback fails on iOS Safari 18+.

3. **Pipecat + Bun roundtrip.** Stand up a minimal Pipecat pipeline locally that hits the existing `/api/voice-agent/simulate` route (mocked transcript-only), confirms the brain returns a reply, confirms TTS plays.
   - Acceptance: end-to-end "hello world" works in < 4 hours of setup.
   - Reject criterion: blocker found in Pipecat ↔ Bun communication.

If any pre-flight gate fails, stop and revisit before building further.

## Build sequence (post pre-flight gates)

| Day | Slice | Output |
|---|---|---|
| 0 (Pre-flight) | SA-accent benchmark + iOS Safari real-device test + Pipecat hello-world | Go / no-go on stack |
| 1 | Pipecat bot sidecar — STT + Brain HTTP call + TTS pipeline | Bot terminates WebRTC, runs STT → Bun brain → TTS |
| 2 | Pipecat bot — sentence aggregator + Cartesia Sonic-3 streaming | First clause streams immediately; sub-500ms perceived latency |
| 3 | Browser client — `pipecat-client-web` integration + WebRTC peer | Mic capture + WebRTC peer + Web Audio playback |
| 4 | iOS Safari unlock UX + persistent `<audio>` element + start CTA | Works on iPhone Safari foreground |
| 5 | Silero VAD barge-in + orb UI states (idle / listening / thinking / speaking) | Bot stops mid-sentence; visual feedback |
| 6 | Wire to `/voice-sim` page (replace mock-text input with live mic) + Patient Zero soak | Live voice agent on `octio.co.za` |

## Tests (TDD, per the user stories already shipped)

Reuses test signatures from `docs/stories/voice-agent-v1.md` and `voice-agent-v2.md`. Adds browser-specific tests:

| Story / Test | What's tested | Where |
|---|---|---|
| US-VA-001 pickup | First audio reaches browser ≤ 2s after Start tap | Playwright E2E |
| US-VA-007 barge-in | Bot stops within 200ms of caller speech detected | Manual on real device + unit test on Silero VAD |
| US-VA-025 latency p50/p95 | p50 < 1.3s / p95 < 2.0s over 100 simulated calls | Pipecat client harness |
| US-VA-031 fallback cascade | Anthropic 503 → Gemini Flash → Groq → static reply | Mocked at brain endpoint |
| US-VA-042 spoken consent | After first qualification turn, agent asks consent; persists decision | Browser E2E |

Pre-existing 29 voice-agent unit tests (orchestrator, tools, mock-brain) stay green.

## Privacy + POPIA notes

- **Consent disclosure on Start tap:** "By talking to us, you agree to our [Privacy Notice]. We record this conversation for service quality." Reuses `recordConsent` from profile service.
- **No call recording in v1.** Audio is processed in-flight (STT → discarded). Transcripts are stored for 90 days per existing retention policy.
- **POPIA Information Officer:** unchanged — founder is the IO; audit log captures every turn via `profileAuditLog`.
- **WebRTC encryption:** SRTP end-to-end between browser and Pipecat bot. No mitm risk.
- **Pipecat sidecar deployment:** Fly.io machine in EU region (POPIA-friendly residency).
- **EU residency for Deepgram + Anthropic + Cartesia:** verified during pre-flight.

## Out of scope (v1)

- iOS PWA standalone mode (cold-launch mic re-prompt + background audio not feasible)
- Native iOS app
- Multi-party calls
- Recording / playback of past calls
- Telephony inbound (Phase 2)
- Outbound calling
- Languages other than English (Phase 2 — Afrikaans via ElevenLabs v3; Phase 3 — Nguni via Lelapa Vulavula)

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SA-accent STT WER too high | Medium | High | Pre-flight benchmark mandatory. Speechmatics fallback. |
| Python sidecar adds ops burden | Low | Medium | Fly.io single machine; observability via Better Stack already wired. |
| iOS Safari quirk breaks demo | Medium | High | Pre-flight real-device test. Foreground-only constraint documented. |
| Cartesia outage | Low | Medium | ElevenLabs Flash v2.5 fallback configured in Pipecat |
| Deepgram outage | Low | High | Speechmatics fallback configured in Pipecat |
| Anthropic API rate limit | Medium | Medium | Existing fallback cascade (Haiku → Gemini → Groq) |
| WebRTC ICE failure (corporate NAT, restrictive mobile networks) | Low | Medium | Daily transport (managed TURN) as fallback to SmallWebRTC P2P |
| Cost overrun on demo traffic | Low | Low | Daily cap at $30 spend; auto-disable demo if exceeded |

## Open questions

1. **SmallWebRTC P2P vs Daily managed SFU.** SmallWebRTC is free + no third-party but doesn't include TURN for corporate-NAT users. Daily costs ~$0.004/participant-minute but solves TURN. Decision after the iOS real-device test — if WebRTC works clean on mobile networks, stay P2P; if not, switch to Daily.

2. **Demo vs production brain.** v1 of this spec defaults to the existing `mockBrain` for safety + determinism while we shake out infra. Switch to the production Mastra agent on `octo.ts` after 1 week of Patient Zero soak.

3. **Audio quality vs latency trade.** Cartesia `pcm_s16le @ 24kHz` is lower-quality than 44.1kHz but cuts ~20ms decode time. If demo feedback says voice sounds tinny, upgrade to 44.1kHz with ~30ms latency penalty.

## Citations

- [Pipecat client-web (GitHub)](https://github.com/pipecat-ai/pipecat-client-web)
- [Pipecat SmallWebRTCTransport docs](https://docs.pipecat.ai/server/services/transport/small-webrtc)
- [Cartesia Sonic-3 WebSocket docs](https://docs.cartesia.ai/api-reference/tts/websocket)
- [Deepgram Flux Quickstart](https://developers.deepgram.com/docs/flux/quickstart)
- [Deepgram JWT token-based auth](https://developers.deepgram.com/guides/fundamentals/token-based-authentication)
- [ricky0123/vad-web (Silero VAD)](https://github.com/ricky0123/vad)
- [Matt Montag — Unlock Web Audio in Safari (iOS)](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)
- [LiveKit — Why WebRTC beats WebSockets for voice AI](https://livekit.com/blog/why-webrtc-beats-websockets-for-voice-ai-agents)
- [AssemblyAI — Vapi vs Pipecat vs LiveKit (2026)](https://www.assemblyai.com/blog/vapi-vs-pipecat-vs-livekit)
- [iOS Safari WebRTC 2026 (VideoSDK)](https://www.videosdk.live/developer-hub/webrtc/webrtc-safari)
