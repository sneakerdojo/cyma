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
import { prepareCallBriefTool } from './prepare-call-brief.js';

// ---------------------------------------------------------------------------

const BASE_INPUT = {
  contactEmail: 'sarah@example.com',
  contactName: 'Sarah Mokoena',
  company: 'Acme Operations',
  serviceInterest: 'AI Agents & Automations',
  budget: 'R150 000 – R300 000',
  requirementsSummary:
    'Six-person operations team needs to automate a manual data entry workflow that currently takes 6 hours per day.',
  keyPainPoints: [
    'Manual data entry consuming 6 hours per day across the team',
    'Errors from re-keying data between systems',
  ],
  teamSize: '6 people',
  timelineUrgency: 'Soft Q3 target — no hard deadline',
  decisionMakers: 'Sarah is the decision maker; no additional sign-off required',
  competitorMentions: ['another agency they spoke to last week'],
  recommendedCallAgenda: [
    'Map the current data entry workflow end-to-end',
    'Identify which steps can be automated vs. require human judgment',
    'Scope integrations required (CRM, internal database)',
  ],
  additionalNotes: 'User is technically literate — skip basics on the call.',
};

// ---------------------------------------------------------------------------

describe('prepareCallBriefTool', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls sendInternalAlert with the correct subject format', async () => {
    mockSendInternalAlert.mockResolvedValueOnce('msg-brief-001');

    await prepareCallBriefTool.execute!(BASE_INPUT, {} as never);

    expect(mockSendInternalAlert).toHaveBeenCalledOnce();
    const [subject] = mockSendInternalAlert.mock.calls[0] as [string, string];
    expect(subject).toBe('[CALL BRIEF] Discovery Call — Sarah Mokoena from Acme Operations');
  });

  it('email body contains contact name, service, and budget', async () => {
    mockSendInternalAlert.mockResolvedValueOnce('msg-brief-002');

    await prepareCallBriefTool.execute!(BASE_INPUT, {} as never);

    const [, body] = mockSendInternalAlert.mock.calls[0] as [string, string];
    expect(body).toContain('Sarah Mokoena');
    expect(body).toContain('AI Agents &amp; Automations');
    expect(body).toContain('R150 000');
  });

  it('email body contains the recommended agenda items', async () => {
    mockSendInternalAlert.mockResolvedValueOnce('msg-brief-003');

    await prepareCallBriefTool.execute!(BASE_INPUT, {} as never);

    const [, body] = mockSendInternalAlert.mock.calls[0] as [string, string];
    expect(body).toContain('Map the current data entry workflow end-to-end');
    expect(body).toContain('Scope integrations required');
  });

  it('returns { ok: true, message } on success', async () => {
    mockSendInternalAlert.mockResolvedValueOnce('msg-brief-004');

    const result = await prepareCallBriefTool.execute!(BASE_INPUT, {} as never);

    expect(result).toEqual({ ok: true, message: 'Brief sent to the team' });
  });

  it('falls back to "Unknown Company" in the subject when company is omitted', async () => {
    mockSendInternalAlert.mockResolvedValueOnce('msg-brief-005');

    const inputWithoutCompany = { ...BASE_INPUT, company: undefined };
    await prepareCallBriefTool.execute!(inputWithoutCompany, {} as never);

    const [subject] = mockSendInternalAlert.mock.calls[0] as [string, string];
    expect(subject).toBe('[CALL BRIEF] Discovery Call — Sarah Mokoena from Unknown Company');
  });

  it('returns { ok: false, error } when sendInternalAlert throws — does not re-throw', async () => {
    mockSendInternalAlert.mockRejectedValueOnce(new Error('Gmail quota exceeded'));

    const result = await prepareCallBriefTool.execute!(BASE_INPUT, {} as never);

    expect(result).toEqual({ ok: false, error: 'Gmail quota exceeded' });
  });

  it('email body contains pain points', async () => {
    mockSendInternalAlert.mockResolvedValueOnce('msg-brief-006');

    await prepareCallBriefTool.execute!(BASE_INPUT, {} as never);

    const [, body] = mockSendInternalAlert.mock.calls[0] as [string, string];
    expect(body).toContain('Manual data entry consuming 6 hours per day');
    expect(body).toContain('Errors from re-keying data between systems');
  });
});
