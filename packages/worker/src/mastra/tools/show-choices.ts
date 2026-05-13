import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// show_choices — pass-through UI tool
//
// SRP: This tool's only responsibility is to signal the frontend to render
// a single-select button grid. All rendering logic lives in the frontend.
// The execute function returns the input as-is so the SSE stream carries
// the component props to the client.
// ---------------------------------------------------------------------------

export const showChoicesTool = createTool({
  id: 'show_choices',
  description:
    'Show a single-select button grid. The frontend renders the matching ChoiceSelector component. Call this for closed questions where you want the user to pick from predefined options.',
  inputSchema: z.object({
    question: z.string().describe('Main question text, bold'),
    detail: z.string().optional().describe('Additional context, muted text below question'),
    options: z
      .array(z.string().min(1).max(120))
      .min(2, 'options must contain at least 2 buttons')
      .max(8, 'options cannot exceed 8 buttons')
      .describe('Button labels (2-8 options, each non-empty, max 120 chars)'),
    allowCustom: z
      .boolean()
      .default(true)
      .describe('Show "or type" text input below buttons'),
  }),
  execute: async (input) => ({ rendered: true, ...input }),
});
