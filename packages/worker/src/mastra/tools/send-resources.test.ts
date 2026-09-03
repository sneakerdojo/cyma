import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock references so they are available inside vi.mock factory closures.
// ---------------------------------------------------------------------------

const { mockSendResourceEmail } = vi.hoisted(() => ({
  mockSendResourceEmail: vi.fn(),
}));

vi.mock('../../services/gmail.js', () => ({
  sendResourceEmail: mockSendResourceEmail,
}));

// Import SUT after mocks are registered.
import { sendResourcesTool, _clearSendResourcesCooldown } from './send-resources.js';

// ---------------------------------------------------------------------------

describe('sendResourcesTool', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Per-recipient cooldown is module-level state — reset between tests so
    // each scenario starts fresh.
    _clearSendResourcesCooldown();
  });

  it('returns { ok: true, message } when sendResourceEmail resolves', async () => {
    mockSendResourceEmail.mockResolvedValueOnce('msg-abc');

    const result = await sendResourcesTool.execute!(
      { toEmail: 'lead@example.com', topic: 'ai-agents' },
      {} as never,
    );

    expect(mockSendResourceEmail).toHaveBeenCalledOnce();
    expect(mockSendResourceEmail).toHaveBeenCalledWith('lead@example.com', 'ai-agents');
    expect(result).toEqual({ ok: true, message: 'Resources sent to lead@example.com' });
  });

  it('returns { ok: false, error } when sendResourceEmail throws — does not re-throw', async () => {
    mockSendResourceEmail.mockRejectedValueOnce(new Error('Gmail API down'));

    const result = await sendResourcesTool.execute!(
      { toEmail: 'lead@example.com', topic: 'web-dev' },
      {} as never,
    );

    expect(result).toEqual({ ok: false, error: 'Gmail API down' });
  });
});
