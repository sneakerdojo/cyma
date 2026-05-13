import { describe, it, expect, vi } from 'vitest';
import { createOctoBrainAdapter } from './octo-brain-adapter.js';
import type { Brain } from './orchestrator.js';

// ---------------------------------------------------------------------------
// OctoBrainAdapter is the seam between the voice-agent orchestrator's
// `Brain` interface and the underlying agent that actually runs the chat
// (mockBrain in v0; real Mastra Octo agent in v1).
//
// v0 contract: takes any underlying `Brain` and returns a Brain. Adds:
//   - Per-turn timeout (default 8s) so a hung underlying brain doesn't
//     stall a voice call
//   - Optional system-hint prefix (used to pass tenant brand / profile
//     summary into the brain transparently)
//   - Bypass to mockBrain when VOICE_USE_MOCK_BRAIN=1 (dev-only)
//
// v1 swap: the underlying brain becomes a real Mastra agent wrapper.
// The adapter contract doesn't change.
// ---------------------------------------------------------------------------

describe('createOctoBrainAdapter', () => {
  it('returns a Brain that forwards to the underlying brain', async () => {
    const underlying: Brain = {
      name: 'underlying',
      generate: vi.fn().mockResolvedValue({ reply: 'hi', toolCalls: [] }),
    };
    const adapter = createOctoBrainAdapter({ underlying });
    const turn = await adapter.generate({ history: [] });
    expect(turn.reply).toBe('hi');
    expect(underlying.generate).toHaveBeenCalledOnce();
  });

  it('exposes a stable name (so latency telemetry can identify the brain)', () => {
    const underlying: Brain = { name: 'fsm', generate: vi.fn() };
    const adapter = createOctoBrainAdapter({ underlying });
    expect(adapter.name).toMatch(/octo-brain-adapter/);
  });

  it('prefixes systemHints onto the request when configured', async () => {
    const underlying: Brain = {
      name: 'spy',
      generate: vi.fn().mockResolvedValue({ reply: 'ok', toolCalls: [] }),
    };
    const adapter = createOctoBrainAdapter({
      underlying,
      tenantBrand: 'Joburg Plumbing',
      profileSummary: 'Returning caller — prefers WhatsApp',
    });
    await adapter.generate({ history: [{ role: 'user', text: 'hi' }] });
    const args = (underlying.generate as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(args.systemHints).toContain('Joburg Plumbing');
    expect(args.systemHints).toContain('Returning caller');
  });

  it('times out a hung underlying brain', async () => {
    const underlying: Brain = {
      name: 'hung',
      generate: () => new Promise(() => {}), // never resolves
    };
    const adapter = createOctoBrainAdapter({ underlying, timeoutMs: 50 });
    const turn = await adapter.generate({ history: [] });
    expect(turn.reply).toMatch(/moment|trouble|connection/i);
    expect(turn.toolCalls).toEqual([]);
  });

  it('does not double-wrap an already-wrapped brain', () => {
    const underlying: Brain = { name: 'fsm', generate: vi.fn() };
    const once = createOctoBrainAdapter({ underlying });
    const twice = createOctoBrainAdapter({ underlying: once });
    // The adapter's name shouldn't compound — re-wrapping is idempotent.
    expect(twice.name).toBe(once.name);
  });
});
