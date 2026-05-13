# Profile System — shared service spec

**Status:** Active. New.
**Last verified:** 2026-05-13.
**Consumes:** Lead Gen, Voice Agent (and any future agent that interacts with a person).
**Patient Zero:** Octio's own Octo on `octio.co.za` is the first consumer.

## Goal

A shared, per-tenant **profile service** that lets every agent (chat, voice, future SKUs) remember the people who interact with it: identity, history, preferences, and whatever else those people choose to share. The point is personalisation — every visitor/caller eventually gets a tailored experience instead of starting from zero every time.

## The four design decisions (locked-in 2026-05-13)

| Decision | Choice | Reasoning |
|---|---|---|
| **Cross-tenant boundary** | Per-tenant only | POPIA-safe. John's profile at Customer A is separate from his profile at Customer B. No cross-controller inference risk. |
| **Content scope** | User-led — "as much as the user is willing to provide" | Open-ended. We capture what the visitor offers; we don't fish. Off-topic mentions allowed (e.g. "startup idea") if the user shares them. |
| **Memory architecture** | Roll our own — Postgres + embeddings + summary jobs | We own the data. No new vendor DPA. Mastra-compatible. Lower break-even than buying a vendor at our scale. |
| **Consent surface** | Inline in chat / call | Visitor's first interaction includes the consent ask; opt-out at any time. Matches POPIA's informed-consent bar. |

## Architecture

```
                ┌─────────────────────────────────────────┐
                │     Lead Gen (chat)  + Voice Agent      │
                │     (and future agents)                  │
                └────────────────┬────────────────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │  profile service (shared)     │
                  │  worker/src/services/profile/ │
                  │                                │
                  │  - lookup(tenant, identity)    │
                  │  - extend(tenant, id, facts)   │
                  │  - consent(tenant, id, ...)    │
                  │  - forget(tenant, identity)    │
                  │  - export(tenant, identity)    │
                  │  - summarise(profile_id)       │
                  └────────────┬───────────────────┘
                               │
                               ▼
        ┌──────────────────────┴─────────────────────┐
        │  Postgres tables (all tenant-scoped):       │
        │   - profiles                                 │
        │   - profile_identifiers (phone, email, wa)  │
        │   - profile_facts                            │
        │   - profile_consent                          │
        │   - profile_embeddings                       │
        │   - profile_audit_log                        │
        └──────────────────────────────────────────────┘
```

The profile service is a single shared package. Each agent imports the same functions; the agents differ only in *how* they collect consent (text bubble vs. spoken disclosure) and *how* they personalise (different system-prompt injection points).

## Data model

### `profiles` (root entity)

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tenant_id | BIGINT | Indexed; every query filters by this |
| display_name | TEXT (encrypted) | Optional; whatever the person prefers to be called |
| created_at | TIMESTAMPTZ | |
| last_seen_at | TIMESTAMPTZ | Drives retention sweep |
| identity_confidence | NUMERIC | 0.0-1.0; probabilistic matching score |

### `profile_identifiers`

| Column | Type | Notes |
|---|---|---|
| profile_id | UUID FK | |
| kind | ENUM | `phone`, `email`, `whatsapp`, `name_hint` |
| value_hash | TEXT | SHA-256 of normalised value (for lookup) |
| value | TEXT (encrypted) | The actual value (encrypted at rest) |
| first_seen_at | TIMESTAMPTZ | |
| last_seen_at | TIMESTAMPTZ | |

A profile can have multiple identifiers; phone + WhatsApp + email all map to the same profile_id.

### `profile_facts`

| Column | Type | Notes |
|---|---|---|
| id | UUID | |
| profile_id | UUID FK | |
| category | ENUM | `preference`, `history`, `service_context`, `personal`, `off_topic`, `sensitive` |
| key | TEXT | e.g. `preferred_channel`, `last_service`, `startup_idea_summary` |
| value | JSONB | Free-form value |
| source | ENUM | `agent_inferred`, `user_stated`, `system_recorded` |
| confidence | NUMERIC | 0.0-1.0 |
| created_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ NULL | Per-fact TTL override |

### `profile_consent`

| Column | Type | Notes |
|---|---|---|
| profile_id | UUID FK | |
| granted | BOOLEAN | |
| granted_at | TIMESTAMPTZ | |
| revoked_at | TIMESTAMPTZ NULL | |
| consent_text_hash | TEXT | SHA-256 of the exact consent text shown; for audit |
| channel | ENUM | `chat`, `voice` |
| ip_or_caller_id_hash | TEXT | Audit trail |

### `profile_embeddings`

