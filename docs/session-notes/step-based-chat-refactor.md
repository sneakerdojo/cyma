# Step-based Chat Refactor

## Date
2026-04-11

## What was done

Completed a major refactor replacing the tool-call-based `InteractiveChat` (which relied on Mastra/AI SDK `useChat` + `show_*` tools) with a fully stateless step-based HTTP conversation architecture.

### Key decisions made

1. **generateObject does NOT work with Kimi** — confirmed by test. Kimi returns a warning: `responseFormat is not supported. JSON response format schema is only supported with structuredOutputs`. Use `generateText` with JSON system prompt + `JSON.parse` + `Zod.safeParse` instead. Hardcoded fallbacks are in place if parsing fails.

2. **Architecture**: The backend (`/chat/step`) is fully stateless. Frontend carries all state (stepIndex, answers map keyed by stepId). This is simpler, more resilient, and easier to debug than the tool-call approach.

3. **History edit**: Implemented as "restart from step N" — clears downstream answers, re-fetches the target step with updated context.

4. **WizardContext type**: Moved to `src/features/chat/types.ts`. `FreeChatWidget.tsx` still has its own copy (dead file now that OctoFreeChat mounts InteractiveChat directly) but nothing imports from it.

5. **Forms cut for Phase 1** as agreed — wizard already collected contact data.

6. **Scheduler step**: Backend fetches real calendar data from Google Calendar. Local dev returns empty slots (Google credentials not configured for local, works in production).

## Files created

- `src/features/chat/types.ts` — shared `WizardContext` + `OrbState` types
- `worker/src/conversation/steps.ts` — 9 step definitions, schemas, prompt builders
- `worker/src/routes/step.ts` — `POST /chat/step` + `GET /chat/step/count` endpoints
- `worker/scripts/test-generate-object.ts` — diagnostic script (can delete after review)

## Files modified

- `src/features/chat/InteractiveChat.tsx` — completely rewritten (step-based, no useChat)
- `worker/src/index.ts` — mounted `stepRoutes` at `/chat/step`

## Files NOT changed (as specified)

- `worker/src/routes/chat.ts` — `/chat/stream` endpoint kept intact
- All existing components in `src/features/chat/components/` — untouched
- `src/features/octo/OctoFreeChat.tsx` — no changes needed (re-exports still work)

## Current state

- Worker typechecks clean: `pnpm --filter @octio/worker run typecheck` = 0 errors
- Frontend typechecks clean: `tsc --noEmit` = 0 errors
- Build succeeds: `pnpm build` = success
- `/chat/step` curl tested: steps 0, 1, 7 (scheduler), 8 (summary) all return correct JSON
- Kimi generates personalised, context-aware content for each step

## Step sequence

```
Step 0: main_problem    → choice    (ChoiceSelector)
Step 1: problem_detail  → text      (TextInputPanel)
Step 2: approach        → choice    (ChoiceSelector)
Step 3: team_size       → choice    (ChoiceSelector)
Step 4: timeline        → choice    (ChoiceSelector)
Step 5: pain_points     → multi     (MultiSelector)
Step 6: files           → upload    (FileUploadPanel)
Step 7: schedule        → scheduler (SchedulerPanel + real calendar)
Step 8: summary         → summary   (SummaryView + blueprint offer)
```

## Next steps

1. Browser E2E test — start dev server + worker, walk through all 9 steps
2. Wire Vite proxy to forward `/chat/step` to worker in dev mode (check vite.config.ts)
3. Verify scheduler step shows real slots once Google Calendar is configured
4. Consider adding rate limiting specifically to `/chat/step` (currently inherits `/chat/*` rate limiter)
5. Task #67 (end-to-end test) is now achievable

## Blockers

None. The `/chat/stream` endpoint (old Mastra agent) is still mounted and working — can be removed in a future cleanup task once the new step flow is fully validated in production.

## Important architectural note

`InteractiveChat` no longer uses `useChat` or any AI SDK streaming. It's a pure REST fetch loop. This means:
- No SSE/WebSocket complexity
- Simpler error handling
- Easier to add retry logic
- The orb state is managed locally based on fetch lifecycle (fetching = thinking, fetched = speaking, idle = idle)
