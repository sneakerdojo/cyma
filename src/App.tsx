import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Github,
  Linkedin,
  Menu,
  Mail,
  Code,
  Rocket,
  Server,
  Smartphone,
  Bot,
  CalendarCheck,
  Palette,
  LightbulbIcon,
  CheckSquare,
  Code2,
  ArrowRight,
  ArrowDown,
  MessageSquare
} from 'lucide-react';

function App() {
  const [currentMember, setCurrentMember] = useState(0);

  const teamMembers = [
    {
      name: "Simekani",
      role: "Co-Founder",
      bio: "As co-founder of Paradigm, Simekani brings innovative vision and technical expertise to drive our mission of delivering exceptional software solutions.",
      image: "/simekani.jpg", // We'll use the actual photo
      github: "https://github.com",
      linkedin: "https://linkedin.com"
    },
    {
      name: "Sarah Chen",
      role: "Chief Technology Officer",
      bio: "With over 15 years of experience in low-code development, Sarah leads our technical strategy and innovation initiatives.",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?fit=crop&w=150&h=150",
      github: "https://github.com",
      linkedin: "https://linkedin.com"
    },
    {
      name: "Michael Rodriguez",
      role: "Lead Solutions Architect",
      bio: "Michael brings 12 years of enterprise architecture experience, specializing in scalable low-code solutions.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?fit=crop&w=150&h=150",
      github: "https://github.com",
      linkedin: "https://linkedin.com"
    }
  ];

  const nextMember = () => {
    setCurrentMember((prev) => (prev + 1) % teamMembers.length);
  };

  const prevMember = () => {
    setCurrentMember((prev) => (prev - 1 + teamMembers.length) % teamMembers.length);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-black/90 backdrop-blur-sm border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/Black and White Abstract Agency Logo.png" className="w-12 h-12" alt="Cyma logo" />
              <span className="ml-4 text-xl font-bold font-[pondar]">CYMA</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="hover:text-gray-300 transition-colors">Services</a>
              <a href="#about" className="hover:text-gray-300 transition-colors">About us</a>
              <a href="#contact" className="hover:text-gray-300 transition-colors">Contact</a>
              <button className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">
                Let's talk
              </button>
            </div>
            <div className="md:hidden">
              <Menu className="w-6 h-6" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-32 sm:pt-48 sm:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/*
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-8">
              Custom low-code<br />software solutions
            </h1> */}
            <h1 className='font-[pondar] text-[11.2rem]' data-component-name="App">
              CYMA
            </h1>
            <p className="text-gray-400 text-2xl sm:text-3xl max-w-3xl mx-auto mt-4 mb-12">
              Innovation through Artificial Intelligence.
            </p>
            <button className="group bg-white text-black px-6 py-3 rounded-md hover:bg-gray-200 transition-colors inline-flex items-center">
              Let's Talk
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Abstract Design Elements */}
        <div className="absolute top-1/2 left-0 w-full h-96 -translate-y-1/2 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rotate-12 transform-gpu"></div>
          <div className="absolute inset-0 bg-gradient-to-l from-white/5 to-transparent -rotate-12 transform-gpu"></div>
        </div>
      </div>

      {/* About Section */}
      <div className="relative py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative z-10">
            <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl sm:text-7xl font-bold tracking-tight bg-gradient-to-r from-white/80 to-white bg-clip-text text-transparent">
                We are CYMA
              </h2>
              <p className="text-2xl sm:text-3xl md:text-4xl leading-relaxed mb-12">
              We answer your needs now, with quality built to last: So you can get the solutions you need today, delivered with the quality you can trust tomorrow.
              </p>
            </div>
          </div>

          {/* Design Elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[800px] h-[800px] bg-gradient-to-r from-white/5 to-transparent rounded-full blur-3xl transform -rotate-45"></div>
            <div className="w-[600px] h-[600px] bg-gradient-to-l from-white/5 to-transparent rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="relative py-24 overflow-hidden" id="services">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-20">
            Services tailored to your<br />unique business needs
          </h2>
          
          {/* Web Development */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Web Development</h2>
              <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
                Delivering modern, scalable, and optimized web solutions.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8">
              {/* Design & Development */}
              <div className="relative group">
                <div className="bg-white/5 rounded-2xl p-6 md:p-10 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:translate-y-[-8px] flex flex-col">
                  <div className="bg-white/10 p-4 rounded-full w-14 md:w-16 h-14 md:h-16 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                    <Code className="w-6 md:w-8 h-6 md:h-8 text-white" />
                  </div>
                  <h4 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-center">Design & Development</h4>
                  <p className="text-gray-400 mb-4 text-center text-sm md:text-base">
                    Custom-built, responsive, and high-performance websites tailored to your specific needs.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto text-sm md:text-base">
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Responsive designs optimized for all devices and screen sizes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Modern frameworks like React, Vue, and Angular</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Performance-focused development with optimal load times</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Modernization */}
              <div className="relative group">
                <div className="bg-white/5 rounded-2xl p-6 md:p-10 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:translate-y-[-8px] flex flex-col">
                  <div className="bg-white/10 p-4 rounded-full w-14 md:w-16 h-14 md:h-16 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                    <Rocket className="w-6 md:w-8 h-6 md:h-8 text-white" />
                  </div>
                  <h4 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-center">Modernization</h4>
                  <p className="text-gray-400 mb-4 text-center text-sm md:text-base">
                    Transform your legacy systems with cutting-edge technologies for improved performance and user experience.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto text-sm md:text-base">
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Legacy system assessment and migration planning</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Incremental modernization to minimize disruption</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Enhanced security and compliance measures</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Hosting & SEO */}
              <div className="relative group">
                <div className="bg-white/5 rounded-2xl p-6 md:p-10 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:translate-y-[-8px] flex flex-col">
                  <div className="bg-white/10 p-4 rounded-full w-14 md:w-16 h-14 md:h-16 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                    <Server className="w-6 md:w-8 h-6 md:h-8 text-white" />
                  </div>
                  <h4 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-center">Hosting & SEO</h4>
                  <p className="text-gray-400 mb-4 text-center text-sm md:text-base">
                    Comprehensive hosting solutions with advanced SEO strategies to maximize your online visibility.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto text-sm md:text-base">
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Cloud-based hosting with 99.9% uptime guarantee</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>On-page and technical SEO optimization</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
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
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Custom Software Solutions</h2>
              <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
                Tailored software solutions designed for your business needs.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-8">
              {/* AI-driven software */}
              <div className="relative group">
                <div className="bg-white/5 rounded-2xl p-6 md:p-10 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:translate-y-[-8px] flex flex-col">
                  <div className="bg-white/10 p-4 rounded-full w-14 md:w-16 h-14 md:h-16 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                    <Bot className="w-6 md:w-8 h-6 md:h-8 text-white" />
                  </div>
                  <h4 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-center">AI-driven Software</h4>
                  <p className="text-gray-400 mb-4 text-center text-sm md:text-base">
                    Harness the power of artificial intelligence to create intelligent software solutions that adapt and evolve.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto text-sm md:text-base">
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Natural language processing and understanding</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Predictive analytics and machine learning models</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Computer vision and image recognition capabilities</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Web & Mobile Applications */}
              <div className="relative group">
                <div className="bg-white/5 rounded-2xl p-6 md:p-10 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:translate-y-[-8px] flex flex-col">
                  <div className="bg-white/10 p-4 rounded-full w-14 md:w-16 h-14 md:h-16 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                    <Smartphone className="w-6 md:w-8 h-6 md:h-8 text-white" />
                  </div>
                  <h4 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-center">Web & Mobile Applications</h4>
                  <p className="text-gray-400 mb-4 text-center text-sm md:text-base">
                    Comprehensive application development for all platforms, from responsive web apps to native mobile experiences.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto text-sm md:text-base">
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Progressive Web Apps (PWAs) with offline capabilities</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Native iOS and Android development</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Cross-platform solutions with React Native or Flutter</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Cloud-based architecture with real-time synchronization</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* AI Powered Chatbots */}
              <div className="relative group">
                <div className="bg-white/5 rounded-2xl p-6 md:p-10 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:translate-y-[-8px] flex flex-col">
                  <div className="bg-white/10 p-4 rounded-full w-14 md:w-16 h-14 md:h-16 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                    <MessageSquare className="w-6 md:w-8 h-6 md:h-8 text-white" />
                  </div>
                  <h4 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-center">AI Powered Chatbots</h4>
                  <p className="text-gray-400 mb-4 text-center text-sm md:text-base">
                    Intelligent conversational agents that enhance customer engagement, automate support, and drive business growth.
                  </p>
                  <ul className="text-gray-400 space-y-2 mt-auto text-sm md:text-base">
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Custom LLM integration and fine-tuning</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Multi-channel deployment (website, social media, messaging)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-white">•</span>
                      <span>Knowledge base integration and continuous learning</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
        </div>
      </div>

      {/* Brand Section */}
      <div className="relative py-24 overflow-hidden">

        {/* Background Elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] bg-gradient-to-r from-white/5 to-transparent rounded-full blur-3xl transform rotate-45"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center">
            <div className="text-center">
              <h2 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight mb-8">
                Bring together<br />
                AI<br />
                and Technology
              </h2>
              <div className="h-1 w-24 bg-white/20 rounded-full mx-auto"></div>
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] bg-gradient-to-r from-white/5 to-transparent rounded-full blur-3xl transform rotate-45"></div>
        </div>
      </div>

      {/* Our Approach Section */}
      <div className="relative py-16 md:py-24 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] bg-gradient-to-r from-purple-500/5 to-transparent rounded-full blur-3xl transform -rotate-12"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Our Approach</h2>
            <p className="text-lg md:text-xl text-gray-400">From concept to launch, we guide you every step of the way</p>
          </div>
          
          <div className="relative">
            {/* Horizontal line connecting steps - hidden on mobile */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/20 via-white/20 to-purple-500/20 -translate-y-1/2 hidden md:block"></div>
            
            {/* Vertical line for mobile only */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gradient-to-b from-purple-500/20 via-white/20 to-purple-500/20 -translate-x-1/2 md:hidden"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-12 md:gap-4">
              {/* Step 1: Let's Talk */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6">
                <div className="bg-white/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full blur-md"></div>
                  <CalendarCheck className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                </div>
                <h4 className="text-xl font-semibold mb-2 text-center">Let's Talk</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto">Initial consultation to understand your vision and goals</p>
                {/* Arrows - desktop */}
                <div className="hidden md:block absolute -right-4 top-8 text-white">
                  <ArrowRight className="w-8 h-8" />
                </div>
                {/* Arrows - mobile */}
                <div className="md:hidden text-white mb-2">
                  <ArrowDown className="w-6 h-6" />
                </div>
              </div>
              
              {/* Step 2: Let's Design */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6">
                <div className="bg-white/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full blur-md"></div>
                  <Palette className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                </div>
                <h4 className="text-xl font-semibold mb-2 text-center">Let's Design</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto">Transform ideas into visual concepts aligned with your brand</p>
                {/* Arrows - desktop */}
                <div className="hidden md:block absolute -right-4 top-8 text-white">
                  <ArrowRight className="w-8 h-8" />
                </div>
                {/* Arrows - mobile */}
                <div className="md:hidden text-white mb-2">
                  <ArrowDown className="w-6 h-6" />
                </div>
              </div>
              
              {/* Step 3: Let's Prototype */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6">
                <div className="bg-white/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full blur-md"></div>
                  <LightbulbIcon className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                </div>
                <h4 className="text-xl font-semibold mb-2 text-center">Let's Prototype</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto">Build interactive mockups to visualize functionality</p>
                {/* Arrows - desktop */}
                <div className="hidden md:block absolute -right-4 top-8 text-white">
                  <ArrowRight className="w-8 h-8" />
                </div>
                {/* Arrows - mobile */}
                <div className="md:hidden text-white mb-2">
                  <ArrowDown className="w-6 h-6" />
                </div>
              </div>
              
              {/* Step 4: Let's Review */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6">
                <div className="bg-white/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full blur-md"></div>
                  <CheckSquare className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                </div>
                <h4 className="text-xl font-semibold mb-2 text-center">Let's Review</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto">Gather feedback and refine designs before development</p>
                {/* Arrows - desktop */}
                <div className="hidden md:block absolute -right-4 top-8 text-white">
                  <ArrowRight className="w-8 h-8" />
                </div>
                {/* Arrows - mobile */}
                <div className="md:hidden text-white mb-2">
                  <ArrowDown className="w-6 h-6" />
                </div>
              </div>
              
              {/* Step 5: Let's Build */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6">
                <div className="bg-white/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full blur-md"></div>
                  <Code2 className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                </div>
                <h4 className="text-xl font-semibold mb-2 text-center">Let's Build</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto">Develop clean, maintainable code with regular updates</p>
                {/* Arrows - desktop */}
                <div className="hidden md:block absolute -right-4 top-8 text-white">
                  <ArrowRight className="w-8 h-8" />
                </div>
                {/* Arrows - mobile */}
                <div className="md:hidden text-white mb-2">
                  <ArrowDown className="w-6 h-6" />
                </div>
              </div>
              
              {/* Step 6: Let's Go Live */}
              <div className="flex flex-col items-center relative z-10 w-full md:w-1/6">
                <div className="bg-white/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full blur-md"></div>
                  <Rocket className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                </div>
                <h4 className="text-xl font-semibold mb-2 text-center">Let's Go Live</h4>
                <p className="text-gray-400 text-center text-sm mb-4 max-w-[200px] mx-auto">Deploy your solution with ongoing support and maintenance</p>
              </div>
            </div>
            
            <div className="flex justify-center mt-10 md:mt-16">
              <a href="#contact" className="inline-flex items-center text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 py-2 px-5 md:py-3 md:px-6 rounded-full shadow-lg transition-all hover:shadow-xl text-sm md:text-base">
                Start Your Journey <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="relative py-24 overflow-hidden" id="contact">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Column */}
            <div className="relative overflow-hidden rounded-3xl p-12 group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A2540] via-[#0A3152] to-[#0B4066] opacity-80"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent)] group-hover:opacity-60 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <h2 className="text-5xl font-bold mb-6">Don't be shy,<br />just say hi.</h2>
                <div className="flex items-center text-gray-400 mt-8">
                  <Mail className="w-5 h-5 mr-3" />
                  <a href="mailto:hello@paradigm-solutions.io" className="hover:text-white transition-colors">
                    hello@paradigm-solutions.io
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-2">Message (optional)</label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors resize-none"
                  placeholder="Tell us about your project..."
                ></textarea>
                <div className="text-right mt-1">
                  <span className="text-sm text-gray-500">1000 symbols</span>
                </div>
              </div>
              <div className="flex justify-start">
                <button className="bg-white text-black font-medium px-6 py-2.5 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center group">
                  Submit
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] bg-gradient-to-r from-white/5 to-transparent rounded-full blur-3xl transform -rotate-12"></div>
        </div>
      </div>
    </div>
  );
}

export default App;
