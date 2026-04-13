# Task #8 — File Storage Service + Multipart Handling

**Date:** 2026-04-11  
**Status:** Complete (pending `pnpm install` before tests run)

## What Was Done

Implemented the file upload plumbing layer for the Octio booking flow. Pure TypeScript — no external APIs, no DB changes.

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `worker/src/services/storage.errors.ts` | 23 | Typed error classes: `FileTooLargeError`, `InvalidFileTypeError` |
| `worker/src/services/storage.ts` | 238 | Core storage service: `saveVoiceNote`, `saveAttachment`, `deleteUploadedFile` |
| `worker/src/services/storage.test.ts` | 268 | Vitest unit tests for the storage service |
| `worker/src/middleware/multipart.ts` | 108 | Hono multipart parser: `parseBookingMultipart` + `MissingFieldError`, `WrongFieldTypeError` |
| `worker/src/middleware/multipart.test.ts` | 126 | Vitest unit tests for the multipart middleware |
| `worker/vitest.config.ts` | 9 | Minimal Vitest config |

### Files Modified

- `worker/src/config.ts` — replaced Task #5's hard-coded prod defaults for `uploadDir`/`uploadPublicUrlBase` with environment-aware defaults (`./uploads` in dev, `/var/octio/uploads` in prod)
- `worker/package.json` — added `"test"` and `"test:watch"` scripts; normalised `vitest` to `^2.0.0` and added `@vitest/ui: ^2.0.0` (Task #5 had already added vitest `^4.1.4` — downgraded to match the plan spec)
- `worker/.env.example` — replaced commented-out upload vars with active dev defaults
- `worker/.env` — added `UPLOAD_DIR=./uploads` and `UPLOAD_PUBLIC_URL_BASE=http://localhost:3000/uploads`

## Key Design Decisions

### Options injection for testability (SOLID — Dependency Inversion)
Rather than using `vi.resetModules()` + env mutation, each storage function accepts an optional `StorageOptions` parameter (`baseDir`, `publicUrlBase`). When omitted it falls back to the config singleton. Tests pass a temp dir and never touch environment variables — cleaner, faster, parallelisable.

### Typed errors (not string throws)
`FileTooLargeError` and `InvalidFileTypeError` extend `Error` and carry typed public fields (`actualBytes`, `maxBytes`, `actualType`, `allowedTypes`). Task #9 can use `instanceof` checks to return the right HTTP status codes without string parsing.

### `MissingFieldError` vs `WrongFieldTypeError` in multipart middleware
Two separate errors rather than one generic `ValidationError` — makes the route handler in Task #9 trivial to write and gives clients a precise error name.

### `path.basename()` before any path construction
Applied in `sanitizeFilename()` before the UUID-prefixed join. Prevents directory traversal even if the original name contains `../../` or Windows-style `\..\..\`.

### `deleteUploadedFile` ENOENT handling
POPIA deletion flows may call delete multiple times (retry on crash). ENOENT is treated as success — idempotent by design.

## Current State

All code written and manually type-checked. `pnpm install` has NOT been run — per the parallel-task constraint (Task #5 was running concurrently and owns the install).

## Next Steps / Blockers

1. **CRITICAL — run `pnpm install` at repo root before Task #9** to pick up `vitest`, `@vitest/ui`, and any deps Task #5 added.
2. After install, run `pnpm --filter @octio/worker test` to verify all 15+ test cases pass.
3. Task #9 (`/api/book` endpoint) should import from:
   - `../services/storage.js` — `saveVoiceNote`, `saveAttachment`, `deleteUploadedFile`, `SavedFile`
   - `../middleware/multipart.js` — `parseBookingMultipart`
   - `../services/storage.errors.js` — `FileTooLargeError`, `InvalidFileTypeError`
   - `../middleware/multipart.js` — `MissingFieldError`, `WrongFieldTypeError`

## Important Notes for Task #9

- Voice note buffer: `await voiceNote.arrayBuffer()` to convert `File` → `ArrayBuffer` before passing to `saveVoiceNote`
- The `intake` field from `parseBookingMultipart` is a raw JSON string — Task #9 must parse + validate it with Zod
- `SavedFile.url` is the public nginx URL to store in the database
- `SavedFile.absolutePath` is what to store for POPIA deletion (never expose to client)
