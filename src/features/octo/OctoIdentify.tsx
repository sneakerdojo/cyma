import { useState, useCallback } from 'react';
import { ArrowRight, Loader } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentityData {
  firstName: string;
  surname: string;
  email: string;
  phone: string;       // normalised to +27... format
  company: string;     // optional but captured upfront
  returning: boolean;  // true when existing contact with a confirmed booking
  contactId?: string;  // set only for existing contacts
}

interface OctoIdentifyProps {
  onIdentified: (data: IdentityData) => void;
}

interface IdentifyApiResponse {
  existing: boolean;
  contact?: { id: string; firstName: string };
  hasPastBooking: boolean;
}

// ---------------------------------------------------------------------------
// Phone normalisation — South African numbers only
//
// Accepted formats:
//   0821234567  → +27821234567
//   27821234567 → +27821234567
//   +27821234567 → +27821234567
// ---------------------------------------------------------------------------

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length === 10) {
    return '+27' + digits.slice(1);
  }
  if (digits.startsWith('27') && digits.length === 11) {
    return '+' + digits;
  }
  if (raw.startsWith('+27') && digits.length === 11) {
    return '+' + digits;
  }
  return null;
}

// ---------------------------------------------------------------------------
// OctoIdentify
//
// Identity gate rendered before the wizard. Collects name, email, phone, and
// optional company. Calls POST /api/identify to check if the user is a
// returning client, then hands off to the parent via onIdentified.
// ---------------------------------------------------------------------------

export default function OctoIdentify({ onIdentified }: OctoIdentifyProps) {
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  const [phoneError, setPhoneError] = useState('');
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate phone on blur so the user isn't blocked while typing
  const handlePhoneBlur = useCallback(() => {
    const raw = phone.trim();
    if (!raw) return;
    const normalised = normalizePhone(raw);
    if (!normalised) {
      setPhoneError('Please enter a valid SA number (e.g. 082 123 4567 or +27 82 123 4567)');
    } else {
      setPhoneError('');
    }
  }, [phone]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isSubmitting) return;

      const trimmedPhone = phone.trim();
      const normalisedPhone = normalizePhone(trimmedPhone);

      if (!normalisedPhone) {
        setPhoneError('Please enter a valid SA number (e.g. 082 123 4567 or +27 82 123 4567)');
        return;
      }

      setPhoneError('');
      setApiError('');
      setIsSubmitting(true);

      try {
        const apiBase = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL ?? '';
        const res = await fetch(`${apiBase}/api/identify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!res.ok) {
          let message = 'Something went wrong — please try again.';
          try {
            const body = await res.json();
            if (typeof body?.error === 'string') message = body.error;
          } catch {
            // non-JSON response — use default message
          }
          setApiError(message);
          return;
        }

        const data: IdentifyApiResponse = await res.json();

        const returning = data.existing && data.hasPastBooking;

        onIdentified({
          firstName: firstName.trim(),
          surname: surname.trim(),
          email: email.trim(),
          phone: normalisedPhone,
          company: company.trim(),
          returning,
          contactId: data.contact?.id,
        });
      } catch {
        setApiError('Unable to reach our server — please check your connection and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, firstName, surname, email, phone, company, onIdentified]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 max-w-xl mx-auto p-8 rounded-2xl bg-surface border border-border animate-fade-up"
      noValidate
    >
      {/* Heading */}
      <div className="mb-8 text-center">
        <h2 className="font-display font-semibold text-lg text-text">
          Before we begin
        </h2>
        <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
          This helps us personalise your experience
        </p>
      </div>

      {/* Name row */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
            First Name *
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
            required
            maxLength={100}
            autoComplete="given-name"
            autoCapitalize="words"
            className="w-full min-h-[44px] px-4 py-3 bg-surface-2 border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
            Surname *
          </label>
          <input
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="Smith"
            required
            maxLength={100}
            autoComplete="family-name"
            autoCapitalize="words"
            className="w-full min-h-[44px] px-4 py-3 bg-surface-2 border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 transition-all"
          />
        </div>
      </div>

      {/* Email */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
          Email *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          required
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full min-h-[44px] px-4 py-3 bg-surface-2 border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 transition-all"
        />
      </div>

      {/* Phone */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
          Cellphone *
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (phoneError) setPhoneError('');
          }}
          onBlur={handlePhoneBlur}
          placeholder="082 123 4567"
          required
          maxLength={20}
          autoComplete="tel"
          inputMode="tel"
          className={`w-full min-h-[44px] px-4 py-3 bg-surface-2 border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none transition-all ${
            phoneError ? 'border-red-500/60 focus:border-red-500/80' : 'border-border focus:border-orange/50'
          }`}
        />
        {phoneError && (
          <p className="mt-2 text-xs text-red-400 leading-relaxed">{phoneError}</p>
        )}
      </div>

      {/* Company (optional) */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
          Company <span className="normal-case text-text-muted/60">(optional)</span>
        </label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Corp"
          maxLength={200}
          autoComplete="organization"
          className="w-full min-h-[44px] px-4 py-3 bg-surface-2 border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 transition-all"
        />
      </div>

      {/* API error */}
      {apiError && (
        <p className="mb-4 text-sm text-red-400 leading-relaxed text-center">{apiError}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-glow group w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange text-bg font-semibold rounded-full transition-all duration-300 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/20 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
      >
        {isSubmitting ? (
          <>
            <Loader size={16} className="animate-spin" />
            Checking...
          </>
        ) : (
          <>
            Let's get started
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>
    </form>
  );
}
