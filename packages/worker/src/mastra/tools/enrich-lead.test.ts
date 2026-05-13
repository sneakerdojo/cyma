import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock references so they are available inside vi.mock factory closures.
// ---------------------------------------------------------------------------

const { mockSelect, mockFrom, mockWhere, mockLimit, mockInsert, mockValues } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockValues = vi.fn().mockResolvedValue([]);
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  return { mockSelect, mockFrom, mockWhere, mockLimit, mockInsert, mockValues };
});

vi.mock('../../db/client.js', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
  schema: {
    contacts: { id: 'id', email: 'email' },
    leadScores: 'leadScores',
  },
}));

// Import SUT after mocks are registered.
import { enrichLeadTool } from './enrich-lead.js';

// ---------------------------------------------------------------------------

describe('enrichLeadTool', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Re-wire the fluent chain after each reset.
    mockLimit.mockResolvedValue([{ id: 'contact-uuid-123' }]);
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockValues.mockResolvedValue([]);
    mockInsert.mockReturnValue({ values: mockValues });
  });

  it('inserts a lead_scores row with source="agent" and the correct dimension', async () => {
    const result = await enrichLeadTool.execute!(
      {
        contactEmail: 'lead@example.com',
        field: 'team_size',
        value: '6-person operations team',
      },
      {} as never,
    );

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockValues).toHaveBeenCalledOnce();

    const insertedRow = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertedRow.source).toBe('agent');
    expect(insertedRow.dimension).toBe('team_size');
    expect(insertedRow.reason).toBe('6-person operations team');
    expect(insertedRow.points).toBe(0);
    expect(insertedRow.contactId).toBe('contact-uuid-123');

    expect(result).toEqual({ ok: true, message: 'noted' });
  });

  it('stores with null contactId when contact is not found by email', async () => {
    mockLimit.mockResolvedValue([]);

    const result = await enrichLeadTool.execute!(
      {
        contactEmail: 'unknown@example.com',
        field: 'pain_points',
        value: 'Manual reconciliation taking 3 days per month',
      },
      {} as never,
    );

    const insertedRow = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertedRow.contactId).toBeNull();
    expect(insertedRow.source).toBe('agent');
    expect(insertedRow.dimension).toBe('pain_points');
    expect(result).toEqual({ ok: true, message: 'noted' });
  });

  it('returns { ok: false, error } when the DB insert throws — does not re-throw', async () => {
    mockValues.mockRejectedValueOnce(new Error('DB connection refused'));

    const result = await enrichLeadTool.execute!(
      {
        contactEmail: 'lead@example.com',
        field: 'timeline_urgency',
        value: 'Hard deadline: end of Q3',
      },
      {} as never,
    );

    expect(result).toEqual({ ok: false, error: 'DB connection refused' });
  });

  it('stores competitor_mentions dimension correctly', async () => {
    const result = await enrichLeadTool.execute!(
      {
        contactEmail: 'lead@example.com',
        field: 'competitor_mentions',
        value: 'Also speaking with two other agencies',
      },
      {} as never,
    );

    const insertedRow = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertedRow.dimension).toBe('competitor_mentions');
    expect(result).toEqual({ ok: true, message: 'noted' });
  });
});
