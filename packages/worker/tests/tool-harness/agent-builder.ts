/**
 * Agent builder for the tool intensity harness.
 *
 * Wraps each real tool in a recording proxy so the harness can capture every
 * call's args + result without re-implementing the tool logic. The proxy's
 * execute delegates straight to the real tool's execute — same DB writes,
 * same email sends (intercepted via GMAIL_INTERCEPT=1), same return shape.
 */

import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { CapturedCall } from './runner.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealTool = any;

export interface BuildAgentArgs {
  /** Tool registry — keys become the tool IDs Mastra surfaces to the model. */
  realTools: Record<string, RealTool>;
  instructions: string;
  recordCall: (call: CapturedCall) => void;
}

export function buildHarnessAgent(args: BuildAgentArgs): Agent {
  const KIMI_API_KEY = process.env.KIMI_API_KEY;
  if (!KIMI_API_KEY) throw new Error('KIMI_API_KEY is not set');

  const kimi = createOpenAICompatible({
    name: 'kimi',
    baseURL: process.env.KIMI_BASE_URL ?? 'https://api.moonshot.ai/v1',
    apiKey: KIMI_API_KEY,
  });
  const modelId = process.env.KIMI_MODEL ?? 'kimi-k2-turbo-preview';

  const wrappedTools: Record<string, RealTool> = {};
  for (const [toolId, realTool] of Object.entries(args.realTools)) {
    wrappedTools[toolId] = createTool({
      id: realTool.id,
      description: realTool.description,
      inputSchema: realTool.inputSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (input: any, context: any) => {
        const result = await realTool.execute(input, context);
        args.recordCall({
          tool: realTool.id,
          args: input as Record<string, unknown>,
          result,
          turn: -1, // runner will overwrite with the actual turn index
        });
        return result;
      },
    });
  }

  return new Agent({
    id: 'tool-harness-agent',
    name: 'tool-harness-agent',
    instructions: args.instructions,
    model: kimi.chatModel(modelId),
    tools: wrappedTools,
  });
}
