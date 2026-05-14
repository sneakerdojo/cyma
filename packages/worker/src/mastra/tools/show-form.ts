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
  description: `Render a dynamic labeled form in the chat UI for structured data capture (contact details, project metadata, etc).

WHEN TO CALL: any moment you tell the user you will collect specific pieces of information — "I'll grab a couple of details", "let me take down your contact info", "I'll add you to the discovery call list", "fill in this quick form". Call this tool IMMEDIATELY in the same reply, with 1-8 valid fields. Empty fields:[] is rejected by schema — never attempt that. Saying "I'll grab your details" without firing show_form leaves the user staring at empty chat with nowhere to type their info.

WHEN NOT TO CALL: collecting a single piece of free-text (use show_text_input instead), or when you haven't yet asked for any structured data.

EXAMPLES:
- User: "Add me to the discovery call list." → Call show_form(question="Your details", fields=[{name:"fullName",label:"Full name",type:"text",required:true},{name:"email",label:"Email",type:"email",required:true}]) AND reply "I'll grab a couple of details to add you."
- User: "Send me the proposal." → Call show_form(question="Where should we send it?", fields=[{name:"firstName",label:"First name",type:"text",required:true},{name:"email",label:"Email",type:"email",required:true},{name:"company",label:"Company (optional)",type:"text"}]).

RETURNS: {rendered: true, question, fields} — pass-through to frontend.`,
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
