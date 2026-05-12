# Voice Agent (Octo on +27 number) — Spec v2

**Status:** Active. Supersedes `2026-05-12-voice-agent-design.md`.
**Last verified:** 2026-05-12 via 8-agent Reddit + Medium + vendor-docs research pass.
**Patient Zero:** Octio's own inbound SA phone number.

## Goal

A 24/7 AI receptionist that answers SA Twilio inbound calls, qualifies, books appointments into Google Calendar, escalates urgent cases to the founder. Sounds human, sub-2-second p95 mouth-to-ear.

Patient Zero metrics: **pickup rate, booking accuracy, escalation rate, customer comments**.

## Reality check: sub-1s is physics-impossible for SA → US/EU stack

Twilio has no SA Media Streams region. Inbound audio routes SA → IE1 (Dublin) at ~150–220ms RTT or US1 at ~260ms. Add ~100ms WebSocket overhead. Then the LLM call (any provider in EU or US) adds another intercontinental hop. Operator data from Twilio, LiveKit, Vapi, AssemblyAI converges on:

**Realistic median mouth-to-ear for our stack: 1.35–1.55s. Sub-1s requires both endpoints in the same region — not achievable for SA inbound → cloud LLM today.**

Target band: **p50 < 1.4s / p95 < 2.0s**. Twilio's ConversationRelay published median is 1,115ms — that IS the production norm. Don't burn engineering weeks chasing a number physics rejects.

## The stack

**Winning configuration (verified May 2026):**

| Layer | Choice | Reason |
|---|---|---|
| Telephony | **Twilio SA inbound + SIP trunk** ($0.010/min + $1.50–4.00/mo per +27 11 or +27 21 number) | Only viable SA inbound provider; SIP saves 100–200ms vs Media Streams |
| Orchestration | **Retell AI** ($0.07/min platform fee) | Lowest TCO; managed agent; function-calling for Calendar; barge-in handled; ship in days |
| STT | **Deepgram Nova-3 with Flux eager-EOT** ($0.0077/min PAYG) | Sub-300ms first-final; semantic end-of-turn beats VAD silence-wait by 500–1000ms. Pair with keyterm prompting for SA proper nouns (Sandton, Sasol, common SA surnames). |
| LLM reasoning | **Claude Haiku 4.5 in EU** ($1/$5 per 1M) | ~80ms slower TTFT than Groq Llama 3.3 but ~200ms RTT savings vs Groq US — net win. Better function-calling reliability than Llama for calendar booking. |
| TTS | **Cartesia Sonic-3** (~$0.02–0.03/min equivalent at our volume) | 40–90ms TTFB — 100ms faster than ElevenLabs Flash. Acceptable voice quality. Use ElevenLabs Flash v2.5 as fallback for premium-voice tier. |
| Calendar | Google Calendar API direct | OAuth per tenant; insert via Retell function-call |
| Escalation routing | Twilio `<Dial>` verb warm-transfer + Slack alert in parallel | Fallback when LLM tool-call misses urgency (operator-reported 2–5% miss rate) |

**Cost math at 1,000 mins/customer/month (verified May 2026):**

| Item | Cost |
|---|---|
| Twilio SA inbound (1,000 min × $0.010) | $10.00 ≈ R165 |
| Twilio number rental | $1.50–4.00 ≈ R30–66 |
| Retell platform (1,000 min × $0.07) | $70.00 ≈ R1,150 |
| Deepgram Nova-3 (1,000 min × $0.0077) | $7.70 ≈ R127 |
| Cartesia Sonic-3 (estimated 800k chars × ~$0.02/1k) | $16.00 ≈ R263 |
| Claude Haiku 4.5 EU (estimated 6M tokens routed) | ~$22 ≈ R362 |
| **Total marginal cost / customer / month** | **~R2,100** |
| **Margin at R6,500/mo Voice tier** | **~68%** |
| **Margin at R12,500/mo Growth tier** | **~83%** |

