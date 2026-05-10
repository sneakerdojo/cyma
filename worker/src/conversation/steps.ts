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
    /** Page the user was on when they opened the wizard */
    referrerPath?: string;
    /** URL pathname when the wizard was opened */
    entryPath?: string;
    /**
     * What the user was doing when they opened the chat — drives step-0
     * branching. Values match the WizardIntent enum on the frontend.
     */
    intent?: 'general' | 'contact' | 'ask' | 'onboard';
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
  /** Optional social proof snippet shown below the detail text */
  socialProof?: string;
  /**
   * Optional A/B test variants. Each key is a variant name (e.g. 'A', 'B').
   * The variant definition overrides the base step fields (promptFn, socialProof, etc).
   * When present, the step route randomly assigns a variant per session and
   * merges the overrides onto the base.
   */
  variants?: Record<string, VariantOverride>;
}

/** Fields a variant can override on a step definition */
export interface VariantOverride {
  socialProof?: string;
  /** Override the prompt builder — variant-specific wording */
  promptFn?: (ctx: StepPromptContext) => string;
  /** Override the scheduler title (only relevant for scheduler steps) */
  title?: string;
  /** Override the scheduler detail (only relevant for scheduler steps) */
  detail?: string;
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
  if (wc?.entryPath) lines.push(`Page user came from: ${wc.entryPath}`);
  if (wc?.referrerPath && wc.referrerPath !== wc.entryPath) {
    lines.push(`Referrer page: ${wc.referrerPath}`);
  }

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
// The 9-step sequence: opener → problem detail → approach → team → timeline →
// pain points → files → schedule → summary. Identity (name/email) is captured
// at the schedule step via the existing booking form, not as a separate step.
// ---------------------------------------------------------------------------

export const STEPS: StepDef[] = [
  // Step 0 — main_problem
  {
    id: 'main_problem',
    componentType: 'choice',
    // Example A/B test: variant B uses outcome-focused framing instead of
    // problem-focused. Tracked via ab_test_assignments and analytics events.
    variants: {
      A: {}, // control — uses the base promptFn below
      B: {
        promptFn: (ctx) => {
          const pagePath = ctx.wizardContext?.entryPath ?? '';
          const pageHint = pagePath.includes('ai-agent')
            ? '\nThe user came from the AI Agents page — reference AI/automation outcomes.'
            : '';
          return `${jsonSystemPrompt(`{ "title": "string", "detail": "string", "options": ["string", "string", "string", "string", "string"] }`)}

Generate step 0 of 8: ask the user what OUTCOME they want to achieve (not problem-focused — outcome-focused).
The title should be aspirational: e.g. "What are you hoping to achieve?"
Provide exactly 5 outcome-oriented options (e.g. "Save time on manual work", "Scale customer support", "Launch a new product faster").${pageHint}${contextBlock(ctx)}`;
        },
      },
    },
    promptFn: (ctx) => {
      const pagePath = ctx.wizardContext?.entryPath ?? '';
      const intent = ctx.wizardContext?.intent ?? 'general';
      const selectedService = ctx.wizardContext?.selectedService ?? null;

      // Map known offering paths to a friendly name + lens used by intent
      // branches that benefit from product specificity.
      const OFFERINGS: Record<string, { name: string; lens: string }> = {
        'lead-generation': {
          name: 'AI Lead Generation',
          lens: 'inbound leads, pipeline, qualification, response time',
        },
        'voice-chat': {
          name: 'Voice & Chat Agents',
          lens: 'inbound calls, web chat, WhatsApp, after-hours coverage',
        },
        'social-media': {
          name: 'AI Social Media Manager',
          lens: 'content cadence, brand voice, multi-channel posting',
        },
        newsletter: {
          name: 'The Newsletter Engine',
          lens: 'weekly newsletter, audience growth, brand voice',
        },
        'agentic-app-dev': {
          name: 'Agentic App Development',
          lens: 'custom apps, MVP, AI-accelerated delivery',
        },
        'custom-workflows': {
          name: 'Custom Agentic Workflows',
          lens: 'tool integration, internal automation, AI-driven routing',
        },
        'corporate-advisory': {
          name: 'Corporate AI Advisory',
          lens: 'AI strategy, governance, enterprise rollout',
        },
      };

      const matchedKey =
        (selectedService && OFFERINGS[selectedService] ? selectedService : null) ??
        Object.keys(OFFERINGS).find((slug) => pagePath.includes(slug)) ??
        null;
      const offering = matchedKey ? OFFERINGS[matchedKey] : null;

      const shape = `{ "title": "string", "detail": "string", "options": ["string", "string", "string", "string", "string"] }`;

      // ---------------------------------------------------------------
      // Intent branches — each gets a distinct opener
      // ---------------------------------------------------------------

      if (intent === 'contact' && offering) {
        return `${jsonSystemPrompt(shape)}

Generate step 0 of 8 — opener for a "talk to the team" CTA tied to ${offering.name}.
Tone: warm, direct, business-like. The user wants a human conversation, not a tour.
Title: ask what they want the team to focus on (e.g. "What would you like the team to dig into about ${offering.name}?").
Detail: one short sentence acknowledging this lands directly with the team.
Provide EXACTLY 5 options reflecting why someone would book a contact call about ${offering.name}:
  1. Pricing & contract questions
  2. Custom-fit conversation (does this work for our setup?)
  3. Implementation timeline
  4. Compare against another option we're considering
  5. Something else — I'll explain${contextBlock(ctx)}`;
      }

      if (intent === 'contact') {
        return `${jsonSystemPrompt(shape)}

Generate step 0 of 8 — opener for a generic "talk to the team" CTA (Contact section).
Title: ask what they'd like the team to focus on (e.g. "What would you like the team to talk through?").
Detail: one short sentence acknowledging this lands directly with the team.
Provide EXACTLY 5 options:
  1. Scope a project we have in mind
  2. Discuss pricing for a specific need
  3. Compare offerings — figure out what fits us
  4. Partnership or vendor enquiry
  5. Something else — I'll explain${contextBlock(ctx)}`;
      }

      if (intent === 'ask' && offering) {
        return `${jsonSystemPrompt(shape)}

Generate step 0 of 8 — opener for an "Ask Octo about this" CTA on the ${offering.name} page.
Tone: helpful, factual, ready to answer. The user has a specific question.
Title: "What do you want to know about ${offering.name}?" (or extremely close).
Detail: one short sentence inviting them to pick or type their own question.
Provide EXACTLY 5 options anchored on ${offering.lens}:
  1. How does it actually work day-to-day?
  2. Pricing & what's included
  3. How long does setup take?
  4. Will it integrate with what I already use?
  5. Type my own question${contextBlock(ctx)}`;
      }

      if (intent === 'ask') {
        return `${jsonSystemPrompt(shape)}

Generate step 0 of 8 — opener for a generic "Ask Octo" CTA.
Title: "What do you want to know?" (or extremely close).
Detail: one short sentence inviting them to pick or type their own question.
Provide EXACTLY 5 generic-question options:
  1. What does Octio actually do?
  2. Pricing — typical ranges
  3. Process & timelines
  4. How does Octio compare to a regular agency?
  5. Type my own question${contextBlock(ctx)}`;
      }

      if (intent === 'onboard' && offering) {
        return `${jsonSystemPrompt(shape)}

Generate step 0 of 8 — opener for "Get started with ${offering.name}" CTA (commit-to-buy intent).
Tone: direct, action-oriented. The user wants to start, not browse.
Title: greet them and confirm the action — e.g. "Let's get you set up with ${offering.name}. First — which best describes you?"
Detail: one short sentence framing this as the start of intake, not a sales pitch.
Provide EXACTLY 5 options reflecting common starting positions for ${offering.name}:
  1. Solo founder / small business — first AI tool
  2. Existing team replacing a manual process
  3. Existing team replacing a competing tool
  4. Internal stakeholder evaluating before procurement
  5. Something else — I'll explain${contextBlock(ctx)}`;
      }

      if (intent === 'onboard') {
        return `${jsonSystemPrompt(shape)}

Generate step 0 of 8 — opener for "Get started" CTA (commit-to-buy intent, no specific offering).
Title: "Great — let's get you set up. Which Octio offering are you starting with?"
Detail: one short sentence framing this as the start of intake.
Provide EXACTLY 5 options:
  1. AI Lead Generation
  2. Voice & Chat Agents
  3. AI Social Media Manager
  4. The Newsletter Engine
  5. I'm not sure yet — help me decide${contextBlock(ctx)}`;
      }

      // intent === 'general' (default) — generic page or no specific intent
      if (offering) {
        return `${jsonSystemPrompt(shape)}

Generate step 0 of 8 — a CONTEXT-AWARE opener for someone who just clicked the FAB on the ${offering.name} page.
The title MUST acknowledge they were reading about ${offering.name} and ask an open question (e.g.
"Curious about ${offering.name}, or have something else in mind?").
The detail should be one short sentence (~12–18 words).
Provide EXACTLY 5 options anchored on ${offering.lens}:
  1. "Walk me through ${offering.name}"
  2. "Show me how it'd fit my situation"
  3. "Pricing / what would this cost"
  4. "I have a specific question first"
  5. "Actually, show me other Octio offerings"
Rephrase naturally — don't read like a script.${contextBlock(ctx)}`;
      }

      // Pure generic — no offering context, no specific intent
      return `${jsonSystemPrompt(shape)}

Generate step 0 of 8: a warm opener that asks "How can we help you today?".
The title MUST be "How can we help you today?" (or extremely close).
The detail should be one short sentence inviting them to pick what fits.
Provide EXACTLY 5 options:
  1. "Build a custom AI product or app"
  2. "Get AI working in my business"
  3. "I have a specific problem to solve"
  4. "Just exploring — show me what Octio does"
  5. "Talk to someone — I want to book a call"
Rephrase to match tone, but keep the five intents intact.${contextBlock(ctx)}`;
    },
  },

  // Step 1 — problem_detail (free text elaboration on their step-0 choice)
  {
    id: 'problem_detail',
    componentType: 'text',
    promptFn: (ctx) => `${jsonSystemPrompt(`{ "title": "string", "detail": "string" }`)}

Generate step 1 of 8: ask the user to describe what they're working on in their own words (free text).
Their starting direction was: "${ctx.answers['main_problem'] ?? 'not yet answered'}".
The title should invite elaboration warmly. The detail should set expectations (2-3 sentences).${contextBlock(ctx)}`,
  },

  // Step 2 — approach
  {
    id: 'approach',
    componentType: 'choice',
    socialProof: 'We recently helped a logistics company cut manual processing by 90% with a hybrid integration approach.',
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
    socialProof: 'Our average project goes from kickoff to first deploy in 6 weeks — we move fast without cutting corners.',
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
    socialProof: 'We take on 3-4 projects at a time so every client gets genuine senior attention — not a junior handoff.',
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
