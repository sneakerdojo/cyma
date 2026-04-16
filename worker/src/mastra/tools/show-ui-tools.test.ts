import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// show-ui-tools.test.ts
//
// Covers all 7 conversational UI tools.
//
// Pass-through tools (show_choices, show_multi_select, show_text_input,
// show_file_upload, show_form, show_diagram): verify that execute() echoes
// the input back with rendered: true. No external dependencies to mock.
//
// show_scheduler: two cases —
//   1. Calendar succeeds  → returns real slots from the mocked service
//   2. Calendar throws    → returns { slots: [], error: <message> }
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mock the calendar service module so show_scheduler never hits the network.
// vi.mock is hoisted before imports, so the dynamic import inside
// show-scheduler.ts will receive this mock at runtime.
// ---------------------------------------------------------------------------

const mockGetAvailability = vi.fn();

vi.mock('../../services/calendar.js', () => ({
  getAvailabilityForNextBusinessDays: mockGetAvailability,
}));

// Import SUT modules after mocks are in place.
import { showChoicesTool } from './show-choices.js';
import { showMultiSelectTool } from './show-multi-select.js';
import { showTextInputTool } from './show-text-input.js';
import { showFileUploadTool } from './show-file-upload.js';
import { showFormTool } from './show-form.js';
import { showSchedulerTool } from './show-scheduler.js';
import { showDiagramTool } from './show-diagram.js';

// ---------------------------------------------------------------------------
// Shared test context
// ---------------------------------------------------------------------------

const noop = {} as never;

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// 1. show_choices
// ---------------------------------------------------------------------------

describe('showChoicesTool', () => {
  it('returns { rendered: true } with all input fields echoed', async () => {
    const input = {
      question: 'What type of project are you looking to build?',
      detail: 'Pick the one that best describes your need.',
      options: ['AI Agent', 'Web App', 'Integration', 'Other'],
      allowCustom: true,
    };

    const result = await showChoicesTool.execute!(input, noop);

    expect(result).toEqual({ rendered: true, ...input });
  });

  it('works without optional detail field', async () => {
    const input = {
      question: 'How soon do you need this?',
      options: ['ASAP', '1–3 months', '3–6 months'],
      allowCustom: false,
    };

    const result = await showChoicesTool.execute!(input, noop) as Record<string, unknown>;

    expect(result['rendered']).toBe(true);
    expect(result['question']).toBe(input.question);
    expect(result['options']).toEqual(input.options);
  });
});

// ---------------------------------------------------------------------------
// 2. show_multi_select
// ---------------------------------------------------------------------------

describe('showMultiSelectTool', () => {
  it('returns { rendered: true } with all input fields echoed', async () => {
    const input = {
      question: 'Which of these pain points apply to your team?',
      detail: 'Select all that apply.',
      options: ['Manual data entry', 'Slow lead follow-up', 'No CRM integration', 'Reporting gaps'],
      minSelect: 1,
      maxSelect: 4,
    };

    const result = await showMultiSelectTool.execute!(input, noop);

    expect(result).toEqual({ rendered: true, ...input });
  });

  it('works without optional detail and maxSelect fields', async () => {
    const input = {
      question: 'Which services interest you?',
      options: ['AI Agents', 'Automation', 'Custom Software'],
      minSelect: 1,
    };

    const result = await showMultiSelectTool.execute!(input, noop) as Record<string, unknown>;

    expect(result['rendered']).toBe(true);
    expect(result['options']).toEqual(input.options);
  });
});

// ---------------------------------------------------------------------------
// 3. show_text_input
// ---------------------------------------------------------------------------

describe('showTextInputTool', () => {
  it('returns { rendered: true } with all input fields echoed', async () => {
    const input = {
      question: 'Describe the problem you are trying to solve.',
      detail: 'Be as specific as you can — it helps us prepare.',
      placeholder: 'e.g. We spend 3 days per month on manual reconciliation...',
      multiline: true,
    };

    const result = await showTextInputTool.execute!(input, noop);

    expect(result).toEqual({ rendered: true, ...input });
  });

  it('works with only the required question field', async () => {
    const input = {
      question: 'What is your company name?',
      multiline: false,
    };

    const result = await showTextInputTool.execute!(input, noop) as Record<string, unknown>;

    expect(result['rendered']).toBe(true);
    expect(result['question']).toBe(input.question);
  });
});

// ---------------------------------------------------------------------------
// 4. show_file_upload
// ---------------------------------------------------------------------------

