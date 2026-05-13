import { lazy, Suspense } from 'react';
import { MapPin, Mail, Phone, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useWizard } from '../features/octo/WizardContext';

// The 3D orb is heavy (Three.js + R3F) — load it on demand only when the
// Contact section enters the viewport. Other consumers of OctoScene are
// lazy too, so this stays in the same code-split chunk.
const OctoScene = lazy(() => import('../features/octo/OctoScene'));

const CONTACT_INFO = [
  { icon: MapPin, label: 'Pretoria, South Africa' },
  { icon: Mail, label: 'hello@octio.co.za' },
  { icon: Phone, label: '+27 (0) 12 345 6789' },
];

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Contact() {
  const reducedMotion = useReducedMotion();
  const { openWizard } = useWizard();

  // Stagger reveal — header, orb, CTA, info strip in sequence.
  const fadeUp = {
    initial: reducedMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  };

  return (
    <section
      id="contact"
      className="relative py-32 lg:py-40 bg-surface/30 overflow-hidden"
    >
      {/* Subtle radial glow under the orb */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.08] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, var(--c-orange) 0%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-orange font-display font-semibold text-sm tracking-widest uppercase">
            Get in touch
          </span>
          <h2 className="mt-4 font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl leading-tight">
            Ready to{' '}
            <span className="text-gradient">deploy your AI Driven systems?</span>
          </h2>
          <p className="mt-6 text-base sm:text-lg text-text-muted leading-relaxed">
            Skip the contact form. Talk to Octio directly — brief us on your project,
            lock in a discovery call, and get a proposal within the week.
          </p>
        </motion.div>

        {/* Orb anchor — appears here as the visual signature of this section */}
        <motion.div
          {...fadeUp}
          transition={{
            duration: 0.7,
            ease: EASE_OUT_EXPO,
            delay: reducedMotion ? 0 : 0.1,
          }}
          className="mb-2 flex justify-center"
        >
          <div className="w-full max-w-[420px]">
            <Suspense fallback={null}>
              <OctoScene state="idle" />
            </Suspense>
          </div>
        </motion.div>

        {/*
          Single intent CTA — Contact section's natural intent is "talk to a
          human about something specific." Routes into a contact-flavoured
          chat where Octo opens with "What would you like the team to talk
          through?" rather than the generic "How can we help?" question.
          Onboard / Ask intents live on the offering detail pages where
          they're more contextual.
        */}
        <motion.div
          {...fadeUp}
          transition={{
            duration: 0.5,
            ease: EASE_OUT_EXPO,
            delay: reducedMotion ? 0 : 0.15,
          }}
          className="mb-12 flex justify-center"
        >
          <button
            type="button"
            onClick={() => openWizard({ intent: 'contact' })}
            className="btn-glow group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-orange text-bg font-display font-semibold text-base transition-all duration-300 hover:bg-orange-light hover:shadow-xl hover:shadow-orange/30"
          >
            Contact us
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>
        </motion.div>

        {/* Contact info strip below — kept as direct-contact alternatives */}
        <motion.div
          {...fadeUp}
          transition={{
            duration: 0.6,
            ease: EASE_OUT_EXPO,
            delay: reducedMotion ? 0 : 0.2,
          }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 mt-10 pt-12 border-t border-border"
        >
          {CONTACT_INFO.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-dim flex items-center justify-center">
                <item.icon size={16} className="text-orange" />
              </div>
              <span className="text-text-muted text-sm">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
