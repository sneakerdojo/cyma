import { Zap, Key, Rocket } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: 'Autonomous Deployment',
    description:
      'Fully automated setup for our core marketing and lead gen products. Spin up your agent in minutes, not weeks.',
  },
  {
    icon: Key,
    title: 'BYOK Friendly',
    description:
      'Bring your own AI keys. Flexible, transparent pricing that scales with your actual usage — no markup, no surprises.',
  },
  {
    icon: Rocket,
    title: 'Agentic Efficiency',
    description:
      'We leverage AI to do 90% of the heavy lifting. The speed and cost savings get passed directly to you.',
  },
];

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function About() {
  const reducedMotion = useReducedMotion();

  // Parent stagger — children appear in sequence as the section enters view.
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.1,
        delayChildren: reducedMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE_OUT_EXPO },
    },
  };

  return (
    <section id="about" className="relative py-32 lg:py-40">
      {/* Decorative line */}
      <div className="absolute left-1/2 top-0 w-px h-24 bg-gradient-to-b from-transparent to-border" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
        className="max-w-7xl mx-auto px-6 lg:px-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="max-w-3xl">
          <span className="text-orange font-display font-semibold text-sm tracking-widest uppercase">
            Why Octio
          </span>
          <h2 className="mt-4 font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl leading-tight">
            We Built It. We Tested It. You can now use it to{' '}
            <span className="text-gradient">speed up your operations.</span>
          </h2>
          <p className="mt-6 text-lg text-text-muted leading-relaxed">
            At Octio, we are our own{' '}
            <span className="italic text-text">Patient Zero</span>. Every AI
            workflow, lead generation system, and content engine we offer is
            the exact same technology that powers our own business operations.
            We don&apos;t sell theories — we sell tested, profitable agentic
            systems.
          </p>
        </motion.div>

        {/* Highlight cards */}
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          {HIGHLIGHTS.map((item) => (
            <motion.div
              key={item.title}
              variants={itemVariants}
              className="card-hover group p-8 rounded-2xl bg-surface"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-dim flex items-center justify-center mb-6 transition-colors duration-300 group-hover:bg-orange/20">
                <item.icon size={24} className="text-orange" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">
                {item.title}
              </h3>
              <p className="text-text-muted leading-relaxed text-sm">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
