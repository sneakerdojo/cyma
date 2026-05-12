# Octio Website — Project Rules

Single-page app + booking/chat backend for octio.co.za. Bun monorepo.

## Packages

- **`packages/web`** — `@octio/web`. Vite 7 + React 18 SPA with Tailwind v4, served by nginx in production. Routes: `/`, `/octo`, `/privacy`, `/products/:slug`, `/services/:slug`. SEO via `react-helmet-async`. State via React Context (`WizardContext`).
- **`packages/worker`** — `@octio/worker`. Hono server on port 3000. Booking + chat (AI SDK + Mastra + Anthropic/Kimi), Google Calendar / Groups, Twilio WhatsApp, Drizzle ORM + Postgres. Runs TS directly via Bun in production.
- **`packages/shared`** — `@octio/shared`. Zod schemas exported as source (`exports: "./src/schemas.ts"`). No build step.

## Architecture (request flow)

```
Browser → Traefik (host) → nginx (web image)         # static assets, SPA fallback
                        ↓
                        → /api/* + /chat/* → worker → Postgres
                                                    → Mastra agent (Anthropic / Kimi)
                                                    → Google Calendar / Groups
                                                    → Twilio WhatsApp
```

In dev, Vite's proxy forwards `/api` and `/chat` from `:5173` to `:3000`.

## Bun commands

Run from repo root:

```bash
bun install                            # install all workspace deps
bun run dev                            # parallel: web + worker dev servers
bun run dev:web                        # only the SPA on :5173
bun run dev:worker                     # only the API on :3000
bun run typecheck                      # tsc --noEmit across all packages
bun run lint                           # eslint across all packages
bun run build                          # production build (web only; worker has none)
bun run test                           # vitest across all packages
```

Filter individual packages:

```bash
bun run --filter @octio/web build
bun run --filter @octio/worker db:migrate
bun add lodash --filter @octio/web     # add a dep to a single workspace package
```

## Catalog deps

Two deps are pinned in the root `package.json` `workspaces.catalog`:
`typescript` and `zod`. Packages reference them as `"typescript": "catalog:"`. To bump one, edit the catalog entry in the root `package.json`, then `bun install`. Do not add a catalog entry for a dep used by only one package — catalog scope is "shared by 2+ workspaces."

`@types/node` is **not** installed. The worker (and `vite.config.ts` on the web side) use `@types/bun` instead, which transitively includes Node types — so you get both Bun globals (`Bun.serve`, `Bun.file`, etc.) and Node-compat APIs (`process.env`, `node:path`, etc.) under one dep.

## Worker production model

The worker container (`packages/worker/Dockerfile`) is `oven/bun:1.3.3-alpine` and runs `bun run src/index.ts` — TypeScript executed directly, no transpile step. Prompts (`src/prompts/*.md`) and knowledge (`src/knowledge/*.json`) are read from source at runtime.

The deps stage uses BuildKit's `--mount=type=cache,target=/root/.bun/install/cache` so subsequent rebuilds reuse downloaded tarballs — first build ~55s, rebuilds ~5-10s. The deps stage also COPYs `packages/web/package.json` (even though web isn't installed here) because Bun's lockfile references all three workspace packages and `--frozen-lockfile` rejects mismatches.

HTTP serving uses `Bun.serve({ fetch: app.fetch, port })`, not `@hono/node-server`. Graceful shutdown calls `await server.stop()`. File I/O in handlers and scripts uses `Bun.file(path).text()` / `Bun.write(path, content)` (auto-creates parent dirs). The `__filename`/`__dirname` pattern via `fileURLToPath(import.meta.url)` is replaced by `import.meta.dir` everywhere. UUIDs come from the Web Crypto global `crypto.randomUUID()` — no `import { randomUUID } from 'node:crypto'`.

What we keep on `node:*`:
- `node:path` — Bun has no path utilities, so `path.join`/`path.basename`/`path.resolve` stay.
- `node:crypto` for `createHmac` + `timingSafeEqual` (in `routes/privacy.ts`) — Bun supports the API natively and it's more readable than Web Crypto for HMAC.
- `node:fs` for the few sync inits at module load (prompt + knowledge JSON) and `fs.promises.unlink` — Bun has no clean replacement for unlink.

**Do not add a tsc build step back.** It was removed deliberately. If you find yourself wanting one, you probably want `tsc --noEmit` for typecheck — already wired up as `bun run --filter @octio/worker typecheck`.

## Tailwind v4

Theme lives in `packages/web/src/index.css` inside a single `@theme` block. Tokens use the v4 namespace convention (`--color-*`, `--font-*`); Tailwind auto-generates the corresponding utilities (`bg-bg`, `text-orange`, `font-display`, etc).

