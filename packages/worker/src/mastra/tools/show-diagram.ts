import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// show_diagram — pass-through UI tool
//
// SRP: This tool's only responsibility is to signal the frontend to render
// a Mermaid diagram inline in the conversation. It can be called multiple
// times in a single agent response to produce side-by-side comparisons.
// The execute function returns the input as-is so the SSE stream carries
// the mermaidCode and display options to the client renderer.
// ---------------------------------------------------------------------------

export const showDiagramTool = createTool({
  id: 'show_diagram',
  description:
    'Show a Mermaid diagram inline in the conversation. Call this when explaining architecture, workflows, or comparing approaches visually. Can be called multiple times in one response for side-by-side comparisons.',
  inputSchema: z.object({
    title: z.string().optional().describe('Caption above the diagram'),
    mermaidCode: z.string().describe('Raw Mermaid diagram syntax'),
    expandable: z
      .boolean()
      .default(true)
      .describe('Show tap-to-expand link below the diagram'),
  }),
  execute: async (input) => ({ rendered: true, ...input }),
});
