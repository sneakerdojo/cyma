import { describe, it, expect } from 'vitest';
import {
  derivePhase,
  activeToolsForPhase,
  forcedToolForPhase,
  TOOLS_BY_PHASE,
} from './phase.js';

describe('derivePhase', () => {
  it('returns "cold" on zero user turns', () => {
    expect(
      derivePhase({ userTurnsSoFar: 0, toolCallHistory: [] }),
    ).toBe('cold');
  });

  it('returns "cold" on the first user turn with no tool calls', () => {
    expect(
      derivePhase({ userTurnsSoFar: 1, toolCallHistory: [] }),
    ).toBe('cold');
  });

  it('returns "discovery" once the caller is talking but no qualifying data captured', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 3,
        toolCallHistory: [{ name: 'answer_service_question' }],
      }),
    ).toBe('discovery');
  });

  it('returns "qualify" after the first enrich_lead call', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 4,
        toolCallHistory: [{ name: 'enrich_lead' }],
      }),
    ).toBe('qualify');
  });

  it('returns "close" once 3+ qualifying dimensions are captured', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 6,
        toolCallHistory: [
          { name: 'enrich_lead' },
          { name: 'enrich_lead' },
          { name: 'enrich_lead' },
        ],
      }),
    ).toBe('close');
  });

  it('jumps to "close" when closing keywords appear with at least 1 enrich_lead', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 4,
        toolCallHistory: [{ name: 'enrich_lead' }],
        lastUserMessage: "Okay, that's all from me. Thanks!",
      }),
    ).toBe('close');
  });

  it('jumps to "book" on explicit booking intent', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 5,
        toolCallHistory: [{ name: 'enrich_lead' }],
        lastUserMessage: 'When can we schedule a call?',
      }),
    ).toBe('book');
  });

  it('stays in "book" once show_scheduler has fired', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 7,
        toolCallHistory: [
          { name: 'enrich_lead' },
          { name: 'show_scheduler' },
        ],
      }),
    ).toBe('book');
  });

  it('booking intent overrides regardless of enrich count', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 2,
        toolCallHistory: [],
        lastUserMessage: 'book me in tomorrow morning',
      }),
    ).toBe('book');
  });
});

describe('activeToolsForPhase', () => {
  it('cold phase includes universal tools + show_choices', () => {
    const tools = activeToolsForPhase('cold');
    expect(tools).toContain('answer_service_question');
    expect(tools).toContain('handoff_to_human');
    expect(tools).toContain('show_choices');
    expect(tools).not.toContain('enrich_lead');
    expect(tools).not.toContain('show_scheduler');
  });

  it('qualify phase includes enrich_lead + show_form', () => {
    const tools = activeToolsForPhase('qualify');
    expect(tools).toContain('enrich_lead');
    expect(tools).toContain('show_form');
    expect(tools).not.toContain('show_scheduler');
    expect(tools).not.toContain('prepare_call_brief');
  });

  it('close phase includes prepare_call_brief + send_resources but NOT generate_project_blueprint', () => {
    const tools = activeToolsForPhase('close');
    expect(tools).toContain('prepare_call_brief');
    expect(tools).toContain('send_resources');
    // Blueprint is post-call analysis only (product decision 2026-05-14).
    expect(tools).not.toContain('generate_project_blueprint');
  });

  it('book phase includes show_scheduler + show_form', () => {
    const tools = activeToolsForPhase('book');
    expect(tools).toContain('show_scheduler');
    expect(tools).toContain('show_form');
  });

  it('every phase has handoff_to_human (caller can always escalate)', () => {
    for (const phase of Object.keys(TOOLS_BY_PHASE) as Array<
      keyof typeof TOOLS_BY_PHASE
    >) {
      expect(TOOLS_BY_PHASE[phase]).toContain('handoff_to_human');
    }
  });

  it('every phase has answer_service_question (caller can always ask)', () => {
    for (const phase of Object.keys(TOOLS_BY_PHASE) as Array<
      keyof typeof TOOLS_BY_PHASE
    >) {
      expect(TOOLS_BY_PHASE[phase]).toContain('answer_service_question');
    }
  });

  it('no phase exposes generate_project_blueprint (post-call analysis only)', () => {
    for (const phase of Object.keys(TOOLS_BY_PHASE) as Array<
      keyof typeof TOOLS_BY_PHASE
    >) {
      expect(TOOLS_BY_PHASE[phase]).not.toContain('generate_project_blueprint');
    }
  });
});

describe('forcedToolForPhase', () => {
  it('forces show_form on first entry to qualify phase', () => {
    expect(forcedToolForPhase('qualify', [])).toBe('show_form');
  });

  it('does NOT re-force show_form once it has fired this session', () => {
    expect(forcedToolForPhase('qualify', [{ name: 'show_form' }])).toBeUndefined();
  });

  it('does not force anything in cold phase', () => {
    expect(forcedToolForPhase('cold', [])).toBeUndefined();
  });

  it('does not force anything in discovery phase', () => {
    expect(forcedToolForPhase('discovery', [])).toBeUndefined();
  });

  it('does not force anything in close phase', () => {
    expect(forcedToolForPhase('close', [])).toBeUndefined();
  });

  it('does not force anything in book phase', () => {
    expect(forcedToolForPhase('book', [])).toBeUndefined();
  });

  it('returns undefined when availableTools does NOT include the would-be forced tool', () => {
    expect(
      forcedToolForPhase('qualify', [], ['enrich_lead']),
    ).toBeUndefined();
  });

  it('returns show_form when availableTools includes it', () => {
    expect(
      forcedToolForPhase('qualify', [], ['show_form', 'enrich_lead']),
    ).toBe('show_form');
  });

  it('omitting availableTools (undefined) keeps the forced tool', () => {
    // Default behaviour for callers that don't know what's registered.
    expect(forcedToolForPhase('qualify', [])).toBe('show_form');
  });
});

describe('derivePhase — contact-capture intent', () => {
  it('jumps to qualify on "add me to the discovery call list" (turn 1)', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 1,
        toolCallHistory: [],
        lastUserMessage: "I'd like to be added to your discovery call list.",
      }),
    ).toBe('qualify');
  });

  it('jumps to qualify on "sign me up"', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 1,
        toolCallHistory: [],
        lastUserMessage: 'Sign me up please.',
      }),
    ).toBe('qualify');
  });

  it('jumps to qualify on "get in touch"', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 2,
        toolCallHistory: [],
        lastUserMessage: 'I want someone to get in touch with me.',
      }),
    ).toBe('qualify');
  });

  it('does not trip on tangential mentions of "list"', () => {
    expect(
      derivePhase({
        userTurnsSoFar: 1,
        toolCallHistory: [],
        lastUserMessage: 'Can you list your services?',
      }),
    ).toBe('cold');
  });
});
