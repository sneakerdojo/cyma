import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock references — vi.mock calls are hoisted above imports
// ---------------------------------------------------------------------------

const {
  mockGmailSend,
  mockAdminMembersInsert,
  mockGetOAuth2Client,
} = vi.hoisted(() => {
  const mockGmailSend = vi.fn();
  const mockAdminMembersInsert = vi.fn();
  const mockGetOAuth2Client = vi.fn().mockReturnValue({ credentials: {} });

  return { mockGmailSend, mockAdminMembersInsert, mockGetOAuth2Client };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../services/google-auth.js', () => ({
  getOAuth2Client: mockGetOAuth2Client,
}));

vi.mock('googleapis', () => {
  return {
    google: {
      gmail: vi.fn().mockReturnValue({
        users: {
          messages: {
            send: mockGmailSend,
          },
        },
      }),
      admin: vi.fn().mockReturnValue({
        members: {
          insert: mockAdminMembersInsert,
        },
      }),
    },
  };
});

vi.mock('../config.js', () => ({
  config: {
    googleSenderEmail: 'hello@octio.co.za',
    leadsGroupEmail: 'leads@octio.co.za',
    outreachGroupEmail: 'outreach@octio.co.za',
  },
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../utils/html-escape.js', () => ({
  escapeHtml: (s: string) => s,
}));

// Stub gmail.ts exports that leads-group.ts re-uses
vi.mock('./gmail.js', () => ({
  encodeHeaderValue: (s: string) => s,
  base64url: (s: string) => Buffer.from(s).toString('base64url'),
}));

// ---------------------------------------------------------------------------
// Load module under test AFTER mocks are registered
// ---------------------------------------------------------------------------

import { notifyLeadsGroup, addToOutreachList } from './leads-group.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Shared test fixture
// ---------------------------------------------------------------------------

const SAMPLE_INPUT = {
  contact: { name: 'Jane Doe', email: 'jane@example.com', company: 'Acme' },
  selectedService: 'AI Agents & Automations',
  budget: 'R500K+',
  requirements: 'We need a full booking AI pipeline',
  olsScore: 18,
  scoreBand: 'hot' as const,
  meetLink: 'https://meet.google.com/abc-defg-hij',
  slotLabel: 'Mon 14 Apr · 9:00 AM',
};

// ---------------------------------------------------------------------------
// Tests: notifyLeadsGroup
// ---------------------------------------------------------------------------

describe('notifyLeadsGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGmailSend.mockResolvedValue({ data: { id: 'msg-001' } });
  });

  it('sends an email TO the leads group email with the correct subject', async () => {
    await notifyLeadsGroup(SAMPLE_INPUT);

    expect(mockGmailSend).toHaveBeenCalledOnce();

    const callArg = mockGmailSend.mock.calls[0][0] as {
      userId: string;
      requestBody: { raw: string };
    };

    expect(callArg.userId).toBe('me');
    // Decode the base64url raw message to inspect headers
    const rawMessage = Buffer.from(callArg.requestBody.raw, 'base64url').toString('utf-8');

    // TO must point at the leads group, NOT at the lead's email
    expect(rawMessage).toContain('To: leads@octio.co.za');

    // Subject must contain score band (uppercased) and lead name
    expect(rawMessage).toMatch(/\[HOT\]/);
    expect(rawMessage).toContain('Jane Doe');
  });

  it('logs the error and does NOT throw when Gmail API fails', async () => {
    const apiError = new Error('Gmail API unavailable');
    mockGmailSend.mockRejectedValue(apiError);

    // Must not throw
    await expect(notifyLeadsGroup(SAMPLE_INPUT)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledOnce();
    const [meta] = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { err: unknown; email: string },
      string,
    ];
    expect(meta.email).toBe('jane@example.com');
  });
});

// ---------------------------------------------------------------------------
// Tests: addToOutreachList
// ---------------------------------------------------------------------------

describe('addToOutreachList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminMembersInsert.mockResolvedValue({ data: {} });
  });

  it('calls admin.members.insert with the outreach group key and the lead email', async () => {
    await addToOutreachList('jane@example.com', 'Jane Doe');

    expect(mockAdminMembersInsert).toHaveBeenCalledOnce();

    const callArg = mockAdminMembersInsert.mock.calls[0][0] as {
      groupKey: string;
      requestBody: { email: string; role: string };
    };
    expect(callArg.groupKey).toBe('outreach@octio.co.za');
    expect(callArg.requestBody.email).toBe('jane@example.com');
    expect(callArg.requestBody.role).toBe('MEMBER');
  });

  it('logs info (not error) and does NOT throw on a 409 Conflict response', async () => {
    const conflict = Object.assign(new Error('Already a member'), { code: 409 });
    mockAdminMembersInsert.mockRejectedValue(conflict);

    await expect(addToOutreachList('jane@example.com')).resolves.toBeUndefined();

    // Should be INFO, not ERROR
    expect(logger.info).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
