import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { MessageCircle, ChevronDown, X } from 'lucide-react';
import OctoConversation from '../features/octo/OctoConversation';
import { useWizard } from '../features/octo/WizardContext';
import type { OctoAnimState } from '../features/octo/types';

const OctoScene = lazy(() => import('../features/octo/OctoScene'));

type Phase = 'black' | 'logo' | 'glow' | 'morph' | 'orb' | 'content';

export default function Hero() {
  const [phase, setPhase] = useState<Phase>('black');
  const { open: wizardOpen, openWizard, closeWizard } = useWizard();
  const [orbState, setOrbState] = useState<OctoAnimState>('idle');
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('logo'), 300),
      setTimeout(() => setPhase('glow'), 2200),
      setTimeout(() => setPhase('morph'), 2700),
      setTimeout(() => setPhase('orb'), 3400),
      setTimeout(() => setPhase('content'), 4400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Restore scroll if Hero unmounts while wizard is open (e.g. route change)
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // iOS keyboard handling: push conversation container up when virtual keyboard appears
  useEffect(() => {
    if (!wizardOpen) {
      setKeyboardOffset(0);
      return;
    }
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;
    const handleResize = () => {
      const offset = Math.max(0, window.innerHeight - vv.height);
      setKeyboardOffset(offset);
    };

    vv.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      vv.removeEventListener('resize', handleResize);
      setKeyboardOffset(0);
    };
  }, [wizardOpen]);

  const phaseIndex = ['black', 'logo', 'glow', 'morph', 'orb', 'content'].indexOf(phase);

  const handleChatClick = useCallback(() => {
    openWizard();
  }, [openWizard]);

  const handleCloseWizard = useCallback(() => {
    closeWizard();
    setOrbState('idle');
  }, [closeWizard]);

  return (
    <section
      id="hero"
      className={`${wizardOpen ? 'fixed' : 'relative'} inset-0 min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden ${wizardOpen ? 'z-[100] bg-bg' : ''}`}
    >
      {/* Darker backdrop when wizard is open */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-all duration-700"
        style={{
          background: wizardOpen
            ? 'radial-gradient(ellipse at center, rgba(232, 134, 42, 0.08) 0%, rgba(6, 6, 12, 0.95) 60%)'
            : 'transparent',
        }}
      />

      {/* Close button when wizard open */}
      {wizardOpen && (
        <button
          onClick={handleCloseWizard}
          className="fixed top-6 right-6 z-50 w-11 h-11 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-orange/40 transition-all bg-bg/60 backdrop-blur-sm animate-fade-in"
          aria-label="Close conversation"
        >
          <X size={18} />
        </button>
      )}

      {/* === PHASE: Logo entrance === */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
        style={{
          opacity: phaseIndex >= 3 ? 0 : 1,
          transition: 'opacity 900ms cubic-bezier(0.65, 0, 0.35, 1)',
        }}
      >
        <img
          src="/octio-icon.svg"
          alt="Octio"
          className="w-20 h-20 sm:w-24 sm:h-24"
          style={{
            opacity: phaseIndex >= 1 ? 1 : 0,
            transform: phaseIndex >= 1 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 1100ms cubic-bezier(0.16, 1, 0.3, 1), transform 1100ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        <span
          className="mt-5 font-display font-bold text-2xl sm:text-3xl tracking-tight text-text"
          style={{
            opacity: phaseIndex >= 1 ? 1 : 0,
            transform: phaseIndex >= 1 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 1100ms cubic-bezier(0.16, 1, 0.3, 1) 200ms, transform 1100ms cubic-bezier(0.16, 1, 0.3, 1) 200ms',
          }}
        >
          octio
        </span>
      </div>

      {/* === Persistent 3D Orb (same asset across states) === */}
      <div
        className="relative z-10 w-full"
        style={{
          opacity: phaseIndex >= 4 ? 1 : 0,
          transform: `translateY(${wizardOpen ? '-42%' : '-28%'})`,
          transition: 'opacity 1400ms cubic-bezier(0.16, 1, 0.3, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Suspense fallback={null}>
          <OctoScene state={orbState} />
        </Suspense>
      </div>

      {/* === Hero text (visible when wizard closed) === */}
      <div
        className="absolute inset-x-0 z-10 text-center px-6"
        style={{
          bottom: '14%',
          opacity: phaseIndex >= 5 && !wizardOpen ? 1 : 0,
          transform: phaseIndex >= 5 && !wizardOpen ? 'translateY(0)' : 'translateY(30px)',
          pointerEvents: phaseIndex >= 5 && !wizardOpen ? 'auto' : 'none',
          transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <h1 className="font-display font-extrabold leading-[0.9] tracking-tight text-[clamp(1.75rem,8vw,2.5rem)] sm:text-[3.5rem] md:text-[4.5rem]">
          <span className="text-text">We build </span>
          <span className="text-gradient">the future</span>
        </h1>

        <p className="mt-5 max-w-xl mx-auto text-base sm:text-lg text-text-muted leading-relaxed">
          Agentic AI, custom applications, and modernisation for businesses ready to move faster.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleChatClick}
            className="btn-glow group flex items-center gap-2 px-7 py-3.5 bg-orange text-bg font-semibold rounded-full transition-all duration-300 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/20"
          >
            <MessageCircle size={18} />
            Chat with Octio
          </button>
          <a
            href="#services"
            className="group flex items-center gap-2 px-7 py-3.5 border border-border text-text-muted font-medium rounded-full transition-all duration-300 hover:border-orange/40 hover:text-text text-sm"
          >
            Explore our work
            <ChevronDown size={16} className="transition-transform group-hover:translate-y-0.5" />
          </a>
        </div>
      </div>

      {/* === Conversation UI (visible when wizard open) === */}
      <div
        className="absolute inset-x-0 z-10"
        style={{
          top: '38%',
          bottom: '5%',
          opacity: wizardOpen ? 1 : 0,
          transform: wizardOpen ? 'translateY(0)' : 'translateY(30px)',
          pointerEvents: wizardOpen ? 'auto' : 'none',
          transition: 'opacity 800ms cubic-bezier(0.16, 1, 0.3, 1) 300ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) 300ms',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          paddingBottom: `${keyboardOffset}px`,
        }}
      >
        <OctoConversation
          onClose={handleCloseWizard}
          onStateChange={wizardOpen ? setOrbState : undefined}
        />
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg to-transparent z-0 pointer-events-none" />
    </section>
  );
}
