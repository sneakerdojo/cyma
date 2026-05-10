/**
 * Octio product + service catalogue.
 *
 * Single source of truth for everything visible to visitors:
 *   - Homepage Services cards
 *   - Detail pages (rendered by ProductDetailPage)
 *   - Footer navigation
 *   - Eventually: bot knowledge base (mirrored to worker/src/knowledge/services.json)
 *
 * `category: 'product'` means it's marketed as autonomous/self-serve.
 * `category: 'service'` means it's a custom engagement (consultative).
 *
 * The `serviceKey` is what we pass to `openWizard()` so the discovery flow
 * pre-fills the right service.
 */

import {
  Bot,
  Mic,
  Megaphone,
  Mail,
  Code2,
  Workflow,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export type Category = 'product' | 'service';

/**
 * Master switch for displaying public pricing.
 *
 * When `false`: pricing tier cards show "Enquire for pricing" instead of the
 * concrete `priceFrom` figure. The full PricingTier data (name, includes,
 * cadence, etc.) still renders — only the price number and cadence are
 * hidden, so we can flip back to `true` later without restructuring.
 *
 * Also drives SEO JSON-LD (price omitted when false).
 *
 * Set to `true` to restore concrete prices everywhere.
 */
export const SHOW_PUBLIC_PRICING = false;

/** Display string used wherever a public price would otherwise appear. */
export const PRICING_HIDDEN_LABEL = 'Enquire for pricing';

/**
 * Hero-banner stat — one of 3-4 displayed under the page hero.
 * Use specific numbers from real deployments where possible.
 */
export interface StatItem {
  /** The headline metric, e.g. "30s" or "3.5x" */
  value: string;
  /** What that metric represents, e.g. "average response time" */
  label: string;
}

/**
 * Expanded explanation of a single capability — one entry per
 * `whatItDoes` bullet. Adds depth without bloating the bullet itself.
 */
export interface CapabilityDeepDive {
  /** Short heading — 4-7 words */
  title: string;
  /** 100-150 word explanation in plain language */
  body: string;
  /** Optional inline tags / chips (e.g. tools, channels) */
  highlights?: string[];
}

/**
 * Concrete artifact the offering produces — e.g. a sample email,
 * a sample lead score, a sample newsletter issue. Builds trust by
 * showing what the AI actually outputs.
 */
export interface SampleOutput {
  /** Short label, e.g. "Sample first-touch email" */
  label: string;
  /** What this artifact is, in 1-2 sentences */
  caption: string;
  /** The artifact itself — markdown for prose, JSON-string for data */
  body: string;
  /** How to render it: as prose, as code, as quote */
  format: 'prose' | 'code' | 'quote';
}

export interface UseCase {
  industry: string;
  challenge: string;
  outcome: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface HowItWorksStep {
  title: string;
  description: string;
}

export interface IncludedItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface PricingTier {
  name: string;
  priceFrom: string;
  cadence: string;
  bestFor: string;
  includes: string[];
  cta: string;
  highlighted?: boolean;
}

export interface ProductDef {
  slug: string;
  category: Category;
  icon: LucideIcon;
  name: string;
  shortName: string;
  tagline: string;
  /** Full headline used on the detail page hero */
  heroHeadline: string;
  /**
   * Optional one-liner that supports the hero headline. Sits between
   * the headline and the value-prop block. Should be specific (numbers,
   * timelines), 12-25 words.
   */
  heroSubheadline?: string;
  /** 1-3 paragraph value-prop block (P / A / S) */
  valueProp: string[];
  /** What this thing does, in detail (outcome-led bullets) */
  whatItDoes: string[];
  /** Hero stats banner — 3-4 specific metrics. Optional. */
  stats?: StatItem[];
  /**
   * Expanded explanation of each `whatItDoes` bullet. Same order
   * as `whatItDoes`. Allows the bullet list to stay scannable while
   * a longer explanation lives below.
   */
  capabilityDeepDives?: CapabilityDeepDive[];
  /**
   * Concrete artifacts the offering produces — e.g. sample emails,
   * sample call transcripts, sample newsletter issues. Builds trust.
   */
  sampleOutputs?: SampleOutput[];
  howItWorks: HowItWorksStep[];
  whatsIncluded: IncludedItem[];
  useCases: UseCase[];
  pricing: PricingTier[];
  faq: FAQ[];
  /** Service key passed to wizard for prefill */
  serviceKey: string;
  /** Short summary the AI bot uses when speaking about this offering */
  botSummary: string;
}

// ---------------------------------------------------------------------------
// Product 1: AI Lead Generation & Pipeline
// ---------------------------------------------------------------------------

const LEAD_GEN: ProductDef = {
  slug: 'lead-generation',
  category: 'product',
  icon: Bot,
  name: 'AI Lead Generation & Pipeline',
  shortName: 'AI Lead Generation',
  tagline: 'Every inbound lead. Qualified. In 30 seconds.',
  heroHeadline: 'Stop letting leads go cold.',
  heroSubheadline:
    'Average B2B response time is 42 hours. We respond in 30 seconds. The lead is yours before they finish making coffee.',
  valueProp: [
    "74% of B2B companies miss the 5-minute response window. After 5 minutes, lead quality drops 80% — not because the lead wasn't real, but because someone was on lunch, in a meeting, or asleep.",
    'Every lost lead is paid acquisition cost down the drain. The leads you spent R200 to capture are walking to whoever answered first.',
    "We capture every lead the moment it arrives, qualify it against your ICP, send a personalised follow-up in your voice, and book qualified meetings — all in under a minute, 24/7. Companies that respond in under a minute see conversion rates jump 391%.",
  ],
  whatItDoes: [
    'Catch every lead before competitors do — unified intake from website, ads, LinkedIn, Facebook forms, and inbound email.',
    'Filter the noise — every lead scored 0–100 by fit + intent before it touches a human.',
    'Reply in your voice, not a template — first message in 30 seconds, follow-ups on a cadence that converts.',
    'Book the meeting, skip the back-and-forth — qualified prospects land directly on the right team member\'s calendar.',
    'Brief your sales team for them — every handover comes with score, source, conversation history, and recommended angle.',
  ],
  stats: [
    { value: '<30s', label: 'first response' },
    { value: '48hr', label: 'setup to live' },
    { value: '3.5×', label: 'more meetings booked' },
    { value: '0', label: 'leads slipping through' },
  ],
  capabilityDeepDives: [
    {
      title: 'Catch every lead before competitors do',
      body:
        "When someone fills your form, comments on a Meta ad, opens a LinkedIn DM, or replies to your sequence, our system picks it up the same second — no polling delay, no daily exports.\n\nWe unify intake from website forms, Google Ads, Meta lead-gen forms, LinkedIn ads + DMs, inbound email, and WhatsApp Business into a single pipeline. Every touch is timestamped, source-tagged, deduplicated against your CRM, and pushed straight into qualification.\n\nThe result: while a competitor's autoresponder is still queued in Mailchimp, your AI is already 90 seconds into a real conversation with the lead.",
      highlights: ['Website forms', 'Google Ads', 'Meta Ads', 'LinkedIn', 'WhatsApp Business', 'Email'],
    },
    {
      title: 'Filter the noise — score every lead 0–100',
      body:
        "Most lead-scoring tools rely on form-fills alone. Ours combines three signal layers: firmographic fit (industry, size, geography from Clearbit + Apollo enrichment), engagement signals (pages visited, content downloaded, response patterns), and intent signals (Bombora topic surge, G2 category research, hiring patterns).\n\nBehavioural signals get 50% of weighting, fit gets 30%, intent gets 20% — calibrated to your closed-won data over the first 30 days. The score updates in real time as the lead engages.\n\nAnything below 40 goes to nurture. 40–70 gets longer qualification. 70+ goes straight to your sales team with a 'respond now' tag.",
      highlights: ['Firmographic fit', 'Behavioural signals', 'Intent data', 'Real-time recalibration'],
    },
    {
      title: 'Reply in your voice, not a template',
      body:
        "Generic outbound dies. Personalised outbound converts. The difference is two things: tone matched to your brand, and a reference to something specific about the lead's context.\n\nWe onboard with 30+ examples of your past outbound, sales replies, and landing copy. The AI extracts your tone (formal / casual / cheeky), structural patterns (question first vs context first), and signature CTAs.\n\nEvery outgoing message includes at least one piece of lead-specific context: the page they came from, what they downloaded, a comment they left, or an industry-relevant signal. Templates don't pass review — only context-aware drafts do.",
      highlights: ['Brand voice tuning', 'Lead context insertion', 'Multi-touch sequencing'],
    },
    {
      title: 'Book the meeting, skip the back-and-forth',
      body:
        "The traditional 'let's find a time that works' email exchange takes an average of 4 round-trips. We replace it with one step.\n\nWhen a qualified lead is ready to talk, the AI proposes 3 slots from the right team member's actual calendar (we read availability live from Google Calendar / Outlook), the lead clicks, the meeting is booked, both parties get a calendar invite with a Google Meet link, and the CRM is updated.\n\nThe system knows who on your team should take which conversation — based on territory, vertical, deal size, or decision-maker role — and books accordingly.",
      highlights: ['Google Calendar', 'Outlook', 'Calendar routing', 'Meet auto-link'],
    },
    {
      title: 'Brief your sales team for them',
      body:
        "When your rep walks into a discovery call, they shouldn't be reading the lead's name for the first time. Every meeting we book comes with a structured brief delivered 30 minutes before the call.\n\nThe brief contains: lead's name + role + company + size, source they came from, content they engaged with, score breakdown (fit / intent / behaviour), pain points mentioned in conversation, current tools or competitors named, and a recommended angle for the discovery call.\n\nYour reps stop spending 10 minutes pre-call digging through LinkedIn. They walk in informed.",
      highlights: ['Pre-call briefs', 'Conversation history', 'Recommended angle'],
    },
  ],
  sampleOutputs: [
    {
      label: 'Sample first-touch email',
      caption:
        "What the AI actually sends to a new lead within 30 seconds of arrival. Tuned to your brand voice and the lead's specific source.",
      format: 'prose',
      body:
        "Subject: Quick question about the cybersecurity report\n\nHey Tumi,\n\nSaw you downloaded our 2026 cybersecurity benchmark report yesterday — the section on ransomware attribution costs is the one most CFOs flag too.\n\nQuick question: was this for a specific compliance review you're running, or general planning? Either way I can point you to the parts most relevant to your industry (FinServ, I'd guess, given the company).\n\nWorth a 15-minute call this week? I have Thursday 11:00 SAST or Friday 14:00 SAST open if useful.\n\n— Sara\nOctio",
    },
    {
      label: 'Sample lead score (JSON)',
      caption: 'Exactly what gets handed to your CRM after the AI finishes qualifying a lead.',
      format: 'code',
      body:
        '{\n  "leadId": "lead_2026_05_10_8341",\n  "score": 78,\n  "band": "warm",\n  "fit": {\n    "industry": "Financial Services",\n    "size": "Mid-market (250–1000 employees)",\n    "geo": "South Africa",\n    "icpMatch": 0.82,\n    "weight": 30,\n    "subScore": 25\n  },\n  "behavioural": {\n    "pagesVisited": 7,\n    "downloadedAssets": ["cybersecurity-benchmark-2026"],\n    "emailEngagement": "opened 3, replied to 1",\n    "weight": 50,\n    "subScore": 39\n  },\n  "intent": {\n    "bomboraTopics": ["ransomware", "soc-2-compliance"],\n    "g2Activity": "researched 4 competitors in last 30 days",\n    "weight": 20,\n    "subScore": 14\n  },\n  "recommendedAction": "Book discovery call within 48 hours",\n  "assignTo": "sara@octio.co.za (mid-market FinServ team)"\n}',
    },
    {
      label: 'Sample sales handover brief',
      caption: 'Sent to the assigned rep 30 minutes before the discovery call.',
      format: 'prose',
      body:
        "Discovery call brief — Tumi Mokoena, FinTechCo\n\nScheduled: Thursday 14 May, 11:00 SAST (30 min, Google Meet)\n\nWho: Tumi Mokoena — Head of IT Ops, FinTechCo (380 staff, Johannesburg)\nScore: 78 / 100 (warm)\n\nHow they got here: Downloaded 2026 cybersecurity benchmark from a LinkedIn ad → visited pricing twice → replied to first-touch email → booked.\n\nWhat they care about (extracted from conversation):\n• Ransomware attribution + insurance premium pressure\n• SOC 2 readiness for an enterprise customer pursuing them\n• Mentioned they currently use SentinelOne, frustrated with reporting\n\nRecommended angle:\nLead with how a Custom Workflow over their SentinelOne data could give them the audit-ready reporting they're missing. Not a fit for our Lead Gen product — they're a security buyer themselves.\n\nDon't raise pricing — they didn't ask, and Tumi noted in chat they want to evaluate fit before talking budget.",
    },
  ],
  howItWorks: [
    {
      title: 'Connect your channels',
      description:
        'Link your website, ad platforms, LinkedIn, email, and CRM through our secure portal. Setup takes under 30 minutes.',
    },
    {
      title: 'Define your ideal customer',
      description:
        'Tell us who you sell to — industry, size, pain points, budget. Our AI uses this to score every lead automatically.',
    },
    {
      title: 'Customise your outreach',
      description:
        'We tune the messaging templates to your brand voice, value proposition, and the calls-to-action that work for your business.',
    },
    {
      title: 'Go live in 48 hours',
      description:
        'Your AI agent starts capturing, scoring, and engaging leads. You get a daily digest of pipeline activity.',
    },
    {
      title: 'Refine with the data',
      description:
        'Every conversation makes the system smarter. We review performance monthly and tune the qualification criteria, messaging, and routing.',
    },
  ],
  whatsIncluded: [
    {
      icon: Bot,
      title: 'Multi-channel lead capture',
      description: 'Website forms, paid ad responses, social DMs, and email — all unified.',
    },
    {
      icon: Megaphone,
      title: 'AI lead scoring',
      description: 'Each lead scored 0-100 against your ICP. Hot leads escalated immediately.',
    },
    {
      icon: Mail,
      title: 'Personalised outreach',
      description: 'Email + WhatsApp messaging in your brand voice. Follow-ups handled automatically.',
    },
    {
      icon: Workflow,
      title: 'Calendar integration',
      description: 'Direct booking into Google Calendar / Outlook — no back-and-forth.',
    },
    {
      icon: ShieldCheck,
      title: 'CRM sync',
      description: 'HubSpot, Salesforce, Pipedrive, or Zoho — every lead lands in your CRM with full context.',
    },
    {
      icon: Code2,
      title: 'Performance dashboard',
      description: 'Real-time view of pipeline velocity, score distribution, and conversion rates.',
    },
  ],
  useCases: [
    {
      industry: 'B2B Software',
      challenge: '4-hour average response time from form-fill to first contact. 70% of leads went cold.',
      outcome: 'Response time cut to 30 seconds. 3x more qualified meetings booked per week.',
    },
    {
      industry: 'Professional Services',
      challenge: 'Manual lead routing meant senior partners were buried in unqualified inbound.',
      outcome: 'AI scoring filtered 80% of inbound — partners only saw genuine prospects.',
    },
    {
      industry: 'Logistics',
      challenge: 'Inbound came from 6 different channels with no unified pipeline view.',
      outcome: 'Single dashboard, automatic routing by territory + size. Pipeline visibility went from days to real-time.',
    },
  ],
  pricing: [
    {
      name: 'Starter',
      priceFrom: 'R8 500',
      cadence: '/month',
      bestFor: 'Up to 200 leads/month. Single channel.',
      includes: [
        'Website + 1 ad platform',
        'AI scoring + qualification',
        'Email outreach (English)',
        'Calendar integration',
        'Monthly tuning review',
      ],
      cta: 'Get started',
    },
    {
      name: 'Growth',
      priceFrom: 'R18 500',
      cadence: '/month',
      bestFor: 'Up to 1 000 leads/month. Multi-channel.',
      includes: [
        'All channels (web, ads, LinkedIn, email)',
        'AI scoring + qualification',
        'Email + WhatsApp outreach',
        'CRM sync (HubSpot, Salesforce, etc.)',
        'Bi-weekly tuning review',
        'Custom branding + voice',
      ],
      cta: 'Get started',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      priceFrom: 'Custom',
      cadence: '',
      bestFor: 'Unlimited volume. Multi-team or multi-region.',
      includes: [
        'Everything in Growth',
        'Multi-team routing + territories',
        'Custom integrations (any CRM)',
        'White-glove onboarding',
        'Dedicated CSM',
        'SLA-backed uptime',
      ],
      cta: 'Talk to sales',
    },
  ],
  faq: [
    {
      q: 'How long does setup take?',
      a: "Most clients are live within 48 hours. The longest part is connecting your channels and defining your ideal customer profile — both done in a 60-minute kickoff call.",
    },
    {
      q: 'Will it sound like a robot?',
      a: "No. We tune the AI to your brand voice during onboarding using your existing copy, emails, and any sales scripts you already have. Most prospects can't tell the difference.",
    },
    {
      q: 'What channels does it work with?',
      a: 'Website forms, Google Ads, Meta (Facebook + Instagram) Ads, LinkedIn, email (Gmail + Outlook), and WhatsApp Business. Custom integrations available on Enterprise.',
    },
    {
      q: 'Do I keep my data?',
      a: "Yes. Your leads, conversations, and pipeline data live in your own database (or your CRM). We don't sell or share data, ever.",
    },
    {
      q: 'What happens if a lead asks a complex question?',
      a: 'The AI escalates to a human on your team automatically — with full conversation context. You define the escalation triggers (price, custom requirements, decision-maker mentions, etc.).',
    },
    {
      q: 'Can I see it in action before signing up?',
      a: "Yes. Book a 30-minute discovery call and we'll demo the system on a use case relevant to your business — including showing you what the AI would say to your typical prospect.",
    },
  ],
  serviceKey: 'AI Lead Generation',
  botSummary:
    'We catch every inbound lead in 30 seconds, qualify it, follow up in your voice, and book the meeting. Setup takes 48 hours, prices from R8 500/month.',
};

// ---------------------------------------------------------------------------
// Product 2: Voice & Chat Agents
// ---------------------------------------------------------------------------

const VOICE_CHAT: ProductDef = {
  slug: 'voice-chat',
  category: 'product',
  icon: Mic,
  name: 'Voice & Chat Agents',
  shortName: 'Voice & Chat Agents',
  tagline: 'Pick up every call. Book every appointment. Never miss another inbound.',
  heroHeadline: 'Answer every call. Even at 3 a.m.',
  heroSubheadline:
    'Only 37.8% of business calls actually get answered. Each missed call is a customer choosing your competitor instead. We answer all of them — in your brand voice, on your behalf.',
  valueProp: [
    "Phone calls still convert better than any other channel — and only 37.8% of business calls actually get answered, per industry data. Voicemail doesn't fix it: 85% of callers don't leave one, and of those who do, less than 20% get called back in time to convert.",
    "Every missed call is a buyer choosing someone else: 62% of callers who can't reach you contact a competitor within minutes. After-hours, lunch breaks, holidays — that's when high-intent customers call. They don't wait.",
    "Octio's voice agents answer every call instantly in a natural, brand-tuned voice. They qualify the caller, book appointments straight into your calendar, take detailed messages, and warm-transfer to a human when it matters.",
  ],
  whatItDoes: [
    'Pick up on the first ring — natural-sounding voice, indistinguishable from a real receptionist for the first minute.',
    'Same agent, same voice, on every channel — phone, web chat, WhatsApp.',
    'Filter for buyers, not browsers — captures intent, urgency, decision authority, and budget in conversation.',
    'Book straight into the right person\'s calendar — no double-handling, no email tag.',
    'Brief your team better than a human would — full transcript, sentiment, recommended next step.',
    'Hand off when it matters — defined triggers warm-transfer to your team in seconds.',
  ],
  stats: [
    { value: '100%', label: 'inbound calls answered' },
    { value: '<1s', label: 'pickup time' },
    { value: '24/7', label: 'availability' },
    { value: '4', label: 'languages on Enterprise' },
  ],
  capabilityDeepDives: [
    {
      title: 'Pick up on the first ring',
      body:
        "We provision a dedicated phone number (or port your existing one) and route inbound calls to a voice agent that picks up sub-1-second every time. The agent uses neural TTS tuned to your brand — multiple voice options, including South African English accents on the standard plan and Afrikaans, Zulu, Xhosa, and Sesotho on Enterprise.\n\nMid-call interruptions, accents, background noise, and rapid speech are handled in real time. Most callers don't notice they're talking to an AI for the first 60 seconds — and when they ask directly, the agent is upfront: 'I'm an AI assistant for [Company], here to help with bookings and quick questions.'",
      highlights: ['Sub-1s pickup', 'Neural TTS', 'Interruption handling', 'Multi-language'],
    },
    {
      title: 'Same agent on every channel',
      body:
        "Phone, your website's live chat widget, and WhatsApp Business — all answered by the same agent, with the same brand voice, the same knowledge base, and the same booking integrations.\n\nA caller who starts on WhatsApp, escalates to a phone call, then comes back the next day on chat picks up exactly where they left off. The agent remembers the conversation, the booking attempt, and what they asked for last time — context preserved across channels and sessions.",
      highlights: ['Phone', 'Web chat widget', 'WhatsApp Business', 'Cross-channel memory'],
    },
    {
      title: 'Filter for buyers, not browsers',
      body:
        "Every conversation runs through a structured qualification flow we tune to your business. The agent asks naturally — 'What are you looking for help with?' — then drills in on the right four: what specifically, how soon, who's involved in the decision, and what budget is in play.\n\nIt does this without sounding like a script. Pacing matches the caller, follow-ups branch on what they said, and the agent skips questions you already know answers to from CRM or previous calls. The result is qualified intent data on every conversation, not just the ones that convert.",
      highlights: ['BANT-style qualification', 'CRM-aware', 'Branching dialogue'],
    },
    {
      title: "Book straight into the right person's calendar",
      body:
        "When a caller wants to book, the agent reads availability live from Google Calendar or Outlook, proposes 2–3 specific slots, takes the booking, and sends a calendar invite with a Google Meet link or location details — all inside the same call.\n\nRouting logic decides who the meeting goes to: you can route by territory, language preference, expertise area, or first-available. For practices with multiple locations or service tiers, the agent confirms which clinic or which service the caller wants before booking.",
      highlights: ['Google Calendar', 'Outlook', 'Routing logic', 'Multi-location'],
    },
    {
      title: 'Brief your team better than a human would',
      body:
        "After every call your team gets a structured summary in their inbox or Slack: caller's name + number + company (looked up from CRM or enriched), the reason for the call, decisions made, what was booked, sentiment (calm / urgent / frustrated), and a recommended next step.\n\nFull verbatim transcripts are linked but not buried in the email — just the bullets your team needs. If the caller mentioned a competitor, raised a pricing concern, or pushed on a feature, those get tagged automatically and surfaced in the brief.",
      highlights: ['Auto-summarised', 'Sentiment analysis', 'Competitor tagging'],
    },
    {
      title: 'Hand off when it matters',
      body:
        "You define when a human takes over: any mention of a price above R50K, the word 'lawyer', anyone identifying as press, callers who get audibly frustrated, or any topic the AI hasn't been trained on. The agent warm-transfers — staying on the line to brief the human — rather than dropping the caller into a queue.\n\nIf no human is available, the agent takes a detailed message with priority tagging, and your defined on-call person gets a Slack ping or SMS within 30 seconds.",
      highlights: ['Warm transfer', 'Slack escalation', 'SMS escalation', 'Configurable triggers'],
    },
  ],
  sampleOutputs: [
    {
      label: 'Sample call transcript — dental practice',
      caption: 'A real-feel transcript of the agent handling an after-hours emergency call.',
      format: 'prose',
      body:
        "AI: Hi, you've reached Dr Naidoo's practice — this is Mia, the after-hours assistant. How can I help?\n\nCaller: Hi, my tooth is killing me. I think I cracked it eating dinner.\n\nAI: Oh no — that sounds painful. Quick question so I can get you the right help: is the pain sharp when you bite down, or constant?\n\nCaller: Sharp, only when I press on it. Bleeding's stopped now.\n\nAI: Okay — that sounds like a cracked tooth, urgent but not emergency-room urgent. Dr Naidoo has a 7:30am emergency slot tomorrow open. Would that work, or do you need someone tonight?\n\nCaller: Tomorrow morning is fine, ja.\n\nAI: Perfect. Can I get your name and a number to confirm on?\n\nCaller: Thabo Maseko, 082 555 0143.\n\nAI: Got it. Booking you with Dr Naidoo tomorrow Tuesday 14 May at 7:30am at the Sandton clinic. You'll get a confirmation SMS in a minute. In the meantime — over-the-counter painkillers and avoid chewing on that side. Anything else?\n\nCaller: Thanks. That's it.\n\nAI: Take care, Thabo.",
    },
    {
      label: 'Sample post-call summary delivered to the dentist',
      caption: "Lands in Dr Naidoo's inbox 30 seconds after the call ends.",
      format: 'prose',
      body:
        "AFTER-HOURS CALL — 21:14, Mon 13 May\n\nCaller: Thabo Maseko (082 555 0143)\nReason: Cracked tooth, pain on biting (4/10)\nUrgency: Emergency-adjacent (not life-threatening)\nBooked: Tomorrow Tue 14 May, 7:30am, Sandton clinic\nSentiment: Calm, in pain but composed\n\nFlagged for your attention:\n• First-time caller — no patient record found, please add at intake\n• Bleeding stopped before the call (mentioned without prompting)\n• Said 'eating dinner' — likely happened ~1.5h before the call\n\nTranscript: [link]\nReplay audio: [link]",
    },
  ],
  howItWorks: [
    {
      title: 'Provision a number',
      description:
        'We give you a dedicated phone number (local SA or international). Existing numbers can be ported.',
    },
    {
      title: 'Train the agent',
      description:
        'Upload your FAQs, common scripts, and any existing call recordings. The AI learns your business in 24 hours.',
    },
    {
      title: 'Define escalation',
      description:
        'Tell us what conversations need a human — pricing over R50K, legal questions, frustrated callers, etc.',
    },
    {
      title: 'Go live',
      description:
        'Your agent starts answering calls + chat. Every conversation is logged, transcribed, and tagged.',
    },
  ],
  whatsIncluded: [
    {
      icon: Mic,
      title: 'Natural-sounding voice',
      description: 'Multiple voice options. Tuned to your brand. Fluent in English + South African accents.',
    },
    {
      icon: Workflow,
      title: 'Calendar booking',
      description: 'Direct integration with Google Calendar, Outlook, Calendly. Books with the right person.',
    },
    {
      icon: Bot,
      title: 'Live chat widget',
      description: 'Drop-in chat widget for your website. Same agent, same voice, same brand.',
    },
    {
      icon: ShieldCheck,
      title: 'Smart escalation',
      description: 'AI knows when to call a human. Hot leads get pinged via Slack/email/SMS instantly.',
    },
    {
      icon: Mail,
      title: 'Conversation logs + analytics',
      description: 'Every call transcribed and tagged. Sentiment analysis. Top topics. Conversion tracking.',
    },
    {
      icon: Code2,
      title: 'CRM integration',
      description: 'Caller history surfaces automatically. New conversations create CRM records.',
    },
  ],
  useCases: [
    {
      industry: 'Dental & Medical',
      challenge: 'Front desk overwhelmed during peak hours. 40% of after-hours calls went to voicemail (and never returned).',
      outcome: 'Agent answers all calls instantly, books appointments after-hours, and triages emergency vs routine.',
    },
    {
      industry: 'Legal',
      challenge: 'Senior partners spent 2 hours/day on intake calls before deciding if a case was worth taking.',
      outcome: 'AI conducts the initial intake interview. Partners only handle pre-qualified cases.',
    },
    {
      industry: 'Real Estate',
      challenge: 'Agents missed calls while showing properties. Lost deals to competitors who responded first.',
      outcome: 'AI answers immediately, qualifies the buyer, and books a viewing. Agent walks into the showing prepared.',
    },
  ],
  pricing: [
    {
      name: 'Voice Starter',
      priceFrom: 'R6 500',
      cadence: '/month',
      bestFor: 'Up to 500 calls/month. Single line.',
      includes: [
        'Dedicated phone number',
        'Voice agent (English)',
        'Calendar booking',
        'Conversation logs',
        'Email escalation',
      ],
      cta: 'Get started',
    },
    {
      name: 'Voice + Chat',
      priceFrom: 'R12 500',
      cadence: '/month',
      bestFor: 'Up to 2 000 conversations/month.',
      includes: [
        'Voice agent + live chat widget',
        'Multi-channel routing',
        'CRM sync',
        'Sentiment analysis',
        'Slack + SMS escalation',
        'Custom branding + voice',
      ],
      cta: 'Get started',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      priceFrom: 'Custom',
      cadence: '',
      bestFor: 'Unlimited calls. Multi-team routing.',
      includes: [
        'Everything in Voice + Chat',
        'Multi-line / multi-team',
        'Multilingual (Afrikaans, Zulu, Xhosa)',
        'Custom integrations',
        'On-prem voice option',
        'Dedicated CSM',
      ],
      cta: 'Talk to sales',
    },
  ],
  faq: [
    {
      q: 'Will callers know they\'re talking to AI?',
      a: 'Most don\'t notice for the first 60 seconds. We\'re upfront if asked directly — the agent will say "I\'m an AI assistant for [Company]". You can also configure it to disclose by default if you prefer.',
    },
    {
      q: 'What languages does it support?',
      a: 'English (including South African accent) on all plans. Afrikaans, Zulu, Xhosa, and Sesotho available on Enterprise. Other languages on request.',
    },
    {
      q: 'Can it transfer calls to humans?',
      a: "Yes. Configure escalation triggers (specific keywords, sentiment, request type) and the AI will warm-transfer the call to a designated team member or department.",
    },
    {
      q: 'What happens if my system is down?',
      a: 'Calls fail over to a human voicemail and you\'re notified immediately. We also provide 99.9% SLA on Enterprise.',
    },
    {
      q: 'Can I review what the AI has been saying?',
      a: 'Yes. Every conversation is recorded, transcribed, and reviewable in your dashboard. You can flag any response and we\'ll retrain the agent on it.',
    },
  ],
  serviceKey: 'Voice & Chat Agents',
  botSummary:
    'We pick up every call, book the meeting, and route the urgent ones to your team. Multilingual on Enterprise. Pricing from R6 500/month.',
};

// ---------------------------------------------------------------------------
// Product 3: AI Social Media Manager
// ---------------------------------------------------------------------------

const SOCIAL_MEDIA: ProductDef = {
  slug: 'social-media',
  category: 'product',
  icon: Megaphone,
  name: 'AI Social Media Manager',
  shortName: 'AI Social Media Manager',
  tagline: 'Industry-specific content in your voice — drafted, scheduled, published, measured.',
  heroHeadline: 'Five posts a week. Zero hours from you.',
  heroSubheadline:
    "Most company channels die in month three because nobody has time to keep posting. We don't burn out. We post in your voice every week — forever.",
  valueProp: [
    "Most company social accounts post for 8 weeks then go silent. Not because content marketing doesn't work — because nobody has the bandwidth to sustain it.",
    'And silence on your channels does damage. Prospects who Googled you and saw the last post was 6 months ago quietly went elsewhere. Your competitors who keep posting earn the trust you used to have.',
    "Octio's Social Media Manager studies your industry every week, drafts content in your voice, generates supporting visuals, and ships it to LinkedIn, Instagram, TikTok, and your blog. You approve. The AI does the rest.",
  ],
  whatItDoes: [
    "Spot what's working before competitors do — weekly scan of industry news, competitor content, trending angles.",
    'Sound like you, not like ChatGPT — drafts trained on your past content + competitor examples you admire.',
    'On-brand visuals without the design queue — AI-generated images, carousels, video scripts.',
    'Post when your audience is actually awake — timing tuned to when your specific followers engage.',
    'Drop the duds, double down on winners — performance data feeds back into next week\'s drafts.',
    "You stay in control — every post hits your approval queue. Auto-publish only when you're ready.",
  ],
  stats: [
    { value: '40+', label: 'posts per month' },
    { value: '4', label: 'channels at once' },
    { value: '0', label: 'hours from your team' },
    { value: '50+', label: 'sources scanned weekly' },
  ],
  capabilityDeepDives: [
    {
      title: "Spot what's working before competitors do",
      body:
        "Every Monday morning the system scans your industry: 50–100 news sources, 5–10 competitor accounts you nominated, trending hashtags in your niche, recent earnings calls of public companies you sell to, and discussions on relevant subreddits, X communities, and LinkedIn comments.\n\nIt ranks what's surfacing by recency × relevance × novelty. The output is a weekly content brief: 8–12 angles you can post about this week, with the data point or hook each one would lead with. Your competitors are still asking 'what should we post' — you already have the list.",
      highlights: ['Industry news', 'Competitor monitoring', 'Trend detection', 'Weekly brief'],
    },
    {
      title: 'Sound like you, not like ChatGPT',
      body:
        "Generic AI content is dead — readers can spot it in two seconds. We avoid it by training the AI on your specific voice during onboarding.\n\nUpload 30–50 of your past posts (or competitor posts you admire), describe your tone in 2–3 lines (formal / cheeky / authoritative / casual), and identify your structural patterns (do you lead with a stat? a hot take? a story?). The AI extracts the patterns and uses them on every draft.\n\nFor the first 30 days you flag any post that doesn't sound like you. Each correction tunes the model further. By week 4, most clients can't tell their drafts from human-written ones.",
      highlights: ['Brand voice training', '30-day tuning loop', 'Multi-author voices'],
    },
    {
      title: 'On-brand visuals without the design queue',
      body:
        "Every post comes with the visuals it needs — generated, not stock. For LinkedIn: branded carousels with consistent typography and colour. For Instagram: lifestyle-style images and reels covers in your aesthetic. For TikTok: video scripts with on-screen text and shot lists.\n\nWe enforce a visual style guide per brand — colours, fonts, logo placement, image mood — so output stays cohesive across channels. AI image generation handles 80% of the work; for high-stakes assets a human designer at our end refines.\n\nNet result: you stop waiting two weeks for a design queue to produce a single Instagram post.",
      highlights: ['AI image generation', 'Branded carousels', 'Reels covers', 'TikTok scripts'],
    },
    {
      title: "Post when your audience is awake",
      body:
        "Generic 'best time to post' guides assume your audience looks like everyone else's. They don't. Within 4 weeks of going live the system has enough engagement data to identify the windows when your specific followers actually open the app.\n\nIt schedules each post to that audience's peak window per channel — usually different across LinkedIn, Instagram, TikTok, and X. As your audience grows or shifts, the schedule recalibrates automatically.",
      highlights: ['Per-channel optimisation', 'Audience-specific timing', 'Auto-recalibration'],
    },
    {
      title: 'Drop the duds, double down on winners',
      body:
        "Every post's performance — reach, engagement, click-throughs, replies, follows — flows back into next week's content brief. If LinkedIn carousels outperform single-image posts 4-to-1, the brief shifts toward more carousels. If a particular angle (e.g. 'how we screwed up X') gets disproportionate engagement, you'll see more of it in next week's drafts.\n\nThis is the part most agencies skip because it's tedious manual work. AI does it weekly without burning out.",
      highlights: ['Per-format ROI', 'Auto-rebalance', 'Weekly performance review'],
    },
    {
      title: 'Approval queue keeps you in control',
      body:
        "Every draft lands in a review queue — Slack, email, or our dashboard, your pick. You get one batch per week (configurable). Approve, edit, or skip in seconds.\n\nFor clients who want fully automated posting, you can set 'trusted formats' that auto-publish without review (e.g. stat-of-the-week posts that always perform), while keeping bigger announcements or opinion pieces in manual approval. Most clients move to hybrid auto-publish after 30–60 days once trust is established.",
      highlights: ['Slack review', 'Email review', 'Hybrid auto-publish', 'Edit-in-place'],
    },
  ],
  sampleOutputs: [
    {
      label: 'Sample LinkedIn post — accounting firm thought leadership',
      caption: "What the AI drafts for a mid-tier accounting firm whose voice is direct and slightly contrarian.",
      format: 'prose',
      body:
        "Most accountants will tell you to 'use AI for productivity'.\n\nWe don't think that's the actual opportunity.\n\nThe opportunity is in how AI changes the work itself:\n\n• Audit prep that used to take 40 hours now takes 6 — and the remaining 6 are the judgement calls that always mattered most.\n• Tax research that meant flipping through SARS interpretations now happens in real time inside the conversation.\n• Variance analysis that took your senior 3 days happens in 20 minutes and finds anomalies a human wouldn't.\n\nThis isn't about doing the same work faster. It's about your team doing different work — work that compounds, work that clients see value in, work juniors can't replicate.\n\nThe firms still treating AI as a productivity tool will lose the talent in two years. The ones treating it as a redefinition of what 'accounting work' means will have moats no spreadsheet can replicate.\n\n#Accounting #AI #FutureOfWork",
    },
    {
      label: 'Sample Instagram caption — boutique hotel',
      caption: 'Caption + 3 hashtag tiers for a Cape Town hotel — voice is warm, sensory, never salesy.',
      format: 'prose',
      body:
        "06:14 — that pause before the city wakes up.\n\nWe save Room 7 for guests who want exactly this. East-facing balcony, the only sound the doves on the rooftop next door, coffee on the side table because we already knew you'd be up.\n\nIt's not the biggest room. It's the quietest one. Sometimes that's the whole point.\n\n.\n.\n.\n\n#CapeTown #BoutiqueHotel #SlowTravel #MorningLight #WhereToStayCT #VisitSouthAfrica #RoomWithAView",
    },
    {
      label: 'Sample short-form video script — SaaS product launch',
      caption: 'A 30-second TikTok / Reels script with shot list and on-screen text.',
      format: 'prose',
      body:
        "Title: 'I rebuilt my CRM in 4 hours'\nDuration: 28 seconds, vertical, voiceover style\n\n[0:00–0:03] B-roll of cluttered Excel sheet on screen.\nOn-screen text: 'My CRM in 2024'\nVoiceover: 'This was my pipeline. It was killing me.'\n\n[0:03–0:08] Hard cut — zoom on chaotic Excel formulas.\nVoiceover: 'Six tabs. Three colour-coding systems. None of them updated.'\n\n[0:08–0:14] Switch to clean dashboard view (your product).\nOn-screen text: 'Same data. Sunday afternoon.'\nVoiceover: 'I rebuilt the whole thing in four hours with [Product]. No coding, no consultants, no BS.'\n\n[0:14–0:22] Quick cuts: deal stages auto-updating, Slack notification firing, mobile view.\nVoiceover: 'It updates itself now. Talks to my email. Pings me when something stalls.'\n\n[0:22–0:28] Close on hero shot of you on a beach with phone.\nOn-screen text: 'Try it free → link in bio'\nVoiceover: 'And I'm at the beach. Take that, Excel.'",
    },
  ],
  howItWorks: [
    {
      title: 'Pick your platforms',
      description:
        'Choose which channels matter — LinkedIn for B2B, Instagram + TikTok for B2C, blog for SEO. Three is plenty to start.',
    },
    {
      title: 'Define your voice',
      description:
        'Upload past posts, competitor examples, or just describe your tone (professional / casual / cheeky / authoritative).',
    },
    {
      title: 'Pick your themes',
      description:
        'What does your audience care about? We turn that into a 30-day content calendar with a healthy mix of formats.',
    },
    {
      title: 'Review + approve',
      description:
        'Drafts arrive in your dashboard daily or weekly. You approve, edit, or skip — anything you approve goes live automatically.',
    },
  ],
  whatsIncluded: [
    {
      icon: Megaphone,
      title: 'Multi-platform posting',
      description: 'LinkedIn, Instagram, TikTok, X, and your blog. All from one calendar.',
    },
    {
      icon: Bot,
      title: 'AI-drafted content',
      description: 'Posts in your brand voice. Carousel slides, video scripts, blog drafts.',
    },
    {
      icon: Code2,
      title: 'AI-generated visuals',
      description: 'Images, carousels, video scripts. On-brand, consistent style.',
    },
    {
      icon: Workflow,
      title: 'Smart scheduling',
      description: 'Posts at peak engagement times for your specific audience.',
    },
    {
      icon: Mail,
      title: 'Approval workflow',
      description: 'Review queue. Approve, edit, or skip — full control over what goes live.',
    },
    {
      icon: ShieldCheck,
      title: 'Performance analytics',
      description: 'Reach, engagement, conversions per post. Auto-iterates on winners.',
    },
  ],
  useCases: [
    {
      industry: 'Dentistry',
      challenge: 'Dentist wanted to post weekly oral-health tips but never had time.',
      outcome: '4 LinkedIn + 3 Instagram posts per week, all on-brand. Engagement up 8x in 90 days.',
    },
    {
      industry: 'Accounting',
      challenge: 'Firm needed thought leadership content for LinkedIn but partners hated writing.',
      outcome: 'Daily LinkedIn posts in each partner\'s voice. Two enterprise leads attributed directly to LinkedIn content.',
    },
    {
      industry: 'B2B SaaS',
      challenge: 'Marketing team of 1 couldn\'t keep up with content + ads + email.',
      outcome: 'AI handled blog + social. Marketer freed up for higher-value work (campaigns, partnerships).',
    },
  ],
  pricing: [
    {
      name: 'Single Channel',
      priceFrom: 'R4 500',
      cadence: '/month',
      bestFor: 'One platform (LinkedIn, Instagram, or blog).',
      includes: [
        '12 posts/month',
        'AI-drafted content',
        'Brand voice tuning',
        'Approval workflow',
        'Monthly analytics',
      ],
      cta: 'Get started',
    },
    {
      name: 'Multi-Channel',
      priceFrom: 'R9 500',
      cadence: '/month',
      bestFor: 'Three platforms. Full content engine.',
      includes: [
        '40+ posts/month across 3 channels',
        'AI-generated visuals',
        'Smart scheduling',
        'Bi-weekly analytics review',
        'Custom voice + style',
      ],
      cta: 'Get started',
      highlighted: true,
    },
    {
      name: 'Agency',
      priceFrom: 'Custom',
      cadence: '',
      bestFor: 'Multiple brands or unlimited platforms.',
      includes: [
        'Everything in Multi-Channel',
        'Unlimited platforms',
        'Multiple brand voices',
        'White-label option',
        'Dedicated content strategist',
      ],
      cta: 'Talk to sales',
    },
  ],
  faq: [
    {
      q: 'Do I have to approve every post?',
      a: 'No. You set the rules — approve every post, only specific topics, or full auto-publish. Most clients start with full review and move to auto-publish for trusted formats after a month.',
    },
    {
      q: 'How do you keep posts on-brand?',
      a: "We onboard with 20-30 of your past posts (or competitor examples you like). The AI learns your voice from those. We then run sample content past you for tuning before going live.",
    },
    {
      q: 'Can it write industry-specific content?',
      a: "Yes — that's the point. The AI studies your industry's terminology, common topics, and what's currently being discussed. Output is far more specific than generic AI tools.",
    },
    {
      q: 'What about images / video?',
      a: 'Multi-Channel and Agency include AI-generated visuals (DALL-E/Midjourney quality) plus short-form video scripts. We can also use your existing brand assets.',
    },
    {
      q: 'Will it sound like AI?',
      a: 'Not if we tune it properly. The first month is a feedback loop where you flag any post that doesn\'t feel right — the AI gets better fast. After 30 days most clients can\'t pick the AI posts from human-written ones.',
    },
  ],
  serviceKey: 'AI Social Media Manager',
  botSummary:
    'We draft and post 4–6 pieces of content a week in your voice, on the channels that matter for your business. AI-generated visuals included. From R4 500/month.',
};

// ---------------------------------------------------------------------------
// Product 4: Newsletter Engine
// ---------------------------------------------------------------------------

const NEWSLETTER: ProductDef = {
  slug: 'newsletter',
  category: 'product',
  icon: Mail,
  name: 'The Newsletter Engine',
  shortName: 'Newsletter Engine',
  tagline: 'Weekly newsletter. In your voice. On autopilot.',
  heroHeadline: 'The newsletter that writes itself.',
  heroSubheadline:
    'Newsletter is the highest-ROI marketing channel in 2026 — but only if it actually goes out. We make sure it does, every week, forever.',
  valueProp: [
    "Most newsletters started this year will stop publishing within 6 months. Not because the format doesn't work — average open rates are still 41% across the industry — because curating + writing + designing + shipping every week is a real job nobody actually has time for.",
    "When your newsletter dies, so does the highest-leverage channel you have. The list you spent months building goes cold. The thought leadership you were building? Gone the moment you stop showing up.",
    "Octio's Newsletter Engine scans industry sources every week, ranks what your audience cares about, drafts the issue in your voice with your perspective, designs the artwork, and ships it to your list. You approve. It runs forever.",
  ],
  whatItDoes: [
    'Always have something worth saying — weekly scan of 50–100 industry sources curated by relevance and recency.',
    "Skip the noise — AI ranks each story by what your specific audience engages with.",
    'Your perspective, not a press release — drafts include your take and angle, not just summaries.',
    'Branded design every issue — header art, layout, and CTAs that match your identity.',
    'Connects to whatever you already use — Mailchimp, ConvertKit, Beehiiv, Substack, MailerLite.',
    "Get sharper every issue — engagement data feeds back into next week's content selection.",
  ],
  stats: [
    { value: '50–100', label: 'sources scanned weekly' },
    { value: '35%', label: 'avg open rate' },
    { value: '0', label: 'weeks skipped' },
    { value: '5', label: 'email tools supported' },
  ],
  capabilityDeepDives: [
    {
      title: 'Always have something worth saying',
      body:
        "Every week the system scans 50–100 sources you nominated: news sites, blog feeds, podcast transcripts (yes, we transcribe podcasts), YouTube channel uploads, Twitter / LinkedIn discussions, and any custom sources you give us (e.g. SEC filings, regulatory updates, internal company blogs).\n\nIt deduplicates similar stories, filters out PR fluff, and ranks what's left by recency × source quality × relevance to your audience. The output is a weekly content brief: 10–15 stories worth covering, ranked, with the headline and core insight extracted from each.\n\nYou're never staring at a blank page on Monday morning.",
      highlights: ['News sites', 'Podcast transcripts', 'YouTube', 'Custom sources'],
    },
    {
      title: 'Skip the noise — AI ranks by audience fit',
      body:
        "Different audiences care about different things. A newsletter for fintech founders shouldn't lead with the same story as one for retail investors, even if both are about 'AI in finance'.\n\nThe AI learns from your past issue performance — which stories drove opens, which drove click-throughs, which drove replies — and recalibrates ranking weekly. Stories your audience consistently ignores drop. Stories they engage with rise. Topics that performed well in past issues get more weight than topics that flopped.\n\nWithin 6–8 issues, the brief looks like an editor who's been with you for years.",
      highlights: ['Engagement-weighted ranking', 'Topic memory', 'Audience-specific'],
    },
    {
      title: 'Your perspective, not a press release',
      body:
        "Most newsletter automation produces what readers immediately recognise as 'AI summaries' — a flat retelling of what someone else wrote. Ours doesn't.\n\nWe extract your perspective from your past writing during onboarding (your hot takes, recurring themes, the angles you reach for). Every story in every issue gets framed through that lens — not just 'here's what happened' but 'here's what happened, here's what most people will miss, here's what it means for [your audience]'.\n\nReaders feel like they're hearing from you, not from a content mill.",
      highlights: ['Voice-tuned drafts', 'Perspective insertion', 'Anti-summary framing'],
    },
    {
      title: 'Branded design every issue',
      body:
        "Each issue ships with a custom header image (AI-generated, in your visual style), consistent typography, your colour palette, your logo, and clean inbox-friendly formatting that renders well in Gmail, Outlook, Apple Mail, and Spark.\n\nFor higher tiers we generate per-section illustrations or photo treatments — so the issue feels editorial, not transactional. CTAs are subtle but clickable: book a call, reply with a question, share with a friend.",
      highlights: ['Custom header art', 'Inbox-safe HTML', 'Brand consistency'],
    },
    {
      title: 'Connects to whatever you already use',
      body:
        "We integrate with the tools you have rather than forcing a switch: Mailchimp, ConvertKit, Beehiiv, Substack, MailerLite, Klaviyo, and direct SMTP if you're rolling your own.\n\nOnboarding takes about 20 minutes — connect the API, confirm sender domains pass DKIM / SPF, send a test issue, you're live. We never ask you to re-import your subscriber list, never lock you to our infrastructure, and you keep ownership of your audience throughout.",
      highlights: ['Mailchimp', 'Beehiiv', 'Substack', 'ConvertKit', 'Custom SMTP'],
    },
    {
      title: 'Get sharper every issue',
      body:
        "After every issue we pull engagement data — open rate, click-through by section, reply rate, unsubscribes, forward rate — and feed it back into the system.\n\nSubject-line patterns that consistently underperform get dropped. Sections that get clicked the most rise to the top of the layout. Topics that drove unsubscribes get flagged for review. The AI doesn't just publish — it learns.",
      highlights: ['Per-section CTR', 'Subject-line A/B', 'Auto-iteration'],
    },
  ],
  sampleOutputs: [
    {
      label: 'Sample newsletter intro — fintech audience',
      caption: 'Opening section of an issue for a newsletter aimed at South African fintech founders.',
      format: 'prose',
      body:
        "Hey,\n\nFour things this week. Two of them you'll already know about, two of them you probably won't, and one of them is going to matter to about three of you in particular — Capitec, you know who you are.\n\n→ The Reserve Bank quietly published its updated open finance principles on Tuesday. Most of the coverage focused on consent management. The interesting part is buried on page 17 — there's now a regulatory carve-out for AI-driven lending decisions that I haven't seen anywhere else. It's narrow but it changes the calculus for anyone building credit scoring.\n\n→ Stitch announced a $12M extension. Not because the round size is interesting (it's not), but because the term sheet is — the lead investor required them to publish their compliance audit results. That's a new pattern for SA fintech, and worth watching.\n\nMore below.",
    },
    {
      label: 'Sample story summary with perspective',
      caption: "A single story rendered with the AI's voice + perspective, not a flat summary.",
      format: 'prose',
      body:
        "OPENAI'S NEW BANKING RAILS — what it actually means for SA\n\nOpenAI announced direct ACH integration for ChatGPT business plans on Monday. The tech press covered it as a productivity upgrade. They missed the bigger story.\n\nWhat this actually does: it lets any business with a US bank route money based on a natural-language instruction inside ChatGPT. 'Pay invoice from supplier X' becomes a real, executed transaction.\n\nWhy it matters here: Stripe and PayShap have been racing to be the API layer for AI-driven payments in SA. OpenAI just told them they don't need an API layer at all — the LLM is the API. Whoever's building 'agentic banking' for the SA market needs to decide whether they're competing with this or routing through it.\n\nMy take: the smart move is the latter. Build for the LLM as the buyer, not the customer.",
    },
    {
      label: 'Sample weekly subject-line variants',
      caption: 'The system generates 4–6 subject-line options per issue and picks the highest-CTR pattern from your history.',
      format: 'prose',
      body:
        "Issue topic: SARB open finance update + Stitch's audit-publish term sheet\n\nVariant A (curiosity-led): 'Capitec, you specifically need to read this'\nVariant B (data-led): '4 fintech things, 1 of them buried on page 17'\nVariant C (contrarian): 'The Reserve Bank quietly changed the rules. Nobody noticed.'\nVariant D (direct): 'This week in SA fintech: open finance + a new term sheet pattern'\n\nWinner (based on this audience's CTR history): Variant A — curiosity + specificity outperforms data-led 1.6× in this list.",
    },
  ],
  howItWorks: [
    {
      title: 'Define your niche + audience',
      description:
        'What\'s the topic? Who reads it? What\'s your unique angle? 30-minute kickoff call to nail this.',
    },
    {
      title: 'Train your voice',
      description:
        'Share 2-3 newsletters you admire and a few past pieces of yours. The AI learns the tone and structure.',
    },
    {
      title: 'Connect your sender',
      description:
        'We integrate with your existing email tool (Mailchimp, ConvertKit, Beehiiv, Substack) or set up a new sender.',
    },
    {
      title: 'Review the first issue',
      description:
        'You see issue #1 before it goes out. Tweak anything that doesn\'t feel right — the AI learns from edits.',
    },
    {
      title: 'Goes auto',
      description:
        'After 2-3 issues of tuning, the engine runs on its own. You only intervene when you want to.',
    },
  ],
  whatsIncluded: [
    {
      icon: Mail,
      title: 'AI content curation',
      description: 'Web scraping, ranking, and selection of best-fit content for your audience.',
    },
    {
      icon: Bot,
      title: 'Voice-tuned drafting',
      description: 'Newsletters written in your voice with your perspective — not generic summaries.',
    },
    {
      icon: Megaphone,
      title: 'Branded design',
      description: 'Custom header, color palette, and inbox-friendly formatting.',
    },
    {
      icon: Workflow,
      title: 'Email tool integration',
      description: 'Mailchimp, ConvertKit, Beehiiv, Substack, MailerLite — or your own SMTP.',
    },
    {
      icon: ShieldCheck,
      title: 'Approval workflow',
      description: 'Review every issue or auto-publish — your call.',
    },
    {
      icon: Code2,
      title: 'Performance reports',
      description: 'Open rates, click-throughs, reply patterns — used to tune content automatically.',
    },
  ],
  useCases: [
    {
      industry: 'Independent Consulting',
      challenge: 'Consultant wanted a newsletter to stay top-of-mind with past clients but never had time.',
      outcome: 'Bi-weekly newsletter on industry trends. 35% open rate. 2 reactivated clients within 90 days.',
    },
    {
      industry: 'Niche SaaS',
      challenge: 'Founder needed thought-leadership content to position the company as the expert.',
      outcome: 'Weekly newsletter ranking #1 in its niche. 5x newsletter-driven sign-ups in 6 months.',
    },
    {
      industry: 'Personal Brand',
      challenge: 'Creator wanted to build an audience but hated writing long-form.',
      outcome: 'Weekly "best of" newsletter that summarised their YouTube + LinkedIn output. Audience grew 4x.',
    },
  ],
  pricing: [
    {
      name: 'Solo',
      priceFrom: 'R3 500',
      cadence: '/month',
      bestFor: 'Personal brand or solo consultant.',
      includes: [
        'Bi-weekly issues',
        'AI content curation',
        'Voice-tuned drafting',
        'Standard email integration',
        'Monthly analytics',
      ],
      cta: 'Get started',
    },
    {
      name: 'Business',
      priceFrom: 'R6 500',
      cadence: '/month',
      bestFor: 'Companies building thought leadership.',
      includes: [
        'Weekly issues',
        'Custom branded design',
        'Multi-author voices',
        'Premium email tools',
        'Bi-weekly analytics',
        'Performance tuning',
      ],
      cta: 'Get started',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      priceFrom: 'Custom',
      cadence: '',
      bestFor: 'Multiple newsletters or custom needs.',
      includes: [
        'Unlimited issues + lists',
        'Multi-newsletter management',
        'Custom integrations',
        'Dedicated content lead',
        'White-label option',
      ],
      cta: 'Talk to sales',
    },
  ],
  faq: [
    {
      q: 'Where does the content come from?',
      a: 'The AI scrapes ~50-100 industry sources per week — news sites, blogs, podcasts (transcripts), YouTube, Twitter/LinkedIn discussions. We weight by recency, source quality, and relevance to your audience.',
    },
    {
      q: 'Will it copy other people\'s articles?',
      a: 'No. Every issue cites sources but the writing is original. The AI takes your perspective and angle on the news — not a copy-paste.',
    },
    {
      q: 'Can I add my own content?',
      a: 'Absolutely. You can drop in custom sections — case studies, announcements, your own articles — and the AI builds the issue around them.',
    },
    {
      q: 'What if I want to skip a week?',
      a: 'Just toggle off in the dashboard. The AI will skip and resume the next cycle.',
    },
    {
      q: 'How long until I see results?',
      a: 'Newsletters compound. Most clients see meaningful growth (subscribers + engagement) by month 3. Top-performing newsletters take 6-12 months to find their voice and audience fit.',
    },
  ],
  serviceKey: 'Newsletter Engine',
  botSummary:
    'We curate, draft, design, and ship a newsletter in your voice every week. Plugs into Mailchimp, Beehiiv, Substack — whatever you already use. From R3 500/month.',
};

// ---------------------------------------------------------------------------
// Service 1: Agentic Web & App Development
// ---------------------------------------------------------------------------

const APP_DEV: ProductDef = {
  slug: 'agentic-app-dev',
  category: 'service',
  icon: Code2,
  name: 'Agentic Web & App Development',
  shortName: 'Agentic App Dev',
  tagline: 'Production apps in weeks, not quarters. At a quarter of the cost.',
  heroHeadline: 'Software, at AI speed.',
  heroSubheadline:
    'Most agencies bill you to write code AI can write in seconds. We use AI to do the boilerplate and senior humans to do the judgement — agency quality, fraction of the time.',
  valueProp: [
    "A typical agency quote for a custom web app: R600K–R1.5M, 4–9 months. The reason isn't complexity — it's that 70% of any build is boilerplate code that hasn't changed in a decade.",
    "You're paying senior developers to copy-paste login flows, scaffold CRUD endpoints, and write basic UI. Meanwhile your competitor who shipped six months ago has a real product in market — and you're still in scoping calls.",
    "Octio's senior developers don't write boilerplate — they review and polish what AI agents have already built. The result: production-grade apps in 2–10 weeks, at a quarter of agency cost. You own the code, end-to-end.",
  ],
  whatItDoes: [
    'Ship in weeks, not quarters — AI scaffolds the bulk; senior humans polish the 30% that matters.',
    'Web and mobile from one team — React, Next.js, React Native — proven stacks that other developers can maintain.',
    'No junior hand-offs — every line reviewed, refined, or rewritten by a senior developer before you see it.',
    'Validate fast, build right — testable MVP in days, production-ready build in weeks.',
    'You own everything — full source, deployment access, documentation. Any developer can take over from us.',
  ],
  stats: [
    { value: '3 wks', label: 'MVP shipped' },
    { value: '4×', label: 'faster than typical agency timelines' },
    { value: '100%', label: 'code ownership' },
    { value: '30 days', label: 'post-launch support' },
  ],
  capabilityDeepDives: [
    {
      title: 'Ship in weeks, not quarters',
      body:
        "Agency timelines are dominated by repetitive work — auth flows, CRUD endpoints, form validation, basic UI components, deployment plumbing. None of it is intellectually challenging; all of it costs time.\n\nWe use AI agents to produce these layers in parallel from the architecture spec we agree at kickoff. A typical web app that an agency would scope at 12–16 weeks ships from us in 3–6 weeks. The senior developer's time is reserved for the parts AI can't be trusted with: data model decisions, edge-case logic, security review, and product judgement.\n\nYou see a working version every week. Feedback loops are 24-hour, not 2-week.",
      highlights: ['AI-generated scaffolding', 'Weekly demos', '24h feedback loops'],
    },
    {
      title: 'Web and mobile from one team',
      body:
        "We default to proven stacks unless your situation specifically requires otherwise: Next.js + Postgres + Vercel for web, React Native + Expo for mobile, with shared TypeScript types between the two so the same lead engineer can work across.\n\nWhere a project genuinely needs native (iOS-only / Android-only or heavy device integration), we go native — Swift and Kotlin. We don't pick stacks based on what's exciting to build with; we pick based on what's easiest for any developer to maintain after we hand it over.",
      highlights: ['Next.js', 'React Native', 'Postgres', 'Swift / Kotlin when required'],
    },
    {
      title: 'No junior hand-offs',
      body:
        "Most agencies sell you on senior names then staff your project with juniors managed by a project manager. We don't. Every line of code that ships in your repo is reviewed (or rewritten) by a senior developer with 8+ years of production experience, before you see it.\n\nThe AI does the volume. The senior does the judgement. The junior layer that creates 60% of agency rework simply doesn't exist in our process.\n\nThis is also why our timelines compress: we skip the round-trips between juniors and seniors that consume agency hours.",
      highlights: ['Senior-led', '8+ years experience', 'No junior layer'],
    },
    {
      title: 'Validate fast, build right',
      body:
        "Most product ideas die on contact with reality. The fastest way to find out if yours will is to ship a real working version to real users in days — before you've burnt 3 months of runway.\n\nOur MVP Sprint produces a production-deployed application in 2–3 weeks, scoped tight enough to validate the riskiest assumption. If validation fails, you've spent R85K instead of R600K to learn it. If it succeeds, the same codebase is the foundation for the production build — no rewrite, no throwaway code.",
      highlights: ['MVP Sprint (2–3 weeks)', 'Production-deployed', 'Continuous codebase'],
    },
    {
      title: 'You own everything',
      body:
        "When we hand over, you get the GitHub repo (or your VCS of choice), the deployment infrastructure, the database, the credentials, all third-party API keys, and the architecture documentation.\n\nYou don't owe us a license fee. You don't pay us to keep the lights on. You can hire any developer in the world to take over from us — and they will be able to, because the code is documented and uses the kinds of stacks they already know.\n\nWe take a 30-day post-launch support window so transitions are clean, then we step out unless you want us on retainer.",
      highlights: ['Full source ownership', 'Standard stacks', 'Documented handover'],
    },
  ],
  sampleOutputs: [
    {
      label: 'Sample architecture document — week 1 deliverable',
      caption:
        "What you receive at the end of week 1 of an MVP Sprint. Approve before any production code is written.",
      format: 'prose',
      body:
        "ARCHITECTURE — InvoiceFlow MVP\n\nProblem we're solving: SA accountants need to chase 60–90 day invoice payments without spending 4 hours/day on reminders. MVP scope: ingest invoices from Xero, send AI-drafted reminders on a tunable cadence, log responses, surface stuck invoices to the firm.\n\nStack:\n• Frontend: Next.js 15 (App Router) + Tailwind. Hosted on Vercel.\n• Backend: Hono on Bun, Postgres via Supabase. Background jobs in Inngest.\n• AI: Claude Sonnet 4.6 for reminder drafting via the Anthropic Messages API. Caching on the prompt template (saves ~80% on token cost).\n• Auth: Clerk (organisation-scoped — accounting firms are multi-user).\n• Integrations: Xero OAuth + invoices.read, Postmark for outbound email.\n\nData model (simplified):\n• organisations → users (Clerk)\n• organisations → xero_connections (oauth tokens, encrypted)\n• organisations → invoices (mirror of Xero, refreshed every 4h)\n• invoices → reminder_schedule + reminder_log\n\nWhat's NOT in MVP:\n• Multiple invoicing tools (Xero only for now — QuickBooks in v2)\n• Voice / SMS reminders (email only)\n• Predictive collection probability (manual pipeline view in MVP)\n\nRisks we're flagging:\n• Xero rate limits at 60 calls/min/connection — we batch and cache.\n• Reminder tone is the make/break — needs your firm's voice tuned in week 2.\n\nNext step: kickoff this Tuesday, demo end of next Friday.",
    },
    {
      label: 'Sample weekly demo email',
      caption: "What lands in your inbox every Friday during the build.",
      format: 'prose',
      body:
        "Hey James,\n\nWeek 2 build update. 12-min demo video: [link]\n\nShipped this week:\n✓ Xero OAuth + first invoice sync (works on the test account, ready for your prod connection on Monday)\n✓ Reminder template editor — you can tune voice in the UI now, we don't need a code change every time\n✓ Three-tier escalation (gentle → firm → handover-to-partner) wired into the cadence\n\nNot shipped (and why):\n✗ Predictive 'will this invoice be paid?' score — moved to v2. Talked through this Tuesday — not enough signal in 14 days of data to train it usefully. We'll revisit at month 3.\n\nDecisions I need from you by Tuesday:\n→ Should the 'firm' reminder tone CC the partner? Some firms do, some don't.\n→ For invoices over R500K, do you want auto-escalation to the partner skipping the gentle tier?\n\nAccess for next week:\nProd Xero connection (you mentioned doing this Monday)\n2 sample firm voices (yours + Edge & Co — you said they have great template language)\n\nDemo: Friday 11am as usual, calendar invite already sent.\n\n— Mahlatse",
    },
  ],
  howItWorks: [
    {
      title: 'Scoping call',
      description:
        '60-minute conversation. What are you building? Who\'s it for? What does success look like? We leave with a tight scope.',
    },
    {
      title: 'Wireframes + architecture (24-48 hours)',
      description:
        'You see a clickable wireframe and a technical architecture doc within two days. We agree the shape before any real code.',
    },
    {
      title: 'AI scaffolds + human polish',
      description:
        'AI generates the bulk of the code. Our senior devs refine, polish UI, write the tricky bits, and review every line.',
    },
    {
      title: 'Iterate weekly',
      description:
        'You see a working version every week. Feedback loops are fast — most decisions made and acted on within 24 hours.',
    },
    {
      title: 'Ship + handover',
      description:
        'We ship to production, hand over clean code + documentation, and stay on for 30 days of support.',
    },
  ],
  whatsIncluded: [
    {
      icon: Code2,
      title: 'AI-accelerated builds',
      description: 'Use proven AI scaffolding to ship 3-5x faster than traditional dev.',
    },
    {
      icon: ShieldCheck,
      title: 'Senior human polish',
      description: 'Every build reviewed and refined by a senior developer. No junior hand-offs.',
    },
    {
      icon: Workflow,
      title: 'Clean, maintainable code',
      description: 'You get the source. Documented, tested, ready for any developer to continue.',
    },
    {
      icon: Bot,
      title: 'AI-ready architecture',
      description: 'Built to plug AI agents in from day one — vector DBs, embeddings, agent frameworks.',
    },
    {
      icon: Megaphone,
      title: 'Weekly demos',
      description: 'See progress every week. Tight feedback loop. No "big reveal" surprises.',
    },
    {
      icon: Mail,
      title: '30-day post-launch support',
      description: 'Bugs fixed, small tweaks, deployment guidance — all covered for the first month.',
    },
  ],
  useCases: [
    {
      industry: 'B2B SaaS',
      challenge: 'Founder needed an MVP fast to validate with early customers, on a tight budget.',
      outcome: 'Production MVP shipped in 3 weeks. Validated, raised seed in month 2.',
    },
    {
      industry: 'Internal Tools',
      challenge: 'Operations team wasted 20 hours/week on manual spreadsheet work.',
      outcome: 'Custom internal tool replaced 4 spreadsheets. Reclaimed ~80 hours/month.',
    },
    {
      industry: 'Mobile App',
      challenge: 'Existing app was buggy + slow. Native rewrite quotes were R1.5M+ and 6 months.',
      outcome: 'Rewrote in React Native + AI scaffolding. Done in 7 weeks. R280K total.',
    },
  ],
  pricing: [
    {
      name: 'MVP Sprint',
      priceFrom: 'R85 000',
      cadence: 'project',
      bestFor: '2-3 week build. Validating an idea or shipping a v1.',
      includes: [
        'Scoping + architecture',
        'Production-ready MVP',
        'Source code handover',
        'Deployment',
        '14-day post-launch support',
      ],
      cta: 'Get a quote',
    },
    {
      name: 'Production Build',
      priceFrom: 'R220 000',
      cadence: 'project',
      bestFor: '6-10 week build. Real product going to real customers.',
      includes: [
        'Full discovery + design',
        'Production application',
        'Tests + CI/CD',
        'Documentation',
        '30-day post-launch support',
      ],
      cta: 'Get a quote',
      highlighted: true,
    },
    {
      name: 'Long-term Partner',
      priceFrom: 'Custom',
      cadence: 'retainer',
      bestFor: 'Ongoing product team for hire.',
      includes: [
        'Dedicated senior devs',
        'Continuous delivery',
        'Roadmap + product input',
        'AI agent integration',
        'SLA + on-call',
      ],
      cta: 'Talk to sales',
    },
  ],
  faq: [
    {
      q: 'How is this different from a normal agency?',
      a: 'We use AI agents to do the repetitive 70% — scaffolding, boilerplate, basic UI. Our humans focus on the 30% that actually requires judgement. Same output quality, fraction of the time and cost.',
    },
    {
      q: 'Will the code be maintainable?',
      a: 'Yes. We don\'t ship AI slop. Every line is reviewed by a senior developer, follows standard patterns, has tests, and is documented. Any developer can pick it up.',
    },
    {
      q: 'What stack do you use?',
      a: 'For web: React + Node.js (or Next.js + Postgres + Vercel) by default. For mobile: React Native unless native is essential. We pick boring, proven stacks unless there\'s a specific reason not to.',
    },
    {
      q: 'Do I own the code?',
      a: '100%. You get the full source, the deployment, the credentials, everything. No lock-in.',
    },
    {
      q: 'Can you take over an existing codebase?',
      a: 'Yes — that\'s actually one of our strengths. Modernising legacy code is exactly the work AI accelerates the most.',
    },
  ],
  serviceKey: 'Agentic App Development',
  botSummary:
    'We build custom web and mobile apps — AI does the boilerplate, senior devs do the polish. MVPs from R85K (3 weeks). Production builds from R220K (6–10 weeks). You own the code.',
};

// ---------------------------------------------------------------------------
// Service 2: Custom Agentic Workflows
// ---------------------------------------------------------------------------

const WORKFLOWS: ProductDef = {
  slug: 'custom-workflows',
  category: 'service',
  icon: Workflow,
  name: 'Custom Agentic Workflows',
  shortName: 'Custom Workflows',
  tagline: "Replace your team's busywork with workflows that think.",
  heroHeadline: 'Your software. Talking. Thinking. Acting.',
  heroSubheadline:
    "Most businesses run on 15–20 tools that don't talk to each other. The hours your team spends moving information between them? We replace those with workflows that route, decide, and act on their own.",
  valueProp: [
    "Your CRM, calendar, support tool, project tracker, and finance system all do their jobs. They just don't talk to each other. So your team plays human glue — copy-pasting, status-updating, reminding, escalating.",
    "We've seen ops teams spend 4 hours a day on coordination work. That's 25% of payroll going to something AI does in seconds — and gets right more often than humans do, because it never forgets, never loses focus, never gets tired.",
    'Octio designs and builds custom workflows that connect your tools into one cohesive AI brain. Routing, decisions, follow-ups, escalations — all automated, all auditable. Your team gets their hours back.',
  ],
  whatItDoes: [
    'Built around how you actually work — no template-driven automation. We map your real process first.',
    'Use the tools you have — 100+ integrations out of the box, custom for anything else.',
    'Decisions, not just data movement — AI agents read context and route, summarise, escalate, or act.',
    'Reclaim 4+ hours/day per ops person — handoffs, reminders, status updates, escalations all happen automatically.',
    'See what to optimise next — real-time view of where time is being lost and where the workflow breaks.',
  ],
  stats: [
    { value: '4+ hrs/day', label: 'reclaimed per ops person' },
    { value: '100+', label: 'pre-built integrations' },
    { value: '30 days', label: 'pilot before cutover' },
    { value: 'R35K', label: 'audit, credited toward build' },
  ],
  capabilityDeepDives: [
    {
      title: 'Built around how you actually work',
      body:
        "Most workflow tools sell you a template. The template assumes your business looks like everyone else's. It doesn't.\n\nWe start with a 1-week audit: we sit with your ops, sales, and support teams and map the real flow — where work originates, where it stalls, who picks it up, what they do, where they hand it off, what gets dropped. The output is a current-state diagram and a target-state diagram side by side.\n\nThe target-state diagram is what we build. Every node is justified by something we observed in your audit. Nothing is generic.",
      highlights: ['1-week audit', 'Current vs target diagrams', 'Real process mapping'],
    },
    {
      title: 'Use the tools you already have',
      body:
        "We don't push a tooling change if it isn't needed. If you're on HubSpot, Slack, Asana, and Xero — we connect those, with the data already in them, untouched.\n\n100+ pre-built integrations cover the standard SaaS stack: Salesforce, HubSpot, Pipedrive, Zoho, Slack, Microsoft Teams, Notion, Asana, ClickUp, Monday, Trello, Google Workspace, Microsoft 365, Stripe, Paystack, Xero, Sage, QuickBooks, Zendesk, Freshdesk, Intercom, Calendly, and many more.\n\nWhere a tool isn't pre-built, we add a custom integration as part of the project — bespoke ERPs, legacy databases, even SOAP APIs.",
      highlights: ['HubSpot', 'Salesforce', 'Slack', 'Xero', 'Sage', 'Custom APIs'],
    },
    {
      title: 'Decisions, not just data movement',
      body:
        "Most automation tools (Zapier, Make) move data between systems but can't make decisions. That's where workflows fall apart — every interesting decision still needs a human.\n\nWe insert AI agents at exactly the points that need judgement: 'is this support ticket urgent?' (reads context, classifies), 'which sales rep should this lead go to?' (territory + capacity + expertise), 'should we escalate this invoice?' (history + value + customer health), 'is this email a complaint or a sales enquiry?' (tone + content).\n\nThe agents are auditable — every decision logs the reasoning, so you can review and tune the rules over time.",
      highlights: ['Agent-based decisions', 'Auditable reasoning', 'Tune-able rules'],
    },
    {
      title: 'Reclaim hours every day',
      body:
        "In our audit work, ops teams typically spend 4–6 hours a day on coordination work — Slack updates, CRM data entry, status reminders, scheduling, escalations, copy-pasting between tools. None of it is high-leverage. All of it is necessary if it isn't automated.\n\nA workflow that captures even 60% of this saves a typical mid-market team 30+ hours per week — equivalent to nearly a full-time hire. The system pays for itself within 4–6 months on payroll math alone, before counting the speed gains and reduced error rates.",
      highlights: ['30+ hrs/week saved', '4–6 month payback', 'Lower error rates'],
    },
    {
      title: 'See what to optimise next',
      body:
        "Every workflow we build comes with a real-time dashboard: time in stage, where work bottlenecks, what % of decisions the AI handled vs escalated, error rates, and where humans are still spending time.\n\nThis is the part that makes workflows compound. Most automation projects launch then go static. Ours surface the next opportunity to automate — usually within 60 days you'll see a stage that's still slow and obvious to fix. The Ongoing Operations retainer exists for exactly this work.",
      highlights: ['Real-time dashboard', 'Bottleneck detection', 'Continuous improvement'],
    },
  ],
  sampleOutputs: [
    {
      label: 'Sample current-state vs target-state diagram',
      caption:
        "What you receive after the 1-week audit. Mermaid format — exports to PDF + lives in the workflow repo.",
      format: 'code',
      body:
        "CURRENT STATE — sales-to-onboarding handover\n\n  Lead arrives (HubSpot)\n     │\n     ▼\n  SDR qualification (manual, 2-3 days, 30% drop)\n     │\n     ▼\n  AE call (Calendly, 4-7 days lag, 18% no-show)\n     │\n     ▼\n  Quote drafted (manual, 1-2 days)\n     │\n     ▼\n  Signed contract (DocuSign, 5-10 days)\n     │\n     ▼\n  Onboarding handoff (Slack message + 4 manual steps, 40% data loss)\n     │\n     ▼\n  CSM kickoff (avg 11 days from signed)\n\n\nTARGET STATE — sales-to-onboarding handover\n\n  Lead arrives (HubSpot)\n     │\n     ▼\n  AI qualification (real-time, 0% drop, scored 0–100)\n     │\n     ├── score < 40 → nurture sequence (auto)\n     └── score ≥ 40\n           │\n           ▼\n        Routed AE call (auto-booked from real availability)\n           │\n           ▼\n        AI-drafted quote (review + sign in same call)\n           │\n           ▼\n        Signed contract (DocuSign auto-trigger)\n           │\n           ▼\n        AI onboarding handoff (zero manual steps, full context to CSM)\n           │\n           ▼\n        CSM kickoff (avg 2 days from signed — vs 11)\n\nNet impact: 9 days off the cycle, 30%+ drop-off eliminated, 4 hrs/week of manual work removed from each AE.",
    },
    {
      label: 'Sample audit findings report (excerpt)',
      caption: 'A real section from a recent audit deliverable, anonymised.',
      format: 'prose',
      body:
        "FINDING #3 — POST-DEMO HANDOFF (CRITICAL)\n\nWhat we observed:\n• AE finishes a demo call → manually creates 4 records: HubSpot deal-stage update, Slack #wins post, internal Notion page for ops handoff, calendar follow-up reminder.\n• Average time spent: 22 minutes per call, 4–6 calls per AE per day.\n• Failure rate: 1 in 5 handoffs lose at least one step (ops team flagged 14 instances in last 30 days where they had to chase the AE for missing context).\n\nCost:\n• 2.2 hrs/day × 4 AEs = 8.8 hrs/day in admin time = R72,000/month at loaded cost.\n• 14 lost handoffs × avg 3 days delay = R420,000 in delayed onboarding revenue.\n• Total annualised cost of this single workflow gap: ~R5.8M.\n\nRecommendation:\n• Replace 4-step manual handoff with a single AI workflow triggered by call-end (Gong / Otter / manual confirm).\n• AI extracts: deal stage, key risks, technical requirements, decision-maker map. Updates HubSpot, posts Slack, creates Notion page automatically.\n• AE confirms / edits the auto-draft (avg 90 seconds vs current 22 min).\n\nProjected payback: 6 weeks based on time-saving alone, faster if delayed onboarding losses count.",
    },
  ],
  howItWorks: [
    {
      title: 'Workflow audit (1 week)',
      description:
        'We map your current process. Where does work originate? Where does it stall? What handoffs eat the most time?',
    },
    {
      title: 'Design + scope',
      description:
        'We propose a target-state workflow + the AI agents needed. You approve scope before any build.',
    },
    {
      title: 'Build + integrate',
      description:
        'We connect your tools (n8n, Zapier-pro, custom code as needed) and add AI agents at the right decision points.',
    },
    {
      title: 'Pilot for 30 days',
      description:
        'We run the workflow alongside your current process. Metrics collected. Issues fixed in real time.',
    },
    {
      title: 'Cut over + own',
      description:
        'You go live. We hand over documentation + training. Stay on retainer for tuning and additions.',
    },
  ],
  whatsIncluded: [
    {
      icon: Workflow,
      title: 'Custom workflow design',
      description: 'Built around your specific business, not a template.',
    },
    {
      icon: Code2,
      title: 'AI decision agents',
      description: 'Intelligent routing, summarisation, and decision-making at key workflow points.',
    },
    {
      icon: Bot,
      title: 'Tool integrations',
      description: '100+ pre-built integrations. Custom integrations for any API.',
    },
    {
      icon: ShieldCheck,
      title: 'Pilot + tuning',
      description: '30-day side-by-side pilot. Issues caught before they affect your business.',
    },
    {
      icon: Megaphone,
      title: 'Analytics + reporting',
      description: 'Real-time dashboard showing time saved, bottlenecks, automation health.',
    },
    {
      icon: Mail,
      title: 'Training + handover',
      description: 'Documentation + training for your team. We don\'t leave you reliant on us.',
    },
  ],
  useCases: [
    {
      industry: 'Professional Services',
      challenge: 'Post-call workflow took ops manager 4 hours/day — Slack updates, CRM entry, follow-up emails, scheduling.',
      outcome: 'AI workflow handled 90% of it. Ops manager freed up for higher-leverage work.',
    },
    {
      industry: 'E-commerce',
      challenge: 'Customer support tickets routed by category but high-priority issues got buried.',
      outcome: 'AI triages every ticket, escalates VIPs and time-sensitive issues, drafts responses.',
    },
    {
      industry: 'Real Estate',
      challenge: 'Listing updates required edits in 6 different platforms (MLS, website, social, email, etc.).',
      outcome: 'Single source of truth. AI propagates changes everywhere. Listing turnaround went from days to minutes.',
    },
  ],
  pricing: [
    {
      name: 'Workflow Audit',
      priceFrom: 'R35 000',
      cadence: 'one-off',
      bestFor: 'Map current state + design target state. No build.',
      includes: [
        '1-week deep audit',
        'Workflow diagrams (current + target)',
        'Tool stack recommendations',
        'ROI projection',
        'Implementation roadmap',
      ],
      cta: 'Book audit',
    },
    {
      name: 'Build + Pilot',
      priceFrom: 'R150 000',
      cadence: 'project',
      bestFor: 'Full workflow build + 30-day pilot.',
      includes: [
        'Workflow audit included',
        'Custom build',
        'Tool integrations',
        'AI agent setup',
        '30-day pilot + tuning',
        'Training + handover',
      ],
      cta: 'Get a quote',
      highlighted: true,
    },
    {
      name: 'Ongoing Operations',
      priceFrom: 'R25 000',
      cadence: '/month',
      bestFor: 'Continuous workflow management + iteration.',
      includes: [
        'Monthly workflow review',
        'Optimisation + new automations',
        'Issue resolution',
        'Quarterly strategy session',
        'SLA-backed uptime',
      ],
      cta: 'Talk to sales',
    },
  ],
  faq: [
    {
      q: 'What tools do you integrate with?',
      a: 'Pretty much anything with an API. We use n8n + custom Node.js code as the foundation, so we can hit Salesforce, HubSpot, Slack, Notion, Asana, Google Workspace, Microsoft 365, Stripe, Shopify, anything REST or GraphQL.',
    },
    {
      q: 'How long does a typical build take?',
      a: '2-6 weeks depending on complexity. Audit takes 1 week. Build is 1-4 weeks. Pilot adds 30 days. Most clients see meaningful time savings within 60 days of kickoff.',
    },
    {
      q: 'What if my tools aren\'t on the list?',
      a: "Custom integration is part of the work. We've integrated bespoke ERPs, legacy databases, even SOAP APIs. If it has any kind of programmatic interface, we can connect it.",
    },
    {
      q: 'Will I need ongoing support?',
      a: 'Up to you. Many clients take the Ongoing Operations retainer because workflows evolve as the business does. Others take the build, get trained, and run it themselves.',
    },
    {
      q: 'How do you measure success?',
      a: 'We define metrics during the audit — usually hours saved per week, error rate reduction, or specific business outcomes (faster lead response, fewer support tickets). We measure these monthly.',
    },
  ],
  serviceKey: 'Custom Agentic Workflows',
  botSummary:
    'We connect your existing tools (CRM, calendar, support, project, finance) into one workflow with AI making decisions at the right points. Audit from R35K, build from R150K, optional ongoing ops at R25K/month.',
};

// ---------------------------------------------------------------------------
// Service 3: Corporate AI Advisory & Adoption
// ---------------------------------------------------------------------------

const ADVISORY: ProductDef = {
  slug: 'corporate-advisory',
  category: 'service',
  icon: ShieldCheck,
  name: 'Corporate AI Advisory & Adoption',
  shortName: 'Corporate AI Advisory',
  tagline: "From 'we should try AI' to AI generating real revenue — in 90 days.",
  heroHeadline: "AI strategy that doesn't blow up.",
  heroSubheadline:
    "Enterprises know they need AI. Most don't know how to deploy it without exposing customer data, breaking POPIA/GDPR, or wasting six months on the wrong projects. We do.",
  valueProp: [
    "80% of AI projects fail to deliver business value (RAND, 2025). 88% of agent pilots never make it to production. The average abandoned AI initiative cost the business $7.2M before being shelved.",
    "The cost isn't just wasted budget. It's the compliance incident when someone pastes customer data into ChatGPT. The regulatory fine when an AI makes a decision that violates POPIA. The competitor who got it right while you ran in circles. ISO 42001-certified companies are already getting 15–25% lower AI liability insurance premiums; 83% of Fortune 500 procurement teams plan to require ISO 42001 alignment by 2027.",
    "Octio's Advisory practice takes mid-market and enterprise companies from 'we should try AI' to 'AI is making us measurably more money' in 90–180 days. Governance (POPIA / GDPR / ISO 42001), training, prioritisation, and pilot execution — all included.",
  ],
  whatItDoes: [
    'See where you actually stand — board-level readiness assessment of data, infrastructure, processes, and team capability.',
    'Avoid the compliance incident — POPIA + GDPR + ISO 42001 frameworks, vendor approval process, incident response.',
    'Skip the experiments that go nowhere — sequenced 12-month roadmap of use cases ranked by impact, effort, and risk.',
    "Role-specific training, not 'what is ChatGPT' — different upskilling for marketing, ops, support, finance.",
    "Get wins on the board — we don't just advise; we run the first 2–3 pilots and prove the model.",
  ],
  stats: [
    { value: '90 days', label: 'kickoff to first wins' },
    { value: '3', label: 'compliance frameworks (POPIA / GDPR / ISO 42001)' },
    { value: '15–25%', label: 'lower AI liability premiums when ISO 42001-aligned' },
    { value: '2–3', label: 'pilots delivered, not just advised' },
  ],
  capabilityDeepDives: [
    {
      title: 'See where you actually stand',
      body:
        "Most AI strategies fail because they start from 'what could AI do?' instead of 'where are we?'. We start with the latter.\n\nThe 2-week readiness assessment covers four dimensions: data (what you have, where it lives, what state it's in, what you can legally use it for), infrastructure (cloud maturity, identity systems, integration capability), processes (which workflows are AI-ready vs which need cleaning up first), and people (skill levels by role, current AI adoption patterns, change-management capacity).\n\nThe output is a written readiness report scored against a published framework, with 5–10 specific 90-day quick wins identified — projects you can start immediately because the prerequisites already exist.",
      highlights: ['Data readiness', 'Infrastructure audit', 'Skill mapping', 'Quick-win identification'],
    },
    {
      title: 'Avoid the compliance incident',
      body:
        "ISO 42001 became the global AI governance standard in 2024 and is moving fast: 83% of Fortune 500 procurement teams plan to require alignment by 2027, and certified organisations are already getting 15–25% lower AI liability insurance premiums.\n\nWe build the governance framework needed for ISO 42001 alignment + POPIA + GDPR + (where relevant) the EU AI Act. That includes: AI usage policy, vendor approval process, data classification rules, incident response procedure, audit logging requirements, and the documentation needed for certification when you're ready.\n\nFor financial services and healthcare clients we add sector-specific addendums (Reserve Bank guidelines, HPCSA where relevant, sector data residency requirements).",
      highlights: ['ISO 42001', 'POPIA', 'GDPR', 'EU AI Act', 'NIST AI RMF'],
    },
    {
      title: 'Skip the experiments that go nowhere',
      body:
        "80% of AI projects fail. The pattern is consistent: chosen because of vendor pitch (not internal pain), scoped wider than feasible, no measurable success criteria, no executive sponsor, no plan for production handover.\n\nOur prioritisation framework forces clarity on all five before anything is greenlit. We score each candidate use case against impact (R revenue or hours saved), effort (engineering weeks + change-management complexity), and risk (compliance / customer-facing / reversibility), and produce a sequenced 12-month roadmap.\n\nThe roadmap is ruthless about what doesn't make the cut — most readiness assessments identify 30+ candidate use cases; we typically recommend pursuing 5–8.",
      highlights: ['Impact / effort / risk scoring', '12-month roadmap', 'Honest cuts'],
    },
    {
      title: "Role-specific training, not 'what is ChatGPT'",
      body:
        "Generic AI training doesn't translate into productivity. We've seen it consistently — staff sit through a 2-hour session and use AI 0% more the following month.\n\nWe replace generic training with role-specific programmes. Marketing teams learn AI for content + analysis + competitor research. Operations teams learn AI for routing + summarisation + reporting. Finance teams learn AI for variance analysis + forecasting + audit prep. Customer support teams learn AI for ticket triage + draft replies + knowledge retrieval.\n\nEvery programme is hands-on (not lecture-style) and ends with measurable adoption goals. We re-measure at 30, 60, and 90 days — and update the programme if uptake stalls.",
      highlights: ['Role-specific', 'Hands-on', 'Adoption-measured'],
    },
    {
      title: 'Get wins on the board',
      body:
        "Most pure-advisory engagements end with a glossy roadmap document and disappear. We've seen that pattern fail too many times to repeat it.\n\nThe Adoption Programme includes piloting the top 2–3 use cases ourselves: we build them, run them, measure them, and hand them off only after they've delivered measurable value. This pattern is critical — the wins on the board create the political capital your team needs to expand AI internally without us.\n\nMITSloan's 2025 research found 95% of GenAI pilots fail to scale. Ours don't, because we don't hand off until they've already scaled.",
      highlights: ['Pilot delivery', 'Measured outcomes', 'Political capital'],
    },
  ],
  sampleOutputs: [
    {
      label: 'Sample readiness report excerpt',
      caption:
        "A real (anonymised) section from a recent readiness assessment for a 1,200-person SA financial services firm.",
      format: 'prose',
      body:
        "READINESS SCORE — Acme Financial Services\nOverall: 4.2 / 7 (Mature pilot stage — ready for production deployment in selected domains)\n\nDIMENSION SCORES:\n• Data: 5.5 / 7 (Strong — well-modelled customer data, weak on unstructured doc archives)\n• Infrastructure: 4.8 / 7 (Good — Azure-native, IAM mature, but no internal model hosting capability)\n• Processes: 3.0 / 7 (Weak — most ops processes still spreadsheet-driven, no documented workflows)\n• People: 3.5 / 7 (Mixed — analytics team is AI-native, ops team has not received any AI training)\n\nKEY FINDINGS:\n\n1. Customer data quality is unusually high — your migration to a single CDP in 2023 paid off. Most use cases needing customer data can run today.\n\n2. Compliance posture is medium-risk. POPIA framework is documented but not enforced — we found 6 instances of staff using ChatGPT with customer data in interviews. ISO 42001 alignment will require a formal AI usage policy + technical enforcement (e.g. enterprise ChatGPT with data isolation).\n\n3. Operations is your highest-leverage domain for early wins. The reconciliation, claims triage, and statement preparation workflows are well-suited to AI automation, low compliance risk, and would each save 25–40% of staff hours.\n\nRECOMMENDED 90-DAY QUICK WINS:\n→ Reconciliation automation (est. 800 hrs/month saved, low compliance risk)\n→ Claims triage AI assistant (est. 35% faster routing, low compliance risk)\n→ AI usage policy + enterprise ChatGPT rollout (compliance imperative — protects against current data leakage)\n\nWe do not recommend at this stage:\n✗ Customer-facing AI agents (compliance posture not yet ready)\n✗ Credit decisioning AI (regulatory uncertainty until SARB finalises position)\n✗ Generative content for marketing (no brand voice training, high reputational risk).",
    },
    {
      label: 'Sample 12-month roadmap excerpt',
      caption: 'A high-level view of the sequenced roadmap delivered after the audit.',
      format: 'prose',
      body:
        "12-MONTH AI ADOPTION ROADMAP — Acme Financial Services\n\nQ1 (Months 1–3) — Foundation\n• AI usage policy + ISO 42001 baseline (week 1–4)\n• Enterprise ChatGPT rollout with data-loss prevention (week 3–6)\n• Reconciliation automation pilot (week 4–10)\n• Operations AI training programme launch (week 6–12)\n\n• Success metrics: AI policy adopted, 800 hrs/month saved on reconciliation, 90%+ ops staff completing training\n\nQ2 (Months 4–6) — Scale Quick Wins\n• Reconciliation automation expanded company-wide\n• Claims triage AI assistant in production\n• Statement preparation AI assistant pilot\n• Marketing voice-tuning + content generation pilot\n\n• Success metrics: 1,500+ hrs/month saved across all automated workflows, marketing content output up 3×\n\nQ3 (Months 7–9) — Compliance + Expansion\n• ISO 42001 certification preparation (audit Q4)\n• Vendor evaluation programme — replace 3 existing tools with AI-native alternatives\n• Predictive churn pilot (analytics team — high compliance review)\n\n• Success metrics: ISO 42001 audit-ready, R3M+ annualised savings booked\n\nQ4 (Months 10–12) — Scale + Certification\n• ISO 42001 certification audit\n• Customer-facing AI assistant pilot (post-compliance approval)\n• Predictive churn in production\n• AI Office formalised as standing function\n\n• Success metrics: ISO 42001 certified, customer NPS impact measured, AI Office self-sustaining",
    },
    {
      label: 'Sample governance framework excerpt — AI usage policy',
      caption: 'The opening sections of the AI usage policy document, redacted for client.',
      format: 'prose',
      body:
        "[CLIENT] — AI USAGE POLICY (v1.0)\nEffective: 1 March 2026\nNext review: 1 September 2026\n\n1. PURPOSE\nThis policy defines what AI tools and uses are approved at [Client], how staff and contractors are expected to handle data interacting with AI systems, and the procedures for incident response. It is binding on all employees, contractors, and third parties operating on [Client] systems.\n\n2. APPROVED AI TOOLS\nApproved for general use:\n• ChatGPT Enterprise (data-isolation enabled, billing under [Client] tenant)\n• Microsoft Copilot for Microsoft 365\n• [Vendor] AI workflow tooling (specific approved use cases — see Appendix B)\n\nNOT approved for use with [Client] data:\n• ChatGPT Free / Plus (consumer tier — no data isolation)\n• Gemini consumer tier\n• Claude.ai consumer tier (Claude Pro for individuals — Enterprise approved separately)\n• Any AI tool not on the approved-vendors list (Appendix A)\n\n3. DATA HANDLING\nCustomer Personal Information (POPIA-defined) MAY be used with approved tools where the use case is approved per Section 5. It MUST NOT be used with non-approved tools under any circumstance.\nFinancial data classified Confidential or higher: same rules as Personal Information.\nPublic / marketing data: may be used freely with any approved tool.\n\n4. PROHIBITED USES\nThe following uses are prohibited regardless of tool:\n• Credit decisioning solely on AI output (regulatory)\n• Customer-facing automated decisions without human review (POPIA Section 71)\n• Generation of customer-facing content without brand-team review (reputational)\n• Sharing of source code containing IP with non-approved tools\n\n5. APPROVED USE CASES (see Appendix C for full list)\n[…]",
    },
  ],
  howItWorks: [
    {
      title: 'Discovery + readiness assessment (2 weeks)',
      description:
        'We interview leadership + key teams. Audit data + tools. Output: written readiness report with concrete next steps.',
    },
    {
      title: 'Governance framework (2 weeks)',
      description:
        'We draft your AI usage policy, data handling rules, vendor approval process, and incident response. You sign off.',
    },
    {
      title: 'Roadmap + prioritisation (1 week)',
      description:
        'We identify 5-10 high-ROI use cases for your business. We sequence them by impact, effort, and risk.',
    },
    {
      title: 'Pilot + scale (60-150 days)',
      description:
        'We pilot the top 2-3 use cases. Measure. Scale what works. Train your teams to own it themselves.',
    },
    {
      title: 'Quarterly reviews',
      description:
        'Ongoing oversight. New use cases evaluated. Governance kept current as AI capabilities evolve.',
    },
  ],
  whatsIncluded: [
    {
      icon: ShieldCheck,
      title: 'Governance framework',
      description: 'Custom AI usage policy. POPIA + GDPR + ISO 42001 compliant from day one.',
    },
    {
      icon: Workflow,
      title: 'Use-case roadmap',
      description: 'Prioritised, sequenced 12-month plan. Specific to your business, not generic.',
    },
    {
      icon: Bot,
      title: 'Vendor evaluation',
      description: 'We vet AI vendors against your security + compliance requirements.',
    },
    {
      icon: Megaphone,
      title: 'Role-specific training',
      description: 'Marketing, ops, finance, support — each gets training tailored to their work.',
    },
    {
      icon: Code2,
      title: 'Pilot + scale execution',
      description: 'We don\'t just advise — we deliver the first 2-3 wins to prove the model.',
    },
    {
      icon: Mail,
      title: 'Quarterly oversight',
      description: 'Keep governance current. Evaluate new vendors. Surface new opportunities.',
    },
  ],
  useCases: [
    {
      industry: 'Financial Services',
      challenge: 'Bank wanted to use AI but couldn\'t expose customer data to public LLMs (POPIA + internal policy).',
      outcome: 'Built private AI infrastructure + governance. 4 productive use cases live in 90 days. Zero data incidents.',
    },
    {
      industry: 'Healthcare',
      challenge: 'Practice group wanted AI for admin work but staff were terrified of using anything (HIPAA-equivalent fears).',
      outcome: 'Trained staff + built compliant tooling. Saved 30% of admin time across 12 practices.',
    },
    {
      industry: 'Mid-Market Manufacturing',
      challenge: 'CEO wanted AI but had no idea where to start. Risk of buying expensive tools that didn\'t solve real problems.',
      outcome: 'Roadmap identified 3 high-ROI use cases (procurement, quality, scheduling). Implemented 2 in 6 months. ~R4M savings projected year 1.',
    },
  ],
  pricing: [
    {
      name: 'Readiness Audit',
      priceFrom: 'R125 000',
      cadence: 'one-off',
      bestFor: 'Board-level AI readiness review + strategic recommendations.',
      includes: [
        'Leadership + team interviews',
        'Data + tooling audit',
        'Governance gap analysis',
        'Written readiness report',
        '90-day quick-win recommendations',
      ],
      cta: 'Book audit',
    },
    {
      name: 'Adoption Programme',
      priceFrom: 'R450 000',
      cadence: '90 days',
      bestFor: 'Full audit + governance + roadmap + first wins.',
      includes: [
        'Readiness audit included',
        'Governance framework',
        'Compliance implementation',
        '12-month roadmap',
        '2-3 use cases piloted',
        'Staff training programme',
      ],
      cta: 'Get a quote',
      highlighted: true,
    },
    {
      name: 'Embedded AI Office',
      priceFrom: 'R65 000',
      cadence: '/month',
      bestFor: 'Ongoing AI strategy + governance + execution.',
      includes: [
        'Quarterly executive reviews',
        'New use case evaluation',
        'Vendor vetting + procurement',
        'Governance updates',
        'Incident response',
        'Ad-hoc strategy sessions',
      ],
      cta: 'Talk to sales',
    },
  ],
  faq: [
    {
      q: 'What size company is this for?',
      a: 'Typically 50+ employees and / or annual revenue R50M+. Below that, our products + workflows usually deliver more value than advisory.',
    },
    {
      q: 'Do you actually implement, or just advise?',
      a: 'Both. The Adoption Programme includes piloting the first 2-3 use cases ourselves. Most pure-advisory firms hand you a roadmap and disappear — we stay until you have wins on the board.',
    },
    {
      q: 'How do you handle compliance?',
      a: 'We build POPIA, GDPR, and ISO 42001 (the new AI management standard) compliance into the governance framework from day one. Every AI vendor + tool we recommend is vetted against these standards.',
    },
    {
      q: 'What about training? My staff are very junior on AI.',
      a: 'Training is included. We do role-specific sessions (not generic ChatGPT 101). Marketing learns one set of skills, finance learns another. We measure whether people actually use what they learn.',
    },
    {
      q: 'Will you recommend tools we have to buy?',
      a: 'Sometimes — but we have no kickback arrangements with any vendor. Our recommendations are based purely on what fits your business. Plenty of recommendations end up being "use what you already have, just differently."',
    },
  ],
  serviceKey: 'Corporate AI Advisory',
  botSummary:
    'We help mid-market and enterprise companies adopt AI safely — POPIA/GDPR/ISO 42001 governance, role-specific training, prioritised use cases, and pilot execution. Audit from R125K, 90-day Adoption Programme from R450K.',
};

// ---------------------------------------------------------------------------
// Public catalogue
// ---------------------------------------------------------------------------

export const PRODUCTS: ProductDef[] = [LEAD_GEN, VOICE_CHAT, SOCIAL_MEDIA, NEWSLETTER];
export const SERVICES: ProductDef[] = [APP_DEV, WORKFLOWS, ADVISORY];
export const ALL_OFFERINGS: ProductDef[] = [...PRODUCTS, ...SERVICES];

export function getOfferingBySlug(slug: string): ProductDef | undefined {
  return ALL_OFFERINGS.find((o) => o.slug === slug);
}
