import { createTool } from '@mastra/core/tools';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

// Sync read at module init avoids import-assertion syntax differences across
// TS/Vitest/runtime resolvers; the JSON is small (<10KB) and reads once.

const SERVICES_PATH = join(import.meta.dir, '..', '..', 'knowledge', 'services.json');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceEntry = Record<string, any>;
type ServicesMap = Record<string, ServiceEntry>;

function loadServicesData(): ServicesMap {
  const raw = readFileSync(SERVICES_PATH, 'utf-8');
  return JSON.parse(raw) as ServicesMap;
}

// ---------------------------------------------------------------------------
// Tool definition (SRP: resolves service knowledge lookups only)
// ---------------------------------------------------------------------------

export const answerServiceQuestionTool = createTool({
  id: 'answer_service_question',
  description:
    'Look up factual information about Octio services by topic. Use this whenever the user asks about a specific service, pricing, process, or general info about Octio. Always prefer this tool over generating answers from memory to avoid hallucination.',
  inputSchema: z.object({
    topic: z
      .string()
      .describe(
        'The Octio offering or topic to look up. Octio is a pure-play AI company with 4 autonomous products (lead-generation, voice-chat, social-media, newsletter) and 3 services (agentic-app-dev, custom-workflows, corporate-advisory). Plus general info topics: pricing, process, general. Falls back to "general" if not recognised.',
      ),
  }),
  execute: async (inputData): Promise<ServiceEntry> => {
    const { topic } = inputData;
    const services = loadServicesData();

    if (topic in services) {
      return services[topic] as ServiceEntry;
    }

    return services['general'] as ServiceEntry;
  },
});
