# Task #14 — Mastra Memory wired to local Postgres

## Date
2026-04-11

## What was done

Wired `@mastra/memory` and `@mastra/pg` into the Octio worker so freechat conversation history persists in the local Postgres container and survives page reloads.

### Packages installed
- `@mastra/memory` (was missing from `worker/package.json`)
- `@mastra/pg` (was missing from `worker/package.json`)

### Files created
- `worker/src/mastra/memory.ts` — isolated module that creates `PostgresStore` and `Memory` instances; extracted to avoid a circular import between `index.ts` and `agents/octo.ts`.

### Files modified
- `worker/src/mastra/index.ts` — imports `memory` from `./memory.js`, registers it with Mastra as `memory: { octoMemory: memory }`.
- `worker/src/mastra/agents/octo.ts` — imports `memory` from `../memory.js`, passes it to `new Agent({ ..., memory })`.
- `worker/src/routes/chat.ts` — passes `memory: { thread: sessionId, resource: contactId }` inside `params` to `handleChatStream` when `contactId` is present; omits memory for anonymous requests.

## Actual Mastra memory API (vs task sketches)

The task suggested two possible call sites. The real API is:

```ts
// Correct — memory option goes inside params, alongside messages
handleChatStream({
  mastra,
  agentId: 'octo',
  version: 'v6',
  params: {
    messages,
    memory: {
      thread: sessionId,   // AgentMemoryOption.thread: string
      resource: contactId, // AgentMemoryOption.resource: string
    },
  },
});
```

Key types:
- `AgentMemoryOption = { thread: string | { id: string, ... }, resource: string, options?: MemoryConfigInternal }`
- `ChatStreamHandlerParams` extends `AgentExecutionOptions` — so `memory` is a first-class field on `params`
- `Memory` constructor: `new Memory({ storage: MastraCompositeStore, options: { lastMessages: number } })`
- `PostgresStore` constructor: `new PostgresStore({ id: string, connectionString: string })`

## Tables Mastra creates

`@mastra/pg` auto-creates and manages:
- `mastra_threads`
- `mastra_messages`
- `mastra_resources`
- `mastra_observational_memory`

These are entirely separate from the application's Drizzle schema (`worker/src/db/schema.ts`), which was not touched.

## Connection approach

`@mastra/pg` uses `node-postgres (pg)` for its pool, while the existing Drizzle client uses `postgres.js`. These two libraries are incompatible at the connection-object level. The approach taken is to share only the `DATABASE_URL` connection string — each library manages its own pool. This is the correct approach per Mastra's design.

## Observational memory / semantic summarization

Not enabled in this task. `observationalMemory: true` requires a vector store (pgvector) and an embedder model to be wired. That is a separate concern from basic persistence and can be enabled in a follow-up task.

## Test results

- Typecheck: clean (0 errors)
- Tests: 85/85 passing across all 8 test files
- No existing tests were broken

## Persistence verification

Manual verification requires a running worker + valid `ANTHROPIC_API_KEY`. The implementation is correct per the types — `PostgresStore.init()` is called lazily on first use, creating `mastra_threads` / `mastra_messages` tables if they don't exist. To verify:

1. `pnpm --filter @octio/worker run dev`
2. `curl -X POST http://localhost:3000/chat/stream -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Hello, what services does Octio offer?"}],"sessionId":"test-session-1","contactId":"contact-123"}'`
3. Check Postgres: `SELECT * FROM mastra_threads; SELECT * FROM mastra_messages;`
4. Send a second message referencing the first — agent should have context.

## Current state

Task #14 complete. Memory persistence is wired and working at the type level.

## Next steps

- Task #15–17: Wire tools into the Octo agent
- Task #18: Full production system prompt
- Follow-up: Enable `observationalMemory` with pgvector + embedder for semantic summarization
