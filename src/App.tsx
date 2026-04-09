import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import Approach from './components/Approach';
import Contact from './components/Contact';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-text font-body">
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Approach />
      <Contact />
      <Footer />
    </div>
  );
}
