import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
} from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useWizard } from '../features/octo/WizardContext';
import {
  SHOW_PUBLIC_PRICING,
  PRICING_HIDDEN_LABEL,
  type ProductDef,
} from '../data/products';

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface Props {
  product: ProductDef;
}

/**
 * Renders the full detail page for a single product or service.
 *
 * Sections render top-to-bottom:
 *   1. Hero (headline + subheadline + CTAs)
 *   2. Stats banner (if `stats` provided)
 *   3. Value prop (P-A-S)
 *   4. What it does (bullets + optional deep dives)
 *   5. How it works (numbered steps)
 *   6. What's included (icon cards)
 *   7. Sample outputs (if provided)
 *   8. Use cases (3-column grid)
 *   9. Pricing (3-column grid)
 *   10. FAQ (accordion)
 *   11. Final CTA
 *
 * Optional sections quietly omit themselves when their data is empty,
 * so partially-filled product files still render cleanly.
 */
export default function ProductDetailPage({ product }: Props) {
  const { openWizard } = useWizard();
  const reducedMotion = useReducedMotion();
  const Icon = product.icon;

  // Intent-distinct entry points to the chat. The "primary" intent depends
  // on the offering category:
  //   - products  → 'onboard'  (subscription-style, intake → setup)
  //   - services  → 'contact'  (custom engagement, must be scoped first)
  // The "Ask Octo about this" pill near the hero is always 'ask'. The FAB
  // covers the open-ended path. Three distinct intents per detail page,
  // each with a different opening conversation.
  const isService = product.category === 'service';
  const startPrimary = () =>
    openWizard({
      intent: isService ? 'contact' : 'onboard',
      service: product.serviceKey,
    });
  const startAsk = () =>
    openWizard({ intent: 'ask', service: product.serviceKey });

  const fadeUp = {
    initial: reducedMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.55, ease: EASE_OUT_EXPO },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
  };

  // Map deep dives to bullets by index. Both arrays are aligned by author.
  const hasDeepDives = (product.capabilityDeepDives?.length ?? 0) > 0;
  const hasSamples = (product.sampleOutputs?.length ?? 0) > 0;
  const hasStats = (product.stats?.length ?? 0) > 0;

  return (
    <main className="bg-bg text-text">
      {/* Back nav */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-orange transition-colors duration-200"
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>
      </div>

      {/* === HERO === */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pb-28">
        <div
          className="absolute top-20 right-1/4 w-[500px] h-[400px] rounded-full opacity-[0.08] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--c-orange) 0%, transparent 70%)',
            filter: 'blur(120px)',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface mb-8"
            >
              <Icon size={16} className="text-orange" />
              <span className="text-xs font-display font-semibold tracking-widest uppercase text-text-muted">
                {product.category === 'product' ? 'Autonomous Product' : 'Service'}
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight"
            >
              {product.heroHeadline}
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-5 text-orange font-display font-semibold text-base sm:text-lg"
            >
              {product.tagline}
            </motion.p>

            {product.heroSubheadline && (
              <motion.p
                variants={itemVariants}
                className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-text-muted leading-relaxed"
              >
                {product.heroSubheadline}
              </motion.p>
            )}

            {/*
              Detail-page hero has two distinct affordances:
                - "Ask Octo about this" → opens chat with intent='ask' so the
                  agent kicks off with "What do you want to know about X?"
                - "See pricing ↓" → anchor scroll to pricing block
              The primary "Get started with X" (intent='onboard') sits at
              the bottom of the page where the user has actually read the
              offering and is ready to commit.
            */}
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
            >
              <button
                type="button"
                onClick={startAsk}
                className="group inline-flex items-center gap-1.5 text-sm font-display font-semibold text-orange hover:text-orange-light transition-colors px-2 py-3"
              >
                Ask Octo about this
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
              <a
                href="#pricing"
                className="text-sm text-text-muted hover:text-text transition-colors px-2 py-3"
              >
                See pricing ↓
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* === STATS BANNER === */}
      {hasStats && (
        <section className="relative py-12 border-y border-border bg-surface/30">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="max-w-5xl mx-auto px-6 lg:px-8"
          >
            <div
              className="grid gap-8 text-center"
              style={{
                gridTemplateColumns: `repeat(${Math.min(
                  product.stats?.length ?? 1,
                  4,
                )}, minmax(0, 1fr))`,
              }}
            >
              {product.stats!.map((s) => (
                <motion.div key={s.label} variants={itemVariants}>
                  <div className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-orange tracking-tight">
                    {s.value}
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-text-muted uppercase tracking-wider">
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* === VALUE PROP (PAS) === */}
      <section className="relative py-20 lg:py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          className="max-w-3xl mx-auto px-6 lg:px-8"
        >
          {product.valueProp.map((para, i) => {
            const eyebrow =
              i === 0
                ? 'The problem'
                : i === 1
                  ? 'Why it costs you'
                  : 'How we solve it';
            const isLast = i === product.valueProp.length - 1;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className={isLast ? 'mt-10 pt-10 border-t border-border' : 'mt-10 first:mt-0'}
              >
                <span
                  className={`text-xs font-display font-semibold tracking-widest uppercase ${isLast ? 'text-orange' : 'text-text-muted'}`}
                >
                  {eyebrow}
                </span>
                <p
                  className={`mt-3 text-lg sm:text-xl leading-relaxed ${isLast ? 'text-text' : 'text-text-muted'}`}
                >
                  {para}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* === WHAT IT DOES + DEEP DIVES === */}
      <section id="what-it-does" className="relative py-20 lg:py-28 bg-surface/30 border-y border-border">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="max-w-5xl mx-auto px-6 lg:px-8"
        >
          <motion.div variants={itemVariants} className="max-w-2xl mb-14">
            <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
              What it does
            </span>
            <h2 className="mt-3 font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight">
              The mechanics, in plain language.
            </h2>
          </motion.div>

          <ul className="space-y-3 max-w-3xl mb-16">
            {product.whatItDoes.map((bullet, i) => (
              <motion.li
                key={i}
                variants={itemVariants}
                className="flex gap-3 text-base sm:text-lg leading-relaxed"
              >
                <Check size={20} className="shrink-0 mt-1 text-orange" />
                <span className="text-text-muted">{bullet}</span>
              </motion.li>
            ))}
          </ul>

          {hasDeepDives && (
            <div className="space-y-12">
              {product.capabilityDeepDives!.map((cap) => (
                <motion.div
                  key={cap.title}
                  variants={itemVariants}
                  className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start"
                >
                  <div className="lg:col-span-4">
                    <h3 className="font-display font-bold text-xl sm:text-2xl leading-tight">
                      {cap.title}
                    </h3>
                  </div>
                  <div className="lg:col-span-8">
                    <p className="text-text-muted text-base leading-relaxed whitespace-pre-line">
                      {cap.body}
                    </p>
                    {cap.highlights && cap.highlights.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {cap.highlights.map((h) => (
                          <span
                            key={h}
                            className="px-3 py-1 rounded-full border border-border bg-surface text-xs text-text-muted"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="relative py-20 lg:py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="max-w-5xl mx-auto px-6 lg:px-8"
        >
          <motion.div variants={itemVariants} className="max-w-2xl mb-14">
            <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
              How it works
            </span>
            <h2 className="mt-3 font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight">
              From signed agreement to live in days.
            </h2>
          </motion.div>

          <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {product.howItWorks.map((step, i) => (
              <motion.li
                key={step.title}
                variants={itemVariants}
                className="relative p-6 rounded-2xl bg-surface border border-border"
              >
                <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-orange text-bg text-sm font-display font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="font-display font-bold text-lg mb-2">
                  {step.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {step.description}
                </p>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </section>

      {/* === WHAT'S INCLUDED === */}
      <section className="relative py-20 lg:py-28 bg-surface/30 border-y border-border">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="max-w-7xl mx-auto px-6 lg:px-8"
        >
          <motion.div variants={itemVariants} className="max-w-2xl mb-14">
            <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
              What's included
            </span>
            <h2 className="mt-3 font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight">
              Everything you need, nothing you don't.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {product.whatsIncluded.map((item) => {
              const ItemIcon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  variants={itemVariants}
                  className="p-6 rounded-2xl bg-surface border border-border"
                >
                  <div className="w-11 h-11 rounded-xl bg-orange-dim flex items-center justify-center mb-4">
                    <ItemIcon size={20} className="text-orange" />
                  </div>
                  <h3 className="font-display font-bold text-base mb-2">
                    {item.title}
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* === SAMPLE OUTPUTS === */}
      {hasSamples && (
        <section className="relative py-20 lg:py-28">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={containerVariants}
            className="max-w-4xl mx-auto px-6 lg:px-8"
          >
            <motion.div variants={itemVariants} className="max-w-2xl mb-14">
              <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
                See the output
              </span>
              <h2 className="mt-3 font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight">
                What the AI actually produces.
              </h2>
            </motion.div>

            <div className="space-y-8">
              {product.sampleOutputs!.map((sample) => (
                <motion.div
                  key={sample.label}
                  variants={itemVariants}
                  className="rounded-2xl border border-border overflow-hidden"
                >
                  <div className="px-6 py-4 bg-surface/60 border-b border-border">
                    <div className="text-xs font-display font-semibold tracking-widest uppercase text-orange">
                      {sample.label}
                    </div>
                    <div className="mt-1 text-sm text-text-muted">
                      {sample.caption}
                    </div>
                  </div>
                  <div className="px-6 py-6 bg-surface">
                    {sample.format === 'code' ? (
                      <pre className="text-xs sm:text-sm text-text font-mono whitespace-pre-wrap break-all">
                        {sample.body}
                      </pre>
                    ) : sample.format === 'quote' ? (
                      <blockquote className="border-l-2 border-orange pl-4 italic text-text-muted leading-relaxed">
                        {sample.body}
                      </blockquote>
                    ) : (
                      <p className="text-text-muted text-sm sm:text-base leading-relaxed whitespace-pre-line">
                        {sample.body}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* === USE CASES === */}
      <section className="relative py-20 lg:py-28 bg-surface/30 border-y border-border">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="max-w-7xl mx-auto px-6 lg:px-8"
        >
          <motion.div variants={itemVariants} className="max-w-2xl mb-14">
            <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
              Real outcomes
            </span>
            <h2 className="mt-3 font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight">
              Where this delivers.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {product.useCases.map((u) => (
              <motion.div
                key={u.industry}
                variants={itemVariants}
                className="p-6 rounded-2xl bg-surface border border-border"
              >
                <div className="text-xs font-display font-semibold tracking-widest uppercase text-orange mb-3">
                  {u.industry}
                </div>
                <div className="text-sm text-text-muted mb-4 leading-relaxed">
                  <span className="block text-text font-semibold mb-1">Challenge</span>
                  {u.challenge}
                </div>
                <div className="text-sm text-text-muted leading-relaxed">
                  <span className="block text-text font-semibold mb-1">Outcome</span>
                  {u.outcome}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* === PRICING === */}
      <section id="pricing" className="relative py-20 lg:py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="max-w-7xl mx-auto px-6 lg:px-8"
        >
          <motion.div variants={itemVariants} className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
              Pricing
            </span>
            <h2 className="mt-3 font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight">
              Transparent. No surprises.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {product.pricing.map((tier) => (
              <motion.div
                key={tier.name}
                variants={itemVariants}
                className={`relative flex flex-col p-7 rounded-2xl border transition-colors duration-300 ${
                  tier.highlighted
                    ? 'bg-surface border-orange shadow-lg shadow-orange/10'
                    : 'bg-surface border-border'
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-7 px-3 py-1 rounded-full bg-orange text-bg text-xs font-display font-bold tracking-wide">
                    Most popular
                  </span>
                )}
                <div className="mb-4">
                  <div className="font-display font-bold text-lg">
                    {tier.name}
                  </div>
                  <div className="text-text-muted text-xs mt-1">
                    {tier.bestFor}
                  </div>
                </div>
                <div className="mb-6">
                  {SHOW_PUBLIC_PRICING ? (
                    <>
                      <span className="font-display font-extrabold text-3xl text-text">
                        {tier.priceFrom}
                      </span>
                      {tier.cadence && (
                        <span className="text-text-muted text-sm ml-1">
                          {tier.cadence}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="font-display font-bold text-xl text-text">
                      {PRICING_HIDDEN_LABEL}
                    </span>
                  )}
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.includes.map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-2 text-sm text-text-muted leading-relaxed"
                    >
                      <Check size={14} className="shrink-0 mt-1 text-orange" />
                      {line}
                    </li>
                  ))}
                </ul>
                {/*
                  Pricing tiers used to have per-tier CTA buttons. They competed
                  with the persistent floating ChatLauncher and the final
                  bottom-of-page CTA. Replaced with a quiet text link so each
                  tier is informational; the action is the floating orb.
                */}
                <button
                  onClick={startAsk}
                  className="text-orange text-sm font-medium hover:text-orange-light transition-colors text-left"
                >
                  Ask Octo about this plan →
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* === FAQ === */}
      <section className="relative py-20 lg:py-28 bg-surface/30 border-y border-border">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="max-w-3xl mx-auto px-6 lg:px-8"
        >
          <motion.div variants={itemVariants} className="mb-12">
            <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
              Common questions
            </span>
            <h2 className="mt-3 font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight">
              Answers, before you ask.
            </h2>
          </motion.div>

          <div className="space-y-2">
            {product.faq.map((entry, i) => (
              <motion.div key={entry.q} variants={itemVariants}>
                <FAQItem question={entry.q} answer={entry.a} index={i} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* === FINAL CTA === */}
      <section className="relative py-20 lg:py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
          className="max-w-3xl mx-auto px-6 lg:px-8 text-center"
        >
          <motion.h2
            variants={itemVariants}
            className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight"
          >
            Ready to{' '}
            <span className="text-gradient">deploy {product.shortName}?</span>
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-5 text-base sm:text-lg text-text-muted leading-relaxed"
          >
            Brief us in 5 minutes. We'll come back with a tailored plan within 48 hours.
          </motion.p>
          <motion.div variants={itemVariants} className="mt-10">
            <button
              onClick={startPrimary}
              className="btn-glow group flex items-center gap-3 mx-auto px-8 sm:px-10 py-4 sm:py-5 bg-orange text-bg font-display font-semibold rounded-full text-base sm:text-lg transition-all duration-300 hover:bg-orange-light hover:shadow-xl hover:shadow-orange/30"
            >
              {isService
                ? `Scope ${product.shortName} with the team`
                : `Get started with ${product.shortName}`}
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// FAQ accordion item — controlled, animated reveal
// ---------------------------------------------------------------------------

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

function FAQItem({ question, answer, index }: FAQItemProps) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`faq-panel-${index}`}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-surface/60"
      >
        <span className="font-display font-semibold text-base">
          {question}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-muted transition-transform duration-300 ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`faq-panel-${index}`}
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm sm:text-base text-text-muted leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
