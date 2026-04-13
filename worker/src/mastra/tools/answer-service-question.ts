import { createTool } from '@mastra/core/tools';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Load knowledge base at module initialisation time.
// Using readFileSync + JSON.parse avoids import-assertion syntax differences
// between NodeNext TS compilation, Vitest's ESM resolver, and Node runtimes.
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICES_PATH = join(__dirname, '..', '..', 'knowledge', 'services.json');

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
        'The service topic to look up. Known keys: web-dev, custom-software, ai-agents, mobile-app, modernisation, pricing, process, general. Falls back to "general" if not recognised.',
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
