import { useEffect, useRef, useState } from 'react';
import {
  Globe,
  RefreshCcw,
  Server,
  Brain,
  Smartphone,
  MessageSquare,
} from 'lucide-react';

interface ServiceCard {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

const WEB_SERVICES: ServiceCard[] = [
  {
    icon: Globe,
    title: 'Design & Development',
    description:
      'Custom-built websites and web applications tailored to your brand identity and business objectives.',
  },
  {
    icon: RefreshCcw,
    title: 'Modernization',
    description:
      'Transform legacy systems into modern, performant applications using the latest technologies and best practices.',
  },
  {
    icon: Server,
    title: 'Hosting & SEO',
    description:
      'Reliable hosting infrastructure paired with data-driven SEO strategies to maximize your online visibility.',
  },
];

const SOFTWARE_SERVICES: ServiceCard[] = [
  {
    icon: Brain,
    title: 'AI-driven Software',
    description:
      'Intelligent applications that leverage machine learning and AI to automate processes and generate insights.',
  },
  {
    icon: Smartphone,
    title: 'Web & Mobile Apps',
    description:
      'Cross-platform applications with native performance, delivering seamless experiences on every device.',
  },
  {
    icon: MessageSquare,
    title: 'AI Powered Chatbots',
    description:
      'Conversational AI solutions that handle customer interactions, streamline support, and drive engagement.',
  },
];

function ServiceGroup({
  title,
  services,
  visible,
  delayBase,
}: {
  title: string;
  services: ServiceCard[];
  visible: boolean;
  delayBase: number;
}) {
  return (
    <div>
      <h3
        className={`font-display font-bold text-lg text-text-muted mb-6 ${
          visible ? 'animate-fade-up' : 'opacity-0'
        }`}
        style={{ animationDelay: `${delayBase}ms` }}
      >
        {title}
      </h3>
      <div className="grid gap-4">
        {services.map((service, i) => (
          <div
            key={service.title}
            className={`card-hover group p-6 rounded-2xl bg-surface flex items-start gap-5 ${
              visible ? 'animate-fade-up' : 'opacity-0'
            }`}
            style={{ animationDelay: `${delayBase + 100 + i * 120}ms` }}
          >
            <div className="shrink-0 w-11 h-11 rounded-lg bg-orange-dim flex items-center justify-center transition-colors duration-300 group-hover:bg-orange/20">
              <service.icon size={20} className="text-orange" />
            </div>
            <div>
              <h4 className="font-display font-bold text-base mb-1.5">
                {service.title}
              </h4>
              <p className="text-text-muted text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
            Services tailored to{' '}
            <span className="text-gradient">your needs</span>
          </h2>
        </div>

        {/* Service groups */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          <ServiceGroup
            title="Web Development"
            services={WEB_SERVICES}
            visible={visible}
            delayBase={200}
          />
          <ServiceGroup
            title="Custom Software"
            services={SOFTWARE_SERVICES}
            visible={visible}
            delayBase={400}
          />
        </div>
      </div>
    </section>
  );
}
