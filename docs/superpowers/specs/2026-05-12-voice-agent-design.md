# Octio Voice Agent — Design

> ⚠️ **SUPERSEDED on 2026-05-12.** This spec has been replaced by [`2026-05-12-voice-agent-superseded.md`](./2026-05-12-voice-agent-superseded.md), which incorporates verified stack research (Retell AI + Twilio SIP + Deepgram Nova-3 + Haiku 4.5 EU + Cartesia Sonic-3) and realistic SA-latency targets (p50 < 1.4s; sub-1s is physics-impossible for SA → cloud LLM). Read the new spec; this one is kept only for traceability.

**Status:** Draft, awaiting approval. Day 3 of the 7-day build plan.
**Author:** Simekani + Claude (Opus 4.7)
**Last updated:** 2026-05-12
**Powers:** Voice & Chat Agents SKU on octio.co.za (R6,500/mo entry — voice half)
**Builds in:** existing `cyma` repo's worker (new routes + services), not a new repo

---

## 1. Goal

Pick up inbound phone calls on a customer's Twilio number, have a real-time AI conversation with the caller (sub-1.5s/turn target), qualify them, and either book a discovery call into the customer's calendar OR escalate to a human / take a message.

Marketed positioning: *"24/7 AI receptionist for phone, web chat, and WhatsApp. Picks up sub-1-second, books appointments, escalates to humans."*

## 2. Architecture

```
Caller → Twilio number → Twilio webhook → Worker /api/voice/twilio/incoming
                            │
                            ▼
                  Returns TwiML <Stream> URL
                            │
                            ▼
                  Twilio Media Stream (WebSocket)
                  ←→ Worker WebSocket handler
                            │
                ┌───────────┼───────────┐
                ▼                       ▼
              Deepgram               ElevenLabs
              (streaming STT)        (Flash v2.5 TTS)
                │                       ▲
                └─► transcript chunks   │
                    → Kimi/Claude       │
                    → response text ────┘
                            │
                            ▼
                  Save voice_calls row
                  Trigger booking flow if needed
```

**Latency budget per turn (caller-says → AI-replies):** 1500ms wall-clock.
- STT partial: 200ms
- LLM response: 800ms (use Kimi K2 Turbo, not full Claude — vision not needed here)
- TTS first byte: 300ms
- Twilio audio piping overhead: 200ms

If we miss budget: fallback to ElevenLabs Flash + smaller LLM, OR degrade to push-to-talk via Twilio `<Gather>`.

## 3. Components

| Component | Choice | Why |
|---|---|---|
| Telephony | Twilio Programmable Voice | SA support, well-trodden, $1/mo number + ~$0.013/min |
| Streaming STT | Deepgram Nova-2 | Fastest streaming STT in 2026 (~150ms partials), $0.0043/min, supports SA English |
| LLM | Kimi K2 Turbo | We already have it; cheap; fast enough |
| TTS | ElevenLabs Flash v2.5 | Sub-300ms first-byte, $0.30/1k chars |
| Cron/queue | node-cron in worker | Already running |
| DB | Existing Postgres | Reuse |

## 4. Data model

```sql
CREATE TABLE voice_calls (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL DEFAULT 1,
  twilio_call_sid TEXT UNIQUE NOT NULL,
  from_number     TEXT NOT NULL,
  to_number       TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_secs   INTEGER,
  transcript      JSONB,                       -- [{ role, text, t_offset_ms }]
  outcome         TEXT,                        -- 'booked' | 'message' | 'transferred' | 'hangup' | 'no_answer'
  booking_id      BIGINT REFERENCES bookings(id),
  message_text    TEXT,                        -- when outcome='message'
  transfer_to     TEXT,                        -- phone number transferred to
  cost_cents      INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'in_progress',
  error           TEXT
);
CREATE INDEX vc_tenant_started_idx ON voice_calls (tenant_id, started_at DESC);
```

Tenant-scoped Twilio config in existing `channel_accounts` table:

```
channel_accounts (existing from content engine spec)
  channel = 'twilio'
  external_id = Twilio number SID
  display_name = "+27 12 345 6789"
  access_token = Twilio Auth Token (AES-encrypted) — null if shared Octio account
```

