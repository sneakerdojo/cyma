import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock references so they are available inside vi.mock factory closures.
// ---------------------------------------------------------------------------

const { mockGenerateText, mockSend, mockGetOAuth2Client, mockCreateOpenAICompatible } =
  vi.hoisted(() => {
    const mockChatModel = vi.fn(() => 'mock-kimi-model');
    const mockCreateOpenAICompatible = vi.fn(() => ({ chatModel: mockChatModel }));
    return {
      mockGenerateText: vi.fn(),
      mockSend: vi.fn(),
      mockGetOAuth2Client: vi.fn(() => ({})),
      mockCreateOpenAICompatible,
    };
  });

// Mock the AI SDK generateText
vi.mock('ai', () => ({
  generateText: mockGenerateText,
}));

// Mock @ai-sdk/openai-compatible using the hoisted reference
vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: mockCreateOpenAICompatible,
}));

// Mock googleapis so no real HTTP calls are made
vi.mock('googleapis', () => {
  return {
    google: {
      gmail: vi.fn(() => ({
        users: {
          messages: {
            send: mockSend,
          },
        },
      })),
    },
  };
});

// Mock google-auth so getOAuth2Client doesn't need real credentials
vi.mock('../../services/google-auth.js', () => ({
  getOAuth2Client: mockGetOAuth2Client,
}));

// Mock config
vi.mock('../../config.js', () => ({
  config: {
    kimiBaseUrl: 'https://api.moonshot.ai/v1',
    kimiApiKey: 'test-kimi-key',
    kimiModel: 'kimi-k2-0905-preview',
    googleSenderEmail: 'hello@octio.co.za',
    octioTeamEmail: 'team@octio.co.za',
  },
}));

// Import SUT after mocks are registered.
import { generateProjectBlueprintTool } from './generate-project-blueprint.js';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const BLUEPRINT_MARKDOWN = `## Recommended Approach
We would tackle this project by starting with a thorough discovery phase.

## Proposed Phases
- Phase 1: Discovery (2 weeks)
- Phase 2: Build (8 weeks)

## Key Technical Decisions
- **Framework**: React Native for cross-platform support

## Risks & Mitigations
- Risk: Scope creep — mitigated by fixed-price scoping

## Recommended Call Agenda
- Review existing systems
- Define MVP scope`;

const BASE_INPUT = {
  contactEmail: 'sarah@example.com',
  contactName: 'Sarah',
  company: 'Acme Corp',
  serviceInterest: 'ai-agents',
  projectSummary: 'Sarah needs an AI agent to handle lead qualification.',
  painPoints: ['Manual follow-ups taking too long', 'Leads going cold'],
  budgetRange: 'R150 000 – R300 000',
  teamSize: '5 people',
  timelineNotes: 'Q3 target',
  technicalContext: 'Using HubSpot CRM currently',
};

// ---------------------------------------------------------------------------

describe('generateProjectBlueprintTool', () => {
  beforeEach(() => {
    // Reset only per-call state — do NOT reset createOpenAICompatible as
    // vi.resetAllMocks() would wipe its return-value implementation and cause
    // chatModel to be undefined.
    mockGenerateText.mockReset();
    mockSend.mockReset();
    mockGetOAuth2Client.mockReset();

    // Default: send resolves successfully
    mockSend.mockResolvedValue({ data: { id: 'msg-blueprint-001' } });
    // Default: generateText returns structured markdown
    mockGenerateText.mockResolvedValue({ text: BLUEPRINT_MARKDOWN });
    // Default: getOAuth2Client returns a plain object (auth stub)
    mockGetOAuth2Client.mockReturnValue({});
    // Ensure createOpenAICompatible always returns a valid provider object
    mockCreateOpenAICompatible.mockReturnValue({ chatModel: vi.fn(() => 'mock-kimi-model') });
  });

  // -------------------------------------------------------------------------
  // Test 1: Happy path
  // -------------------------------------------------------------------------

  it('returns ok: true and emails the lead (with team CC) on success', async () => {
    const result = await generateProjectBlueprintTool.execute!(BASE_INPUT, {} as never);

    // Tool returns success confirmation
    expect(result).toEqual({
      ok: true,
      message: `Blueprint sent to sarah@example.com. The team has been CC'd.`,
    });

    // Gmail send was called exactly once
    expect(mockSend).toHaveBeenCalledOnce();

    // Verify To and Cc headers in the raw message
    const callArg = mockSend.mock.calls[0][0] as { userId: string; requestBody: { raw: string } };
    const decoded = Buffer.from(callArg.requestBody.raw, 'base64').toString('utf-8');
    expect(decoded).toContain('To: sarah@example.com');
    expect(decoded).toContain('Cc: team@octio.co.za');
  });

  // -------------------------------------------------------------------------
  // Test 2: LLM generation fails → no throw, returns { ok: false, error }
  // -------------------------------------------------------------------------

  it('returns ok: false when LLM generateText throws — does not re-throw', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('Kimi API timeout'));

    const result = await generateProjectBlueprintTool.execute!(BASE_INPUT, {} as never);

    expect(result).toEqual({ ok: false, error: 'Kimi API timeout' });
    // Gmail send should never be reached
    expect(mockSend).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 3: Gmail send fails → no throw, returns { ok: false, error }
  // -------------------------------------------------------------------------

  it('returns ok: false when Gmail send throws — does not re-throw', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: BLUEPRINT_MARKDOWN });
    mockSend.mockRejectedValueOnce(new Error('Gmail quota exceeded'));

    const result = await generateProjectBlueprintTool.execute!(BASE_INPUT, {} as never);

    expect(result).toEqual({ ok: false, error: 'Gmail quota exceeded' });
  });

  // -------------------------------------------------------------------------
  // Test 4: Unknown service key falls back to 'general' service entry
  // -------------------------------------------------------------------------

  it('falls back to the general service entry for an unknown serviceInterest key', async () => {
    const inputWithUnknownService = {
      ...BASE_INPUT,
      serviceInterest: 'non-existent-service-key',
    };

    const result = await generateProjectBlueprintTool.execute!(inputWithUnknownService, {} as never);

    // Should still succeed — 'general' entry exists in services.json
    expect(result).toEqual({
      ok: true,
      message: `Blueprint sent to sarah@example.com. The team has been CC'd.`,
    });

    // LLM prompt should have received the 'general' entry's title (About Octio)
    const llmCall = mockGenerateText.mock.calls[0][0] as { prompt: string };
    expect(llmCall.prompt).toContain('About Octio');
  });
});
