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
  description: `Render an interactive single-select button grid in the chat UI. The frontend draws buttons from your "options" array and waits for the user to tap one.

WHEN TO CALL: any question with a small closed set of plausible answers — budget tiers, team size buckets, project stages, urgency levels, service categories. If you are about to enumerate 2-6 options in prose ("we work across a few tiers — Under R100k, R100k-R250k, ..."), call this tool INSTEAD and pass those tiers as "options". The buttons are the UX; prose enumeration is a bug.

WHEN NOT TO CALL: open-ended questions with unbounded answers ("what's your company name?"), pure yes/no asks (use prose), or when you have no specific options to offer yet.

EXAMPLES:
- User: "What budget ranges do you work with?" → Call show_choices(question="Which fits your project?", options=["Under R100k","R100k–R250k","R250k–R500k","R500k+","Still figuring it out"], allowCustom=true) — short prose framing is fine ("We work across a few tiers — which fits?") but the tiers MUST go through this tool, not be typed out.
- User: "I want to understand my team size category." → Call show_choices(question="Which bracket?", options=["1–5","6–20","21–50","51–200","200+"]).

RETURNS: {rendered: true, question, options, allowCustom} — pass-through to frontend.`,
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
