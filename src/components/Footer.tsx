import { Link } from 'react-router-dom';
import { PRODUCTS, SERVICES } from '../data/products';

const COMPANY_LINKS: { label: string; href: string }[] = [
  { label: 'About', href: '/#about' },
  { label: 'Approach', href: '/#approach' },
  { label: 'Services', href: '/#services' },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-bg">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src="/octio-icon.png" alt="Octio" className="h-8 w-8" />
              <span className="font-display font-bold text-lg">octio</span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed max-w-sm">
              The future of autonomous business operations. Pure-play AI agents
              that run your marketing, manage your leads, and ship your
              software at unprecedented speeds.
            </p>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-display font-bold text-sm mb-4">Products</h4>
            <ul className="space-y-3">
              {PRODUCTS.map((product) => (
                <li key={product.slug}>
                  <Link
                    to={`/products/${product.slug}`}
                    className="text-sm text-text-muted hover:text-orange transition-colors duration-300"
                  >
                    {product.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-display font-bold text-sm mb-4">Solutions</h4>
            <ul className="space-y-3">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link
                    to={`/services/${service.slug}`}
                    className="text-sm text-text-muted hover:text-orange transition-colors duration-300"
                  >
                    {service.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-bold text-sm mb-4">Company</h4>
            <ul className="space-y-3">
              {COMPANY_LINKS.map((link) => (
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
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Octio (Pty) Ltd. The future of autonomous business operations.
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
            <a
              href="#"
              className="text-xs text-text-muted hover:text-orange transition-colors"
            >
              AI Governance
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
