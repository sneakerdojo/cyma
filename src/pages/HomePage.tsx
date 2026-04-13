import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import Approach from '../components/Approach';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

// Time it takes for the Hero entrance sequence to complete
const INTRO_DURATION = 5200;

export default function HomePage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Lock scroll during intro
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      setReady(true);
      document.body.style.overflow = '';
    }, INTRO_DURATION);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      {/* Navbar fades in with the rest */}
      <div
        className="transition-opacity duration-[1200ms] ease-out"
        style={{ opacity: ready ? 1 : 0, pointerEvents: ready ? 'auto' : 'none' }}
      >
        <Navbar />
      </div>

      <Hero />

      {/* Everything below hero is hidden until intro completes */}
      <div
        className="transition-opacity duration-[1500ms] ease-out"
        style={{
          opacity: ready ? 1 : 0,
          pointerEvents: ready ? 'auto' : 'none',
        }}
      >
        <About />
        <Services />
        <Approach />
        <Contact />
        <Footer />
      </div>
    </>
  );
}
