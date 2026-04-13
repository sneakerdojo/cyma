import { useEffect, useRef, useState } from 'react';
import { Bot, Layers, RefreshCcw, Smartphone } from 'lucide-react';

const AI_CAPABILITIES = [
  'Customer service agents',
  'Sales & BDR agents',
  'Ops automation',
  'Research agents',
  'Document workflows',
  'Multi-agent orchestration',
];

interface SupportingService {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

const SUPPORTING_SERVICES: SupportingService[] = [
  {
    icon: Layers,
    title: 'Custom Applications',
    description:
      'Bespoke platforms built AI-native from day one. Web platforms and internal tools — every one of them intelligent by design, not retrofitted.',
  },
  {
    icon: RefreshCcw,
    title: 'Modernisation',
    description:
      "Legacy systems rebuilt as intelligent platforms. We don't just migrate — we add agents where humans used to do manual work.",
  },
  {
    icon: Smartphone,
    title: 'Mobile App Development',
    description:
      'Native-feeling iOS and Android apps — React Native, Swift, or Kotlin depending on what fits. AI-ready from day one.',
  },
];

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="services"
      ref={sectionRef}
      className="relative py-32 lg:py-40 bg-surface/30"
    >
      {/* Glow accent */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.06] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--c-orange) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center max-w-2xl mx-auto mb-20 ${
            visible ? 'animate-fade-up' : 'opacity-0'
          }`}
        >
          <span className="text-orange font-display font-semibold text-sm tracking-widest uppercase">
            What we do
          </span>
          <h2 className="mt-4 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-tight">
            Services with{' '}
            <span className="text-gradient">teeth</span>
          </h2>
        </div>

        {/* Hero AI Solutions card */}
        <div
          className={`relative mb-6 overflow-hidden rounded-3xl border border-orange/30 bg-gradient-to-br from-surface via-surface to-orange/5 p-8 sm:p-12 lg:p-14 ${
            visible ? 'animate-fade-up' : 'opacity-0'
          }`}
          style={{ animationDelay: '200ms' }}
        >
          {/* Glow inside card */}
          <div
            className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--c-orange) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />

          <div className="relative grid lg:grid-cols-12 gap-8 items-center">
            {/* Left: Icon + copy */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-orange flex items-center justify-center shadow-lg shadow-orange/20">
                  <Bot size={28} className="text-bg" />
                </div>
                <span className="text-orange font-display font-semibold text-xs tracking-widest uppercase">
                  Our flagship
                </span>
              </div>

              <h3 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[0.95] mb-4">
                AI Solutions
              </h3>
              <p className="font-display text-lg sm:text-xl text-orange-light mb-5">
                Agents, automations, agentic workflows
              </p>
              <p className="text-text-muted text-base sm:text-lg leading-relaxed max-w-xl">
                We design and deploy autonomous AI agents that handle complex work — from
                customer operations to back-office automation to multi-agent orchestration.
                Not chatbots. Systems that actually do the job.
              </p>
            </div>

            {/* Right: Capability chips */}
            <div className="lg:col-span-5">
              <div className="flex flex-wrap gap-2.5">
                {AI_CAPABILITIES.map((cap, i) => (
                  <span
                    key={cap}
                    className={`px-4 py-2 rounded-full border border-border bg-surface/60 text-sm text-text-muted hover:border-orange/40 hover:text-text transition-all duration-300 ${
                      visible ? 'animate-fade-up' : 'opacity-0'
                    }`}
                    style={{ animationDelay: `${300 + i * 60}ms` }}
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Supporting services grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {SUPPORTING_SERVICES.map((service, i) => (
            <div
              key={service.title}
              className={`card-hover group p-8 rounded-2xl bg-surface ${
                visible ? 'animate-fade-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${500 + i * 120}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-orange-dim flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-orange/20">
                <service.icon size={22} className="text-orange" />
              </div>
              <h4 className="font-display font-bold text-xl mb-3">
                {service.title}
              </h4>
              <p className="text-text-muted text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
