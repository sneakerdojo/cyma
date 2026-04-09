import { useEffect, useRef, useState } from 'react';
import { Cpu, Zap, RefreshCcw } from 'lucide-react';

const HIGHLIGHTS = [
  {
    icon: Cpu,
    title: 'AI Technologies',
    description:
      'We leverage cutting-edge artificial intelligence to create intelligent, adaptive solutions that learn and evolve with your business.',
  },
  {
    icon: Zap,
    title: 'Rapid Development',
    description:
      'Agile methodologies and modern tooling enable us to deliver production-ready software at speed without compromising quality.',
  },
  {
    icon: RefreshCcw,
    title: 'Modernization',
    description:
      'We breathe new life into legacy systems, transforming outdated technology stacks into modern, scalable architectures.',
  },
];

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative py-32 lg:py-40"
    >
      {/* Decorative line */}
      <div className="absolute left-1/2 top-0 w-px h-24 bg-gradient-to-b from-transparent to-border" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          className={`max-w-3xl ${visible ? 'animate-fade-up' : 'opacity-0'}`}
        >
          <span className="text-orange font-display font-semibold text-sm tracking-widest uppercase">
            Who we are
          </span>
          <h2 className="mt-4 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-tight">
            A team of passionate{' '}
            <span className="text-gradient">technologists</span>
          </h2>
          <p className="mt-6 text-lg text-text-muted leading-relaxed">
            At Octio, we specialize in building intelligent, adaptive solutions
            that bridge the gap between cutting-edge technology and real-world
            business needs. From concept to deployment, we design, build, and
            modernize applications that stand out.
          </p>
        </div>

        {/* Highlight cards */}
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          {HIGHLIGHTS.map((item, i) => (
            <div
              key={item.title}
              className={`card-hover group p-8 rounded-2xl bg-surface ${
                visible ? 'animate-fade-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${200 + i * 150}ms` }}
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
