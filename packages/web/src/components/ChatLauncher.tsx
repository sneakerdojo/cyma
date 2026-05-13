import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useWizard } from '../features/octo/WizardContext';

/**
 * ChatLauncher — the persistent "Talk to our AI agent" floating action button.
 *
 * One affordance, every page (except utility routes like /privacy).
 * Visual: a small 2D orb that visually rhymes with the 3D OctoScene
 * (used inside the chat modal), plus a label and arrow. Always-visible
 * label means visitors instantly know what the orb does.
 *
 * The 2D orb is a CSS-only render (.chat-orb in index.css) so we don't
 * pay the Three.js cost on every page; the heavy 3D version only mounts
 * inside the chat modal when opened.
 *
 * Behaviour:
 *   - Hidden on /privacy and similar utility pages
 *   - Hidden when chat is open (the modal IS the orb during conversation)
 *   - Single intro pulse 3s after page settles
 *   - Single idle-nudge pulse after 60s of no scroll/click
 *   - Respects prefers-reduced-motion
 */

const HIDDEN_PATHS = ['/privacy'];
const INTRO_DELAY_MS = 3_000;
const IDLE_NUDGE_MS = 60_000;
const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function ChatLauncher() {
  const { open: chatOpen, openWizard } = useWizard();
  const { pathname } = useLocation();
  const reducedMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(false);
  const [idleNudge, setIdleNudge] = useState(false);
  // Hidden when either the Hero or the Contact section is visible — both
  // already render their own intent CTAs (Hero: general "Let's get you
  // started!"; Contact: "Ready to integrate" + "Contact us"), so the FAB
  // would be redundant noise next to them. The FAB is the catch-all for the
  // *middle* of the page where no anchored CTA is on screen.
  const [ctaSectionInView, setCtaSectionInView] = useState(true);
  const idleTimerRef = useRef<number | null>(null);

  // Single intro pulse 3s after page first paints
  useEffect(() => {
    const t = window.setTimeout(() => setIntroDone(true), INTRO_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Watch the sections that already render their own primary CTAs (Hero +
  // Contact). When either is visible, hide the FAB. Re-runs on route change
  // so detail pages (which only have #hero, not #contact) get the right
  // observer set on every mount.
  useEffect(() => {
    const hero = document.getElementById('hero');
    const contact = document.getElementById('contact');
    const targets = [hero, contact].filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) {
      setCtaSectionInView(false);
      return;
    }

    // Track each target's visibility independently and OR them together.
    const visibility = new Map<Element, boolean>();
    targets.forEach((el) => visibility.set(el, true));

    const recompute = () => {
      let any = false;
      visibility.forEach((v) => {
        if (v) any = true;
      });
      setCtaSectionInView(any);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(
            entry.target,
            entry.isIntersecting && entry.intersectionRatio > 0.25,
          );
        }
        recompute();
      },
      { threshold: [0, 0.25, 0.5, 1] },
    );
    targets.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [pathname]);

  // Single idle-nudge pulse after 60s of no user activity. Reset on any
  // scroll/click so the nudge only fires when the user actually goes idle.
  useEffect(() => {
    if (chatOpen) return;

    const reset = () => {
      setIdleNudge(false);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(
        () => setIdleNudge(true),
        IDLE_NUDGE_MS,
      );
    };

    reset();
    window.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('click', reset);
    return () => {
      window.removeEventListener('scroll', reset);
      window.removeEventListener('click', reset);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [chatOpen]);

  if (HIDDEN_PATHS.includes(pathname) || chatOpen || ctaSectionInView) return null;

  const showPulse = !introDone || idleNudge;

  return (
    <motion.button
      type="button"
      onClick={() => openWizard()}
      aria-label="Talk to our AI agent — open Octo, the conversational assistant"
      initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 1.0 }}
      whileHover={{ y: -2 }}
      className="
        group fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40
        flex items-center gap-3 pl-2 pr-5 h-14
        rounded-full
        bg-bg/85 backdrop-blur-xl
        border border-orange/40
        font-display font-semibold text-sm text-text
        shadow-2xl shadow-orange/20
        transition-[border-color,box-shadow] duration-300
        hover:border-orange/70 hover:shadow-orange/40
      "
    >
      {/* Orb on the left — same visual language as OctoScene */}
      <span
        className={`relative shrink-0 h-10 w-10 rounded-full chat-orb ${
          showPulse ? 'chat-orb--pulse' : ''
        }`}
        aria-hidden="true"
      >
        {/* Online indicator — subtle, informs without alarming */}
        <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-bg" />
        </span>
      </span>

      {/* Label — always visible. Hidden on very narrow viewports if needed,
          but at 375px the label still fits comfortably alongside the orb. */}
      <span className="whitespace-nowrap">
        <span className="hidden sm:inline">Talk to our AI agent</span>
        <span className="sm:hidden">Talk to Octo</span>
      </span>

      <ArrowRight
        size={14}
        className="text-orange transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </motion.button>
  );
}
