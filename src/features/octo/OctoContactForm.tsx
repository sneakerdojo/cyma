import { useState } from 'react';
import { Send } from 'lucide-react';
import type { ContactInfo } from './types';

interface OctoContactFormProps {
  onSubmit: (contact: ContactInfo) => void;
  visible: boolean;
}

export default function OctoContactForm({ onSubmit, visible }: OctoContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Bug #1: trim() prevents whitespace-only values from passing validation
    // Bug #2: isSubmitting guard prevents double-submit
    if (name.trim() && email.trim() && !isSubmitting) {
      setIsSubmitting(true);
      onSubmit({ name: name.trim(), email: email.trim(), company: company.trim() });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 max-w-xl mx-auto p-8 rounded-2xl bg-surface border border-border animate-fade-up"
    >
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
            Full Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            maxLength={100}
            autoComplete="name"
            autoCapitalize="words"
            className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
            Company
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
            maxLength={200}
            autoComplete="organization"
            className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 transition-all"
          />
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
          Email *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 transition-all"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-glow group w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange text-bg font-semibold rounded-full transition-all duration-300 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/20 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Submit
        <Send size={16} className="transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}
