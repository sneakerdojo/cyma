import { Agent } from '@mastra/core/agent';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import { memory } from '../memory.js';
import { answerServiceQuestionTool } from '../tools/answer-service-question.js';
import { sendResourcesTool } from '../tools/send-resources.js';
import { handoffToHumanTool } from '../tools/handoff-to-human.js';
import { enrichLeadTool } from '../tools/enrich-lead.js';
import { prepareCallBriefTool } from '../tools/prepare-call-brief.js';
import { generateProjectBlueprintTool } from '../tools/generate-project-blueprint.js';
import { showChoicesTool } from '../tools/show-choices.js';
import { showMultiSelectTool } from '../tools/show-multi-select.js';
import { showTextInputTool } from '../tools/show-text-input.js';
import { showFileUploadTool } from '../tools/show-file-upload.js';
import { showFormTool } from '../tools/show-form.js';
import { showSchedulerTool } from '../tools/show-scheduler.js';
import { showDiagramTool } from '../tools/show-diagram.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OCTO_INSTRUCTIONS = readFileSync(
  resolve(__dirname, '../../prompts/octo-freechat.md'),
  'utf-8',
);

/**
 * Resolves the language model to use for the Octo agent.
 *
 * When LLM_PROVIDER=kimi (or KIMI_API_KEY is set and LLM_PROVIDER is unset),
 * the agent uses Moonshot Kimi via @ai-sdk/openai-compatible.
 * Otherwise it falls back to Anthropic Claude via Mastra's string model router.
 *
 * Single Responsibility: this function only concerns itself with model selection.
 * Open/Closed: adding a new provider means adding a new branch here without
 * touching the Agent instantiation below.
 */
function buildModel(): ReturnType<ReturnType<typeof createOpenAICompatible>['chatModel']> | string {
  if (config.llmProvider === 'kimi') {
    if (!config.kimiApiKey) {
      throw new Error('LLM_PROVIDER=kimi but KIMI_API_KEY is not set');
    }
    const baseURL = config.kimiBaseUrl ?? 'https://api.moonshot.ai/v1';
    const modelId = config.kimiModel ?? 'kimi-k2-0905-preview';
    const kimi = createOpenAICompatible({
      name: 'kimi',
      baseURL,
      apiKey: config.kimiApiKey,
    });
    logger.info({ model: modelId, baseURL }, 'octo agent: using Kimi');
    return kimi.chatModel(modelId);
  }
  // Fall through to Anthropic via Mastra's string model router (existing behaviour).
  logger.info({ model: 'anthropic/claude-haiku-4-5-20251001' }, 'octo agent: using Anthropic');
  return 'anthropic/claude-haiku-4-5-20251001';
}

export const octoAgent = new Agent({
  id: 'octo',
  name: 'octo',
  instructions: OCTO_INSTRUCTIONS,
  model: buildModel(),
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
    enrich_lead: enrichLeadTool,
    prepare_call_brief: prepareCallBriefTool,
    generate_project_blueprint: generateProjectBlueprintTool,
    // UI tools — pass-through signals for the frontend conversational UI renderer
    show_choices: showChoicesTool,
    show_multi_select: showMultiSelectTool,
    show_text_input: showTextInputTool,
    show_file_upload: showFileUploadTool,
    show_form: showFormTool,
    show_scheduler: showSchedulerTool,
    show_diagram: showDiagramTool,
  },
});

export { OCTO_INSTRUCTIONS };
