import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Identifier kinds.
// ---------------------------------------------------------------------------

export type IdentifierKind = 'phone' | 'email' | 'whatsapp' | 'name_hint';

export interface Identity {
  phone?: string;
  email?: string;
  whatsapp?: string;
  nameHint?: string;
  nameConfirmed?: boolean;
}

// ---------------------------------------------------------------------------
// normaliseSAPhone — accepts common SA number formats, returns E.164.
//
// Accepted prefixes:
//   +27 (country code, normal)
//   27  (country code without +, legacy/SMS)
//   0   (local prefix, must be replaced with +27)
//
// After prefix normalisation the local part is 9 digits (mobile or landline).
// Anything else throws an Error — caller decides how to surface the failure.
// ---------------------------------------------------------------------------

const VALID_SA_LOCAL_FIRST_DIGIT = /^[1-8]/; // 1-5 landline, 6/7/8 mobile

export function normaliseSAPhone(raw: string): string {
  if (typeof raw !== 'string') {
    throw new Error('normaliseSAPhone: invalid format');
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error('normaliseSAPhone: invalid format');
  }

  // Strip everything except digits and a leading +
  const onlyAllowed = trimmed.replace(/[^\d+]/g, '');
  if (onlyAllowed === '') {
    throw new Error('normaliseSAPhone: invalid format');
  }

  let digits: string;

  if (onlyAllowed.startsWith('+')) {
    // International form — must be +27
    if (!onlyAllowed.startsWith('+27')) {
      throw new Error('normaliseSAPhone: SA-only / invalid country');
    }
    digits = onlyAllowed.slice(3);
  } else if (onlyAllowed.startsWith('27') && onlyAllowed.length === 11) {
    digits = onlyAllowed.slice(2);
  } else if (onlyAllowed.startsWith('0') && onlyAllowed.length === 10) {
    digits = onlyAllowed.slice(1);
  } else if (/^[+]?\d+$/.test(onlyAllowed) && !onlyAllowed.startsWith('+')) {
    // Anything else with no recognisable SA prefix
    throw new Error('normaliseSAPhone: invalid country / invalid format');
  } else {
    throw new Error('normaliseSAPhone: invalid format');
  }

  if (digits.length !== 9) {
    throw new Error('normaliseSAPhone: too short / invalid');
  }
  if (!/^\d{9}$/.test(digits)) {
    throw new Error('normaliseSAPhone: invalid format');
  }
  if (!VALID_SA_LOCAL_FIRST_DIGIT.test(digits)) {
    throw new Error('normaliseSAPhone: invalid SA prefix');
  }

  return '+27' + digits;
}

// ---------------------------------------------------------------------------
// hashIdentifier — SHA-256 of <kind>:<normalised value>.
//
// Kind is prefixed so a digit-string that could be both a phone and an
// email user-part hashes differently per intent.
// ---------------------------------------------------------------------------

export function hashIdentifier(kind: IdentifierKind, value: string): string {
  const normalised = normaliseIdentifierValue(kind, value);
  return createHash('sha256').update(`${kind}:${normalised}`).digest('hex');
}

function normaliseIdentifierValue(kind: IdentifierKind, value: string): string {
  switch (kind) {
    case 'email':
      return value.trim().toLowerCase();
    case 'phone':
    case 'whatsapp':
      // Accept already-E.164 input; if not, attempt normalisation.
      try {
        return normaliseSAPhone(value);
      } catch {
        return value.trim();
      }
    case 'name_hint':
      return value.trim().toLowerCase();
    default:
      return value;
  }
}

// ---------------------------------------------------------------------------
// scoreIdentityConfidence — probabilistic per the profile-system spec.
//
//   phone only                      → 0.85
//   whatsapp only                   → 0.85 (treated as a phone equivalent)
//   email only                      → 0.90
//   phone + nameConfirmed           → 0.98
//   phone + email cross-confirmed   → 0.99
//
// Empty / malformed inputs return 0. The caller should treat <0.7 as "new
// caller; ask to confirm" per US-VA-035 / US-LG-036.
// ---------------------------------------------------------------------------

export function scoreIdentityConfidence(identity: Identity): number {
  const hasPhone = nonEmpty(identity.phone) || nonEmpty(identity.whatsapp);
  const hasEmail = nonEmpty(identity.email);
  const nameConfirmed = identity.nameConfirmed === true;

  if (hasPhone && hasEmail) return 0.99;
  if (hasPhone && nameConfirmed) return 0.98;
  if (hasEmail) return 0.90;
  if (hasPhone) return 0.85;

  return 0;
}

function nonEmpty(s: string | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0;
}
