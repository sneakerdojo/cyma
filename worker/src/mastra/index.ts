import { Mastra } from '@mastra/core/mastra';
import { octoAgent } from './agents/octo.js';
import { memory } from './memory.js';

/**
 * Root Mastra instance for the Octio worker.
 *
 * Memory is registered here so Mastra can resolve it for the agent at runtime.
 * The 'octo' key is what handleChatStream uses to look up the agent via agentId.
 */
export const mastra = new Mastra({
  agents: { octo: octoAgent },
  memory: { octoMemory: memory },
});

export { memory };
