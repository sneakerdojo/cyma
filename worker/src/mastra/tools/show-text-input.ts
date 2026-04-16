import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// show_text_input — pass-through UI tool
//
// SRP: This tool's only responsibility is to signal the frontend to render
// a text input field. The execute function returns the input as-is so the
// SSE stream carries component props to the client.
// ---------------------------------------------------------------------------

export const showTextInputTool = createTool({
  id: 'show_text_input',
  description:
    'Show a text input field. Call this for open-ended questions where the user needs to type a longer response.',
  inputSchema: z.object({
    question: z.string().describe('Main question text'),
    detail: z.string().optional().describe('Additional context, muted text below question'),
    placeholder: z.string().optional().describe('Placeholder text for the input field'),
    multiline: z.boolean().default(false).describe('Render as a multiline textarea'),
  }),
  execute: async (input) => ({ rendered: true, ...input }),
});
