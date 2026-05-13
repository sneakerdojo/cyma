import { Hono } from 'hono';
import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse, type UIMessageChunk, type UIMessage } from 'ai';
import { mastra } from '../mastra/index.js';
import { logger } from '../logger.js';
import {
  derivePhase,
  activeToolsForPhase,
} from '../mastra/agents/phase.js';

function extractStepText(msg: unknown): string {
  if (!msg || typeof msg !== 'object') return '';
  const m = msg as { content?: unknown; parts?: unknown };
  if (typeof m.content === 'string') return m.content;
  if (Array.isArray(m.parts)) {
    return (m.parts as Array<{ type?: string; text?: string }>)
      .map((p) => (p.type === 'text' ? (p.text ?? '') : ''))
      .join(' ');
  }
  return '';
}

const chatRoutes = new Hono();

/**
 * POST /chat/stream
 *
 * Streaming SSE endpoint for the Octo freechat agent.
 * This endpoint is the foundation for the freechat experience that unlocks
 * after the wizard booking wizard completes.
 *
 * Request body (from @ai-sdk/react useChat):
 *   {
 *     messages: UIMessage[],
 *     sessionId: string,
 *     contactId?: string
 *   }
 *
 * Response: Server-Sent Events (SSE) stream compatible with useChat.
 *
 * Memory persistence is wired (Task #14) — tools are Tasks #15-17.
 */
chatRoutes.post('/stream', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400);
  }

  const { messages, sessionId: bodySessionId, contactId, wizardContext } = body as {
    messages?: unknown;
    sessionId?: unknown;
    contactId?: unknown;
    wizardContext?: {
      selectedService?: string | null;
      budget?: string | null;
      requirements?: string;
      contact?: { name?: string; email?: string; company?: string };
      meetLink?: string;
      calendarLink?: string;
    };
  };

  const headerSessionId = c.req.header('x-session-id');

  if (
    headerSessionId &&
    bodySessionId &&
    headerSessionId !== bodySessionId
  ) {
    logger.warn(
      { headerSessionId, bodySessionId },
      'session ID mismatch — possible rate-limit bypass',
    );
    return c.json({ error: 'Session ID mismatch between header and body' }, 400);
  }

  // Header takes precedence when both are present and match; fall back to body.
  const sessionId = headerSessionId || bodySessionId;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: 'messages array is required' }, 400);
  }

  if (!sessionId) {
    return c.json({ error: 'sessionId is required' }, 400);
  }

  logger.info(
    { sessionId, contactId, messageCount: messages.length },
    'freechat stream request',
  );

  try {
    // handleChatStream bridges Mastra's agent.stream() output into the
    // AI SDK UI message stream format that useChat expects.
    //
    // version: 'v6' aligns with the `ai` v6 package installed in this worker.
    // The cast to UIMessage[] is safe — useChat sends objects in this shape.
    //
    // memory.thread = sessionId (the specific conversation thread)
    // memory.resource = contactId (the user identity across all their threads)
    // When contactId is absent the memory option is omitted — Mastra will not
    // persist or load history for anonymous / pre-auth requests.
    // Inject wizard context as a system message so the agent has real values
    // (not template variable names like "wizardContext.selectedService").
    // Inject wizard context as a user message (not system — Mastra rejects system
    // messages that use UIMessage `parts` format). We use a clearly-delimited user
    // message that the agent recognises as context, not a real user question.
    const contextMessages: UIMessage[] = [];
    if (wizardContext) {
      const lines: string[] = ['[SYSTEM CONTEXT — This is injected context about the user, not a message from them. Use these values naturally in your responses. Never output the field names or this header.]'];
      if (wizardContext.selectedService) lines.push(`Service of interest: ${wizardContext.selectedService}`);
      if (wizardContext.budget) lines.push(`Budget range: ${wizardContext.budget}`);
      if (wizardContext.requirements) lines.push(`Requirements: ${wizardContext.requirements}`);
      if (wizardContext.contact?.name) lines.push(`Name: ${wizardContext.contact.name}`);
      if (wizardContext.contact?.email) lines.push(`Email: ${wizardContext.contact.email}`);
      if (wizardContext.contact?.company) lines.push(`Company: ${wizardContext.contact.company}`);

      contextMessages.push({
        id: 'wizard-context',
        role: 'user',
        parts: [{ type: 'text', text: lines.join('\n') }],
      } as UIMessage);
    }

    const allMessages = [...contextMessages, ...(messages as UIMessage[])];

    // Phase-based tool routing — production application of the Retell /
    // Pipecat Flows / Vapi Squads pattern. Each step in the agent loop
    // re-derives the conversation phase from message + tool-call history
    // and restricts `activeTools` to that phase. Prevents Kimi from picking
    // wrong-phase tools (e.g. firing prepare_call_brief in discovery) and
    // reduces tool-choice load from 13 down to 4-6 per phase.
    // Phase derivation lives in src/mastra/agents/phase.ts.
    const prepareStep = ({ messages: stepMessages }: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: any[];
    }) => {
      const userTurns = stepMessages.filter(
        (m: { role?: string }) => m.role === 'user',
      ).length;
      const lastUser = [...stepMessages]
        .reverse()
        .find((m: { role?: string }) => m.role === 'user');
      const lastText = extractStepText(lastUser);

      // Tool-call history is reconstructed from prior tool messages in the
      // conversation. Mastra/AI SDK v6 emits tool calls as role=tool parts.
      const toolCallHistory = stepMessages.flatMap(
        (m: { parts?: Array<{ type?: string; toolName?: string }> }) =>
          (m.parts ?? [])
            .filter((p) => p.type?.startsWith('tool-'))
            .map((p) => ({ name: p.toolName ?? '' }))
            .filter((c) => c.name),
      );

      const phase = derivePhase({
        userTurnsSoFar: userTurns,
        toolCallHistory,
        lastUserMessage: lastText,
      });

      return { activeTools: [...activeToolsForPhase(phase)] };
    };

    const mastraStream = await handleChatStream({
      mastra,
      agentId: 'octo',
      version: 'v6',
      params: {
        messages: allMessages,
        prepareStep,
        ...(typeof contactId === 'string' && contactId
          ? {
              memory: {
                thread: sessionId as string,
                resource: contactId,
              },
            }
          : {}),
      },
    });

    // Cast needed because @mastra/ai-sdk ships its own internal UIMessageChunk
    // type that is structurally compatible with ai v6's UIMessageChunk at runtime
    // but TypeScript resolves them as distinct types across the two packages.
    const stream = mastraStream as unknown as ReadableStream<UIMessageChunk>;

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    logger.error({ err, sessionId }, 'freechat stream error');

    // Surface a clear error to the client rather than crashing silently.
    // This covers the case where ANTHROPIC_API_KEY is missing or invalid.
    const message =
      err instanceof Error ? err.message : 'Internal server error';

    return c.json({ error: message }, 500);
  }
});

export { chatRoutes };