Margin tightens compared to the Lead Gen-only customer (94% margin) because voice is genuinely more expensive. Suite bundle (R18,500) restores margin to ~90% by amortising across products.

## Why we rejected the alternatives

| Alternative | Why we rejected |
|---|---|
| **Vapi BYO keys** | Cheaper-per-min on paper ($0.05/min platform) but hidden-cost creep to $0.20–0.33/min once you add retries, transfer minutes, recording — operators consistently report this. More config knobs = more places to bleed. Re-evaluate at 10+ customers. |
| **LiveKit Agents self-hosted** | Best margin past 10k aggregate mins/month, but solo-founder ops cost > savings until then. Graduate when customer count > 10. |
| **Synthflow / Bland** | Synthflow $0.09/min + LLM; Bland $0.11–0.14/min. Both fine but no clear win vs Retell, and Bland has had pricing volatility (raised Dec 2025). |
| **Llama 3.3 70B on Groq for LLM** | Faster TTFT (50–180ms) but function-calling reliability gap for calendar booking. Operator anecdotes show flaky tool firing. Haiku 4.5 EU is more reliable for booking. Keep Groq as fallback for non-tool-using turns. |
| **ElevenLabs Flash v2.5 for primary TTS** | Better voice quality but 200–300ms TTFB vs Cartesia Sonic-3's 40–90ms. We can't afford 100ms when total budget is 1.4s. Eleven goes in Growth tier (custom voice clone) only. |
| **Whisper self-hosted for STT** | Batch-only; not real-time-ready without serious infra. Skip. |
| **Speechmatics** | Marketing claim is 1.07% WER but on US/UK clean audio — not validated on SA-accented phone audio. AfriSpeech-MultiBench shows real-world SA WER is 8–15% for both Speechmatics and Deepgram. Deepgram wins on price, latency, Twilio integration. |
| **OpenAI Realtime API** | New, expensive ($0.06/$0.24 per minute audio); voice quality strong but cost destroys margin. Re-evaluate at 200+ customers if voice quality becomes the differentiator. |

## Latency budget (where every millisecond goes)

| Stage | Budget |
|---|---|
| SA caller → Twilio IE1 inbound | 250 ms |
| Twilio Media Stream / SIP overhead | 100 ms |
| Deepgram Nova-3 streaming interim → final | 150–300 ms |
| Flux eager-EOT (semantic turn detection) | 150–250 ms |
| Haiku 4.5 EU TTFT (SA orchestrator → Anthropic EU) | 250–350 ms |
| Cartesia Sonic-3 TTFB | 100–180 ms |
| Outbound media → caller ear | 250 ms |
| **Total p50** | **~1.25–1.55 s** |
| **Total p95** | **~1.8–2.0 s** |

Three engineering tricks that reliably hit this band (operator consensus from r/AI_Agents + LiveKit + Pipecat blogs):

1. **Streaming everywhere + sentence-boundary TTS chunking** — pipe LLM tokens into TTS at first clause boundary (10–15 tokens). Latency collapses from `STT + LLM + TTS` to `max(STT, LLM, TTS)`. Retell/Vapi/Pipecat all do this — verify on configuration.
2. **Semantic end-of-turn + eager LLM speculation** — replace pure-VAD silence-waits (500–1500ms) with Flux's eager EOT or Pipecat's smart-turn transformer. Fire LLM speculatively on partial transcripts; cancel if caller keeps talking. Saves 200–400ms p50.
3. **Speculative tool calling + filler speech** — when a tool will fire (calendar lookup), emit conversational acknowledgement ("Let me check that...") via TTS in parallel with the tool call. Pre-execute read-only tools on predicted intent.

## Call flow (turn-by-turn)

