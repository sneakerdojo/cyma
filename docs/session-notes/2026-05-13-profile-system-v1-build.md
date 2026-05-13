# Profile System v1 — TDD build session

**Date:** 2026-05-13
**Branch baseline:** post-MR-!2-merge (bun + tailwind v4 + bun runtime)
**Spec:** `docs/superpowers/specs/2026-05-13-profile-system.md`
**Stories driven:** US-LG-035..046 (chat) + US-VA-042..052 (voice) profile slice

## What shipped (this session)

### Schema (`packages/worker/src/db/schema.ts`)

5 new tables, all tenant-scoped via `tenant_id INTEGER NOT NULL DEFAULT 1`:

- `profiles` — root entity, with `summary`, `preferred_channel`, `last_seen_at`
- `profile_identifiers` — phone/email/whatsapp/name_hint with SHA-256 `value_hash` for lookup
- `profile_facts` — JSONB value, per-category retention TTL
- `profile_consent` — append + revoke, stores `consent_text_hash` for audit
- `profile_audit_log` — append-only, PII-hashed targets only

Migration generated: `packages/worker/src/db/migrations/0004_legal_shriek.sql`.

### Service modules (`packages/worker/src/services/profile/`)

| Module | Purpose | Tests |
|---|---|---|
| `identity.ts` | `normaliseSAPhone`, `hashIdentifier`, `scoreIdentityConfidence` | 24 |
| `repo.ts` | `ProfileRepo` interface (data-access boundary) | — |
| `repo.drizzle.ts` | Production Drizzle-backed implementation | — (integration only) |
| `_fake-repo.ts` | In-memory test double | — |
| `lookup.ts` | Identity → profile + consent + summary | 11 |
| `consent.ts` | Resolve-or-create profile, hash text, audit | 10 |
| `extend.ts` | Write facts, enforce `off_topic` 20-cap + `sensitive` block | 9 |
| `forget.ts` | Hard-delete profile data (POPIA s.24) | 6 |
| `export.ts` | Subject access export (POPIA s.23) | 5 |
| `index.ts` | Public service entrypoint | — |

**Total: 65 unit tests, all green. Worker typecheck clean.**

### Architectural decisions (locked in)

