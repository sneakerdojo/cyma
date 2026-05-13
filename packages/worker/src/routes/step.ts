/**
 * POST /chat/step
 *
 * Step-based conversation endpoint. The frontend sends the current step index
 * plus all collected answers so far. The backend generates the next step's
 * content via Kimi (generateText + JSON parse + Zod validation) and returns
 * a typed response the frontend can render directly.
 *
 * This endpoint is stateless — all conversation state lives in the frontend.
 * The backend only needs the current step index + prior answers to produce
 * each step.
 *
 * Request body:
 *   {
 *     stepIndex: number,
 *     answers: Record<string, string>,   // keyed by stepId
 *     wizardContext?: { selectedService, budget, requirements, contact }
 *   }
 *
 * Response body (non-scheduler, non-summary):
 *   {
 *     done: false,
 *     stepId: string,
 *     componentType: 'choice' | 'text' | 'multi' | 'upload',
 *     title: string,
 *     detail: string,
 *     options?: string[]    // present for choice + multi
 *   }
 *
 * Response body (scheduler):
 *   { done: false, stepId: 'schedule', componentType: 'scheduler',
 *     title, detail, slots: AvailableSlot[] }
 *
 * Response body (summary):
 *   { done: false, stepId: 'summary', componentType: 'summary',
 *     title, detail, summaryMarkdown: string, agenda: string[] }
 *
 * Response body (done — step index beyond last):
 *   { done: true }
 *
 * SOLID notes:
 *   - Single responsibility: this file only handles HTTP I/O + orchestration.
 *     Step definitions and prompt logic live in conversation/steps.ts.
 *     Calendar logic lives in services/calendar.ts.
 *   - Dependency inversion: imports are interfaces/abstractions, not concretions.
 */

import { Hono } from 'hono';
import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getStep, getTotalSteps, STEPS } from '../conversation/steps.js';
import type { StepPromptContext } from '../conversation/steps.js';
import {
  choiceStepSchema,
  textStepSchema,
  multiStepSchema,
  uploadStepSchema,
  summaryStepSchema,
} from '../conversation/steps.js';
import { getAvailabilityForNextBusinessDays } from '../services/calendar.js';
import { getOrAssignVariant } from '../services/ab-test.js';
import type { VariantOverride } from '../conversation/steps.js';

// ---------------------------------------------------------------------------
// Kimi model instance — reused across requests (connection pool friendly)
// ---------------------------------------------------------------------------

const kimi = createOpenAICompatible({
  name: 'kimi',
  baseURL: config.kimiBaseUrl || 'https://api.moonshot.ai/v1',
  apiKey: config.kimiApiKey ?? '',
});

// Default to the K2 Turbo variant — same architecture as the standard K2
// Preview but without the thinking overhead, optimised for streaming latency.
// Override via KIMI_MODEL env var if you want kimi-k2-0905-preview (slower,
// higher quality) or another variant.
const kimiModel = kimi.chatModel(config.kimiModel || 'kimi-k2-turbo-preview');

// ---------------------------------------------------------------------------
// generateStepContent — calls Kimi with generateText + JSON parse + Zod guard
// ---------------------------------------------------------------------------

