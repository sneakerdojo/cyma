import { Agent } from '@mastra/core/agent';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { memory } from '../memory.js';
import { answerServiceQuestionTool } from '../tools/answer-service-question.js';
import { sendResourcesTool } from '../tools/send-resources.js';
import { handoffToHumanTool } from '../tools/handoff-to-human.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OCTO_INSTRUCTIONS = readFileSync(
  resolve(__dirname, '../../prompts/octo-freechat.md'),
  'utf-8',
);

export const octoAgent = new Agent({
  id: 'octo',
  name: 'octo',
  instructions: OCTO_INSTRUCTIONS,
  // Model string format: 'provider/model-id' — Mastra routes this via its internal model router.
  // Claude Haiku 4.5 confirmed model ID: claude-haiku-4-5-20251001
  model: 'anthropic/claude-haiku-4-5-20251001',
  // Wire the shared Postgres-backed memory instance so the agent persists and
  // retrieves conversation history across requests. The per-request thread/resource
  // identifiers are supplied at call time via AgentMemoryOption in chat.ts.
  memory,
  // Freechat tools — registered as a record keyed by tool id (Mastra Agent API).
  // answer_service_question grounds factual answers in the knowledge base.
  // send_resources delivers case studies via Gmail.
  // handoff_to_human escalates unresolvable conversations to the team.
  tools: {
    answer_service_question: answerServiceQuestionTool,
    send_resources: sendResourcesTool,
    handoff_to_human: handoffToHumanTool,
  },
});

export { OCTO_INSTRUCTIONS };
