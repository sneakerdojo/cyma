/**
 * Step definitions for the guided discovery conversation.
 *
 * Each step describes:
 *   - id          : stable identifier used for history edit
 *   - componentType : which React panel to render on the frontend
 *   - promptFn    : builds the generateText prompt, injecting prior answers
 *                   and wizard context so each step is dynamically tailored
 *
 * Response schemas per componentType:
 *   choice   → { title, detail, options: string[] }
 *   text     → { title, detail }
 *   multi    → { title, detail, options: string[] }
 *   upload   → { title, detail }
 *   scheduler→ handled by /chat/step — no LLM call, real calendar data
 *   summary  → { title, detail, summaryMarkdown, agenda: string[] }
 *
 * SOLID notes:
 *   - Single responsibility: each step only knows how to build its prompt.
 *   - Open/closed: add new steps by extending the STEPS array; the route
 *     handler stays unchanged.
 *   - Liskov/Interface segregation: all step shapes satisfy the StepDef union.
 *   - Dependency inversion: route imports this module; this module knows
 *     nothing about HTTP.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Context available when building a step prompt
// ---------------------------------------------------------------------------

export interface StepPromptContext {
  /** Answers collected so far, keyed by stepId */
  answers: Record<string, string>;
  /** Wizard-collected data from earlier wizard flow */
  wizardContext?: {
    selectedService?: string | null;
    budget?: string | null;
    requirements?: string;
    contact?: { name?: string; email?: string; company?: string };
  };
}

// ---------------------------------------------------------------------------
// Zod schemas for each componentType response
// ---------------------------------------------------------------------------

export const choiceStepSchema = z.object({
  title: z.string(),
  detail: z.string(),
  options: z.array(z.string()).min(2).max(6),
});

export const textStepSchema = z.object({
  title: z.string(),
  detail: z.string(),
});

export const multiStepSchema = z.object({
  title: z.string(),
  detail: z.string(),
  options: z.array(z.string()).min(2).max(8),
});

export const uploadStepSchema = z.object({
  title: z.string(),
  detail: z.string(),
});

export const summaryStepSchema = z.object({
  title: z.string(),
  detail: z.string(),
  summaryMarkdown: z.string(),
  agenda: z.array(z.string()).min(2).max(6),
});

// ---------------------------------------------------------------------------
// Step definition types
// ---------------------------------------------------------------------------

interface BaseStepDef {
  id: string;
  /** Which frontend panel to render */
  componentType: 'choice' | 'text' | 'multi' | 'upload' | 'scheduler' | 'summary';
}

interface ChoiceStepDef extends BaseStepDef {
  componentType: 'choice';
  promptFn: (ctx: StepPromptContext) => string;
}

interface TextStepDef extends BaseStepDef {
  componentType: 'text';
  promptFn: (ctx: StepPromptContext) => string;
}

interface MultiStepDef extends BaseStepDef {
  componentType: 'multi';
  promptFn: (ctx: StepPromptContext) => string;
}

interface UploadStepDef extends BaseStepDef {
  componentType: 'upload';
  promptFn: (ctx: StepPromptContext) => string;
}

interface SchedulerStepDef extends BaseStepDef {
  componentType: 'scheduler';
  /** Scheduler step is purely a calendar fetch — no LLM prompt required */
  title: string;
  detail: string;
}

interface SummaryStepDef extends BaseStepDef {
  componentType: 'summary';
  promptFn: (ctx: StepPromptContext) => string;
}

export type StepDef =
  | ChoiceStepDef
  | TextStepDef
  | MultiStepDef
  | UploadStepDef
  | SchedulerStepDef
  | SummaryStepDef;

// ---------------------------------------------------------------------------
// Helper — serialise context into a compact block for the LLM
// ---------------------------------------------------------------------------

function contextBlock(ctx: StepPromptContext): string {
  const lines: string[] = [];

  const wc = ctx.wizardContext;
  if (wc?.contact?.name) lines.push(`User name: ${wc.contact.name}`);
  if (wc?.selectedService) lines.push(`Service of interest: ${wc.selectedService}`);
  if (wc?.budget) lines.push(`Budget: ${wc.budget}`);
  if (wc?.requirements) lines.push(`Initial requirements: ${wc.requirements}`);

  const answerBlock = Object.entries(ctx.answers)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  if (answerBlock) lines.push(`Prior answers:\n${answerBlock}`);

  return lines.length > 0 ? `\n\nContext:\n${lines.join('\n')}` : '';
}

// ---------------------------------------------------------------------------
// JSON format instructions injected into every generateText system prompt
// ---------------------------------------------------------------------------

function jsonSystemPrompt(shape: string): string {
  return `You are a discovery call assistant for Octio, a software consultancy.
Respond ONLY with valid JSON matching exactly this shape — no markdown fences, no explanation, just raw JSON:
${shape}

Keep the tone professional, concise, and warm. Reference context when relevant.`;
}

// ---------------------------------------------------------------------------
// The 9-step sequence
// ---------------------------------------------------------------------------

