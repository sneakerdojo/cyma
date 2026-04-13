import { useEffect, useRef, useState } from 'react';
import { Target, Hammer, Layers } from 'lucide-react';

const HIGHLIGHTS = [
  {
    icon: Target,
    title: 'Battle-Tested',
    description:
      "Years of shipping real software across industries and stacks. We've seen the edge cases, learned the hard lessons, and know what actually works.",
  },
  {
    icon: Hammer,
    title: 'Production-Grade',
    description:
      'Everything we build runs in real operations. No demos, no toys — software that holds up when it matters.',
  },
  {
    icon: Layers,
    title: 'End-to-End',
    description:
      "From strategy to deployment to ongoing support — we own the whole stack so you don't have to stitch one together.",
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
            Builders{' '}
            <span className="text-gradient">at heart</span>
          </h2>
          <p className="mt-6 text-lg text-text-muted leading-relaxed">
            Octio is a tech consultancy powered by a team that takes craft seriously.
            We partner with ambitious businesses — across industries and stages — to turn
            complex problems into software that ships, works, and lasts.
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
