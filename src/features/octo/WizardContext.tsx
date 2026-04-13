import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface WizardContextValue {
  open: boolean;
  openWizard: () => void;
  closeWizard: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openWizard = useCallback(() => {
    // Scroll to hero first so the orb is visible when wizard opens
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Slight delay to let scroll finish before opening
    setTimeout(() => setOpen(true), 300);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeWizard = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = '';
  }, []);

  return (
    <WizardContext.Provider value={{ open, openWizard, closeWizard }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}