Legacy `--c-*` aliases below the `@theme` block exist only to keep existing inline `style={{ ... var(--c-orange) ... }}` usages working without a global sweep. Prefer Tailwind utilities for new code.

There is no `tailwind.config.js` and no `postcss.config.js`. Tailwind v4 ships its Vite plugin (`@tailwindcss/vite`) and includes autoprefixer. Do not recreate those files.

The site has no dark mode toggle — dark *is* the theme. Don't introduce `dark:` variants.

## Shared package

`@octio/shared` exports `./src/schemas.ts` directly. Bun and Vite both resolve TypeScript sources across workspace symlinks, so no build step. Consumers (currently only `@octio/worker`) just `import { ... } from '@octio/shared'`.

If you ever need to ship `@octio/shared` to a non-bundler runtime (e.g. publish to npm), add a build step then — not preemptively.

## Env handling

Bun auto-loads `.env`, `.env.local`, `.env.<NODE_ENV>` from CWD. No `dotenv` import.

- `packages/web/.env.development` / `.env.production` — committed, contain only `VITE_API_BASE_URL`.
- `packages/web/.env.local` — gitignored, for local overrides.
- `packages/worker/.env` — gitignored, contains DB URL + API keys.
- `packages/worker/.env.example` — committed, lists every variable the worker reads.

In Docker, env vars come from `docker-compose.yml`'s `env_file:` — no `.env` is COPYed into images.

## Deploy flow

`main` branch → GitLab CI runs `build:web` + `typecheck:worker` → `package:web` + `package:worker` push to `registry.gitlab.com/octio-dev/octio-website{,/worker}` → `deploy:qa` (auto) and `deploy:production` (manual) SSH into the target host and run `docker compose pull && up -d --force-recreate` against `/opt/stacks/octio-website-{qa,prd}/`. Healthchecks must pass within 60s or the deploy job fails.

Both environments pull `:latest`. Use `:$CI_COMMIT_SHORT_SHA` tags for rollback.

## Code style rules

- Default to **no comments**. Add one only when the *why* is non-obvious (a workaround, a hidden constraint, a subtle invariant). Don't narrate *what* the code does.
- No JSDoc-style multi-paragraph docstrings on functions. One-line comments only.
- Worker logging: use `pino` (`logger.info(...)`), never `console.log`.
- React state: Context for cross-route shared state (see `WizardContext`). Don't add Redux/Zustand without a reason.
- No new component libraries (no shadcn, no Radix) unless a specific need surfaces. We use `lucide-react` for icons and hand-rolled components.
- Tailwind: utilities directly in JSX; hand-rolled CSS for things that need it. No `@apply`.
- SPA routing: `react-router-dom` only. Nginx handles the SPA fallback. Don't add server-side routing to the web package.

## Known pitfalls

- **Worker bind port is `3000` everywhere** — Dockerfile EXPOSE, compose, and the Vite proxy default. If you see `:3005` in the codebase, it's stale (`packages/worker/src/config.ts` has a 3005 default for `apiBaseUrl`, which is a different thing — used for outbound email links, not bind port). Don't conflate them.
- **Shared no longer builds**. The old "build `@octio/shared` first" rule (see commit `2129c6a` if you're spelunking history) doesn't apply anymore — shared is source-only.
- **The worker reads files from source at runtime** (`src/prompts/*.md`, `src/knowledge/*.json`). The pre-Bun era had a `cp -r src/prompts src/knowledge dist/` hack in the build script for the same reason — that's gone now because there is no dist.
- **Zod v4**: the error-customization key is `error`, not `required_error`/`invalid_type_error` (those still work via a deprecation path but warn). Prefer `z.email()` / `z.url()` over `z.string().email()` / `z.string().url()` for new code — same effect, idiomatic in v4.
- **Drizzle 0.31** changed the `drizzle.config.ts` shape slightly from 0.28. If you regenerate migrations, double-check the config still has `dialect`, `schema`, `out`, `dbCredentials.url`.
- **Vite 8 uses rolldown** by default. Builds are faster but bundle splits may differ from Vite 7 — check `packages/web/dist/assets/*` chunk shapes if anything looks off.

## External references

- Registry: `registry.gitlab.com/octio-dev/octio-website` (web) and `.../worker`.
- Deploy stacks: `/opt/stacks/octio-website-qa/` (QA, demo-01) and `/opt/stacks/octio-website-prd/` (prod, infra-01).
- Both hosts run Traefik; no manual gateway reload needed on deploy.
- See `ops/DEPLOYMENT.md` for the Ansible handoff and nginx config.
