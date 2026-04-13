import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  Company: [
    { label: 'About', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'Approach', href: '#approach' },
    { label: 'Contact', href: '#contact' },
  ],
  Services: [
    { label: 'AI Solutions', href: '#services' },
    { label: 'Custom Applications', href: '#services' },
    { label: 'Modernisation', href: '#services' },
    { label: 'Mobile App Development', href: '#services' },
  ],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-bg">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src="/octio-icon.png" alt="Octio" className="h-8 w-8" />
              <span className="font-display font-bold text-lg">octio</span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed max-w-sm">
              Agentic AI, custom applications, and modernisation. We build
              production AI systems for businesses ready to move faster.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="font-display font-bold text-sm mb-4">
                {heading}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-text-muted hover:text-orange transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Octio (Pty) Ltd. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-xs text-text-muted hover:text-orange transition-colors"
            >
              Privacy Policy
            </Link>
            <a
              href="#"
              className="text-xs text-text-muted hover:text-orange transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
