import {
  MessageCircle,
  PenTool,
  Layers,
  Search,
  Wrench,
  Rocket,
  Settings,
  Plug,
  Sparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

const PRODUCT_STEPS = [
  {
    icon: Settings,
    title: 'Define Your Rules',
    description: 'Tell us your business domain, target audience, and brand voice.',
  },
  {
    icon: Plug,
    title: 'Connect Your Systems',
    description: 'Link your calendars, CRMs, or social accounts through our secure portal.',
  },
  {
    icon: Sparkles,
    title: 'Go Autonomous',
    description:
      'Our framework spins up your dedicated AI agent instantly. Watch it draft your first post, organise your pipeline, or scaffold your app in minutes.',
  },
];

const BUILD_STEPS = [
  {
    icon: MessageCircle,
    title: "Let's Talk",
    description: 'We listen to understand your vision, challenges, and goals.',
  },
  {
    icon: PenTool,
    title: "Let's Design",
    description: 'We craft wireframes and designs that bring your ideas to life.',
  },
  {
    icon: Layers,
    title: "Let's Prototype",
    description: 'A working prototype to validate concepts before full development.',
  },
  {
    icon: Search,
    title: "Let's Review",
    description: 'We refine together, iterating until the solution is exactly right.',
  },
  {
    icon: Wrench,
    title: "Let's Build",
    description: 'Full-scale development with rigorous testing and quality assurance.',
  },
  {
    icon: Rocket,
    title: "Let's Go Live",
    description: 'Seamless deployment with ongoing support and optimisation.',
  },
];

export default function Approach() {
  const reducedMotion = useReducedMotion();

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.1,
        delayChildren: reducedMotion ? 0 : 0.05,
      },
    },
  };

  const fadeUp = {
    hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: EASE_OUT_EXPO },
    },
  };

  return (
    <section id="approach" className="relative py-32 lg:py-40">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={staggerContainer}
        className="max-w-7xl mx-auto px-6 lg:px-8"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-24">
          <span className="text-orange font-display font-semibold text-sm tracking-widest uppercase">
            How It Works
          </span>
          <h2 className="mt-4 font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl leading-tight">
            From idea to <span className="text-gradient">autonomous</span>, in days.
          </h2>
        </motion.div>

        {/* Section A — Product onboarding (3 steps) */}
        <div className="mb-28">
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-10">
            <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
              For Products — Deploy in 3 Steps
            </span>
            <div className="flex-1 h-px bg-border" />
          </motion.div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-8 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-transparent via-orange/40 to-transparent" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
              {PRODUCT_STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  variants={fadeUp}
                  className="relative text-center group"
                >
                  <div className="relative inline-flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-orange/30 bg-surface flex items-center justify-center transition-all duration-500 group-hover:border-orange group-hover:bg-orange/10 group-hover:shadow-lg group-hover:shadow-orange/20">
                      <step.icon
                        size={22}
                        className="text-orange transition-colors duration-300"
                      />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange text-bg text-xs font-bold flex items-center justify-center font-display">
                      {i + 1}
                    </span>
                  </div>

                  <h3 className="mt-5 font-display font-bold text-base">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-text-muted text-sm leading-relaxed max-w-[26ch] mx-auto">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

        </div>

        {/* Section B — Custom build process (6 steps, kept from original) */}
        <div>
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-10">
            <span className="text-text-muted font-display font-semibold text-xs tracking-widest uppercase">
              For Custom Builds — Our 6-Step Delivery Process
            </span>
            <div className="flex-1 h-px bg-border" />
          </motion.div>

          <div className="relative">
            <div className="hidden lg:block absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-4">
              {BUILD_STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  variants={fadeUp}
                  className="relative text-center group"
                >
                  <div className="relative inline-flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-border bg-surface flex items-center justify-center transition-all duration-500 group-hover:border-orange group-hover:bg-orange/10 group-hover:shadow-lg group-hover:shadow-orange/10">
                      <step.icon
                        size={22}
                        className="text-text-muted transition-colors duration-300 group-hover:text-orange"
                      />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange text-bg text-xs font-bold flex items-center justify-center font-display">
                      {i + 1}
                    </span>
                  </div>

                  <h3 className="mt-5 font-display font-bold text-sm">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-text-muted text-xs leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