```
Caller dials +27 11 xxx xxxx
  │
  ▼
[Twilio inbound webhook] → Retell agent starts
  │
  ▼
Agent: "Hi, you've reached [Customer]. How can I help?"
  │
  ▼
┌────────────────────────────────────────────────────────┐
│ Loop (max 20 turns):                                    │
│  - STT (interim + final + Flux eager-EOT)              │
│  - LLM (Haiku 4.5; tool: lookup_availability,          │
│         book_appointment, route_to_human)              │
│  - TTS (Cartesia Sonic-3, streaming, sentence chunked) │
└────────────────────────────────────────────────────────┘
  │
  ├─ urgency_score > 0.7 ──→ <Dial> warm-transfer to founder + Slack alert
  ├─ booking_confirmed ──→ Calendar insert + send WhatsApp confirmation
  └─ end_of_call ──→ Save transcript + sentiment score + Slack summary
```

## Patient Zero metrics scorecard

| Metric | Target Phase A (shadow, test number) | Target Phase B (solo on Octio inbound) | Target Phase C (public proof) |
|---|---|---|---|
| Pickup rate (call answered within 1 ring) | 99% | 99.5% | 99.9% |
| Booking accuracy (slot booked = slot offered) | 90% | 95% | 99% |
| Escalation rate (correctly routed urgent cases) | 90% | 95% | 98% |
| Calendar misses (booked but no-show) | <20% | <15% | <10% |
| p50 mouth-to-ear latency | <1.6s | <1.4s | <1.4s |
| p95 mouth-to-ear latency | <2.5s | <2.0s | <2.0s |
| Caller complaints (negative sentiment in 50 calls) | <3 | <1 | 0 |
| Hallucinated answers (pricing, service area, hours) | 0 critical | 0 critical | 0 critical |

**Hard gate before Phase B:** zero critical incidents for 7 consecutive days running Patient Zero on Octio's actual line.

## Build sequence (3-day sprint within the 7-day plan)

**Day 1 (Twilio + Retell setup)**
- Provision Twilio +27 11 number for Octio
- Set up Retell agent with Sonic-3 + Deepgram + Haiku 4.5 EU
- Configure Twilio SIP trunk → Retell (not Media Streams)
- Initial system prompt + brand voice from Octio's chat

**Day 2 (Function-calling tools)**
- `lookup_availability(date_range)` — Google Calendar Free/Busy API
- `book_appointment(start_time, contact_info)` — Calendar Insert + WhatsApp confirmation
- `route_to_human(urgency_score, reason)` — Twilio `<Dial>` + Slack alert in parallel
- Pre-warm tools (no cold-start lambdas on the audio path)

**Day 3 (Patient Zero pilot)**
- Forward Octio's real inbound number to the agent
- Founder is the only escalation
- 24-hour soak test before customers
- Tune endpointing thresholds, keyterm prompting list, system prompt edge cases

**Beyond day 3 (within the 7-day window, parallel work)**
- Multi-tenant config (per-tenant brand voice, per-tenant phone number)
- Dashboard for call transcripts + sentiment

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Sub-1s expectations from buyers | Sales script: "p50 1.3s mouth-to-ear, faster than a human picking up a busy phone." Set expectations in onboarding. |
| p95 latency spikes hidden by good p50 | Measure p95 mouth-to-ear from day 1, not averages. Alert on p95 > 2.5s. |
| Function-call reliability gap | Haiku 4.5 (more reliable for tools) is primary; Llama on Groq is fallback for non-tool turns only. |
| Twilio jitter buffer spikes | Use SIP trunking (not Media Streams). Test SA → IE1 routing under load. |
| Founder-escalation miss (2–5% rate) | Twilio `<Dial>` verb fallback alongside Slack alert. Belt + braces. |
| Caller talks over the bot (barge-in) | Retell handles natively; verify before launch. |
| POPIA: call recording + transcript storage | DPA with Retell (HIPAA-equivalent posture). EU data residency configurable. Retention policy: 30 days transcripts, 90 days call audio (configurable per tenant). |
| Meta Jan 2026 rule (WhatsApp confirmations) | Use Meta-approved templates only for utility (booking confirmation). Tested in Lead Gen spec. |
| ElevenLabs Flash zu/xh/st unsupported | Stay English-only Phase 1. Afrikaans via ElevenLabs v3 Phase 2. Nguni via Lelapa Vulavula Phase 3 (pilot first). |
| Speechmatics A/B test deferred | Decision: ship on Deepgram. Re-test Speechmatics at 20+ customers if SA-accent complaints exceed 5% of calls. |

