import { useEffect, useRef, useState, FormEvent } from 'react';
import { MapPin, Mail, Phone, Send } from 'lucide-react';

const CONTACT_INFO = [
  { icon: MapPin, label: 'Pretoria, South Africa' },
  { icon: Mail, label: 'hello@octio.co.za' },
  { icon: Phone, label: '+27 (0) 12 345 6789' },
];

export default function Contact() {
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative py-32 lg:py-40 bg-surface/30"
    >
      {/* Glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.06] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--c-orange) 0%, transparent 70%)',
          filter: 'blur(120px)',
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
            Get in touch
          </span>
          <h2 className="mt-4 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-tight">
            Let's discuss{' '}
            <span className="text-gradient">your project</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Contact info */}
          <div
            className={`lg:col-span-2 ${
              visible ? 'animate-slide-left delay-200' : 'opacity-0'
            }`}
          >
            <p className="text-text-muted leading-relaxed mb-10">
              Ready to bring your idea to life? Whether you need a new
              application, want to modernize an existing system, or explore AI
              solutions — we'd love to hear from you.
            </p>

            <div className="space-y-6">
              {CONTACT_INFO.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-dim flex items-center justify-center">
                    <item.icon size={18} className="text-orange" />
                  </div>
                  <span className="text-text-muted text-sm">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Octopus decoration */}
            <div className="mt-16 hidden lg:block">
              <img
                src="/octio-icon.png"
                alt=""
                className="w-32 h-32 opacity-10"
              />
            </div>
          </div>

          {/* Contact form */}
          <form
            onSubmit={handleSubmit}
            className={`lg:col-span-3 space-y-5 ${
              visible ? 'animate-slide-right delay-300' : 'opacity-0'
            }`}
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 focus:ring-1 focus:ring-orange/20 transition-all duration-300"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 focus:ring-1 focus:ring-orange/20 transition-all duration-300"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="subject"
                className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider"
              >
                Subject
              </label>
              <input
                id="subject"
                type="text"
                placeholder="What's this about?"
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 focus:ring-1 focus:ring-orange/20 transition-all duration-300"
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider"
              >
                Message
              </label>
              <textarea
                id="message"
                rows={5}
                placeholder="Tell us about your project..."
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 focus:ring-1 focus:ring-orange/20 transition-all duration-300 resize-none"
              />
            </div>
            <button
              type="submit"
              className="btn-glow group flex items-center gap-2 px-8 py-4 bg-orange text-bg font-semibold rounded-full transition-all duration-300 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/20"
            >
              Send Message
              <Send
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
