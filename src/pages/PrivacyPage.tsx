import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// PrivacyPage — POPIA-compliant privacy policy for Octio
// Single-responsibility: renders static legal content only.
// No data fetching, no side effects, no wizard coupling.
// ---------------------------------------------------------------------------

const LAST_UPDATED = '11 April 2026';

interface SectionProps {
  id: string;
  heading: string;
  children: React.ReactNode;
}

function Section({ id, heading, children }: SectionProps) {
  return (
    <section id={id} className="mb-10">
      <h2 className="font-display font-bold text-xl mb-3 text-text">{heading}</h2>
      <div className="text-text-muted text-sm leading-7 space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg text-text font-body">
      {/* Top nav strip */}
      <nav className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-orange transition-colors duration-200"
          >
            <ArrowLeft size={15} strokeWidth={1.75} />
            Back to home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-14">
        {/* Title block */}
        <header className="mb-12">
          <h1 className="font-display font-bold text-4xl mb-3">Privacy Policy</h1>
          <p className="text-text-muted text-sm">Last updated: {LAST_UPDATED}</p>
        </header>

        <Section id="who-we-are" heading="1. Who we are">
          <p>
            Octio (Pty) Ltd is a South African software and AI agency based in Johannesburg. We build
            agentic AI systems, custom applications, and modernisation solutions for businesses.
          </p>
          <p>
            When you use our website — including the discovery-call wizard or freechat — you interact
            with systems we operate and are responsible for.
          </p>
        </Section>

        <Section id="what-we-collect" heading="2. What data we collect">
          <p>
            <strong className="text-text">Through the discovery wizard:</strong> your name, email
            address, company name, phone number, project details (free text), an optional voice note
            (WebM audio), and any files you choose to upload.
          </p>
          <p>
            <strong className="text-text">Through freechat (after booking):</strong> the messages you
            send and the responses the AI generates during your conversation.
          </p>
          <p>
            <strong className="text-text">Technical data:</strong> a session UUID stored in your
            browser&apos;s localStorage (used to resume your chat session), your IP address (used
            only for rate limiting), and your user-agent string.
          </p>
        </Section>

        <Section id="why-we-collect" heading="3. Why we collect it">
          <p>We use your data to:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Book and confirm your discovery call</li>
            <li>Follow up on your project after the call</li>
            <li>Answer your questions in freechat</li>
            <li>Improve the quality of our service over time</li>
          </ul>
          <p>We do not sell your data. We do not use it for advertising.</p>
        </Section>

        <Section id="where-data-lives" heading="4. Where your data lives">
          <p>
            <strong className="text-text">Primary storage:</strong> a self-hosted PostgreSQL database
            running on our server in Johannesburg, South Africa.
          </p>
          <p>
            <strong className="text-text">Attachments and voice notes:</strong> stored on the same
            Johannesburg server on an encrypted file system.
          </p>
          <p>
            <strong className="text-text">Backups:</strong> nightly{' '}
            <code className="text-orange-light bg-surface px-1 rounded text-xs">pg_dump</code>{' '}
            exports are encrypted with AES-256 and uploaded to Backblaze B2 (EU region). Backblaze
            holds only ciphertext — they cannot read your data.
          </p>
        </Section>

        <Section id="third-parties" heading="5. Third-party data flows">
          <p>We are transparent about every service that touches your data:</p>
          <ul className="list-none space-y-4 pl-0">
            <li>
              <strong className="text-text">Anthropic (Claude API)</strong> — messages you send in
              freechat are processed by Anthropic&apos;s large language model to generate responses.
              Anthropic processes this data in the US and EU. See their{' '}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange hover:text-orange-light transition-colors duration-200"
              >
                privacy policy
              </a>
              .
            </li>
            <li>
              <strong className="text-text">Google Workspace</strong> — when you book a call, we
              create a Google Calendar event with a Meet link and send a confirmation email via Gmail.
              Google processes this per their{' '}
              <a
                href="https://workspace.google.com/terms/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange hover:text-orange-light transition-colors duration-200"
              >
                Workspace privacy policy
              </a>
              .
            </li>
            <li>
              <strong className="text-text">Backblaze B2</strong> — receives only AES-256
              ciphertext. Backblaze has no access to readable data.
            </li>
          </ul>
        </Section>

        <Section id="retention" heading="6. How long we keep it">
          <p>
            We retain your data for 12 months from your last activity. After that, it is automatically
            deleted — including your contact record, bookings, conversations, scores, and uploaded
            files.
          </p>
          <p>
            Google Calendar events created for your booking persist separately in Google&apos;s
            systems until you or we delete them manually.
          </p>
        </Section>

        <Section id="your-rights" heading="7. Your rights under POPIA">
          <p>
            As a data subject under the Protection of Personal Information Act (POPIA), you have the
            following rights:
          </p>
          <ul className="list-none space-y-4 pl-0">
            <li>
              <strong className="text-text">Access</strong> — email{' '}
              <a
                href="mailto:privacy@octio.co.za"
                className="text-orange hover:text-orange-light transition-colors duration-200"
              >
                privacy@octio.co.za
              </a>{' '}
              with your email address and we will share what we hold about you.
            </li>
            <li>
              <strong className="text-text">Correction</strong> — same channel. Tell us what is
              wrong and we will fix it.
            </li>
            <li>
              <strong className="text-text">Deletion</strong> — email{' '}
              <a
                href="mailto:privacy@octio.co.za"
                className="text-orange hover:text-orange-light transition-colors duration-200"
              >
                privacy@octio.co.za
              </a>
              . We will send a confirmation link to your email address to verify ownership, then
              cascade-delete your contact record and all associated bookings, conversations, scores,
              and files. Google Calendar events are not auto-deleted — request that separately in the
              same email or via your own Google account.
            </li>
            <li>
              <strong className="text-text">Objection</strong> — you can end any freechat
              conversation at any time. You are never required to continue.
            </li>
          </ul>
        </Section>

        <Section id="cookies" heading="8. Cookies and tracking">
          <p>
            We use no cookies. No analytics, no advertising pixels, no retargeting.
          </p>
          <p>
            The only persistent browser storage we use is a session UUID in localStorage. It allows
            the chat session to resume if you refresh the page. You can clear it at any time by
            clearing your browser&apos;s local storage.
          </p>
        </Section>

        <Section id="children" heading="9. Children">
          <p>
            Our service is not intended for anyone under 18 years of age. We do not knowingly collect
            data from minors.
          </p>
        </Section>

        <Section id="changes" heading="10. Changes to this policy">
          <p>
            If we update this policy, we will post the revised version here and change the &ldquo;last
            updated&rdquo; date at the top. We will not apply material changes retroactively to data
            collected before the change.
          </p>
        </Section>

        <Section id="contact" heading="11. Contact">
          <p>
            Data requests:{' '}
            <a
              href="mailto:privacy@octio.co.za"
              className="text-orange hover:text-orange-light transition-colors duration-200"
            >
              privacy@octio.co.za
            </a>
          </p>
          <p>
            Everything else:{' '}
            <a
              href="mailto:hello@octio.co.za"
              className="text-orange hover:text-orange-light transition-colors duration-200"
            >
              hello@octio.co.za
            </a>
          </p>
        </Section>
      </main>
    </div>
  );
}
