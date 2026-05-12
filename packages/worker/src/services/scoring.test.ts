import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeOLS } from './scoring.js';
import type { OLSInput } from './scoring.js';

// ---------------------------------------------------------------------------
// Freeze time so timeline scoring is deterministic.
// Reference "now" = 2026-04-11T12:00:00Z
// ---------------------------------------------------------------------------
const FROZEN_NOW_ISO = '2026-04-11T12:00:00.000Z';
const FROZEN_NOW_MS = new Date(FROZEN_NOW_ISO).getTime();

// Slot ID helpers — format: `${utcMidnightISO}-HH:MM`
// Days are counted from FROZEN_NOW. SAST=UTC+2, so the UTC midnight that
// corresponds to a SAST calendar date N days from now is computed below.
function slotIdDaysFromNow(daysFromNow: number): string {
  const targetMs = FROZEN_NOW_MS + daysFromNow * 24 * 60 * 60 * 1000;
  const d = new Date(targetMs);
  const utcMidnight = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  return `${utcMidnight.toISOString()}-09:00`;
}

// ---------------------------------------------------------------------------
// Base fixture — can be overridden per test
// ---------------------------------------------------------------------------
// Long requirements string >= 200 chars for max clarity score
const LONG_REQUIREMENTS =
  'We need a full AI booking agent with automated follow-ups, ' +
  'integrated with our existing CRM and custom reporting dashboards. ' +
  'This is an urgent project for our agency website relaunch in Q2 2026. ' +
  'We also need multi-channel support including WhatsApp and email.';

