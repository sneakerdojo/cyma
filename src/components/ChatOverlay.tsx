import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OctoConversation from '../features/octo/OctoConversation';
import { useWizard } from '../features/octo/WizardContext';
import type { OctoAnimState } from '../features/octo/types';

const OctoScene = lazy(() => import('../features/octo/OctoScene'));

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Site-wide chat overlay.
 *
 * Renders the conversation modal on top of any route — homepage, product
 * detail, service detail. Includes the reactive 3D Octo orb so the agent's
 * thinking / speaking / listening states are visible while the user chats.
 */
export default function ChatOverlay() {
  const { open, closeWizard } = useWizard();
  const [orbState, setOrbState] = useState<OctoAnimState>('idle');
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const handleClose = useCallback(() => {
    closeWizard();
    setOrbState('idle');
  }, [closeWizard]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) {
      setKeyboardOffset(0);
      return;
    }
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleResize = () => {
      setKeyboardOffset(Math.max(0, window.innerHeight - vv.height));
    };
    vv.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      vv.removeEventListener('resize', handleResize);
      setKeyboardOffset(0);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Conversation with Octo, the AI agent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          className="fixed inset-0 z-[100] bg-bg"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at center 65%, rgba(232, 134, 42, 0.10) 0%, transparent 70%)',
            }}
          />

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO, delay: 0.15 }}
            onClick={handleClose}
            className="fixed top-6 right-6 z-[110] w-11 h-11 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-orange/40 transition-all bg-bg/80 backdrop-blur-sm"
            aria-label="Close conversation"
          >
            <X size={18} />
          </motion.button>

          {/*
            Reactive 3D orb — fills the upper band of the overlay. Its
            `state` is driven by the conversation lifecycle (idle / thinking
            / speaking) so visitors see Octo react to their messages.
            Sits in the document flow above the chat content rather than
            absolute-positioned, so the conversation always starts below the
            orb regardless of viewport height.
          */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.05 }}
            className="relative h-full w-full overflow-y-auto"
            style={{
              overscrollBehavior: 'contain',
              paddingBottom: `${Math.max(48, keyboardOffset)}px`,
            }}
          >
            {/*
              Orb band — top of the scroll container.
              `fullHeight` is intentionally NOT passed because OctoScene's
              fullHeight branch zooms the camera back to z=11 (orb looks
              tiny). Instead we let OctoScene use its built-in
              h-[26vh] sm:h-[40vh] sizing with the close-up z=4.5 camera,
              which is what the Hero used to look right.
            */}
            <div className="relative w-full pointer-events-none" aria-hidden="true">
              <Suspense fallback={null}>
                <OctoScene state={orbState} />
              </Suspense>
            </div>

            {/* Conversation content — sits directly under the orb band */}
            <div className="w-full pb-12">
              <OctoConversation
                onClose={handleClose}
                onStateChange={setOrbState}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
