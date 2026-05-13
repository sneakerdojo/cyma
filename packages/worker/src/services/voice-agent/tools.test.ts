import { describe, it, expect } from 'vitest';
import {
  createMockTools,
  mockLookupAvailability,
  mockBookAppointment,
  mockRouteToHuman,
} from './tools.js';

// ---------------------------------------------------------------------------
// Mock tools — deterministic stand-ins for Google Calendar + Twilio.
// They don't hit any external service; they return plausibly-shaped data
// so the simulator + tests exercise the same shapes as production tools.
// ---------------------------------------------------------------------------

describe('mockLookupAvailability', () => {
  it('returns 3 slots within the next 3 business days', async () => {
    const result = await mockLookupAvailability({});
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.slots)).toBe(true);
    expect(result.slots).toHaveLength(3);
  });

  it('all returned slots are valid ISO-8601 strings in the future', async () => {
    const result = await mockLookupAvailability({});
    const now = Date.now();
    for (const slot of result.slots) {
      const d = new Date(slot);
      expect(Number.isNaN(d.getTime())).toBe(false);
      expect(d.getTime()).toBeGreaterThan(now);
    }
  });

  it('respects an explicit date arg', async () => {
    const result = await mockLookupAvailability({ date: '2026-12-25' });
    expect(result.slots.every((s) => s.startsWith('2026-12-25'))).toBe(true);
  });
});

describe('mockBookAppointment', () => {
  it('returns ok + eventId + echoes slot for a valid ISO slot', async () => {
    const result = await mockBookAppointment({ slot: '2026-05-15T10:00:00Z' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.eventId).toMatch(/^mock-evt-/);
      expect(result.slot).toBe('2026-05-15T10:00:00Z');
    }
  });

  it('rejects when slot is missing', async () => {
    const result = await mockBookAppointment({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/slot/i);
    }
  });
});

describe('mockRouteToHuman', () => {
  it('returns ok + a fake transfer number', async () => {
    const result = await mockRouteToHuman({ reason: 'urgent emergency' });
    expect(result.ok).toBe(true);
    expect(result.transferTo).toMatch(/^\+27/);
    expect(result.reason).toBe('urgent emergency');
  });
});

describe('createMockTools', () => {
  it('exposes all three mock tools', () => {
    const tools = createMockTools();
    expect(typeof tools.lookup_availability).toBe('function');
    expect(typeof tools.book_appointment).toBe('function');
    expect(typeof tools.route_to_human).toBe('function');
  });
});
