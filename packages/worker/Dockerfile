# Build context = repo root. `docker build -f packages/worker/Dockerfile .`
# Multi-stage: deps installs the workspace; runtime copies node_modules and
# the worker + shared source, then runs TS directly with Bun.

FROM oven/bun:1.3.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/worker/package.json ./packages/worker/
COPY packages/shared/package.json ./packages/shared/
# packages/web is in the workspace lockfile — Bun needs its package.json to
# keep --frozen-lockfile happy even though no web deps are installed here.
COPY packages/web/package.json ./packages/web/
# BuildKit cache mount keeps Bun's global download cache between builds —
# turns a cold 5+ min install into a warm 10s install.
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

FROM oven/bun:1.3.3-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/worker/node_modules ./packages/worker/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Source — Bun runs TypeScript directly, no build step. Prompts and knowledge
# files live alongside source and are read at runtime via __dirname.
COPY packages/shared ./packages/shared
COPY packages/worker ./packages/worker

WORKDIR /app/packages/worker

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["bun", "run", "src/index.ts"]