| Column | Type | Notes |
|---|---|---|
| profile_id | UUID FK | |
| fact_id | UUID FK NULL | If linked to a specific fact |
| embedding | VECTOR(768) | pgvector; uses `bge-small-en-v1.5` or similar lightweight model |
| text | TEXT (encrypted) | Summary text the embedding was generated from |
| created_at | TIMESTAMPTZ | |

### `profile_audit_log`

Append-only. Every read, write, consent change, export, deletion logged.

## Identity matching (probabilistic)

Phone is the strongest signal; we treat email and name as additional matchers. The matcher returns a `profile_id` and a `confidence` score.

| Input from agent | Match strategy | Confidence |
|---|---|---|
| Phone only (caller ID, WhatsApp number, chat-captured) | Hash lookup on `phone` | 0.85 base — same number can be family-shared |
| Phone + name confirmation ("Hi, is this still Sipho?") | Phone + display_name confirmed | 0.98 |
| Email only | Hash lookup on `email` | 0.90 |
| Phone + email (cross-confirmed by visitor) | Joint lookup | 0.99 |
| Caller-ID withheld | New profile (no link) | n/a |

Below 0.7 confidence → treat as a new profile; let the agent ask "is this still [name]?" to lift confidence.

## Consent flow

### Chat (Lead Gen)

After greeting + first message exchange:

> "Quick note — I can remember our conversation to help you faster next time. Want me to? You can change your mind any time."

Inline buttons: `Yes, remember me` / `No, this time only`. Opt-out is the default for any caller below age threshold (if surfaced).

### Voice (Voice Agent)