describe('showFileUploadTool', () => {
  it('returns { rendered: true } with all input fields echoed', async () => {
    const input = {
      question: 'Do you have a spec, mockup, or brief you can share?',
      detail: 'PDF, Word, or image files — max 10 MB.',
      acceptTypes: '.pdf,.doc,.docx,image/*',
      allowSkip: true,
    };

    const result = await showFileUploadTool.execute!(input, noop);

    expect(result).toEqual({ rendered: true, ...input });
  });

  it('defaults allowSkip to true', async () => {
    const input = {
      question: 'Upload your requirements document.',
      acceptTypes: '.pdf,.txt',
      allowSkip: true,
    };

    const result = await showFileUploadTool.execute!(input, noop) as Record<string, unknown>;

    expect(result['rendered']).toBe(true);
    expect(result['allowSkip']).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. show_form
// ---------------------------------------------------------------------------

describe('showFormTool', () => {
  it('returns { rendered: true } with all fields definition echoed', async () => {
    const input = {
      question: 'Who else will be joining the discovery call?',
      detail: 'We will send them an invite as well.',
      fields: [
        { name: 'name', label: 'Full name', type: 'text' as const, required: true },
        { name: 'email', label: 'Email address', type: 'email' as const, required: true },
        { name: 'role', label: 'Role / title', type: 'text' as const, required: false, placeholder: 'e.g. CTO' },
      ],
    };

    const result = await showFormTool.execute!(input, noop);

    expect(result).toEqual({ rendered: true, ...input });
  });

  it('works without optional detail', async () => {
    const input = {
      question: 'Your contact details',
      fields: [
        { name: 'phone', label: 'Phone number', type: 'tel' as const, required: false },
      ],
    };

    const result = await showFormTool.execute!(input, noop) as Record<string, unknown>;

    expect(result['rendered']).toBe(true);
    expect((result['fields'] as unknown[]).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 6. show_scheduler — calendar succeeds
// ---------------------------------------------------------------------------

describe('showSchedulerTool — calendar succeeds', () => {
  it('returns { rendered: true } with real slots from the calendar service', async () => {
    const fakeSlots = [
      { start: '2026-04-14T09:00:00+02:00', end: '2026-04-14T09:30:00+02:00', label: 'Mon 14 Apr · 9:00 AM' },
      { start: '2026-04-14T11:00:00+02:00', end: '2026-04-14T11:30:00+02:00', label: 'Mon 14 Apr · 11:00 AM' },
    ];

    mockGetAvailability.mockResolvedValueOnce(fakeSlots);

    const input = {
      question: 'Pick a time for your discovery call.',
      detail: '30 min via Google Meet. All SAST.',
      daysAhead: 5,
    };

    const result = await showSchedulerTool.execute!(input, noop) as Record<string, unknown>;

    expect(mockGetAvailability).toHaveBeenCalledOnce();
    expect(mockGetAvailability).toHaveBeenCalledWith(5);
    expect(result['rendered']).toBe(true);
    expect(result['slots']).toEqual(fakeSlots);
    expect(result['question']).toBe(input.question);
  });
});

// ---------------------------------------------------------------------------
// 7. show_scheduler — calendar fails (graceful degradation)
// ---------------------------------------------------------------------------

describe('showSchedulerTool — calendar fails', () => {
  it('returns { rendered: true, slots: [], error } when calendar service throws', async () => {
    mockGetAvailability.mockRejectedValueOnce(new Error('Google OAuth token expired'));

    const input = {
      question: 'Pick a time for your discovery call.',
      daysAhead: 5,
    };

    const result = await showSchedulerTool.execute!(input, noop) as Record<string, unknown>;

    expect(result['rendered']).toBe(true);
    expect(result['slots']).toEqual([]);
    expect(result['error']).toBe('Google OAuth token expired');
    expect(result['question']).toBe(input.question);
  });

  it('returns a string error message when a non-Error is thrown', async () => {
    mockGetAvailability.mockRejectedValueOnce('unexpected string error');

    const input = {
      question: 'Book your slot.',
      daysAhead: 3,
    };

    const result = await showSchedulerTool.execute!(input, noop) as Record<string, unknown>;

    expect(result['slots']).toEqual([]);
    expect(result['error']).toBe('Failed to fetch availability');
  });
});

// ---------------------------------------------------------------------------
// 8. show_diagram
// ---------------------------------------------------------------------------

describe('showDiagramTool', () => {
  it('returns { rendered: true } with mermaidCode and optional fields echoed', async () => {
    const input = {
      title: 'Approach A — Full Automation',
      mermaidCode: 'graph LR\n  Form --> Agent --> CRM',
      expandable: true,
    };

    const result = await showDiagramTool.execute!(input, noop);

    expect(result).toEqual({ rendered: true, ...input });
  });

  it('works without optional title field', async () => {
    const input = {
      mermaidCode: 'sequenceDiagram\n  User->>Agent: message\n  Agent-->>User: response',
      expandable: false,
    };

    const result = await showDiagramTool.execute!(input, noop) as Record<string, unknown>;

    expect(result['rendered']).toBe(true);
    expect(result['mermaidCode']).toBe(input.mermaidCode);
    expect(result['expandable']).toBe(false);
  });
});