Tenant voice config in `tenant_agent_config.voice`:

```typescript
{
  voice: {
    voiceId: string,              // ElevenLabs voice ID
    language: 'en-US' | 'en-ZA' | 'af' | 'zu',  // Phase 1 en-US only
    greeting: string,             // "Thanks for calling Octio, this is the AI receptionist. How can I help?"
    qualifyingQuestions: string[],
    escalation: {
      humanNumber: string|null,   // null = take message
      escalationTriggers: string[], // 'caller says emergency' | 'asks for specific human' | 'frustrated'
    },
    businessHours: { tz, days }   // outside hours, agent says "let me take a message"
  }
}
```

## 5. Worker routes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/voice/twilio/incoming` | Twilio webhook on inbound — returns TwiML pointing at our Stream URL |
| WS | `/api/voice/stream/:callSid` | Media stream handler; pipes Deepgram + Kimi + ElevenLabs |
| POST | `/api/voice/twilio/status` | Twilio webhook for call status updates |
| GET | `/api/admin/voice/calls?tenantId=` | Admin: list recent calls (admin dashboard day 5) |
| GET | `/api/admin/voice/calls/:id` | Admin: full transcript |

## 6. Day-3 MVP scope

**In:**
- Inbound calls only (no outbound)
- English language only
- One Twilio number per tenant
- Booking integration: agent calls existing `/book` flow if caller wants to book
- Message-taking: agent writes message to `voice_calls.message_text` + emails it to tenant via existing Gmail send
- Transfer to human via Twilio `<Dial>` if escalation rule matches

**Out (week 2+):**
- Outbound calling (Twilio dial-out + agent-initiated calls)
- Multi-language (Afrikaans/Zulu/Xhosa for Enterprise tier)
- Call recording → S3 (only transcript saved day 3)
- Voicemail transcription as standalone feature (separate from message-taking)
- IVR menu trees / DTMF input
- Warm transfer with context handoff (basic blind transfer only day 3)

## 7. Failure modes & fallbacks

| Failure | Fallback |
|---|---|
| Deepgram unreachable | Twilio's built-in `<Gather speech>` — push-to-talk, worse UX but functional |
| ElevenLabs slow / down | Twilio `<Say>` with Polly voice — robotic but never fails |
| LLM timeout (>2s) | Pre-rolled fallback lines: "Let me grab someone for you — what's the best number to reach you on?" |
| Caller speaks language we don't support | Pre-rolled fallback: "I'll have someone call you back" + message-take flow |
| Twilio WebSocket drops mid-call | Save partial transcript with `status='dropped'`; alert via Slack |

## 8. Cost economics

Per typical 3-min call:
- Twilio voice: $0.013/min × 3 = $0.04
- Deepgram Nova-2: $0.0043/min × 3 = $0.013
- Kimi K2 Turbo: ~$0.01 of tokens
- ElevenLabs Flash: ~$0.30/1k chars × ~1.5k chars = $0.45

**Total per call:** ~$0.50 = R9. Customer pays R6,500/month entry for unlimited calls (assume ~200 calls/month). Our marginal cost: R1,800. Gross margin: 72%. Healthy.

## 9. Phase 1 estimate (day 3 of 7-day plan)

~8 hours focused work for a single dev:
- 1h: Twilio number provisioning + webhook setup
- 2h: WebSocket media stream handler + Deepgram integration
- 2h: LLM agent + conversation context + booking-flow integration
- 1h: ElevenLabs TTS streaming back to Twilio
- 1h: Database wiring + tenant config plumbing
- 1h: End-to-end test + fallback paths + deploy

## 10. Approval checklist
- [ ] Architecture (§2) + component choices (§3) → approved
- [ ] Data model (§4) → approved
- [ ] API surface (§5) — **needs explicit approval per global rule**
- [ ] MVP scope (§6) → approved
- [ ] Failure-mode fallbacks (§7) → approved
- [ ] Cost economics (§8) → approved
- [ ] 8h estimate for day 3 → approved
