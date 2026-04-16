/**
 * Shared types for the interactive chat feature.
 *
 * Centralised here so InteractiveChat, OctoFreeChat, and any future consumers
 * import from a single source of truth instead of coupling to each other.
 */

import type { ContactInfo } from '../octo/types';

// ---------------------------------------------------------------------------
// WizardContext — wizard-collected data forwarded to the AI agent as context
// ---------------------------------------------------------------------------

export interface WizardContext {
  selectedService: string | null;
  budget: string | null;
  requirements: string;
  contact: ContactInfo;
  meetLink?: string;
  calendarLink?: string;
}

// ---------------------------------------------------------------------------
// OrbState — 3-D orb animation states emitted by InteractiveChat
// ---------------------------------------------------------------------------

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';
