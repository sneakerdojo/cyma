import { useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';

export default function Hero() {
  const octopusRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;

    // Normalize to -1 to 1
    const x = (clientX / innerWidth - 0.5) * 2;
    const y = (clientY / innerHeight - 0.5) * 2;

    if (octopusRef.current) {
      // Octopus follows mouse with parallax + slight rotation
      octopusRef.current.style.transform = `translate(${x * 30}px, ${y * 20}px) rotate(${x * 5}deg) scale(${1 + Math.abs(x * y) * 0.04})`;
      // Brighten when mouse is near center
      const dist = Math.sqrt(x * x + y * y);
      octopusRef.current.style.opacity = `${0.06 + (1 - dist) * 0.06}`;
    }

    if (glowRef.current) {
      // Glow follows mouse more aggressively
      glowRef.current.style.transform = `translate(${x * 60}px, ${y * 40}px)`;
      glowRef.current.style.opacity = `${0.15 + (1 - Math.sqrt(x * x + y * y)) * 0.15}`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (octopusRef.current) {
      octopusRef.current.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
      octopusRef.current.style.opacity = '0.06';
    }
    if (glowRef.current) {
      glowRef.current.style.transform = 'translate(0, 0)';
      glowRef.current.style.opacity = '0.15';
    }
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Interactive octopus background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          ref={octopusRef}
          src="/octio-icon.png"
          alt=""
          className="w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] lg:w-[700px] lg:h-[700px] opacity-[0.06]"
          style={{ transition: 'transform 0.3s ease-out, opacity 0.3s ease-out' }}
        />
        <div
          ref={glowRef}
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.15]"
          style={{
            background: 'radial-gradient(circle, var(--c-orange) 0%, transparent 70%)',
            filter: 'blur(120px)',
            transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center">
        <h1 className="animate-fade-up font-display font-extrabold leading-[0.9] tracking-tight text-[3rem] sm:text-[4rem] md:text-[5rem] lg:text-[6rem]">
          <span className="text-text">We build</span>
          <br />
          <span className="text-gradient">the future</span>
        </h1>

        <p className="animate-fade-up delay-300 mt-8 max-w-lg mx-auto text-lg text-text-muted leading-relaxed">
          Software & AI solutions that transform businesses.
        </p>

        <div className="animate-fade-up delay-500 mt-12">
          <a
            href="#contact"
            className="btn-glow group inline-flex items-center gap-2 px-8 py-4 bg-orange text-bg font-semibold rounded-full transition-all duration-300 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/20"
          >
            Start a project
            <ChevronRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </a>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg to-transparent" />
    </section>
  );
}
