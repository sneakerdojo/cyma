import { useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  PenTool,
  Layers,
  Search,
  Wrench,
  Rocket,
} from 'lucide-react';

const STEPS = [
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
    description: 'Seamless deployment with ongoing support and optimization.',
  },
];

export default function Approach() {
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
      id="approach"
      ref={sectionRef}
      className="relative py-32 lg:py-40"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center max-w-2xl mx-auto mb-24 ${
            visible ? 'animate-fade-up' : 'opacity-0'
          }`}
        >
          <span className="text-orange font-display font-semibold text-sm tracking-widest uppercase">
            Our Process
          </span>
          <h2 className="mt-4 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-tight">
            From concept to{' '}
            <span className="text-gradient">launch</span>
          </h2>
          <p className="mt-6 text-lg text-text-muted">
            We guide you every step of the way
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className={`relative text-center group ${
                  visible ? 'animate-fade-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${200 + i * 120}ms` }}
              >
                {/* Step number + icon */}
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
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className={`text-center mt-20 ${
            visible ? 'animate-fade-up delay-700' : 'opacity-0'
          }`}
        >
          <a
            href="#contact"
            className="btn-glow inline-flex items-center gap-2 px-8 py-4 bg-orange text-bg font-semibold rounded-full transition-all duration-300 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/20"
          >
            Start Your Journey
          </a>
        </div>
      </div>
    </section>
  );
}
