import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * The user's *intent* when they opened the chat. Different intents lead the
 * conversation through different opening flows — see step 0 in
 * worker/src/conversation/steps.ts. Always default to 'general' when the
 * caller has no specific intent (e.g. the homepage Hero or the global FAB).
 *
 *  - general  → "How can we help you today?" (open-ended)
 *  - contact  → "Tell us what you'd like to talk about" (direct line to team)
 *  - ask      → "What do you want to know about [X]?" (Q&A on an offering)
 *  - onboard  → "Let's get you set up — first question…" (intake for an offering)
 */
export type WizardIntent = 'general' | 'contact' | 'ask' | 'onboard';

export interface OpenWizardArgs {
  /** What the user is trying to do — drives the opening question. */
  intent?: WizardIntent;
  /** Slug of the offering this CTA was attached to (e.g. 'lead-generation'). */
  service?: string | null;
}

interface WizardContextValue {
  open: boolean;
  prefilledService: string | null;
  /** The intent the wizard was opened with. 'general' until set otherwise. */
  intent: WizardIntent;
  /**
   * Open the wizard. Pass intent + service to tailor the opening flow.
   * Backwards-compatible with the old `openWizard(serviceString)` signature
   * — a string arg is treated as the service with intent='onboard'.
   */
  openWizard: (args?: OpenWizardArgs | string) => void;
  closeWizard: () => void;
  consumePrefilledService: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefilledService, setPrefilledService] = useState<string | null>(null);
  const [intent, setIntent] = useState<WizardIntent>('general');

  const openWizard = useCallback((args?: OpenWizardArgs | string) => {
    if (typeof args === 'string') {
      setPrefilledService(args);
      setIntent('onboard');
    } else if (args) {
      if (args.service !== undefined) setPrefilledService(args.service);
      if (args.intent) setIntent(args.intent);
      else setIntent('general');
    } else {
      setIntent('general');
      setPrefilledService(null);
    }
    setTimeout(() => setOpen(true), 50);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeWizard = useCallback(() => {
    setOpen(false);
    setPrefilledService(null);
    setIntent('general');
    document.body.style.overflow = '';
  }, []);

  const consumePrefilledService = useCallback(() => {
    setPrefilledService(null);
  }, []);

  return (
    <WizardContext.Provider
      value={{
        open,
        prefilledService,
        intent,
        openWizard,
        closeWizard,
        consumePrefilledService,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}
