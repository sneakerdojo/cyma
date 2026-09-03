import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// show_multi_select — pass-through UI tool
//
// SRP: This tool's only responsibility is to signal the frontend to render
// a checkbox list for multi-selection. The execute function returns the input
// as-is so the SSE stream carries component props to the client.
// ---------------------------------------------------------------------------

export const showMultiSelectTool = createTool({
  id: 'show_multi_select',
  description:
    'Show a checkbox list for multi-selection. User checks items and taps Confirm. Call this when multiple answers apply (pain points, features needed, etc.).',
  inputSchema: z.object({
    question: z.string().describe('Main question text'),
    detail: z.string().optional().describe('Additional context, muted text below question'),
    options: z
      .array(z.string().min(1).max(120))
      .min(2, 'options must contain at least 2 items')
      .max(10, 'options cannot exceed 10 items')
      .describe('Checkbox labels (2-10 options, each non-empty)'),
    minSelect: z
      .number()
      .int()
      .min(0)
      .default(1)
      .describe('Minimum number of selections required (>= 0)'),
    maxSelect: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Maximum number of selections allowed (>= 1, must be >= minSelect)'),
  }),
  execute: async (input) => ({ rendered: true, ...input }),
});
