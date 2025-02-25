import React, { useState } from 'react';
import { Code2, ChevronRight, Menu, Globe, Cpu, Gauge, TestTube, Mail, ChevronLeft, Github, Linkedin } from 'lucide-react';

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
              <Code2 className="w-8 h-8" />
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
            <h1 className='font-[pondar] text-[16rem]'>
              CYMA
            </h1>
            {/*
            <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-12">
              Delivering solutions today, built with quality<br />
              that empowers your tomorrow.
            </p> */}
            <button className="group bg-white text-black px-6 py-3 rounded-md hover:bg-gray-200 transition-colors inline-flex items-center">
              Let's talk
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
              <p className="text-2xl sm:text-3xl md:text-4xl leading-relaxed mb-12">
                At Paradigm, we are committed to redefining excellence in software development. Our team comprises the industry's best developers, dedicated to crafting top-tier solutions where quality code is our utmost priority.
              </p>
              <p className="text-xl sm:text-2xl text-gray-400 leading-relaxed mb-16">
                We answer your needs now, with quality built to last: So you can get the solutions you need today, delivered with the quality you can trust tomorrow.
              </p>
              <h2 className="text-5xl sm:text-7xl font-bold tracking-tight bg-gradient-to-r from-white/80 to-white bg-clip-text text-transparent">
                We are Paradigm
              </h2>
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
            Accelerate your<br />business goals with us
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Web & Mobile Development */}
            <div className="relative group">
              <div className="bg-white/5 rounded-2xl p-8 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20">
                <Globe className="w-12 h-12 mb-6" />
                <h3 className="text-2xl font-semibold mb-4">Web & Mobile Development</h3>
                <p className="text-gray-400">
                  We can deliver multi-channel applications that run on the web and mobile.
                </p>
              </div>
            </div>

            {/* Low Code Architecture */}
            <div className="relative group">
              <div className="bg-white/5 rounded-2xl p-8 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20">
                <Cpu className="w-12 h-12 mb-6" />
                <h3 className="text-2xl font-semibold mb-4">Low Code Architecture & Development</h3>
                <p className="text-gray-400">
                  We are experts in low-code development. Lean on us to help guide you on your low code journey or simply utilize our experts to deliver your projects quicker.
                </p>
              </div>
            </div>

            {/* Scale & Performance */}
            <div className="relative group">
              <div className="bg-white/5 rounded-2xl p-8 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20">
                <Gauge className="w-12 h-12 mb-6" />
                <h3 className="text-2xl font-semibold mb-4">Scale & Performance</h3>
                <p className="text-gray-400">
                  In the right hands, low code can scale efficiently. We can help you identify the best architecture and structure to achieve optimum performance at scale.
                </p>
              </div>
            </div>

            {/* Test Automation */}
            <div className="relative group">
              <div className="bg-white/5 rounded-2xl p-8 h-full border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20">
                <TestTube className="w-12 h-12 mb-6" />
                <h3 className="text-2xl font-semibold mb-4">Test Automation</h3>
                <p className="text-gray-400">
                  Reliable quality goes hand in hand with good test automation. A solid test automation strategy is key to delivering successful products.
                </p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center">
            <div className="text-center">
              <h2 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight mb-8">
                Bring together<br />
                technology<br />
                and expertise
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

      {/* Meet the Team Section */}
      <div className="relative py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Meet the Team</h2>
            <p className="text-xl text-gray-400">The experts behind our success</p>
          </div>
          
          <div className="relative">
            <div className="flex items-center justify-center">
              <button 
                onClick={prevMember}
                className="absolute left-0 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Previous team member"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="text-center max-w-4xl mx-auto px-12">
                <div className="mb-8">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-xl opacity-50"></div>
                    <img
                      src={teamMembers[currentMember].image}
                      alt={teamMembers[currentMember].name}
                      className="relative w-32 h-32 rounded-full mx-auto mb-6 object-cover border-2 border-white/20"
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{teamMembers[currentMember].name}</h3>
                  <p className="text-white/60 mb-6">{teamMembers[currentMember].role}</p>
                  <p className="text-xl leading-relaxed mb-8 max-w-2xl mx-auto">
                    {teamMembers[currentMember].bio}
                  </p>
                  <div className="flex justify-center gap-4">
                    <a
                      href={teamMembers[currentMember].github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                    <a
                      href={teamMembers[currentMember].linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  {teamMembers.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMember(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentMember ? 'bg-white' : 'bg-white/20'
                      }`}
                      aria-label={`Go to team member ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <button 
                onClick={nextMember}
                className="absolute right-0 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Next team member"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
          <div className="w-[800px] h-[800px] bg-gradient-to-r from-white/5 to-transparent rounded-full blur-3xl transform -rotate-12"></div>
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
