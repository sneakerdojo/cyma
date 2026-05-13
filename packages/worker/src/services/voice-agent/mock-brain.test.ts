import { describe, it, expect } from 'vitest';
import { createMockBrain } from './mock-brain.js';
import type { HistoryMessage } from './orchestrator.js';

// ---------------------------------------------------------------------------
// The mock brain is a deterministic FSM that drives a believable
// receptionist conversation without an LLM. It implements:
//   - first turn → greeting
//   - need confirmation (turn 2)
//   - urgency (turn 3)
//   - location (turn 4)
//   - slot offer via lookup_availability (turn 5+)
//   - slot confirmation via book_appointment
// Plus keyword overrides:
//   - urgent / emergency / flood / now / right now → route_to_human
//   - book / appointment / schedule → jump to slot-offering
// ---------------------------------------------------------------------------

const brain = createMockBrain({ tenantBrand: 'Joburg Plumbing' });

function hist(...messages: Array<{ role: HistoryMessage['role']; text: string }>): HistoryMessage[] {
  return messages.map((m) => ({ role: m.role, text: m.text }));
}

describe('mock-brain — greeting', () => {
  it('greets on the very first user turn', async () => {
    const turn = await brain.generate({ history: hist({ role: 'user', text: 'hello' }) });
    expect(turn.reply).toMatch(/Joburg Plumbing/);
    expect(turn.reply).toMatch(/help|how can I|what.*help/i);
    expect(turn.toolCalls).toEqual([]);
  });
});

describe('mock-brain — qualification flow', () => {
  it('asks about urgency after caller states a need', async () => {
    const turn = await brain.generate({
      history: hist(
        { role: 'user', text: 'hello' },
        { role: 'assistant', text: "Hi, you've reached Joburg Plumbing. How can I help?" },
        { role: 'user', text: 'my pipe is leaking' },
      ),
    });
    expect(turn.reply).toMatch(/urgent|today|when/i);
    expect(turn.toolCalls).toEqual([]);
  });

  it('asks about location after urgency is answered', async () => {
    const turn = await brain.generate({
      history: hist(
        { role: 'user', text: 'hello' },
        { role: 'assistant', text: 'greeting' },
        { role: 'user', text: 'leaky pipe' },
        { role: 'assistant', text: 'is this urgent?' },
        { role: 'user', text: 'no just for next week' },
      ),
    });
    expect(turn.reply).toMatch(/where|location|suburb/i);
  });

  it('offers slots after location is given (calls lookup_availability)', async () => {
    const turn = await brain.generate({
      history: hist(
        { role: 'user', text: 'hello' },
        { role: 'assistant', text: 'greeting' },
        { role: 'user', text: 'leaky pipe' },
        { role: 'assistant', text: 'is this urgent?' },
        { role: 'user', text: 'no its for later' },
        { role: 'assistant', text: 'where are you?' },
        { role: 'user', text: 'Centurion' },
      ),
    });
    expect(turn.toolCalls).toHaveLength(1);
    expect(turn.toolCalls[0].name).toBe('lookup_availability');
    expect(turn.reply).toMatch(/availability|times|slots|when/i);
  });
});

describe('mock-brain — keyword overrides', () => {
  it.each([
    'this is urgent',
    'EMERGENCY',
    'help my house is flooding',
    'I need someone right now',
    'pipe burst now',
  ])('routes to human when caller says "%s"', async (text) => {
    const turn = await brain.generate({
      history: hist({ role: 'user', text }),
    });
    expect(turn.toolCalls).toHaveLength(1);
    expect(turn.toolCalls[0].name).toBe('route_to_human');
    expect(turn.reply).toMatch(/putting you through|hold on|right with you/i);
  });

  it('jumps to slot-offer when caller asks to book directly', async () => {
    const turn = await brain.generate({
      history: hist({ role: 'user', text: 'I want to book an appointment' }),
    });
    expect(turn.toolCalls).toHaveLength(1);
    expect(turn.toolCalls[0].name).toBe('lookup_availability');
  });

  it('does NOT treat the word "urgent" as urgent when used to negate (e.g. "not urgent")', async () => {
    const turn = await brain.generate({
      history: hist({ role: 'user', text: 'not urgent, just planning ahead' }),
    });
    expect(turn.toolCalls).not.toContainEqual(expect.objectContaining({ name: 'route_to_human' }));
  });
});

describe('mock-brain — booking confirmation', () => {
  it('books the chosen slot when caller picks one from the offered list', async () => {
    // History: previously offered 3 slots; caller now says "the 10am one"
    const offeredSlots = ['2026-05-15T10:00:00Z', '2026-05-15T12:00:00Z', '2026-05-15T14:00:00Z'];
    const history: HistoryMessage[] = [
      { role: 'user', text: 'I want to book' },
      { role: 'assistant', text: 'Let me check availability.' },
      { role: 'tool', text: JSON.stringify({ ok: true, slots: offeredSlots }), toolName: 'lookup_availability' },
      { role: 'assistant', text: 'I have 10am, 12pm or 2pm tomorrow — which works?' },
      { role: 'user', text: '10am works' },
    ];
    const turn = await brain.generate({ history });
    expect(turn.toolCalls).toHaveLength(1);
    expect(turn.toolCalls[0].name).toBe('book_appointment');
    expect((turn.toolCalls[0].args as { slot?: string }).slot).toBe('2026-05-15T10:00:00Z');
  });

  it('confirms the booking after book_appointment succeeds', async () => {
    const offeredSlots = ['2026-05-15T10:00:00Z'];
    const history: HistoryMessage[] = [
      { role: 'user', text: 'book me in' },
      { role: 'assistant', text: 'checking' },
      { role: 'tool', text: JSON.stringify({ ok: true, slots: offeredSlots }), toolName: 'lookup_availability' },
      { role: 'assistant', text: 'I have 10am tomorrow' },
      { role: 'user', text: 'yes 10am' },
      { role: 'assistant', text: 'booking that for you' },
      {
        role: 'tool',
        text: JSON.stringify({ ok: true, eventId: 'e1', slot: '2026-05-15T10:00:00Z' }),
        toolName: 'book_appointment',
      },
    ];
    const turn = await brain.generate({ history });
    expect(turn.reply).toMatch(/booked|confirmed|see you/i);
    expect(turn.toolCalls).toEqual([]); // no further tool calls after booking
  });
});

describe('mock-brain — out-of-scope handling', () => {
  it('falls back to a polite "let me get someone to follow up" for non-service requests', async () => {
    const turn = await brain.generate({
      history: hist({ role: 'user', text: 'I need a haircut' }),
    });
    // Brain should still ask about the need rather than make claims about offering haircuts
    expect(turn.reply).not.toMatch(/yes we do haircuts/i);
    // It should be safe and either qualify or offer a callback
    expect(turn.reply.length).toBeGreaterThan(5);
  });
});
