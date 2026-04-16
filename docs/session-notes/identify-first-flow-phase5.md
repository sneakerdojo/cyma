# Identify-First Flow — Phase 5 Implementation

**Date:** 2026-04-11
**Status:** Complete — typecheck clean, build passing, lint zero warnings

---

## What was done

Implemented the full identify-first flow gate for the Octio wizard. Users now identify themselves before the wizard starts. The system distinguishes returning clients (with confirmed bookings) from new users and routes them accordingly.

### Files created

- `worker/src/routes/identify.ts` — `POST /api/identify` endpoint
- `src/features/octo/OctoIdentify.tsx` — Identity gate form component

### Files modified

- `src/features/octo/types.ts` — Added `phone?: string` to `ContactInfo`
- `worker/src/index.ts` — Mounted `identifyRoutes` under `/api`
- `src/features/octo/OctoConversation.tsx` — Identify gate integration + contact step skip

---

## Architecture decisions

### Backend (`POST /api/identify`)
- Accepts `{ email: string }`, returns `{ existing, contact?, hasPastBooking }`
- Does NOT return phone or company — only firstName + existing flag (per spec)
- Confirmed booking status filtered in JS (Drizzle doesn't support chained `.where()` for different columns cleanly without `and()`)
- Normalises email to lowercase before DB lookup
- Pre-existing `step.ts` type error in worker is unrelated to this work

### Frontend (`OctoIdentify`)
- Collects: first name, surname, email, phone (required), company (optional)
- SA phone validation: accepts `0xx` (10 digits), `27xx` (11 digits), `+27xx` (11 digits)
- Normalises to `+27...` format before submitting
- Inline error on phone blur + submit guard
- API error banner shown inline (not toast)
- Lucide icons used throughout (`ArrowRight`, `Loader`) — no emojis

### Integration (`OctoConversation`)
- `identified` state: starts `false` on every mount — no localStorage persistence
- On identify complete: dispatches `SUBMIT_CONTACT` with merged `firstName + surname`
- Returning user: immediately calls `goToFreeChat()` — skips wizard entirely
- New user: calls `startGreeting()` — wizard starts with contact pre-filled
- Contact step auto-skip: `useEffect` watches `state.step === 'contact' && identified` → dispatches `NEXT_STEP`
- `phone` flows through `ContactInfo` → `WizardContext` → `InteractiveChat` → chat agent

---

## Current state

- Frontend: zero TypeScript errors, zero lint warnings, production build passes
- Worker: zero TypeScript errors (pre-existing `step.ts` error excluded)
- `/api/identify` is mounted and proxied via Vite's `/api` proxy

---

## Next steps / follow-ons

1. Update `shared/src/schemas.ts` — add `phone?: string` to `ContactSchema` so the `/api/book` endpoint stores phone on contact upsert (currently the field is in the DB schema but not forwarded from the wizard intake)
2. Update `worker/src/routes/book.ts` contact upsert to include `phone: intake.contact.phone ?? null`
3. End-to-end test with live DB: verify returning user flow jumps to freechat
4. Consider: rate-limit `/api/identify` per IP more aggressively (email enumeration risk)
5. Consider: add a "Welcome back, {firstName}" personalised greeting when `returning=true` before freechat loads

---

## Important decisions

- **No localStorage persistence for `identified`**: intentional. Refresh resets to identify gate. Wizard data may still be in localStorage but user re-identifies before continuing.
- **Contact step skipped via `NEXT_STEP` dispatch in `useEffect`**: avoids modifying `useWizardState` reducer or `STEP_ORDER` array, keeping the state machine untouched per guardrails.
- **`goToFreeChat()` called with `void`**: the function is async (has an internal delay for orb animation), called fire-and-forget from `handleIdentified` which is synchronous.
- **Returning user freechat context**: `selectedService: null, budget: null, requirements: ''` — qualification starts fresh, identity is pre-loaded via contact.
