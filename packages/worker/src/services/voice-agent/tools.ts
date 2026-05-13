/**
 * Mock tool implementations for the Voice Agent simulator.
 *
 * Production tools will:
 *   lookup_availability → Google Calendar Free/Busy
 *   book_appointment    → Google Calendar Insert + Meta WhatsApp confirmation
 *   route_to_human      → Twilio <Dial> warm-transfer + Slack alert
 *
 * The mocks below return plausibly-shaped data so the simulator + downstream
 * code exercise the same response contracts.
 */

import type { ToolRegistry } from './orchestrator.js';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export async function mockLookupAvailability(
  args: Record<string, unknown>,
): Promise<{ ok: true; slots: string[] }> {
  const explicitDate =
    typeof args.date === 'string' && args.date ? args.date : null;

  let baseDate: Date;
  if (explicitDate) {
    baseDate = new Date(`${explicitDate}T09:00:00Z`);
  } else {
    // Tomorrow at 09:00 UTC
    baseDate = new Date(Date.now() + MS_PER_DAY);
    baseDate.setUTCHours(9, 0, 0, 0);
  }

  const slots = [
    new Date(baseDate.getTime() + 1 * MS_PER_HOUR).toISOString(),
    new Date(baseDate.getTime() + 3 * MS_PER_HOUR).toISOString(),
    new Date(baseDate.getTime() + 5 * MS_PER_HOUR).toISOString(),
  ];

  return { ok: true, slots };
}

export async function mockBookAppointment(
  args: Record<string, unknown>,
): Promise<
  | { ok: true; eventId: string; slot: string }
  | { ok: false; error: string }
> {
  const slot = typeof args.slot === 'string' ? args.slot : null;
  if (!slot) {
    return { ok: false, error: 'missing required arg: slot' };
  }
  return {
    ok: true,
    eventId: `mock-evt-${Math.random().toString(36).slice(2, 10)}`,
    slot,
  };
}

export async function mockRouteToHuman(
  args: Record<string, unknown>,
): Promise<{ ok: true; transferTo: string; reason: string }> {
  return {
    ok: true,
    // Stand-in number — production uses the tenant's configured owner number.
    transferTo: '+27821000000',
    reason:
      typeof args.reason === 'string' && args.reason
        ? args.reason
        : 'unspecified',
  };
}

export function createMockTools(): ToolRegistry {
  return {
    lookup_availability: mockLookupAvailability,
    book_appointment: mockBookAppointment,
    route_to_human: mockRouteToHuman,
  };
}