export const STEPS: StepDef[] = [
  // Step 0 — main_problem
  {
    id: 'main_problem',
    componentType: 'choice',
    promptFn: (ctx) => `${jsonSystemPrompt(`{ "title": "string", "detail": "string", "options": ["string", "string", "string", "string", "string"] }`)}

Generate step 0 of 8: ask the user what their main problem is that they want to solve with software.
The title should be a warm greeting + direct question.
Provide exactly 5 options covering common business software pain points.${contextBlock(ctx)}`,
  },

  // Step 1 — problem_detail
  {
    id: 'problem_detail',
    componentType: 'text',
    promptFn: (ctx) => `${jsonSystemPrompt(`{ "title": "string", "detail": "string" }`)}

Generate step 1 of 8: ask the user to describe their problem in their own words (free text).
Reference their main problem answer if available: "${ctx.answers['main_problem'] ?? 'not yet answered'}".
The title should invite elaboration. The detail should set expectations (2-3 sentences).${contextBlock(ctx)}`,
  },

  // Step 2 — approach
  {
    id: 'approach',
    componentType: 'choice',
    promptFn: (ctx) => `${jsonSystemPrompt(`{ "title": "string", "detail": "string", "options": ["string", "string", "string", "string"] }`)}

Generate step 2 of 8: ask what approach the user prefers for solving their problem.
Reference their problem: "${ctx.answers['main_problem'] ?? ''}" and detail: "${ctx.answers['problem_detail'] ?? ''}".
Provide exactly 4 options (e.g. build custom, buy off-the-shelf, integrate existing tools, hybrid).${contextBlock(ctx)}`,
  },

  // Step 3 — team_size
  {
    id: 'team_size',
    componentType: 'choice',
    promptFn: (ctx) => `${jsonSystemPrompt(`{ "title": "string", "detail": "string", "options": ["string", "string", "string", "string", "string"] }`)}

Generate step 3 of 8: ask the user how many people will use the solution.
Provide exactly 5 team-size ranges (e.g. "Just me", "2-5", "6-20", "21-100", "100+").${contextBlock(ctx)}`,
  },

  // Step 4 — timeline
  {
    id: 'timeline',
    componentType: 'choice',
    promptFn: (ctx) => `${jsonSystemPrompt(`{ "title": "string", "detail": "string", "options": ["string", "string", "string", "string"] }`)}

Generate step 4 of 8: ask when the user needs the solution live.
Provide exactly 4 timeline options ranging from urgent to longer term.${contextBlock(ctx)}`,
  },

  // Step 5 — pain_points
  {
    id: 'pain_points',
    componentType: 'multi',
    promptFn: (ctx) => `${jsonSystemPrompt(`{ "title": "string", "detail": "string", "options": ["string", "string", "string", "string", "string", "string"] }`)}

Generate step 5 of 8: ask the user to select all pain points that apply (multi-select).
Provide exactly 6 specific pain point options relevant to software projects.
Reference their problem area: "${ctx.answers['main_problem'] ?? ''}".${contextBlock(ctx)}`,
  },

  // Step 6 — files (upload)
  {
    id: 'files',
    componentType: 'upload',
    promptFn: (ctx) => `${jsonSystemPrompt(`{ "title": "string", "detail": "string" }`)}

Generate step 6 of 8: invite the user to upload any supporting documents (wireframes, specs, screenshots).
Make it clear this is optional. Keep the title friendly and the detail brief (1-2 sentences).${contextBlock(ctx)}`,
  },

  // Step 7 — schedule (scheduler — no LLM, real calendar)
  {
    id: 'schedule',
    componentType: 'scheduler',
    title: 'Pick a time for your discovery call',
    detail:
      'Choose a 30-minute slot that works for you. All times are in SAST (South Africa Standard Time).',
  },

  // Step 8 — summary
  {
    id: 'summary',
    componentType: 'summary',
    promptFn: (ctx) => {
      const answersText = Object.entries(ctx.answers)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join('\n');

      return `${jsonSystemPrompt(`{ "title": "string", "detail": "string", "summaryMarkdown": "string", "agenda": ["string", "string", "string"] }`)}

Generate step 8 of 8: a personalised summary of what was discussed plus a call agenda.

summaryMarkdown: 2-3 paragraph markdown summary referencing their specific answers. Use **bold** for emphasis.
agenda: exactly 3 agenda items for the discovery call, specific to their situation.
title: "Here's your discovery brief" or similar.
detail: 1-2 sentences explaining what happens next.

User's answers:
${answersText}

Wizard context:
  Service: ${ctx.wizardContext?.selectedService ?? 'not specified'}
  Budget: ${ctx.wizardContext?.budget ?? 'not specified'}
  Requirements: ${ctx.wizardContext?.requirements ?? 'not specified'}`;
    },
  },
];

// ---------------------------------------------------------------------------
// Public lookup helper
// ---------------------------------------------------------------------------

export function getStep(index: number): StepDef | null {
  return STEPS[index] ?? null;
}

export function getTotalSteps(): number {
  return STEPS.length;
}
