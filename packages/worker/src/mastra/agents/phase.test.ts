import { describe, it, expect } from 'vitest';
import {
  derivePhase,
  activeToolsForPhase,
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

  it('close phase includes prepare_call_brief + generate_project_blueprint', () => {
    const tools = activeToolsForPhase('close');
    expect(tools).toContain('prepare_call_brief');
    expect(tools).toContain('generate_project_blueprint');
    expect(tools).toContain('send_resources');
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
});
