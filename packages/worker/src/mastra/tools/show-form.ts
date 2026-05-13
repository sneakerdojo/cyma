import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// show_form — pass-through UI tool
//
// SRP: This tool's only responsibility is to signal the frontend to render
// a dynamic labeled form. The execute function returns the input as-is so
// the SSE stream carries the field definitions to the client renderer.
// ---------------------------------------------------------------------------

const fieldSchema = z.object({
  name: z.string().describe('Field identifier used as the form key'),
  label: z.string().describe('Visible label rendered above the input'),
  type: z
    .enum(['text', 'email', 'tel', 'textarea'])
    .describe('Input type controlling keyboard and validation'),
  required: z.boolean().default(false).describe('Whether this field must be filled before submit'),
  placeholder: z.string().optional().describe('Placeholder text shown inside the input'),
});

export const showFormTool = createTool({
  id: 'show_form',
  description:
    'Show a dynamic form with labeled fields. Call this when collecting structured data (adding someone to a call, contact details, etc.).',
  inputSchema: z.object({
    question: z.string().describe('Main question text'),
    detail: z.string().optional().describe('Additional context, muted text below question'),
    fields: z
      .array(fieldSchema)
      .min(1, 'fields must contain at least one field')
      .max(8, 'fields cannot exceed 8 fields')
      .describe('Ordered list of form field definitions (1-8 fields)'),
  }),
  execute: async (input) => ({ rendered: true, ...input }),
});