After greeting + first qualification turn (when there's already engagement):

> "Quick thing — I can remember this for next time so you don't have to repeat yourself. Want me to?"

The caller responds verbally; the agent classifies (`yes` / `no` / `ask later`). Recording disclosure already played at call start (US-VA-016).

### Consent rules

- **Both channels:** opt-in is recorded with the EXACT text hash (audit trail). Re-prompt every 12 months for renewal.
- **Voice:** explicit voice consent is recorded with a transcript snippet (audit fact).
- **Either channel:** "forget me" command (typed or spoken) triggers immediate `forget(tenant, identity)`.

## Personalisation (how agents USE the profile)

When an agent starts a session/call, it calls `profile.lookup(tenant, identity)`:

1. If no profile + no consent → continue as today (no change).
2. If profile exists + consent granted → load `profile.summary` (a compact, regenerated-nightly summary of facts) into the system prompt's "context about this person" block.
3. The agent uses the context to:
   - Personalise greeting ("Hi Sipho, calling about the geyser again?")
   - Skip already-known qualification turns
   - Offer relevant tools (e.g. if profile says `preferred_channel: whatsapp`, default the contact ask to WhatsApp)
   - Reference past topics ("Last time you mentioned you were thinking about starting a side business — anything come of that?")

The profile is loaded **once** at session start and not re-fetched mid-session. Token cost is bounded by the summary length cap (see below).

## Token economics

Loading raw `profile_facts` into every system prompt would blow up cost. Instead:

- Nightly summary job aggregates each profile's facts into a single ≤300-token summary (`profile.summary` column).
- The summary is the only thing injected into the system prompt at session start.
- For semantic recall (e.g. "what did they mention about kids?"), embeddings are queried on-demand via a tool call, not pre-loaded.

This caps per-session profile-context cost at:
- ~300 tokens × Sonnet input rate ($3/1M) ≈ R0.015 per session
- For 1000 sessions/customer/month ≈ R15 / customer / month profile overhead

Negligible against the chat revenue.

## POPIA mapping

| Obligation | Implementation |
|---|---|
| Lawful basis (s.11) | Explicit consent recorded inline; consent_text_hash for audit |
| Purpose specification (s.13) | Consent text explicitly states the purpose: "remember our conversation to help you faster next time" |
| Information quality (s.16) | Visitor can correct or update facts at any time ("actually, my number's different now") |
| Openness (s.17–18) | Per-tenant privacy notice lists profile system; Octio's own notice covers this |
| Security safeguards (s.19) | Identifiers encrypted at rest; access through tenant-scoped queries only |
| Data subject participation (s.23–24) | `profile.export()` + `profile.forget()` available via privacy@octio.co.za |
| Retention (s.14) | 24 months from `last_seen_at` triggers full purge |

## Retention + auto-purge

- Profile inactive 24 months → full deletion (all facts, embeddings, identifiers, audit history except deletion record).
- Specific fact categories may have shorter TTL:
  - `sensitive` category → 90 days
  - `off_topic` category → 12 months (less frequently referenced)
  - `personal` (name, channel pref) → matches profile lifetime
- TTL enforced by daily retention cron.

## Service interface (TypeScript)

```ts
// worker/src/services/profile/index.ts

export interface Identity {
  phone?: string;        // E.164 if present
  email?: string;
  whatsapp?: string;
  name_hint?: string;
}

export interface ProfileLookupResult {
  profile_id: string | null;
  confidence: number;
  consent_granted: boolean;
  summary: string | null;        // <=300 tokens of compact context
  preferred_channel: 'chat' | 'voice' | 'whatsapp' | 'email' | null;
}

export const profile = {
  lookup(tenantId: number, identity: Identity): Promise<ProfileLookupResult>,
  extend(tenantId: number, profileId: string, facts: ProfileFact[]): Promise<void>,
  consent(tenantId: number, profileId: string, decision: 'granted' | 'revoked', channel: 'chat' | 'voice', textHash: string): Promise<void>,
  forget(tenantId: number, identity: Identity): Promise<{ deleted: number }>,
  export(tenantId: number, identity: Identity): Promise<{ signedZipUrl: string }>,
  semanticRecall(profileId: string, query: string, k?: number): Promise<ProfileFact[]>,
};
```

## Integration points (per agent)

### Lead Gen (chat)

- Session-start: `profile.lookup` runs in parallel with greeting render.
- Turn 1-2: profile consent UI inline (US-LG-035).
- Throughout: agent reads `profile.summary` from system prompt.
- On any user statement that resembles a personal fact ("I prefer email," "I run a SaaS startup"), the agent calls `profile.extend` (US-LG-041).
- "Forget me" intent triggers `profile.forget` (US-LG-040).

### Voice Agent

- Call-start: `profile.lookup` runs in parallel with greeting.
- After greeting + first qualification turn: spoken consent (US-VA-042).
- Throughout: agent reads `profile.summary` from system prompt.
- Off-topic mentions trigger `profile.extend` (US-VA-048).
- "Forget me" / "delete my data" intent triggers `profile.forget` (US-VA-047).

## SOLID notes

- **Single Responsibility:** the profile service does ONE thing — manage profiles. Agents do qualification + booking; they consume the profile service, they don't own profile logic.
- **Open/Closed:** new agent types (CEO PA Phase 2) consume the same service without modifying it.
- **Liskov / Interface segregation:** `Identity` is a minimal shape; agents that have only phone use `{phone}`; agents that have email + name use both.
- **Dependency inversion:** the profile service depends on `Postgres + pgvector` via interfaces (`ProfileRepository`, `EmbeddingProvider`); the implementations can be swapped (e.g. test fakes, alternative DB).

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Identity-matching false-positive (treating a family member as the original) | Probabilistic confidence; agent confirms verbally / textually before personalising ("Hi — is this still Sipho?") |
| Off-topic content storage drifts beyond user intent | Hard cap: total `off_topic` facts per profile ≤ 20; oldest evicted; profile-extend requires explicit category tagging |
| Token bloat (profile summary grows) | Summary capped at 300 tokens; truncation logged for tuning |
| Consent revocation race condition | Forget operation is atomic and idempotent; retries safe |
| pgvector scaling | Indexed; if past 1M profiles we re-evaluate (well after we'd have made other architecture decisions anyway) |

## What this spec deliberately does NOT cover

- **Cross-tenant profile sharing.** Explicitly rejected (POPIA decision).
- **External CRM sync** (HubSpot/Pipedrive). Future spec when a customer requests it.
- **Customer-side profile management UI** beyond the basic dashboard list. Future spec.
- **Profile-based marketing/upsell across the Octio portfolio.** That's a Newsletter/Octio-CRM problem, not a profile-service problem.

## Open questions

1. Should the profile summary be tenant-aware (different brand voice in the summary), or generic facts only? Hypothesis: generic facts; the consuming agent's system prompt handles brand-voice rendering.
2. Should we support profile merging (visitor explicitly says "I'm also reachable at this other email")? Hypothesis: yes, via a `profile.merge` operation; Phase 1.5.
3. Should off-topic content (startup ideas, hobbies) require a per-mention consent confirmation, or is the umbrella consent enough? Hypothesis: umbrella consent is enough for v1; we revisit if any complaints.

## Citations

- POPIA s.11 + s.13 + s.14 + s.19 + s.23 + s.24: [Information Regulator SA](https://inforegulator.org.za/)
- pgvector: [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- bge-small embedding model (256MB, lightweight): [Hugging Face BAAI/bge-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5)
- Mastra Memory + Postgres: [Mastra Memory docs](https://mastra.ai/docs/memory)
