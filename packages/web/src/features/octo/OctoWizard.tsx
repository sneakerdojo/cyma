import { useState, lazy, Suspense, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import OctoConversation from './OctoConversation';
import type { OctoAnimState } from './types';

const OctoScene = lazy(() => import('./OctoScene'));

/**
 * Standalone /octo page variant. Used when someone navigates to /octo directly.
 * For in-page usage (the hero orb flow), use OctoConversation inside the Hero instead.
 */
export default function OctoWizard() {
  const [orbState, setOrbState] = useState<OctoAnimState>('idle');

  const handleClose = useCallback(() => {
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-start relative overflow-y-auto overflow-x-hidden">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(232, 134, 42, 0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <Link
        to="/"
        aria-label="Back to home"
        className="fixed top-8 left-8 z-50 w-10 h-10 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-orange/40 transition-all"
      >
        <ArrowLeft size={18} />
      </Link>

      <div className="relative z-10 w-full" style={{ marginTop: '6vh' }}>
        <Suspense fallback={null}>
          <OctoScene state={orbState} />
        </Suspense>
      </div>

      <div className="relative z-10 w-full pb-24">
        <OctoConversation onClose={handleClose} onStateChange={setOrbState} />
      </div>
    </div>
  );
}
