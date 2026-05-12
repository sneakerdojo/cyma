import type { WizardState } from './types';

const STORAGE_KEY = 'octio:wizard-state';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fields that can't be serialised (Blob / File objects) or shouldn't be
 * restored (transient animation state). We strip these before writing and
 * restore them to sensible defaults on read.
 */
interface PersistedWizardState {
  savedAt: number;
  step: WizardState['step'];
  selectedService: WizardState['selectedService'];
  budget: WizardState['budget'];
  requirements: WizardState['requirements'];
  contact: WizardState['contact'];
  selectedSlot: WizardState['selectedSlot'];
  chatHistory: WizardState['chatHistory'];
  meetLink?: WizardState['meetLink'];
  calendarLink?: WizardState['calendarLink'];
}

export function saveSession(state: WizardState): void {
  try {
    const persisted: PersistedWizardState = {
      savedAt: Date.now(),
      step: state.step,
      selectedService: state.selectedService,
      budget: state.budget,
      requirements: state.requirements,
      contact: state.contact,
      selectedSlot: state.selectedSlot,
      chatHistory: state.chatHistory,
      meetLink: state.meetLink,
      calendarLink: state.calendarLink,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // localStorage full, private browsing, etc. — fail silently
  }
}

export function loadSession(): Partial<WizardState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedWizardState;

    // Respect TTL — stale sessions are discarded
    if (!parsed.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      clearSession();
      return null;
    }

    // Only restore sessions that have meaningful progress. A user who picked
    // a service but bailed shouldn't see a "welcome back" banner on refresh.
    if (parsed.step === 'greeting' && !parsed.contact.email) {
      return null;
    }

    return {
      step: parsed.step,
      selectedService: parsed.selectedService,
      budget: parsed.budget,
      requirements: parsed.requirements,
      contact: parsed.contact,
      selectedSlot: parsed.selectedSlot,
      chatHistory: parsed.chatHistory,
      meetLink: parsed.meetLink,
      calendarLink: parsed.calendarLink,
      // Reset transient/unserialisable fields
      voiceNote: null,
      attachedFile: null,
      aiMessage: '',
      showChoices: false,
      octoState: 'idle',
      bookingError: undefined,
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Has the user meaningfully progressed in the wizard? Used by the UI to
 * decide whether to show a "welcome back" banner or start fresh.
 */
export function hasResumableSession(): boolean {
  return loadSession() !== null;
}
