import { useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useWizard } from '../features/octo/WizardContext';

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Hero — static brand mark + headline + single CTA.
 *
 * The chat experience is no longer embedded in the hero. It lives in
 * ChatOverlay, mounted at App level, so visitors can launch it from any
 * route (home, product detail, service detail). Hero just shows the
 * resting brand state and the primary call to action.
 */
export default function Hero() {
  const { openWizard } = useWizard();
  const reducedMotion = useReducedMotion();

  const handleChatClick = useCallback(() => {
    openWizard();
  }, [openWizard]);

  const fadeDuration = reducedMotion ? 0 : 0.55;
  const contentDuration = reducedMotion ? 0 : 0.7;

  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: fadeDuration, ease: EASE_OUT_EXPO }}
        className="relative z-10 flex flex-col items-center justify-center sm:[--logo-y:-28%] sm:!translate-y-[var(--logo-y)]"
      >
        <img
          src="/octio-icon.png"
          alt="Octio"
          className="w-20 h-20 sm:w-24 sm:h-24"
        />
        <span className="mt-4 font-display font-bold text-2xl sm:text-3xl tracking-tight text-text">
          octio
        </span>
      </motion.div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: contentDuration,
          ease: EASE_OUT_EXPO,
          delay: 0.2,
        }}
        className="absolute inset-x-0 z-10 text-center px-6 bottom-[6%] sm:bottom-[14%]"
      >
        <h1 className="font-display font-extrabold leading-[0.9] tracking-tight text-[clamp(1.75rem,8vw,2.5rem)] sm:text-[3.5rem] md:text-[4.5rem]">
          <span className="text-text">We build </span>
          <span className="text-gradient">the future</span>
        </h1>

        <p className="mt-4 sm:mt-5 max-w-xl mx-auto text-sm sm:text-lg text-text-muted leading-relaxed">
          A pure-play AI company. We build autonomous agents that run your
          marketing, qualify your leads, and ship your software — at
          unprecedented speeds.
        </p>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleChatClick}
            className="btn-glow group flex items-center gap-3 px-8 py-4 bg-orange text-bg font-display font-semibold text-base rounded-full transition-all duration-300 hover:bg-orange-light hover:shadow-xl hover:shadow-orange/30"
          >
            Let&apos;s get you started!
            <ArrowRight
              size={18}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg to-transparent z-0 pointer-events-none" />
    </section>
  );
}
