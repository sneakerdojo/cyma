import { describe, it, expect } from 'vitest';
import {
  normaliseSAPhone,
  hashIdentifier,
  scoreIdentityConfidence,
} from './identity.js';

// ---------------------------------------------------------------------------
// normaliseSAPhone — covers SA-mobile + landline formats into E.164.
// ---------------------------------------------------------------------------

describe('normaliseSAPhone', () => {
  it.each([
    ['082 123 4567', '+27821234567'],
    ['0821234567', '+27821234567'],
    ['+27 82 123 4567', '+27821234567'],
    ['27821234567', '+27821234567'],
    ['+27821234567', '+27821234567'],
    ['(082) 123-4567', '+27821234567'],
    [' 082 123 4567 ', '+27821234567'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normaliseSAPhone(input)).toBe(expected);
  });

  it.each([
    ['082 123', /short|invalid/i],
    ['1234567890', /invalid country|invalid format/i],
    ['not a number', /invalid format/i],
    ['', /invalid format/i],
    ['+1 555 555 5555', /sa.*only|invalid country/i],
  ])('rejects %s', (input, errPattern) => {
    expect(() => normaliseSAPhone(input)).toThrow(errPattern);
  });

  it('accepts SA landline +27 11 / +27 21', () => {
    expect(normaliseSAPhone('011 234 5678')).toBe('+27112345678');
    expect(normaliseSAPhone('021 555 1234')).toBe('+27215551234');
  });
});

// ---------------------------------------------------------------------------
// hashIdentifier — SHA-256 for lookup. Stable across calls.
// ---------------------------------------------------------------------------

describe('hashIdentifier', () => {
  it('returns a 64-char hex string', () => {
    const h = hashIdentifier('phone', '+27821234567');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for the same kind + value', () => {
    expect(hashIdentifier('phone', '+27821234567')).toBe(
      hashIdentifier('phone', '+27821234567'),
    );
  });

  it('differs by kind for the same raw value', () => {
    // a string of digits could be a phone OR a number-shaped email user-part;
    // we keep them distinct.
    expect(hashIdentifier('phone', '+27821234567')).not.toBe(
      hashIdentifier('email', '+27821234567'),
    );
  });

  it('is case-insensitive for emails', () => {
    expect(hashIdentifier('email', 'Sipho@OCTIO.co.za')).toBe(
      hashIdentifier('email', 'sipho@octio.co.za'),
    );
  });
});

// ---------------------------------------------------------------------------
// scoreIdentityConfidence — probabilistic per spec:
//   phone only                       → 0.85
//   email only                       → 0.90
//   phone + email cross-confirmed    → 0.99
//   phone + display_name confirmed   → 0.98
//   below 0.7 → caller treated as new
// ---------------------------------------------------------------------------

describe('scoreIdentityConfidence', () => {
  it('phone only → 0.85', () => {
    expect(scoreIdentityConfidence({ phone: '+27821234567' })).toBe(0.85);
  });

  it('email only → 0.90', () => {
    expect(scoreIdentityConfidence({ email: 'a@b.com' })).toBe(0.90);
  });

  it('phone + email cross-confirmed → 0.99', () => {
    expect(
      scoreIdentityConfidence({ phone: '+27821234567', email: 'a@b.com' }),
    ).toBe(0.99);
  });

  it('phone + display-name confirmed → 0.98', () => {
    expect(
      scoreIdentityConfidence({
        phone: '+27821234567',
        nameConfirmed: true,
      }),
    ).toBe(0.98);
  });

  it('whatsapp on its own gets phone-equivalent confidence', () => {
    expect(scoreIdentityConfidence({ whatsapp: '+27821234567' })).toBe(0.85);
  });

  it('empty identity → 0', () => {
    expect(scoreIdentityConfidence({})).toBe(0);
  });

  it('returns 0 for malformed inputs without throwing', () => {
    expect(scoreIdentityConfidence({ phone: '' })).toBe(0);
  });
});
