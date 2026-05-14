import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// show_scheduler — live-data UI tool
//
// Unlike the other UI tools, this tool fetches real Google Calendar
// availability before returning. A dynamic import is used to avoid circular
// dependencies with the calendar service module.
//
// SRP: This tool owns one responsibility — surface available booking slots
// from Google Calendar and return them alongside the component props so the
// frontend SchedulerPanel can render a real time-slot grid.
//
// Error boundary: if the calendar fetch fails for any reason, we return an
// empty slots array and an error message. The frontend treats empty slots as
// "no availability" and shows a fallback message — the conversation never
// breaks due to a calendar outage.
// ---------------------------------------------------------------------------

export const showSchedulerTool = createTool({
  id: 'show_scheduler',
  description:
    'Show a scheduling picker with real available time slots from Google Calendar. Call this when the user is ready to book or reschedule a discovery call.',
  inputSchema: z.object({
    question: z.string().describe('Main question text'),
    detail: z.string().optional().describe('Additional context, muted text below question'),
    daysAhead: z
      .number()
      .int()
      .min(1, 'daysAhead must be at least 1')
      .max(30, 'daysAhead cannot exceed 30 to limit calendar quota burn')
      .default(5)
      .describe('Number of business days ahead to show slots for (1-30)'),
  }),
  execute: async (input) => {
    try {
      const { getAvailabilityForNextBusinessDays } = await import('../../services/calendar.js');
      const slots = await getAvailabilityForNextBusinessDays(input.daysAhead);
      return { rendered: true, slots, ...input };
    } catch (err) {
      // Calendar outage must not break the conversation — return empty slots
      // so the frontend can display a graceful "no slots available" message.
      return {
        rendered: true,
        slots: [],
        error: err instanceof Error ? err.message : 'Failed to fetch availability',
        ...input,
      };
    }
  },
});
