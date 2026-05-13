import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runTurn, type Brain, type Turn } from './orchestrator.js';

// ---------------------------------------------------------------------------
// runTurn is the pure orchestration for a single voice-agent turn:
//   - takes session history + new transcript
//   - calls the Brain (mocked here) to decide reply + tool calls
//   - dispatches tool calls in order
//   - returns { reply, toolCalls, latencyMs, nextState }
//
// In production the Brain is an LLM. In the simulator + tests it's a fake.
// ---------------------------------------------------------------------------

function makeFakeBrain(scripted: Turn): Brain {
  return {
    name: 'fake-brain',
    async generate() {
      return scripted;
    },
  };
}

describe('runTurn', () => {
  it('appends user transcript to history and returns the brain reply', async () => {
    const brain = makeFakeBrain({
      reply: 'Hi there, what can I help with?',
      toolCalls: [],
    });

    const result = await runTurn({
      sessionState: {
        sessionId: 's1',
        tenantId: 1,
        callerNumber: null,
        history: [],
        bookedSlot: null,
      },
      transcript: 'hello',
      brain,
    });

    expect(result.reply).toBe('Hi there, what can I help with?');
    expect(result.toolCalls).toEqual([]);
    expect(result.nextState.history).toHaveLength(2);
    expect(result.nextState.history[0]).toMatchObject({ role: 'user', text: 'hello' });
    expect(result.nextState.history[1]).toMatchObject({ role: 'assistant', text: 'Hi there, what can I help with?' });
  });

  it('records latencyMs with stt / brain / tts breakdown (mocked plausible values)', async () => {
    const brain = makeFakeBrain({ reply: 'ok', toolCalls: [] });
    const result = await runTurn({
      sessionState: emptyState(),
      transcript: 'hello',
      brain,
    });
    expect(result.latencyMs.stt).toBeGreaterThan(0);
    expect(result.latencyMs.brain).toBeGreaterThanOrEqual(0);
    expect(result.latencyMs.tts).toBeGreaterThan(0);
    expect(result.latencyMs.totalMouthToEar).toBeGreaterThanOrEqual(
      result.latencyMs.stt + result.latencyMs.brain + result.latencyMs.tts,
    );
  });

  it('dispatches tool calls in order and includes results in nextState.history', async () => {
    const lookup = vi.fn().mockResolvedValue({ ok: true, slots: ['2026-05-15T10:00', '2026-05-15T11:00'] });
    const brain = makeFakeBrain({
      reply: 'Let me check availability.',
      toolCalls: [{ name: 'lookup_availability', args: { date: '2026-05-15' } }],
    });

    const result = await runTurn({
      sessionState: emptyState(),
      transcript: 'when can you come?',
      brain,
      tools: {
        lookup_availability: lookup,
        book_appointment: vi.fn(),
        route_to_human: vi.fn(),
      },
    });

    expect(lookup).toHaveBeenCalledWith({ date: '2026-05-15' });
    expect(result.toolCalls).toEqual([
      { name: 'lookup_availability', args: { date: '2026-05-15' }, result: { ok: true, slots: ['2026-05-15T10:00', '2026-05-15T11:00'] } },
    ]);
    // history should contain the tool call/result
    const toolEntries = result.nextState.history.filter((m) => m.role === 'tool');
    expect(toolEntries).toHaveLength(1);
  });

  it('surfaces tool errors in toolCalls[].error without throwing', async () => {
    const lookup = vi.fn().mockRejectedValue(new Error('calendar down'));
    const brain = makeFakeBrain({
      reply: 'Let me check.',
      toolCalls: [{ name: 'lookup_availability', args: {} }],
    });

    const result = await runTurn({
      sessionState: emptyState(),
      transcript: 'when?',
      brain,
      tools: {
        lookup_availability: lookup,
        book_appointment: vi.fn(),
        route_to_human: vi.fn(),
      },
    });

    expect(result.toolCalls[0].error).toMatch(/calendar down/);
    // Brain reply still propagates so the call doesn't hang
    expect(result.reply).toBe('Let me check.');
  });

  it('passes session history to the brain on each call', async () => {
    const generate = vi.fn().mockResolvedValue({ reply: 'ok', toolCalls: [] });
    const brain: Brain = { name: 'spy', generate };

    const state = emptyState();
    state.history = [
      { role: 'user', text: 'earlier message' },
      { role: 'assistant', text: 'earlier reply' },
    ];

    await runTurn({ sessionState: state, transcript: 'new message', brain });

    expect(generate).toHaveBeenCalledOnce();
    const args = generate.mock.calls[0][0] as { history: Array<{ role: string; text: string }> };
    expect(args.history).toHaveLength(3); // 2 prior + 1 new user
    expect(args.history[args.history.length - 1]).toMatchObject({ role: 'user', text: 'new message' });
  });

  it('updates bookedSlot in nextState when book_appointment succeeds', async () => {
    const book = vi.fn().mockResolvedValue({ ok: true, eventId: 'g1', slot: '2026-05-15T10:00' });
    const brain = makeFakeBrain({
      reply: 'Booked.',
      toolCalls: [{ name: 'book_appointment', args: { slot: '2026-05-15T10:00' } }],
    });

    const result = await runTurn({
      sessionState: emptyState(),
      transcript: '10am works',
      brain,
      tools: {
        lookup_availability: vi.fn(),
        book_appointment: book,
        route_to_human: vi.fn(),
      },
    });

    expect(result.nextState.bookedSlot).toBe('2026-05-15T10:00');
  });

  it('sets ended=true when route_to_human is called', async () => {
    const route = vi.fn().mockResolvedValue({ ok: true, transferTo: '+27821000000' });
    const brain = makeFakeBrain({
      reply: 'Putting you through.',
      toolCalls: [{ name: 'route_to_human', args: { reason: 'urgent' } }],
    });

    const result = await runTurn({
      sessionState: emptyState(),
      transcript: 'this is urgent',
      brain,
      tools: {
        lookup_availability: vi.fn(),
        book_appointment: vi.fn(),
        route_to_human: route,
      },
    });

    expect(result.nextState.ended).toBe(true);
    expect(result.nextState.endedReason).toBe('transferred');
  });

  it('handles brain errors gracefully — returns a fallback reply', async () => {
    const brain: Brain = {
      name: 'failing',
      generate: async () => {
        throw new Error('llm offline');
      },
    };
    const result = await runTurn({
      sessionState: emptyState(),
      transcript: 'hello',
      brain,
    });
    expect(result.reply).toMatch(/connection issue|moment|trouble/i);
    expect(result.nextState.degraded).toBe(true);
  });
});

function emptyState() {
  return {
    sessionId: 's1',
    tenantId: 1,
    callerNumber: null as string | null,
    history: [] as Array<{ role: 'user' | 'assistant' | 'tool'; text: string }>,
    bookedSlot: null as string | null,
  };
}
