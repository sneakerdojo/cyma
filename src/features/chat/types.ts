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
  /** Page the user was on when they opened the wizard */
  referrerPath?: string;
  /** URL pathname when the wizard was opened */
  entryPath?: string;
  /**
   * What the user was trying to do when they opened the chat. Drives the
   * step-0 opener: 'general' / 'contact' / 'ask' / 'onboard'. See
   * src/features/octo/WizardContext.tsx for the canonical enum.
   */
  intent?: 'general' | 'contact' | 'ask' | 'onboard';
}

// ---------------------------------------------------------------------------
// OrbState — 3-D orb animation states emitted by InteractiveChat
// ---------------------------------------------------------------------------

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';
