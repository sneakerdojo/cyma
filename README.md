# Octio

Single-page marketing site + booking/chat backend for [octio.co.za](https://octio.co.za).

## Stack

- Bun workspaces monorepo
- `packages/web` — Vite 7 + React 18 + Tailwind v4 SPA
- `packages/worker` — Hono + Mastra + Drizzle on Bun runtime
- `packages/shared` — Zod schemas shared across packages

## Quickstart

```bash
bun install
docker compose up -d postgres        # local Postgres on :5434
cp packages/worker/.env.example packages/worker/.env  # then fill in secrets
bun run dev                          # web on :5173, worker on :3000
```

## Common commands

```bash
bun run typecheck                    # all packages
bun run lint                         # all packages
bun run test                         # all packages
bun run --filter @octio/web build    # production SPA build → packages/web/dist
bun run --filter @octio/worker db:migrate
```

## Docs

- `CLAUDE.md` — project rules, conventions, known pitfalls.
- `ops/DEPLOYMENT.md` — deploy flow, Ansible handoff, nginx config.