1. **Repo abstraction** over direct Drizzle calls — every service module takes a `repo: ProfileRepo` parameter so unit tests use the in-memory fake and never touch Postgres. Drizzle wiring lives in one file (`repo.drizzle.ts`).
2. **Tenant scoping** on every table (`tenant_id INTEGER NOT NULL DEFAULT 1`). Single-tenant today (Octio = tenant 1); multi-tenant unblocked when needed.
3. **PII never in audit log** — `value_hash` for identifiers, `sha256(profile_id)` as `target_hash`, raw phone/email never recorded.
4. **Decline still creates a profile** so the 90-day no-re-ask rule (US-LG-038 / US-VA-045) has a persistence anchor. The "denied" profile has zero facts, just the consent denial.
5. **`sensitive` category is hard-rejected in v1** per spec — the field exists in the schema (so future v3 work doesn't need a schema migration) but writes are bounced.
6. **pgvector deferred** — `profile_embeddings` table not in this migration. Summary text only for v1. Semantic recall lands in v2.

## What's NOT in this slice (intentional)

| Item | Why deferred |
|---|---|
| `summarise.ts` (nightly summary job) | Needs LLM access + cron wiring. Service contract is in place (`profile.summary` column) but the actual summarisation logic is its own concern. |
| pgvector + embeddings | v2 scope per spec; not needed for v1 stories. |
| Octo agent integration (Lead Gen) | Wiring `profileLookup` → Octo's session start + adding `recordConsent` button to the chat widget is a separate slice. The shared service is now ready for it. |
| Voice Agent integration | Same — voice flow needs Retell + Twilio wiring, then plumbs into the same `profile.*` functions. |
| Audit Tool ToS guard | Distinct domain; profile service doesn't touch Claude Code. |
| Drizzle integration tests | Need a pg container fixture. The Drizzle repo is the lowest-confidence file in this slice; would catch bugs that the in-memory fake hides. |

## How to use it (from Lead Gen / Voice Agent)

```ts
import {
  profileLookup,
  recordConsent,
  extendProfile,
  forgetProfile,
  createDrizzleProfileRepo,
} from '../services/profile/index.js';

const repo = createDrizzleProfileRepo();

// On session start
const result = await profileLookup({
  tenantId: 1,
  identity: { phone: '+27821234567' },
  repo,
  actor: 'system:lead-gen',
});

if (result.profile_id && result.consent_granted && result.summary) {
  // inject result.summary into the agent's system prompt
}

// When the user clicks consent button
const consent = await recordConsent({
  tenantId: 1,
  identity: { phone: '+27821234567' },
  granted: true,
  channel: 'chat',
  consentText: 'Quick note — I can remember our chat...',
  repo,
});

// When the bot extracts a fact mid-conversation
await extendProfile({
  tenantId: 1,
  profileId: consent.profile_id,
  facts: [
    { category: 'preference', key: 'preferred_channel', value: 'whatsapp', source: 'user_stated' },
  ],
  repo,
});

// When the user says "forget me"
await forgetProfile({
  tenantId: 1,
  identity: { phone: '+27821234567' },
  repo,
  actor: 'system:lead-gen',
});
```

## Migration to apply

```bash
cd packages/worker
bun run db:migrate   # applies 0004_legal_shriek.sql
```

Requires `DATABASE_URL` pointing at the worker's Postgres.

## Next sessions (suggested order)

1. **Lead Gen integration** — wire `profileLookup` into Octo's session start (`packages/worker/src/mastra/agents/octo.ts`); add consent prompt to chat widget (`packages/web/src/features/chat/...`).
2. **Drizzle integration tests** — spin up testcontainer Postgres, exercise the real repo end-to-end.
3. **Voice Agent v1** — Retell + Twilio + Deepgram + Cartesia + Haiku 4.5 EU; reuse `profileLookup` / `recordConsent` exactly as Lead Gen does. Spoken consent flow (US-VA-042).
4. **Audit Tool v1** — separate concern; Claude Code sandbox + the rest of the spec. Doesn't depend on profile.
5. **Summary job** — nightly cron to populate `profile.summary` from facts. Mastra agent or plain LLM call.
6. **pgvector + semantic recall** (v2).

## Pre-existing test failures (carried over from before this work)

Six suites failed before my work and still fail. They are unrelated to profile:

- `src/services/calendar.test.ts` — suite-load failure
- `src/services/scoring.test.ts` — suite-load failure
- `src/services/storage.test.ts` — suite-load failure
- `src/mastra/tools/answer-service-question.test.ts` — suite-load failure
- `src/routes/book.test.ts` — 502/Calendar handling test
- `src/mastra/tools/generate-project-blueprint.test.ts` — 4 individual test failures

Worth a separate cleanup pass — they predate the bun refactor in spirit (the MR description flagged some of these).

## SOLID notes (for the review later)

- **Single responsibility** — each module does one thing: identity normalisation, lookup, consent, extend, forget, export. Repo handles only data access.
- **Open/closed** — adding a new agent (CEO PA Phase 2) requires zero changes here; it just calls the same `profile.*` functions.
- **Liskov / interface segregation** — `Identity` is a tiny shape; agents pass only what they have. Repo methods are narrow, not "do everything".
- **Dependency inversion** — service modules depend on `ProfileRepo` interface, not Drizzle. Drizzle is the swappable detail.
- **DRY without over-DRY** — `buildIdentifierHashes` is duplicated in three modules (lookup / forget / export) because each has slightly different semantics around whatsapp matching. Extracting it would force one of them to carry an "if voice"-style flag; deferred.
