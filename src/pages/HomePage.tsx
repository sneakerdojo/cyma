import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import Approach from '../components/Approach';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import SEO, { OCTIO_ORGANIZATION_JSONLD, OCTIO_WEBSITE_JSONLD } from '../components/SEO';

/**
 * Single-page marketing site.
 *
 * Scroll is unlocked on first paint — no intro gate. The Hero shows the
 * Octio logo as its resting state and only opens the chat wizard when the
 * user actively engages a CTA. Section components handle their own
 * scroll-triggered entrance animations via Framer Motion.
 */
export default function HomePage() {
  return (
    <>
      <SEO
        title="Octio"
        description="Octio is a pure-play AI company. We build, deploy, and train autonomous AI agents that run your marketing, manage your leads, automate your back-office, and develop custom software at unprecedented speeds."
        path="/"
        jsonLd={[OCTIO_ORGANIZATION_JSONLD, OCTIO_WEBSITE_JSONLD]}
      />
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Approach />
      <Contact />
      <Footer />
    </>
  );
}
