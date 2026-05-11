# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

# Copy workspace manifests first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY worker/package.json ./worker/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile

# Copy source files
COPY worker/ ./worker/
COPY shared/ ./shared/

# Build @octio/shared first so its compiled JS exists before the worker's tsc
# pass type-checks against its declarations. Both packages emit to ./dist.
RUN pnpm --filter @octio/shared build \
 && pnpm --filter @octio/worker build

# ---- Stage 2: Runtime ----
FROM node:20-alpine AS runtime

WORKDIR /app

RUN corepack enable

# Copy only what is needed for a production install
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/worker/package.json ./worker/
COPY --from=builder /app/shared/package.json ./shared/

RUN pnpm install --frozen-lockfile --prod

# Copy compiled worker output
COPY --from=builder /app/worker/dist ./worker/dist

# Copy compiled @octio/shared — package.json `exports` resolves @octio/shared
# to ./dist/schemas.js, so the runtime only needs the compiled JS.
COPY --from=builder /app/shared/dist ./shared/dist

EXPOSE 3000

# Healthcheck hits the worker's /health route (defined in src/index.ts).
# wget is part of busybox on node:20-alpine, no extra install needed.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["node", "worker/dist/index.js"]
