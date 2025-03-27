import React from 'react';
import { Linkedin, Menu, RefreshCcw, Rocket, Map, Brain, Check, Mail, Twitter, Instagram, Facebook, MapPin, Phone, Send, ChevronRight } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-black text-white font-medium">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-black/70 backdrop-blur-xl z-50 border-b border-[#60A5FA]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/Black and White Abstract Agency Logo.png" className="w-12 h-12" alt="Cyma logo" />
              <a href="#hero" className="ml-4 text-xl font-bold font-[pondar] hover:text-[#60A5FA] transition-colors duration-300 text-shadow-sm">CYMA</a>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-200 hover:text-[#60A5FA] transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-[#60A5FA] after:transition-all hover:after:w-full">Services</a>
              <a href="#approach" className="text-gray-200 hover:text-[#60A5FA] transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-[#60A5FA] after:transition-all hover:after:w-full">Our Approach</a>
              <a href="#about" className="text-gray-200 hover:text-[#60A5FA] transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-[#60A5FA] after:transition-all hover:after:w-full">About us</a>
              <a href="#contact" className="bg-[#60A5FA]/10 text-white px-5 py-2.5 rounded-xl border border-[#60A5FA]/20 hover:border-[#60A5FA]/40 hover:bg-[#60A5FA]/20 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(96,165,250,0.15)]">
                Let's talk
              </a>
            </div>
            <div className="md:hidden">
              <Menu className="w-6 h-6" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="h-screen flex items-center justify-center relative overflow-hidden border-b border-[#60A5FA]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center">
            <h1 className='font-[pondar] text-8xl sm:text-9xl md:text-[11.2rem] mb-8 font-bold tracking-tight text-white text-shadow-glow'>
              CYMA
            </h1>
            <p className="text-gray-400 text-xl sm:text-2xl md:text-3xl max-w-3xl mx-auto mt-4 mb-12">
              Innovation through Artificial Intelligence.
            </p>
            <button className="group bg-[#60A5FA]/10 text-white px-7 py-3.5 rounded-xl border border-[#60A5FA]/20 hover:border-[#60A5FA]/40 hover:bg-[#60A5FA]/20 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(96,165,250,0.15)] inline-flex items-center">
              Let's Talk
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Abstract Design Elements */}
        <div className="absolute top-1/2 left-0 w-full h-96 -translate-y-1/2 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-[#60A5FA]/5 to-transparent rotate-12 transform-gpu"></div>
          <div className="absolute inset-0 bg-gradient-to-l from-[#60A5FA]/5 to-transparent -rotate-12 transform-gpu"></div>
        </div>
        
        {/* Additional glow effect */}
        <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black to-transparent"></div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-32 overflow-hidden border-b border-[#60A5FA]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-[pondar] text-5xl mb-8 font-bold tracking-tight text-white">
              Who are we?
            </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto">
              We're a team of passionate technologists focused on creating innovative software solutions that transform businesses.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-6 mb-16">
            <div className="w-24 h-1 bg-gradient-to-r from-[#60A5FA]/10 to-[#60A5FA]/40"></div>
            <p className="text-xl text-gray-400 leading-relaxed max-w-3xl">
              At CYMA, we specialize in building intelligent, adaptive solutions that evolve with your business needs. 
              We answer your needs now, with quality built to last—delivering solutions today that you can trust tomorrow.
            </p>
          </div>

          {/* Three-Column Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* AI Technologies */}
            <div className="group relative">
              <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/20 shadow-xl h-full transition-all duration-300 hover:shadow-[0_0_45px_rgba(96,165,250,0.3)] hover:border-[#60A5FA]/40 relative before:absolute before:inset-0 before:bg-[#60A5FA]/10 before:rounded-2xl before:transition-opacity before:opacity-0 hover:before:opacity-100 transform hover:-translate-y-1">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#60A5FA]/30 to-[#60A5FA]/20 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 blur-xl"></div>
                <h3 className="text-2xl font-bold mb-4 text-white">AI Technologies</h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-[#60A5FA]/40 to-[#60A5FA]/10 mb-6"></div>
                <p className="text-gray-400 leading-relaxed">
                  We leverage cutting-edge AI to create applications that understand, learn, and respond with human-like intelligence—from custom LLM integration to predictive analytics and intelligent automation.
                </p>
              </div>
            </div>

            {/* Rapid Development */}
            <div className="group relative">
              <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/20 shadow-xl h-full transition-all duration-300 hover:shadow-[0_0_35px_rgba(96,165,250,0.25)] hover:border-[#60A5FA]/30 relative before:absolute before:inset-0 before:bg-[#60A5FA]/5 before:rounded-2xl before:transition-opacity before:opacity-0 hover:before:opacity-100">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#60A5FA]/20 to-[#60A5FA]/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 blur-lg"></div>
                <h3 className="text-2xl font-bold mb-4 text-white">Rapid Development</h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-[#60A5FA]/40 to-[#60A5FA]/10 mb-6"></div>
                <p className="text-gray-400 leading-relaxed">
                  We accelerate your development cycle through rapid prototyping, allowing you to visualize your application early, gather feedback faster, and reduce costs through early issue identification.
                </p>
              </div>
            </div>

            {/* Modernization */}
            <div className="group relative">
              <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/20 shadow-xl h-full transition-all duration-300 hover:shadow-[0_0_35px_rgba(96,165,250,0.25)] hover:border-[#60A5FA]/30 relative before:absolute before:inset-0 before:bg-[#60A5FA]/5 before:rounded-2xl before:transition-opacity before:opacity-0 hover:before:opacity-100">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#60A5FA]/20 to-[#60A5FA]/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 blur-lg"></div>
                <h3 className="text-2xl font-bold mb-4 text-white">Modernization</h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-[#60A5FA]/40 to-[#60A5FA]/10 mb-6"></div>
                <p className="text-gray-400 leading-relaxed">
                  We transform legacy systems into modern, scalable applications—upgrading technology stacks, redesigning interfaces, and optimizing architecture for the future of your business.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Statement */}
          <div className="flex flex-col items-center text-center pt-8">
            <p className="text-lg text-gray-400 font-medium max-w-3xl">
              From concept to deployment, we design, build, and modernize web applications that stand out.
            </p>
          </div>
        </div>
        
        {/* Abstract Design Element */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent"></div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative py-32 overflow-hidden border-b border-[#60A5FA]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-[pondar] text-5xl mb-8 font-bold tracking-tight text-white">
              Services tailored to your unique business needs
            </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto">
              We provide comprehensive software solutions to transform your business operations
            </p>
          </div>
          
          {/* Web Development */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Web Development</h2>
              <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
                Delivering modern, scalable, and optimized web solutions.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* Design & Development */}
              <div className="group relative">
                <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/20 shadow-xl h-full flex flex-col transition-all duration-300 hover:shadow-[0_0_35px_rgba(96,165,250,0.25)] hover:border-[#60A5FA]/30 relative before:absolute before:inset-0 before:bg-[#60A5FA]/5 before:rounded-2xl before:transition-opacity before:opacity-0 hover:before:opacity-100">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#60A5FA]/20 to-[#60A5FA]/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 blur-lg"></div>
                  <div className="w-14 h-14 bg-[#60A5FA]/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                    <RefreshCcw className="w-8 h-8 text-[#60A5FA]" />
                  </div>
                  <h4 className="text-xl font-bold mb-4 text-white text-center">Design & Development</h4>
                  <p className="text-gray-400 mb-6 text-center">
                    Custom-built, responsive, and high-performance websites tailored to your specific needs.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto">
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Responsive designs optimized for all devices and screen sizes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Modern frameworks like React, Vue, and Angular</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Performance-focused development with optimal load times</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Modernization */}
              <div className="group relative">
                <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/20 shadow-xl h-full flex flex-col transition-all duration-300 hover:shadow-[0_0_35px_rgba(96,165,250,0.25)] hover:border-[#60A5FA]/30 relative before:absolute before:inset-0 before:bg-[#60A5FA]/5 before:rounded-2xl before:transition-opacity before:opacity-0 hover:before:opacity-100">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#60A5FA]/20 to-[#60A5FA]/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 blur-lg"></div>
                  <div className="w-14 h-14 bg-[#60A5FA]/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                    <Rocket className="w-8 h-8 text-[#60A5FA]" />
                  </div>
                  <h4 className="text-xl font-bold mb-4 text-white text-center">Modernization</h4>
                  <p className="text-gray-400 mb-6 text-center">
                    Transform your legacy systems with cutting-edge technologies for improved performance and user experience.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto">
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Legacy system assessment and migration planning</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Incremental modernization to minimize disruption</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Enhanced security and compliance measures</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Hosting & SEO */}
              <div className="group relative">
                <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/20 shadow-xl h-full flex flex-col transition-all duration-300 hover:shadow-[0_0_35px_rgba(96,165,250,0.25)] hover:border-[#60A5FA]/30 relative before:absolute before:inset-0 before:bg-[#60A5FA]/5 before:rounded-2xl before:transition-opacity before:opacity-0 hover:before:opacity-100">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#60A5FA]/20 to-[#60A5FA]/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 blur-lg"></div>
                  <div className="w-14 h-14 bg-[#60A5FA]/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                    <Map className="w-8 h-8 text-[#60A5FA]" />
                  </div>
                  <h4 className="text-xl font-bold mb-4 text-white text-center">Hosting & SEO</h4>
                  <p className="text-gray-400 mb-6 text-center">
                    Comprehensive hosting solutions with advanced SEO strategies to maximize your online visibility.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto">
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Cloud-based hosting with 99.9% uptime guarantee</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>On-page and technical SEO optimization</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Regular performance monitoring and analytics</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Software Solutions */}
          <div>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Custom Software Solutions</h2>
              <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
                Tailored software solutions designed for your business needs.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {/* AI-driven software */}
              <div className="group relative">
                <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/20 shadow-xl h-full flex flex-col transition-all duration-300 hover:shadow-[0_0_35px_rgba(96,165,250,0.25)] hover:border-[#60A5FA]/30 relative before:absolute before:inset-0 before:bg-[#60A5FA]/5 before:rounded-2xl before:transition-opacity before:opacity-0 hover:before:opacity-100">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#60A5FA]/20 to-[#60A5FA]/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 blur-lg"></div>
                  <div className="w-14 h-14 bg-[#60A5FA]/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                    <Brain className="w-8 h-8 text-[#60A5FA]" />
                  </div>
                  <h4 className="text-xl font-bold mb-4 text-white text-center">AI-driven Software</h4>
                  <p className="text-gray-400 mb-6 text-center">
                    Harness the power of artificial intelligence to create intelligent software solutions that adapt and evolve.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto">
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Natural language processing and understanding</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Predictive analytics and machine learning models</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Computer vision and image recognition capabilities</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Web & Mobile Applications */}
              <div className="group relative">
                <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/20 shadow-xl h-full flex flex-col transition-all duration-300 hover:shadow-[0_0_35px_rgba(96,165,250,0.25)] hover:border-[#60A5FA]/30 relative before:absolute before:inset-0 before:bg-[#60A5FA]/5 before:rounded-2xl before:transition-opacity before:opacity-0 hover:before:opacity-100">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#60A5FA]/20 to-[#60A5FA]/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 blur-lg"></div>
                  <div className="w-14 h-14 bg-[#60A5FA]/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                    <Check className="w-8 h-8 text-[#60A5FA]" />
                  </div>
                  <h4 className="text-xl font-bold mb-4 text-white text-center">Web & Mobile Applications</h4>
                  <p className="text-gray-400 mb-6 text-center">
                    Comprehensive application development for all platforms, from responsive web apps to native mobile experiences.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto">
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Progressive Web Apps (PWAs) with offline capabilities</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Native iOS and Android development</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Cross-platform solutions with React Native or Flutter</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Cloud-based architecture with real-time synchronization</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* AI Powered Chatbots */}
              <div className="group relative">
                <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/20 shadow-xl h-full flex flex-col transition-all duration-300 hover:shadow-[0_0_35px_rgba(96,165,250,0.25)] hover:border-[#60A5FA]/30 relative before:absolute before:inset-0 before:bg-[#60A5FA]/5 before:rounded-2xl before:transition-opacity before:opacity-0 hover:before:opacity-100">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#60A5FA]/20 to-[#60A5FA]/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 blur-lg"></div>
                  <div className="w-14 h-14 bg-[#60A5FA]/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                    <Mail className="w-8 h-8 text-[#60A5FA]" />
                  </div>
                  <h4 className="text-xl font-bold mb-4 text-white text-center">AI Powered Chatbots</h4>
                  <p className="text-gray-400 mb-6 text-center">
                    Intelligent conversational agents that enhance customer engagement, automate support, and drive business growth.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto">
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Custom LLM integration and fine-tuning</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Multi-channel deployment (website, social media, messaging)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-[#60A5FA]">•</span>
                      <span>Knowledge base integration and continuous learning</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract Design Element */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent"></div>
      </section>

      {/* Our Approach Section */}
      <section id="approach" className="relative py-32 overflow-hidden border-b border-[#60A5FA]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-[pondar] text-5xl mb-8 font-bold tracking-tight text-white">
              Our Approach
            </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto">
              From concept to launch, we guide you every step of the way
            </p>
          </div>
          
          <div className="relative">
            {/* Vertical line for mobile only */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gradient-to-b from-[#60A5FA]/10 via-[#60A5FA]/20 to-[#60A5FA]/10 -translate-x-1/2 md:hidden"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-12 md:gap-4">
              {/* Step 1: Let's Talk */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6 group transition-all duration-300 hover:transform hover:scale-105">
                <div className="bg-[#60A5FA]/10 p-4 rounded-xl w-16 h-16 flex items-center justify-center mb-4 relative shadow-xl border border-[#60A5FA]/10 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(96,165,250,0.3)] group-hover:border-[#60A5FA]/30 group-hover:bg-[#60A5FA]/20">
                  <div className="text-2xl font-bold text-[#60A5FA] transition-all duration-300 group-hover:scale-110">1</div>
                </div>
                <h4 className="text-xl font-bold mb-2 text-white text-center transition-colors duration-300 group-hover:text-[#60A5FA]">Let's Talk</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto transition-colors duration-300 group-hover:text-gray-300">Initial consultation to understand your vision and goals</p>
                <div className="hidden md:block absolute -right-4 top-8 text-[#60A5FA] transition-all duration-300 group-hover:translate-x-1">
                  <ChevronRight className="w-8 h-8" />
                </div>
              </div>

              {/* Step 2: Let's Design */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6 group transition-all duration-300 hover:transform hover:scale-105">
                <div className="bg-[#60A5FA]/10 p-4 rounded-xl w-16 h-16 flex items-center justify-center mb-4 relative shadow-xl border border-[#60A5FA]/10 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(96,165,250,0.3)] group-hover:border-[#60A5FA]/30 group-hover:bg-[#60A5FA]/20">
                  <div className="text-2xl font-bold text-[#60A5FA] transition-all duration-300 group-hover:scale-110">2</div>
                </div>
                <h4 className="text-xl font-bold mb-2 text-white text-center transition-colors duration-300 group-hover:text-[#60A5FA]">Let's Design</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto transition-colors duration-300 group-hover:text-gray-300">Transform ideas into visual concepts aligned with your brand</p>
                <div className="hidden md:block absolute -right-4 top-8 text-[#60A5FA] transition-all duration-300 group-hover:translate-x-1">
                  <ChevronRight className="w-8 h-8" />
                </div>
              </div>

              {/* Step 3: Let's Prototype */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6 group transition-all duration-300 hover:transform hover:scale-105">
                <div className="bg-[#60A5FA]/10 p-4 rounded-xl w-16 h-16 flex items-center justify-center mb-4 relative shadow-xl border border-[#60A5FA]/10 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(96,165,250,0.3)] group-hover:border-[#60A5FA]/30 group-hover:bg-[#60A5FA]/20">
                  <div className="text-2xl font-bold text-[#60A5FA] transition-all duration-300 group-hover:scale-110">3</div>
                </div>
                <h4 className="text-xl font-bold mb-2 text-white text-center transition-colors duration-300 group-hover:text-[#60A5FA]">Let's Prototype</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto transition-colors duration-300 group-hover:text-gray-300">Build interactive mockups to visualize functionality</p>
                <div className="hidden md:block absolute -right-4 top-8 text-[#60A5FA] transition-all duration-300 group-hover:translate-x-1">
                  <ChevronRight className="w-8 h-8" />
                </div>
              </div>

              {/* Step 4: Let's Review */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6 group transition-all duration-300 hover:transform hover:scale-105">
                <div className="bg-[#60A5FA]/10 p-4 rounded-xl w-16 h-16 flex items-center justify-center mb-4 relative shadow-xl border border-[#60A5FA]/10 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(96,165,250,0.3)] group-hover:border-[#60A5FA]/30 group-hover:bg-[#60A5FA]/20">
                  <div className="text-2xl font-bold text-[#60A5FA] transition-all duration-300 group-hover:scale-110">4</div>
                </div>
                <h4 className="text-xl font-bold mb-2 text-white text-center transition-colors duration-300 group-hover:text-[#60A5FA]">Let's Review</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto transition-colors duration-300 group-hover:text-gray-300">Gather feedback and refine designs before development</p>
                <div className="hidden md:block absolute -right-4 top-8 text-[#60A5FA] transition-all duration-300 group-hover:translate-x-1">
                  <ChevronRight className="w-8 h-8" />
                </div>
              </div>

              {/* Step 5: Let's Build */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6 group transition-all duration-300 hover:transform hover:scale-105">
                <div className="bg-[#60A5FA]/10 p-4 rounded-xl w-16 h-16 flex items-center justify-center mb-4 relative shadow-xl border border-[#60A5FA]/10 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(96,165,250,0.3)] group-hover:border-[#60A5FA]/30 group-hover:bg-[#60A5FA]/20">
                  <div className="text-2xl font-bold text-[#60A5FA] transition-all duration-300 group-hover:scale-110">5</div>
                </div>
                <h4 className="text-xl font-bold mb-2 text-white text-center transition-colors duration-300 group-hover:text-[#60A5FA]">Let's Build</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto transition-colors duration-300 group-hover:text-gray-300">Develop clean, maintainable code with regular updates</p>
                <div className="hidden md:block absolute -right-4 top-8 text-[#60A5FA] transition-all duration-300 group-hover:translate-x-1">
                  <ChevronRight className="w-8 h-8" />
                </div>
              </div>

              {/* Step 6: Let's Go Live */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6 group transition-all duration-300 hover:transform hover:scale-105">
                <div className="bg-[#60A5FA]/10 p-4 rounded-xl w-16 h-16 flex items-center justify-center mb-4 relative shadow-xl border border-[#60A5FA]/10 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(96,165,250,0.3)] group-hover:border-[#60A5FA]/30 group-hover:bg-[#60A5FA]/20">
                  <div className="text-2xl font-bold text-[#60A5FA] transition-all duration-300 group-hover:scale-110">6</div>
                </div>
                <h4 className="text-xl font-bold mb-2 text-white text-center transition-colors duration-300 group-hover:text-[#60A5FA]">Let's Go Live</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto transition-colors duration-300 group-hover:text-gray-300">Deploy your solution with ongoing support and maintenance</p>
              </div>
            </div>
            
            <div className="flex justify-center mt-16">
              <a href="#contact" className="group bg-[#60A5FA]/10 text-white px-7 py-3.5 rounded-xl border border-[#60A5FA]/20 hover:border-[#60A5FA]/40 hover:bg-[#60A5FA]/20 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(96,165,250,0.15)] inline-flex items-center">
                Start Your Journey
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Abstract Design Element */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent"></div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-[pondar] text-5xl mb-8 font-bold tracking-tight text-white">
              Let's discuss your project
            </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto">
              Contact us today to start the conversation about transforming your business
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
            <div className="md:col-span-2 space-y-8">
              <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/10 shadow-xl h-full">
                <h3 className="text-2xl font-bold mb-6 text-white">Contact Information</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-[#60A5FA]/10 p-3 rounded-lg mr-5">
                      <MapPin className="w-6 h-6 text-[#60A5FA]" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-white mb-1">Location</h4>
                      <p className="text-gray-400">123 Innovation Street, Tech City, TC 12345</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-[#60A5FA]/10 p-3 rounded-lg mr-5">
                      <Mail className="w-6 h-6 text-[#60A5FA]" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-white mb-1">Email</h4>
                      <p className="text-gray-400">hello@cyma.tech</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-[#60A5FA]/10 p-3 rounded-lg mr-5">
                      <Phone className="w-6 h-6 text-[#60A5FA]" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-white mb-1">Phone</h4>
                      <p className="text-gray-400">+1 (555) 123-4567</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-10">
                  <h4 className="text-lg font-medium text-white mb-4">Connect With Us</h4>
                  <div className="flex space-x-4">
                    <a href="#" className="bg-[#60A5FA]/10 p-3 rounded-lg border border-[#60A5FA]/10 hover:border-[#60A5FA]/30 transition-all duration-300 transform hover:scale-110">
                      <Linkedin className="w-5 h-5 text-[#60A5FA]" />
                    </a>
                    <a href="#" className="bg-[#60A5FA]/10 p-3 rounded-lg border border-[#60A5FA]/10 hover:border-[#60A5FA]/30 transition-all duration-300 transform hover:scale-110">
                      <Twitter className="w-5 h-5 text-[#60A5FA]" />
                    </a>
                    <a href="#" className="bg-[#60A5FA]/10 p-3 rounded-lg border border-[#60A5FA]/10 hover:border-[#60A5FA]/30 transition-all duration-300 transform hover:scale-110">
                      <Instagram className="w-5 h-5 text-[#60A5FA]" />
                    </a>
                    <a href="#" className="bg-[#60A5FA]/10 p-3 rounded-lg border border-[#60A5FA]/10 hover:border-[#60A5FA]/30 transition-all duration-300 transform hover:scale-110">
                      <Facebook className="w-5 h-5 text-[#60A5FA]" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-3">
              <div className="bg-black/50 p-8 rounded-2xl border border-[#60A5FA]/10 shadow-xl h-full">
                <h3 className="text-2xl font-bold mb-6 text-white">Send us a message</h3>
                
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-white mb-2">Your Name</label>
                      <input 
                        type="text" 
                        id="name" 
                        className="w-full bg-black border border-[#60A5FA]/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#60A5FA]/30 focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/20 transition-all duration-300"
                        placeholder="Enter your name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-white mb-2">Your Email</label>
                      <input 
                        type="email" 
                        id="email" 
                        className="w-full bg-black border border-[#60A5FA]/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#60A5FA]/30 focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/20 transition-all duration-300"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-white mb-2">Subject</label>
                    <input 
                      type="text" 
                      id="subject" 
                      className="w-full bg-black border border-[#60A5FA]/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#60A5FA]/30 focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/20 transition-all duration-300"
                      placeholder="What is this regarding?"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-white mb-2">Your Message</label>
                    <textarea 
                      id="message" 
                      rows={6} 
                      className="w-full bg-black border border-[#60A5FA]/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#60A5FA]/30 focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/20 transition-all duration-300 resize-none"
                      placeholder="Tell us about your project and requirements..."
                    ></textarea>
                  </div>
                  
                  <div>
                    <button 
                      type="submit" 
                      className="group bg-[#60A5FA]/10 text-white px-7 py-3.5 rounded-xl border border-[#60A5FA]/20 hover:border-[#60A5FA]/40 hover:bg-[#60A5FA]/20 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(96,165,250,0.15)] inline-flex items-center"
                    >
                      Send Message
                      <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract Design Element */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent"></div>
      </section>

      {/* Footer */}
      <footer className="relative bg-black text-white py-16 border-t border-[#60A5FA]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="space-y-6">
              <div className="text-4xl font-[pondar] font-bold text-white">CYMA</div>
              <p className="text-gray-400">
                Innovative software solutions that transform businesses and drive growth.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-[#60A5FA] text-sm">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-[#60A5FA] text-sm">Linkedin</a>
                <a href="#" className="text-gray-400 hover:text-[#60A5FA] text-sm">Instagram</a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6">Company</h3>
              <ul className="space-y-4">
                <li><a href="#about" className="text-gray-400 hover:text-[#60A5FA] text-sm">About Us</a></li>
                <li><a href="#services" className="text-gray-400 hover:text-[#60A5FA] text-sm">Services</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-[#60A5FA] text-sm">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6">Services</h3>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-[#60A5FA] text-sm">Web Development</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#60A5FA] text-sm">Mobile Apps</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#60A5FA] text-sm">AI Solutions</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#60A5FA] text-sm">Digital Transformation</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6">Contact Us</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <MapPin className="w-5 h-5 text-[#60A5FA] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">123 Innovation Street, Tech City, TC 12345</span>
                </li>
                <li className="flex items-start">
                  <Mail className="w-5 h-5 text-[#60A5FA] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">hello@cyma.tech</span>
                </li>
                <li className="flex items-start">
                  <Phone className="w-5 h-5 text-[#60A5FA] mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">+1 (555) 123-4567</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-[#60A5FA]/10 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">
              &copy; {new Date().getFullYear()} CYMA. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-600 hover:text-[#60A5FA] text-sm">Privacy Policy</a>
              <a href="#" className="text-gray-600 hover:text-[#60A5FA] text-sm">Terms of Service</a>
              <a href="#" className="text-gray-600 hover:text-[#60A5FA] text-sm">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;