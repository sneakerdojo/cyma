import { describe, it, expect } from 'vitest';
import { detectHallucinatedAction } from './mastra-brain.js';

// ---------------------------------------------------------------------------
// The detector is the heart of the hallucination guard. Coverage here is
// dense because Kimi's failure-mode taxonomy is the exact thing we're paying
// the per-turn token cost of the guard to defeat.
//
// Three claim categories — book / transfer / lookup — each with:
//   - happy detection (claim present, tool didn't fire)
//   - negative (claim present BUT tool DID fire — no false-positive)
//   - leaked function-call syntax variant
//   - curly-apostrophe variant (Kimi sometimes emits U+2019)
// ---------------------------------------------------------------------------

describe('detectHallucinatedAction — book claims', () => {
  it("detects \"you're booked\"", () => {
    expect(detectHallucinatedAction("You're booked for tomorrow at 10am.", [])).toBe('book');
  });

  it("detects \"i've booked you\"", () => {
    expect(detectHallucinatedAction("Perfect, I've booked you for Friday at noon.", [])).toBe('book');
  });

  it('detects "booked for"', () => {
    expect(detectHallucinatedAction('Booked for tomorrow at 10am.', [])).toBe('book');
  });

  it('detects "scheduled for"', () => {
    expect(detectHallucinatedAction('Done — you are scheduled for 12pm.', [])).toBe('book');
  });

  it('returns null when book_appointment DID fire (no false positive)', () => {
    expect(
      detectHallucinatedAction("You're booked for 10am.", ['book_appointment']),
    ).toBeNull();
  });

  it('detects curly-apostrophe variant', () => {
    expect(detectHallucinatedAction('You’re booked for tomorrow at 10am.', [])).toBe(
      'book',
    );
  });

  it('detects leaked function-call syntax for book_appointment', () => {
    expect(
      detectHallucinatedAction(
        'functions.book_appointment:0{"slot": "2026-05-14T10:00:00Z"}',
        [],
      ),
    ).toBe('book');
  });
});

describe('detectHallucinatedAction — transfer claims', () => {
  it('detects "transferring"', () => {
    expect(detectHallucinatedAction('Transferring you now.', [])).toBe('transfer');
  });

  it('detects "putting you through"', () => {
    expect(detectHallucinatedAction("I'm putting you through to our team.", [])).toBe(
      'transfer',
    );
  });

  it('detects "connecting you"', () => {
    expect(detectHallucinatedAction('Connecting you to a plumber right away.', [])).toBe(
      'transfer',
    );
  });

  it('returns null when route_to_human DID fire (no false positive)', () => {
    expect(
      detectHallucinatedAction("Transferring you now.", ['route_to_human']),
    ).toBeNull();
  });

  it('detects leaked function-call syntax for route_to_human', () => {
    expect(
      detectHallucinatedAction('functions.route_to_human:0{"reason": "burst pipe"}', []),
    ).toBe('transfer');
  });
});

describe('detectHallucinatedAction — lookup claims', () => {
  it('detects "let me check availability"', () => {
    expect(detectHallucinatedAction('Let me check availability for you.', [])).toBe(
      'lookup',
    );
  });

  it("detects \"let me see what's open\"", () => {
    expect(detectHallucinatedAction("Let me see what's open.", [])).toBe('lookup');
  });

  it('detects curly-apostrophe variant of "let me see what’s open"', () => {
    expect(detectHallucinatedAction('Let me see what’s open.', [])).toBe('lookup');
  });

  it('returns null when lookup_availability DID fire (no false positive)', () => {
    expect(
      detectHallucinatedAction("Let me check availability.", ['lookup_availability']),
    ).toBeNull();
  });
});

describe('detectHallucinatedAction — non-claim replies', () => {
  it('returns null for a generic question', () => {
    expect(detectHallucinatedAction('Which suburb are you in?', [])).toBeNull();
  });

  it('returns null for a greeting', () => {
    expect(detectHallucinatedAction('Hi, how can I help?', [])).toBeNull();
  });

  it('returns null for a polite no-action close', () => {
    expect(
      detectHallucinatedAction('No problem — call us back when ready.', []),
    ).toBeNull();
  });

  it('returns null for empty reply', () => {
    expect(detectHallucinatedAction('', [])).toBeNull();
  });
});

describe('detectHallucinatedAction — priority order', () => {
  it('when reply mixes book + transfer claims, book takes precedence (most damaging)', () => {
    // A reply that talks about both — we always recover the booking first.
    // Subsequent turns will re-check and recover transfer if it's still missing.
    expect(
      detectHallucinatedAction(
        "You're booked for 10am. Transferring you for confirmation.",
        [],
      ),
    ).toBe('book');
  });
});