async function generateStepContent(
  systemAndPrompt: string,
): Promise<unknown> {
  const { text } = await generateText({
    model: kimiModel,
    system:
      'Respond ONLY with valid JSON. No markdown fences, no explanation, just raw JSON.',
    prompt: systemAndPrompt,
  });

  // Strip any accidental markdown fences if Kimi adds them despite instructions
  const cleaned = text
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Hardcoded fallbacks — used when LLM call or parse fails for a given step
// ---------------------------------------------------------------------------

const FALLBACKS: Record<string, unknown> = {
  main_problem: {
    title: 'How can we help you today?',
    detail: 'Pick the closest fit — we’ll tailor the conversation from there.',
    options: [
      'Build a custom AI product or app',
      'Get AI working in my business',
      'I have a specific problem to solve',
      'Just exploring — show me what Octio does',
      'Talk to someone — I want to book a call',
    ],
  },
  problem_detail: {
    title: "Tell me a bit more — what are you working on?",
    detail:
      "A few sentences is plenty. The team reads every reply before your call, so the more colour the better.",
  },
  approach: {
    title: 'What approach sounds right to you?',
    detail: "We'll explore the best fit together — this is just a starting point.",
    options: [
      'Build a fully custom solution',
      'Adopt an off-the-shelf product',
      'Integrate and extend existing tools',
      'Hybrid of custom + existing tools',
    ],
  },
  team_size: {
    title: 'How many people will use this solution?',
    detail: 'Team size influences architecture and licensing decisions.',
    options: ['Just me', '2–5 people', '6–20 people', '21–100 people', 'More than 100'],
  },
  timeline: {
    title: 'When do you need this live?',
    detail: "We'll scope the project around your deadline.",
    options: [
      'As soon as possible (< 1 month)',
      'Within 3 months',
      'Within 6 months',
      'No firm deadline yet',
    ],
  },
  pain_points: {
    title: 'Which of these apply to your current situation?',
    detail: 'Select all that apply — helps us prioritise on the call.',
    options: [
      'Too much manual data entry',
      'No single source of truth',
      'Poor reporting / no visibility',
      'Slow approvals and bottlenecks',
      'Hard to onboard new team members',
      'Security or compliance concerns',
    ],
  },
  files: {
    title: 'Got any supporting documents to share?',
    detail:
      'Upload wireframes, specs, or screenshots — or skip and we can discuss on the call.',
  },
  summary: {
    title: "Here's your discovery brief",
    detail:
      'We review this before your call so we can hit the ground running.',
    summaryMarkdown:
      "Thanks for completing the discovery questionnaire. We've captured your answers and will prepare a tailored agenda for your call.",
    agenda: [
      'Review your current challenges and goals',
      'Explore the best technical approach for your situation',
      'Outline next steps and expected timeline',
    ],
  },
};

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

const stepRoutes = new Hono();

stepRoutes.post('/', async (c) => {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400);
  }

  const {
    stepIndex,
    answers = {},
    wizardContext,
  } = body as {
    stepIndex?: unknown;
    answers?: Record<string, string>;
    wizardContext?: StepPromptContext['wizardContext'];
  };

  if (typeof stepIndex !== 'number' || stepIndex < 0) {
    return c.json({ error: 'stepIndex must be a non-negative integer' }, 400);
  }

  const totalSteps = getTotalSteps();

  // All steps exhausted — conversation complete
  if (stepIndex >= totalSteps) {
    return c.json({ done: true });
  }

  const step = getStep(stepIndex);
  if (!step) {
    return c.json({ error: `Step ${stepIndex} not found` }, 404);
  }

  const ctx: StepPromptContext = { answers, wizardContext };

  // ---------------------------------------------------------------------------
  // A/B test variant resolution
  // Sessions that have variants defined for this step get a sticky assignment.
  // The variant overrides fields on the base step definition before rendering.
  // ---------------------------------------------------------------------------
  let assignedVariant: string | null = null;
  let variantOverride: VariantOverride | null = null;

  if (step.variants && Object.keys(step.variants).length > 0) {
    const sessionId = c.req.header('X-Session-Id') ?? '';
    if (sessionId) {
      const testName = `step_${step.id}`;
      const variantNames = Object.keys(step.variants);
      assignedVariant = await getOrAssignVariant(sessionId, testName, variantNames);
      variantOverride = step.variants[assignedVariant] ?? null;
    }
  }

  logger.info(
    { stepIndex, stepId: step.id, componentType: step.componentType, variant: assignedVariant },
    'generating step content',
  );

  // ---------------------------------------------------------------------------
  // Scheduler step — no LLM, real calendar data
  // ---------------------------------------------------------------------------

  if (step.componentType === 'scheduler') {
    let slots = await getAvailabilityForNextBusinessDays(5).catch((err) => {
      logger.error({ err }, 'calendar fetch failed — generating placeholder slots');
      return [];
    });

    // If real calendar slots are empty (API failure or no availability),
    // generate placeholder slots for the next 5 business days so the UI works.
    // These are indicative — the actual booking will re-check availability.
    if (slots.length === 0) {
      const placeholderSlots: Array<{ start: string; end: string; label: string }> = [];
      const now = new Date();
      const times = ['09:00', '11:00', '14:00', '16:00'];
      let cursor = new Date(now);
      cursor.setDate(cursor.getDate() + 1); // start tomorrow
      let daysAdded = 0;

      while (daysAdded < 5) {
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) { // skip weekends
          const dateLabel = cursor.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
          for (const time of times) {
            const [h, m] = time.split(':').map(Number);
            const start = new Date(cursor);
            start.setHours(h, m, 0, 0);
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 30);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hour12 = h % 12 || 12;
            placeholderSlots.push({
              start: start.toISOString(),
              end: end.toISOString(),
              label: `${dateLabel} · ${hour12}:${String(m).padStart(2, '0')} ${ampm}`,
            });
          }
          daysAdded++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      slots = placeholderSlots;
      logger.info({ count: slots.length }, 'using placeholder slots — calendar API unavailable');
    }

    return c.json({
      done: false,
      stepId: step.id,
      componentType: 'scheduler',
      title: variantOverride?.title ?? step.title,
      detail: variantOverride?.detail ?? step.detail,
      slots,
      slotsThisWeek: slots.length,
      socialProof: variantOverride?.socialProof ?? step.socialProof ?? null,
      variant: assignedVariant,
    });
  }

  // ---------------------------------------------------------------------------
  // LLM-generated steps
  // ---------------------------------------------------------------------------

  const promptFn = variantOverride?.promptFn ?? step.promptFn;
  const prompt = promptFn(ctx);
  let raw: unknown;

  try {
    raw = await generateStepContent(prompt);
  } catch (err) {
    logger.warn(
      { err, stepId: step.id },
      'LLM call or JSON parse failed — using hardcoded fallback',
    );
    raw = FALLBACKS[step.id] ?? {};
  }

  // Validate + shape the response per componentType.
  // Each branch uses a typed fallback constant that satisfies the schema shape
  // so TypeScript can confirm all fields are present regardless of parse result.
  const stepId = step.id;
  const socialProof = variantOverride?.socialProof ?? step.socialProof ?? null;

  switch (step.componentType) {
    case 'choice': {
      const fallback = FALLBACKS[stepId] as {
        title: string; detail: string; options: string[];
      };
      const parsed = choiceStepSchema.safeParse(raw);
      const data = parsed.success ? parsed.data : fallback;
      return c.json({
        done: false,
        stepId,
        componentType: 'choice' as const,
        title: data.title,
        detail: data.detail,
        options: data.options,
        socialProof,
        variant: assignedVariant,
      });
    }

    case 'text': {
      const fallback = FALLBACKS[stepId] as { title: string; detail: string };
      const parsed = textStepSchema.safeParse(raw);
      const data = parsed.success ? parsed.data : fallback;
      return c.json({
        done: false,
        stepId,
        componentType: 'text' as const,
        title: data.title,
        detail: data.detail,
        socialProof,
        variant: assignedVariant,
      });
    }

    case 'multi': {
      const fallback = FALLBACKS[stepId] as {
        title: string; detail: string; options: string[];
      };
      const parsed = multiStepSchema.safeParse(raw);
      const data = parsed.success ? parsed.data : fallback;
      return c.json({
        done: false,
        stepId,
        componentType: 'multi' as const,
        title: data.title,
        detail: data.detail,
        options: data.options,
        socialProof,
        variant: assignedVariant,
      });
    }

    case 'upload': {
      const fallback = FALLBACKS[stepId] as { title: string; detail: string };
      const parsed = uploadStepSchema.safeParse(raw);
      const data = parsed.success ? parsed.data : fallback;
      return c.json({
        done: false,
        stepId,
        componentType: 'upload' as const,
        title: data.title,
        detail: data.detail,
        socialProof,
        variant: assignedVariant,
      });
    }

    case 'summary': {
      const fallback = FALLBACKS[stepId] as {
        title: string; detail: string; summaryMarkdown: string; agenda: string[];
      };
      const parsed = summaryStepSchema.safeParse(raw);
      const data = parsed.success ? parsed.data : fallback;
      return c.json({
        done: false,
        stepId,
        componentType: 'summary' as const,
        title: data.title,
        detail: data.detail,
        summaryMarkdown: data.summaryMarkdown,
        agenda: data.agenda,
        socialProof,
        variant: assignedVariant,
      });
    }

    default: {
      const exhaustiveCheck: never = step;
      void exhaustiveCheck;
      return c.json({ error: `Unhandled componentType` }, 500);
    }
  }
});

// Convenience: also expose STEPS length for frontend awareness
stepRoutes.get('/count', (c) => c.json({ total: STEPS.length }));

export { stepRoutes };
