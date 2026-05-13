import { CSSProperties } from 'react';

/** Dot delays in ms — staggered to create a cascading bounce effect */
const DOT_DELAYS: number[] = [0, 150, 300];

/**
 * ThinkingState — animated "thinking..." indicator shown between steps.
 * Three bouncing orange dots with staggered delays + muted label below.
 * Pure visual: no props, no state, no side effects.
 * Single-responsibility: communicate that the agent is processing.
 */
export default function ThinkingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      {/* Bouncing dots */}
      <div
        className="flex items-center gap-2"
        aria-label="Thinking"
        role="status"
        aria-live="polite"
      >
        {DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            className="w-2.5 h-2.5 rounded-full bg-orange block"
            style={
              {
                animation: 'thinkingBounce 1.2s ease-in-out infinite',
                animationDelay: `${delay}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Status label */}
      <p className="text-[11px] text-text-muted tracking-wide" aria-hidden="true">
        thinking...
      </p>

      {/*
       * Scoped keyframe — injected once, keyed by component name.
       * Tailwind does not support arbitrary keyframes so we use a style block.
       * The animation name is unique enough to avoid collisions.
       */}
      <style>{`
        @keyframes thinkingBounce {
          0%, 80%, 100% { transform: translateY(0px); }
          40%            { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
