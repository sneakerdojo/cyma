import { parseSlotToISO } from './calendar.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface OLSDimension {
  dimension: 'budget' | 'timeline' | 'clarity' | 'fit' | 'contact';
  points: 0 | 2 | 4;
  reason: string;
}

export interface OLSResult {
  total: number;
  band: 'hot' | 'warm' | 'cold';
  dimensions: OLSDimension[];
}

export interface OLSInput {
  budget: string;
  selectedSlot: { id: string; time: string };
  requirements: string;
  selectedService: string;
  contact: { name: string; email: string; company?: string };
  hasVoiceNote: boolean;
  hasAttachment: boolean;
}

// ---------------------------------------------------------------------------
// Scoring thresholds
// ---------------------------------------------------------------------------

const HOT_THRESHOLD = 14;
const WARM_THRESHOLD = 8;

// ---------------------------------------------------------------------------
// Dimension scorers — each returns an OLSDimension (SRP: one concern each)
// ---------------------------------------------------------------------------

function scoreBudget(budget: string): OLSDimension {
  const dimension = 'budget' as const;

  if (budget === 'R150K-R500K' || budget === 'R500K+') {
    return {
      dimension,
      points: 4,
      reason: `Budget of "${budget}" indicates a high-value engagement`,
    };
  }

  if (budget === 'R50K-R150K') {
    return {
      dimension,
      points: 2,
      reason: `Budget of "${budget}" indicates a mid-range engagement`,
    };
  }

  // Under R50K or unknown
  return {
    dimension,
    points: 0,
    reason: `Budget of "${budget}" is below the mid-range threshold`,
  };
}

function scoreTimeline(selectedSlot: { id: string; time: string }): OLSDimension {
  const dimension = 'timeline' as const;

  let startISO: string;
  try {
    startISO = parseSlotToISO(selectedSlot);
  } catch {
    return {
      dimension,
      points: 0,
      reason: 'Could not parse slot date — defaulting to 0 points',
    };
  }

  const slotMs = new Date(startISO).getTime();
  const nowMs = Date.now();
  const diffDays = (slotMs - nowMs) / (1000 * 60 * 60 * 24);

  if (diffDays < 14) {
    return {
      dimension,
      points: 4,
      reason: `Slot is ${Math.round(diffDays)} day(s) away — high urgency`,
    };
  }

  if (diffDays < 28) {
    return {
      dimension,
      points: 2,
      reason: `Slot is ${Math.round(diffDays)} day(s) away — moderate urgency`,
    };
  }

  return {
    dimension,
    points: 0,
    reason: `Slot is ${Math.round(diffDays)} day(s) away — low urgency`,
  };
}

function scoreClarity(
  requirements: string,
  hasVoiceNote: boolean,
  hasAttachment: boolean,
): OLSDimension {
  const dimension = 'clarity' as const;
  const len = requirements.length;
  const hasMedia = hasVoiceNote || hasAttachment;

  if (len >= 200 && hasMedia) {
    return {
      dimension,
      points: 4,
      reason: `Detailed requirements (${len} chars) with supporting media`,
    };
  }

  if (len >= 50 || hasMedia) {
    return {
      dimension,
      points: 2,
      reason: len >= 50
        ? `Requirements are ${len} chars — sufficient detail`
        : 'Short requirements but includes voice note or attachment',
    };
  }

  return {
    dimension,
    points: 0,
    reason: `Requirements are only ${len} chars with no supporting media`,
  };
}

function scoreFit(selectedService: string): OLSDimension {
  const dimension = 'fit' as const;

  if (
    selectedService === 'AI Agents & Automations' ||
    selectedService === 'Custom Application'
  ) {
    return {
      dimension,
      points: 4,
      reason: `Service "${selectedService}" is a high-fit offering for Octio`,
    };
  }

  if (selectedService === 'Mobile App' || selectedService === 'Modernisation') {
    return {
      dimension,
      points: 2,
      reason: `Service "${selectedService}" is a standard fit for Octio`,
    };
  }

  // Just Browsing or blank
  return {
    dimension,
    points: 0,
    reason: `Service "${selectedService || '(blank)'}" indicates no specific fit`,
  };
}

function scoreContact(contact: {
  name: string;
  email: string;
  company?: string;
}): OLSDimension {
  const dimension = 'contact' as const;
  const hasName = contact.name.trim().length > 0;
  const hasEmail = contact.email.trim().length > 0;
  const hasCompany = (contact.company ?? '').trim().length > 0;

  if (!hasName || !hasEmail) {
    // Wizard requires name + email, so this should never happen, but
    // we score it defensively rather than crashing.
    return {
      dimension,
      points: 0,
      reason: 'Contact is missing name or email',
    };
  }

  if (hasCompany) {
    return {
      dimension,
      points: 4,
      reason: 'Full contact details — name, email, and company provided',
    };
  }

  return {
    dimension,
    points: 2,
    reason: 'Contact has name and email but no company',
  };
}

// ---------------------------------------------------------------------------
// Band derivation
// ---------------------------------------------------------------------------

function deriveBand(total: number): 'hot' | 'warm' | 'cold' {
  if (total >= HOT_THRESHOLD) return 'hot';
  if (total >= WARM_THRESHOLD) return 'warm';
  return 'cold';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the Octio Lead Score (OLS) from wizard intake data.
 *
 * Scoring is entirely deterministic — no LLM calls, no I/O.
 * Max possible score is 20 (5 dimensions × 4 pts each).
 *
 * Thresholds:
 *   >= 14 → 'hot'
 *   >= 8  → 'warm'
 *   < 8   → 'cold'
 */
export function computeOLS(intake: OLSInput): OLSResult {
  const dimensions: OLSDimension[] = [
    scoreBudget(intake.budget),
    scoreTimeline(intake.selectedSlot),
    scoreClarity(intake.requirements, intake.hasVoiceNote, intake.hasAttachment),
    scoreFit(intake.selectedService),
    scoreContact(intake.contact),
  ];

  const total = dimensions.reduce((sum, d) => sum + d.points, 0);
  const band = deriveBand(total);

  return { total, band, dimensions };
}
