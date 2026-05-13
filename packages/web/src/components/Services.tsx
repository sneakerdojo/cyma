import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { PRODUCTS, SERVICES } from '../data/products';

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Homepage Services section.
 *
 * Reads directly from `src/data/products.ts` so adding or renaming an
 * offering automatically updates this section. Each product card is a
 * link to its detail page; each service has a secondary CTA that opens
 * the wizard pre-filled for that service (for buyers who want to skip
 * the page and go straight to a discovery call).
 */
export default function Services() {
  const reducedMotion = useReducedMotion();

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.08,
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
    <section
      id="services"
      className="relative py-32 lg:py-40 bg-surface/30 overflow-hidden"
    >
      {/* Glow accent */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.06] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, var(--c-orange) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={staggerContainer}
        className="max-w-7xl mx-auto px-6 lg:px-8"
      >
        {/* Header */}
        <motion.div
          variants={fadeUp}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <span className="text-orange font-display font-semibold text-sm tracking-widest uppercase">
            Our AI Ecosystem
          </span>
          <h2 className="mt-4 font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl leading-tight">
            One ecosystem.{' '}
            <span className="text-gradient">Four ways to deploy AI.</span>
          </h2>
        </motion.div>

        {/* 1. Autonomous Products — featured grid */}
        <div className="mb-20">
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-8">
            <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
              1 — Autonomous Products
            </span>
            <div className="flex-1 h-px bg-border" />
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="max-w-2xl text-text-muted text-base mb-8"
          >
            Self-service, ready-to-deploy AI agents that handle the heavy
            lifting of your day-to-day operations.
          </motion.p>

          <div className="grid md:grid-cols-2 gap-5">
            {PRODUCTS.map((product) => {
              const Icon = product.icon;
              return (
                <motion.div
                  key={product.slug}
                  variants={fadeUp}
                  className="card-hover group rounded-2xl bg-surface border border-border hover:border-orange/40 transition-all duration-300 overflow-hidden"
                >
                  <Link
                    to={`/products/${product.slug}`}
                    className="block p-7"
                    aria-label={`Learn more about ${product.name}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-orange-dim flex items-center justify-center transition-colors duration-300 group-hover:bg-orange/20">
                        <Icon size={22} className="text-orange" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-lg mb-2 flex items-center justify-between gap-2">
                          <span>{product.name}</span>
                          <ArrowRight
                            size={16}
                            className="shrink-0 text-text-muted transition-all duration-300 group-hover:text-orange group-hover:translate-x-0.5"
                          />
                        </h4>
                        <p className="text-text-muted text-sm leading-relaxed">
                          {product.tagline}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <div className="px-7 pb-5 -mt-1">
                    <Link
                      to={`/products/${product.slug}`}
                      className="text-xs text-orange font-medium hover:text-orange-light transition-colors"
                    >
                      Learn more →
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 2-4. Services categories */}
        {SERVICES.map((service, idx) => {
          const Icon = service.icon;
          const eyebrowMap: Record<string, string> = {
            'agentic-app-dev': 'Build',
            'custom-workflows': 'Connect',
            'corporate-advisory': 'Advise',
          };
          const eyebrow = eyebrowMap[service.slug] ?? 'Service';

          return (
            <motion.div
              key={service.slug}
              variants={fadeUp}
              className="mb-20 last:mb-0"
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
                  {idx + 2} — {eyebrow}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid lg:grid-cols-12 gap-8">
                {/* Left: title + tagline + CTA */}
                <div className="lg:col-span-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-dim flex items-center justify-center">
                      <Icon size={22} className="text-orange" />
                    </div>
                  </div>
                  <h3 className="font-display font-extrabold text-3xl lg:text-4xl leading-[1.1] mb-4">
                    {service.name}
                  </h3>
                  <p className="text-text-muted text-base leading-relaxed mb-6">
                    {service.tagline}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      to={`/services/${service.slug}`}
                      className="inline-flex items-center gap-2 text-orange font-medium text-sm hover:text-orange-light transition-colors group"
                    >
                      Learn more
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  </div>
                </div>

                {/* Right: bullets — top 3 from whatItDoes */}
                <div className="lg:col-span-7 space-y-4">
                  {service.whatItDoes.slice(0, 3).map((bullet, bIdx) => {
                    const [bold, ...rest] = bullet.split(' — ');
                    const tail = rest.join(' — ');
                    return (
                      <div
                        key={bIdx}
                        className="p-5 rounded-xl bg-surface border border-border"
                      >
                        {tail ? (
                          <>
                            <h4 className="font-display font-bold text-base mb-2">
                              {bold}
                            </h4>
                            <p className="text-text-muted text-sm leading-relaxed">
                              {tail}
                            </p>
                          </>
                        ) : (
                          <p className="text-text-muted text-sm leading-relaxed">
                            {bullet}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
