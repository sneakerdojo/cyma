import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock references so they are available inside vi.mock factory closures.
// ---------------------------------------------------------------------------

const { mockSendInternalAlert } = vi.hoisted(() => ({
  mockSendInternalAlert: vi.fn(),
}));

vi.mock('../../services/gmail.js', () => ({
  sendInternalAlert: mockSendInternalAlert,
}));

// Import SUT after mocks are registered.
import { handoffToHumanTool } from './handoff-to-human.js';

// ---------------------------------------------------------------------------

describe('handoffToHumanTool', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls sendInternalAlert with [NORMAL] subject prefix for normal urgency', async () => {
    mockSendInternalAlert.mockResolvedValueOnce('msg-001');

    const result = await handoffToHumanTool.execute!(
      {
        reason: 'User wants to discuss pricing in detail',
        urgency: 'normal',
        conversationSummary: 'User asked about custom software pricing for a mid-range project.',
      },
      {} as never,
    );

    expect(mockSendInternalAlert).toHaveBeenCalledOnce();
    const [subject] = mockSendInternalAlert.mock.calls[0] as [string, string];
    expect(subject).toContain('[NORMAL]');
    expect(subject).toContain('User wants to discuss pricing in detail');
    expect(result).toEqual({
      ok: true,
      message: 'Your message has been flagged for our team. You will hear back within 1 business day.',
    });
  });

  it('calls sendInternalAlert with [URGENT] subject prefix for urgent escalations', async () => {
    mockSendInternalAlert.mockResolvedValueOnce('msg-002');

    const result = await handoffToHumanTool.execute!(
      {
        reason: 'User has lodged a formal complaint',
        urgency: 'urgent',
        conversationSummary: 'User is unhappy with a previous project delivery.',
      },
      {} as never,
    );

    expect(mockSendInternalAlert).toHaveBeenCalledOnce();
    const [subject] = mockSendInternalAlert.mock.calls[0] as [string, string];
    expect(subject).toContain('[URGENT]');
    expect(subject).toContain('User has lodged a formal complaint');
    expect(result).toEqual({
      ok: true,
      message: 'Your message has been flagged for our team. You will hear back within 1 business day.',
    });
  });

  it('returns { ok: false, error } when sendInternalAlert throws — does not re-throw', async () => {
    mockSendInternalAlert.mockRejectedValueOnce(new Error('Gmail credentials expired'));

    const result = await handoffToHumanTool.execute!(
      {
        reason: 'Cannot resolve user question',
        urgency: 'normal',
        conversationSummary: 'User asked about something outside Octio scope.',
      },
      {} as never,
    );

    expect(result).toEqual({ ok: false, error: 'Gmail credentials expired' });
  });
});
