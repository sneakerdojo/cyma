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

RUN pnpm --filter @octio/worker build

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

# Copy shared source — Zod schemas are imported at runtime
COPY --from=builder /app/shared/src ./shared/src

EXPOSE 3000

CMD ["node", "worker/dist/index.js"]