## Compliance gates

| Gate | Check |
|---|---|
| Twilio SA number provisioned | Day 1 |
| Retell DPA (POPIA-equivalent) signed | Pre-launch |
| Per-tenant call recording opt-in (POPIA s.69) | Mandatory before any inbound call recording |
| Caller announcement of recording | First-second of every call: "Calls may be recorded for quality" |
| Founder fallback number configured | Day 3, tested before Patient Zero |
| Hallucination check (50 random calls reviewed weekly) | First 60 days |

## Phase 2 / 3 deferred items

| Item | Phase | Note |
|---|---|---|
| Afrikaans (ElevenLabs v3) | Phase 2 | ElevenLabs v3 confirmed `afr`. Higher latency than Flash — acceptable for receptionist turns. |
| Zulu / Xhosa / Sesotho (Lelapa Vulavula TTS) | Phase 3 | Pilot streaming latency first. Free up to 1,000 calls/mo; $49/mo for 10k. |
| Speechmatics A/B (STT alternative) | Phase 2 | If SA-accent complaints > 5% |
| LiveKit self-host (margin play) | Phase 3 | When >10k aggregate mins/mo |
| Outbound dialling (proactive callback) | Phase 3 | Adds regulatory complexity; not needed in v1 |
| Call recording + sentiment dashboard | Phase 2 | Track now; ship UI later |
| Voice cloning per tenant (ElevenLabs IDs) | Growth tier only | Custom voice from $5/mo per voice |

## Open questions

1. Should we publish p50/p95 latency on the marketing site? Hypothesis: yes — "1.3-second pickup, every time" beats vague "fast AI" pitch.
2. Should the Phase 1 spec include WhatsApp inbound fallback (caller hangs up before booking, agent sends WhatsApp follow-up)? Hypothesis: yes by day 3. Free service-window inbound; high recovery rate.
3. Do we ever build our own voice infra past 10k mins (LiveKit + Pipecat self-host)? Hypothesis: yes at 100+ customers; defer until then.

## Citations

- [Retell AI vs Synthflow / Vapi / Bland](https://www.retellai.com/blog/vapi-vs-synthflow)
- [Vapi hidden cost analysis](https://www.retellai.com/blog/vapi-ai-review)
- [Twilio Core Latency in AI Voice Agents](https://www.twilio.com/en-us/blog/developers/best-practices/guide-core-latency-ai-voice-agents)
- [LiveKit Understand and Improve Agent Latency](https://livekit.com/blog/understand-and-improve-agent-latency)
- [Deepgram Flux eager-EOT](https://developers.deepgram.com/docs/flux/voice-agent-eager-eot)
- [GetStream speculative tool calling](https://getstream.io/blog/speculative-tool-calling-voice/)
- [Llama 3.3 70B benchmarks (Groq)](https://artificialanalysis.ai/models/llama-3-3-instruct-70b/providers)
- [ElevenLabs vs Cartesia TTS benchmark](https://speko.ai/benchmark/elevenlabs-vs-cartesia)
- [AfriSpeech-MultiBench (SA WER reality)](https://arxiv.org/abs/2511.14255)
- [Lelapa Vulavula](https://lelapa.ai/products/vulavula/)
- [Twilio SA WhatsApp number compatibility](https://support.twilio.com/hc/en-us/articles/360026678054)
- [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing)
