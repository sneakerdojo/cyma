import { useEffect, useRef, useState } from 'react';
import { MapPin, Mail, Phone, MessageCircle, ArrowRight } from 'lucide-react';
import { useWizard } from '../features/octo/WizardContext';

const CONTACT_INFO = [
  { icon: MapPin, label: 'Pretoria, South Africa' },
  { icon: Mail, label: 'hello@octio.co.za' },
  { icon: Phone, label: '+27 (0) 12 345 6789' },
];

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const { openWizard } = useWizard();

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
    <section id="contact" ref={sectionRef} className="relative py-32 lg:py-40 bg-surface/30 overflow-hidden">
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.08] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--c-orange) 0%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center max-w-2xl mx-auto mb-14 ${
            visible ? 'animate-fade-up' : 'opacity-0'
          }`}
        >
          <span className="text-orange font-display font-semibold text-sm tracking-widest uppercase">
            Get in touch
          </span>
          <h2 className="mt-4 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-tight">
            Let's discuss{' '}
            <span className="text-gradient">your project</span>
          </h2>
          <p className="mt-6 text-lg text-text-muted leading-relaxed">
            Skip the contact form. Talk to Octio directly — brief us on your project,
            lock in a discovery call, and get a proposal within the week.
          </p>
        </div>

        {/* Primary CTA */}
        <div
          className={`flex justify-center mb-16 ${
            visible ? 'animate-fade-up delay-200' : 'opacity-0'
          }`}
        >
          <button
            onClick={openWizard}
            className="btn-glow group flex items-center gap-3 px-10 py-5 bg-orange text-bg font-semibold rounded-full text-lg transition-all duration-300 hover:bg-orange-light hover:shadow-xl hover:shadow-orange/30"
          >
            <MessageCircle size={22} />
            Chat with Octio
            <ArrowRight
              size={20}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        </div>

        {/* Contact info strip */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 pt-12 border-t border-border ${
            visible ? 'animate-fade-up delay-400' : 'opacity-0'
          }`}
        >
          {CONTACT_INFO.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-dim flex items-center justify-center">
                <item.icon size={16} className="text-orange" />
              </div>
              <span className="text-text-muted text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
