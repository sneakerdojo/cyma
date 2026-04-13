# Task #12: Mastra Agent Stub + POST /chat/stream SSE Route

**Date:** 2026-04-11  
**Status:** DONE  
**Session result:** Complete and passing

---

## What Was Done

### Packages Added to `worker/package.json`

| Package | Version | Purpose |
|---------|---------|---------|
| `@mastra/core` | `^1.24.1` | Mastra framework — Agent class, Mastra root |
| `@mastra/ai-sdk` | `^1.3.3` | Bridge between Mastra streams and AI SDK UI message format |
| `ai` | `^6.0.158` | Vercel AI SDK — `createUIMessageStreamResponse`, types |
| `@ai-sdk/anthropic` | `^3.0.69` | Anthropic provider (available for direct use if needed) |
| `zod` | bumped to `^3.25.76` | Required by `@mastra/core` and `ai` v6 peer dep |

---

## Files Created

### `worker/src/mastra/agents/octo.ts`
Defines the Octo agent using Mastra's string model format:
- `model: 'anthropic/claude-haiku-4-5-20251001'` — confirmed Haiku 4.5 model ID
- Mastra handles the provider routing via its internal model gateway — no `createAnthropic()` needed
- `id: 'octo'` is required in `AgentConfig`
- STUB system prompt — Task #18 will replace with production copy

### `worker/src/mastra/index.ts`
Minimal Mastra root instance:
```ts
export const mastra = new Mastra({ agents: { octo: octoAgent } });
```
Key: `'octo'` is the agent key used by `handleChatStream({ agentId: 'octo' })`.

### `worker/src/routes/chat.ts`
`POST /chat/stream` endpoint:
- Validates `messages` (non-empty array) and `sessionId`
- Uses `handleChatStream({ mastra, agentId: 'octo', version: 'v6', params: { messages } })`
- Returns `createUIMessageStreamResponse({ stream })` — SSE, compatible with `useChat`
- Error handling: streams error as SSE (Mastra handles internally), or returns 500 JSON if pre-stream error

### `worker/src/routes/chat.test.ts`
11 tests covering:
- Happy path (200, SSE content-type, correct agentId, contactId optional)
- Validation: missing messages, empty messages, non-array messages, missing sessionId, invalid JSON body
- Error handling: handleChatStream throws Error, handleChatStream throws non-Error

### `worker/src/index.ts` (modified)
Added:
```ts
import { chatRoutes } from './routes/chat.js';
app.route('/chat', chatRoutes);
```

---

## Key API Decisions (vs. task sketches)

| Aspect | Task Sketch | Actual Implementation |
|--------|------------|----------------------|
| Agent model | `createAnthropic()` + model instance | `model: 'anthropic/claude-haiku-4-5-20251001'` string — Mastra's built-in model router |
| Agent import | `@mastra/core` | `@mastra/core/agent` (subpath) |
| Streaming | `agent.stream(messages).toDataStreamResponse()` | `handleChatStream()` + `createUIMessageStreamResponse()` |
| Stream compat | `toDataStreamResponse` | `createUIMessageStreamResponse` (AI SDK v6 API) |
| Version flag | None | `version: 'v6'` required for correct overload resolution |

---

## Smoke Test Results

With empty `ANTHROPIC_API_KEY`:
- `POST /chat/stream` with no messages → `400 {"error":"messages array is required"}`
- `POST /chat/stream` with no sessionId → `400 {"error":"sessionId is required"}`  
- `POST /chat/stream` with valid body → `200` + SSE stream with Mastra-formatted error event (not a crash)

The missing-API-key case streams back a proper SSE error event rather than crashing or returning JSON 500. This is better UX — `useChat` can handle it gracefully.

---

## Test Results

```
Test Files  7 passed (7)
Tests      75 passed (75)  (64 pre-existing + 11 new chat tests)
```

---

## Next Ready Tasks

Tasks that are now unblocked (all parallelizable):
- **Task #13** — Frontend FreeChatWidget with `@ai-sdk/react` `useChat`
- **Task #14** — Wire Mastra memory to local Postgres via `@mastra/pg`
- **Task #20** — Rate-limit middleware (in-memory LRU)

---

## Blockers / Notes

- `ANTHROPIC_API_KEY` must be set in `worker/.env` before the route produces real AI responses
- Task #18 (production system prompt) is a prerequisite for going live with freechat
- The `as unknown as ReadableStream<UIMessageChunk>` cast in `chat.ts` line ~67 is intentional — `@mastra/ai-sdk` and `ai` v6 ship structurally identical but nominally distinct `UIMessageChunk` types. This is safe at runtime and will resolve naturally when Mastra updates its internal `ai` dependency to v6 fully.