function makeHotIntake(overrides: Partial<OLSInput> = {}): OLSInput {
  return {
    budget: 'R500K+',
    selectedSlot: { id: slotIdDaysFromNow(2), time: '09:00' },
    requirements: LONG_REQUIREMENTS,
    selectedService: 'AI Agents & Automations',
    contact: { name: 'Alice Smith', email: 'alice@acme.co.za', company: 'Acme Corp' },
    hasVoiceNote: true,
    hasAttachment: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeOLS', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW_MS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Test 1: Hot lead — all dimensions max ─────────────────────────────────
  it('returns hot band when all dimensions score 4', () => {
    const result = computeOLS(makeHotIntake());

    expect(result.total).toBe(20);
    expect(result.band).toBe('hot');
    expect(result.dimensions).toHaveLength(5);

    const dimensionNames = result.dimensions.map((d) => d.dimension);
    expect(dimensionNames).toEqual(['budget', 'timeline', 'clarity', 'fit', 'contact']);

    result.dimensions.forEach((d) => {
      expect(d.points).toBe(4);
    });
  });

  // ── Test 2: Warm lead — mid-range on every dimension ─────────────────────
  it('returns warm band for mid-range budget, 3-week slot, partial contact', () => {
    const result = computeOLS(
      makeHotIntake({
        budget: 'R50K-R150K',
        selectedSlot: { id: slotIdDaysFromNow(21), time: '09:00' },
        // >= 50 chars so clarity=2 (no voice/attachment, not >= 200 chars)
        requirements: 'Need a mobile app for our retail store with inventory management',
        selectedService: 'Mobile App',
        contact: { name: 'Bob Jones', email: 'bob@example.com' }, // no company
        hasVoiceNote: false,
        hasAttachment: false,
      }),
    );

    // budget=2, timeline=2, clarity=2 (>=50 chars, no media), fit=2, contact=2
    expect(result.total).toBe(10);
    expect(result.band).toBe('warm');

    const budget = result.dimensions.find((d) => d.dimension === 'budget')!;
    expect(budget.points).toBe(2);

    const timeline = result.dimensions.find((d) => d.dimension === 'timeline')!;
    expect(timeline.points).toBe(2);

    const contact = result.dimensions.find((d) => d.dimension === 'contact')!;
    expect(contact.points).toBe(2);
  });

  // ── Test 3: Cold lead — minimal score ─────────────────────────────────────
  it('returns cold band for low-budget, far-out slot, vague requirements', () => {
    const result = computeOLS(
      makeHotIntake({
        budget: 'Under R50K',
        selectedSlot: { id: slotIdDaysFromNow(35), time: '09:00' },
        requirements: 'Not sure',
        selectedService: 'Just Browsing',
        contact: { name: 'Charlie Brown', email: 'charlie@example.com' }, // no company
        hasVoiceNote: false,
        hasAttachment: false,
      }),
    );

    // budget=0, timeline=0, clarity=0 (<50 chars, no media), fit=0, contact=2
    expect(result.total).toBe(2);
    expect(result.band).toBe('cold');

    const fit = result.dimensions.find((d) => d.dimension === 'fit')!;
    expect(fit.points).toBe(0);

    const clarity = result.dimensions.find((d) => d.dimension === 'clarity')!;
    expect(clarity.points).toBe(0);
  });

  // ── Test 4: Long requirements + voice note but no attachment ──────────────
  it('gives clarity=4 when requirements >= 200 chars and hasVoiceNote=true', () => {
    const longReqs = 'a'.repeat(200);
    const result = computeOLS(
      makeHotIntake({
        requirements: longReqs,
        hasVoiceNote: true,
        hasAttachment: false,
      }),
    );

    const clarity = result.dimensions.find((d) => d.dimension === 'clarity')!;
    expect(clarity.points).toBe(4);
  });

  // ── Test 5: Short requirements (<50 chars) but attachment present ─────────
  it('gives clarity=2 when requirements < 50 chars but hasAttachment=true', () => {
    const result = computeOLS(
      makeHotIntake({
        requirements: 'Short text',
        hasVoiceNote: false,
        hasAttachment: true,
      }),
    );

    const clarity = result.dimensions.find((d) => d.dimension === 'clarity')!;
    expect(clarity.points).toBe(2);
  });

  // ── Test 6: Exactly at warm threshold (8 pts) ─────────────────────────────
  it('returns warm band when total equals 8 (threshold boundary)', () => {
    // budget=0, timeline=0, clarity=0, fit=4, contact=4
    // = 8 → warm (>= 8 threshold)
    const result = computeOLS(
      makeHotIntake({
        budget: 'Under R50K',
        selectedSlot: { id: slotIdDaysFromNow(35), time: '09:00' },
        requirements: 'unclear',
        selectedService: 'AI Agents & Automations',
        contact: { name: 'Dave Lee', email: 'dave@corp.co.za', company: 'Corp Ltd' },
        hasVoiceNote: false,
        hasAttachment: false,
      }),
    );

    // fit=4, contact=4, rest=0
    expect(result.total).toBe(8);
    expect(result.band).toBe('warm');
  });

  // ── Test 7: R150K-R500K budget scores 4 ──────────────────────────────────
  it('gives budget=4 for R150K-R500K (not just R500K+)', () => {
    const result = computeOLS(makeHotIntake({ budget: 'R150K-R500K' }));

    const budget = result.dimensions.find((d) => d.dimension === 'budget')!;
    expect(budget.points).toBe(4);
  });

  // ── Test 8: Contact without company scores 2 ──────────────────────────────
  it('gives contact=2 when company is empty string', () => {
    const result = computeOLS(
      makeHotIntake({
        contact: { name: 'Eve', email: 'eve@example.com', company: '' },
      }),
    );

    const contact = result.dimensions.find((d) => d.dimension === 'contact')!;
    expect(contact.points).toBe(2);
  });

  // ── Test 9: Custom Application scores fit=4 ───────────────────────────────
  it('gives fit=4 for Custom Application', () => {
    const result = computeOLS(
      makeHotIntake({ selectedService: 'Custom Application' }),
    );

    const fit = result.dimensions.find((d) => d.dimension === 'fit')!;
    expect(fit.points).toBe(4);
  });

  // ── Test 10: Slot exactly at 14 days boundary scores 4 ───────────────────
  it('gives timeline=4 when slot is exactly 13 days away (< 14 days)', () => {
    const result = computeOLS(
      makeHotIntake({
        selectedSlot: { id: slotIdDaysFromNow(13), time: '09:00' },
      }),
    );

    const timeline = result.dimensions.find((d) => d.dimension === 'timeline')!;
    expect(timeline.points).toBe(4);
  });

  // ── Test 11: Slot at 15 days out scores 2 ────────────────────────────────
  // Note: slotIdDaysFromNow(14) produces a slot at ~13.8 days from noon which
  // is still < 14, so it scores 4. Use 15 days to reliably land in the 2-pt band.
  it('gives timeline=2 when slot is ~15 days away (>= 14, < 28)', () => {
    const result = computeOLS(
      makeHotIntake({
        selectedSlot: { id: slotIdDaysFromNow(15), time: '09:00' },
      }),
    );

    const timeline = result.dimensions.find((d) => d.dimension === 'timeline')!;
    expect(timeline.points).toBe(2);
  });
});
