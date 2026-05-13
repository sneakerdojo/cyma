import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock references
// ---------------------------------------------------------------------------

const {
  mockSearchContacts,
  mockCreateContact,
  mockUpdateContact,
  mockContactGroupsList,
  mockContactGroupsCreate,
  mockContactGroupsMembersModify,
  mockGetOAuth2Client,
} = vi.hoisted(() => {
  const mockSearchContacts = vi.fn();
  const mockCreateContact = vi.fn();
  const mockUpdateContact = vi.fn();
  const mockContactGroupsList = vi.fn();
  const mockContactGroupsCreate = vi.fn();
  const mockContactGroupsMembersModify = vi.fn();
  const mockGetOAuth2Client = vi.fn().mockReturnValue({ credentials: {} });

  return {
    mockSearchContacts,
    mockCreateContact,
    mockUpdateContact,
    mockContactGroupsList,
    mockContactGroupsCreate,
    mockContactGroupsMembersModify,
    mockGetOAuth2Client,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../services/google-auth.js', () => ({
  getOAuth2Client: mockGetOAuth2Client,
}));

vi.mock('googleapis', () => ({
  google: {
    people: vi.fn().mockReturnValue({
      people: {
        searchContacts: mockSearchContacts,
        createContact: mockCreateContact,
        updateContact: mockUpdateContact,
      },
      contactGroups: {
        list: mockContactGroupsList,
        create: mockContactGroupsCreate,
        members: {
          modify: mockContactGroupsMembersModify,
        },
      },
    }),
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

// ---------------------------------------------------------------------------
// Load module under test AFTER mocks
// ---------------------------------------------------------------------------

import { createLeadContact } from './google-contacts.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const SAMPLE_INPUT = {
  contact: { name: 'Jane Doe', email: 'jane@example.com', company: 'Acme Corp' },
  selectedService: 'AI Agents & Automations',
  budget: 'R500K+',
  requirements: 'We need a full booking AI pipeline integrated with our CRM system',
  olsScore: 18,
  scoreBand: 'hot' as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createLeadContact', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: Leads group already exists
    mockContactGroupsList.mockResolvedValue({
      data: { contactGroups: [{ name: 'Leads', resourceName: 'contactGroups/abc123' }] },
    });
    mockContactGroupsMembersModify.mockResolvedValue({ data: {} });
  });

  // ── Test 1: New contact (search returns empty) ───────────────────────────
  it('calls createContact with correct fields when the lead has no existing contact', async () => {
    mockSearchContacts.mockResolvedValue({ data: { results: [] } });
    mockCreateContact.mockResolvedValue({
      data: { resourceName: 'people/c1111111111' },
    });

    await createLeadContact(SAMPLE_INPUT);

    expect(mockCreateContact).toHaveBeenCalledOnce();

    const callArg = mockCreateContact.mock.calls[0][0] as {
      requestBody: {
        names: Array<{ givenName: string; familyName?: string }>;
        emailAddresses: Array<{ value: string; type: string }>;
        organizations?: Array<{ name: string }>;
        biographies: Array<{ value: string; contentType: string }>;
      };
    };

    const rb = callArg.requestBody;

    // Name splitting: "Jane Doe" → givenName "Jane", familyName "Doe"
    expect(rb.names[0]?.givenName).toBe('Jane');
    expect(rb.names[0]?.familyName).toBe('Doe');

    expect(rb.emailAddresses[0]?.value).toBe('jane@example.com');
    expect(rb.emailAddresses[0]?.type).toBe('work');

    expect(rb.organizations?.[0]?.name).toBe('Acme Corp');

    // Biography should contain lead metadata
    const bio = rb.biographies[0]?.value ?? '';
    expect(bio).toContain('HOT');
    expect(bio).toContain('18/20');
    expect(bio).toContain('AI Agents & Automations');

    // updateContact must NOT have been called
    expect(mockUpdateContact).not.toHaveBeenCalled();
  });

  // ── Test 2: Existing contact (search returns a match) ───────────────────
  it('calls updateContact with refreshed notes when the lead already has a contact', async () => {
    mockSearchContacts.mockResolvedValue({
      data: {
        results: [
          {
            person: {
              resourceName: 'people/c9999999999',
              emailAddresses: [{ value: 'jane@example.com' }],
              metadata: { sources: [{ etag: 'etag-xyz' }] },
            },
          },
        ],
      },
    });
    mockUpdateContact.mockResolvedValue({
      data: { resourceName: 'people/c9999999999' },
    });

    await createLeadContact(SAMPLE_INPUT);

    expect(mockUpdateContact).toHaveBeenCalledOnce();

    const callArg = mockUpdateContact.mock.calls[0][0] as {
      resourceName: string;
      updatePersonFields: string;
      requestBody: { etag?: string; biographies: Array<{ value: string }> };
    };

    expect(callArg.resourceName).toBe('people/c9999999999');
    expect(callArg.updatePersonFields).toBe('biographies');
    expect(callArg.requestBody.etag).toBe('etag-xyz');
    expect(callArg.requestBody.biographies[0]?.value).toContain('Octio Lead');

    // createContact must NOT have been called
    expect(mockCreateContact).not.toHaveBeenCalled();
  });

  // ── Test 3: API error → logs error, does not throw ───────────────────────
  it('logs the error and does NOT throw when the People API call fails', async () => {
    const apiError = new Error('People API unavailable');
    mockSearchContacts.mockRejectedValue(apiError);
    mockCreateContact.mockRejectedValue(apiError);

    await expect(createLeadContact(SAMPLE_INPUT)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledOnce();
    const [meta] = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { err: unknown; email: string },
      string,
    ];
    expect(meta.email).toBe('jane@example.com');
  });
});
