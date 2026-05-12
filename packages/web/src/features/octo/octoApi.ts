import type { WizardStep, TimeSlot, WizardState, BookingSuccess, ContactInfo } from './types';

const DEV_MODE = true;

interface WizardContext {
  service: string | null;
  budget: string | null;
  requirements: string;
  slot: TimeSlot | null;
}

const CANNED_RESPONSES: Record<WizardStep, (ctx: WizardContext) => string> = {
  greeting: () =>
    "Hey, I'm Octio. I help businesses figure out where software and AI actually fit. What are you looking to build?",
  requirements: (ctx) =>
    `${ctx.service} — good territory. Now tell me about your project. Type it, record a voice note, or drop in a spec document.`,
  contact: () =>
    "Okay, I can see the shape of this. Who do we talk to to make it happen?",
  schedule: () =>
    "Perfect. Instead of making you wait for a callback, let's lock in a discovery call right now. Pick a time that works.",
  budget: (ctx) =>
    ctx.slot
      ? `Locked in for ${ctx.slot.label}. One last thing before we wrap — what's the budget range? I'll make sure the team comes prepared.`
      : "One last thing — what's the budget range? I'll make sure the team comes prepared.",
  complete: (ctx) =>
    ctx.slot
      ? `Perfect. See you ${ctx.slot.label} — we'll come ready. You'll get a calendar invite shortly.`
      : "Perfect. We'll be in touch shortly.",
  freechat: () =>
    "Anything else you want to know about Octio? Ask me — our team, our work, our approach — whatever's on your mind.",
};

// Dev-mode canned RAG responses. In production, this hits a real /api/rag endpoint
// backed by Octio's company knowledge base.
const RAG_CANNED: Array<{ match: RegExp; response: string }> = [
  {
    match: /team|who|founder|people/i,
    response:
      "Octio is a tight team of senior engineers and designers. No juniors on client work, no handoffs — the people you meet are the people who build.",
  },
  {
    match: /work|project|case|client|portfolio/i,
    response:
      "We've shipped AI agents, custom platforms, and modernisation work across fintech, ops, and SaaS. We can walk you through specific case studies on the discovery call.",
  },
  {
    match: /process|approach|method|how/i,
    response:
      "We keep it simple: understand the problem, prototype fast, ship in weeks not months, and stay in the trenches with you post-launch.",
  },
  {
    match: /ai|agent|llm|claude|openai/i,
    response:
      "AI is our flagship. We build agents that handle real work — customer ops, research, document workflows, multi-agent orchestration. Not chatbots. Systems that actually do the job.",
  },
  {
    match: /price|cost|rate|how much/i,
    response:
      "Pricing depends on scope. We scoped your budget range earlier — on the discovery call we'll give you a concrete proposal within a week.",
  },
  {
    match: /location|where|based|africa|south/i,
    response:
      "We're based in Pretoria, South Africa, but work with teams globally. Remote-first by default, on-site when it matters.",
  },
  {
    match: /time|long|duration|how fast/i,
    response:
      "Typical discovery → first demo is 2-3 weeks. Production ship depends on scope, but we move faster than traditional agencies because we skip the handoff layers.",
  },
];

export async function askOctio(question: string): Promise<string> {
  if (DEV_MODE) {
    await new Promise((r) => setTimeout(r, 1000));
    const match = RAG_CANNED.find((r) => r.match.test(question));
    if (match) return match.response;
    return "Good question. Honestly, that's best answered live on our discovery call — your team will dig into it properly. But happy to keep chatting in the meantime.";
  }

  let res: Response;
  try {
    res = await fetch('/api/octo/rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new Error('Unable to reach Octio — please check your connection and try again.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message || `Server error (${res.status})`);
  }

  const data = await res.json();
  return data.answer;
}

export async function generateOctoResponse(
  step: WizardStep,
  context: WizardContext
): Promise<string> {
  if (DEV_MODE) {
    return CANNED_RESPONSES[step](context);
  }

  const res = await fetch('/api/octo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, context }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message || `Server error (${res.status})`);
  }

  const data = await res.json();
  return data.message;
}

// ---------------------------------------------------------------------------
// Canned booking result used when DEV_MODE = true
// Mirrors the BookingResult shape from shared/src/schemas.ts
// ---------------------------------------------------------------------------

const CANNED_BOOKING_RESULT: BookingSuccess = {
  meetLink: 'https://meet.google.com/xxx-yyyy-zzz',
  calendarLink: 'https://calendar.google.com/calendar/event?eid=placeholder',
};

// ---------------------------------------------------------------------------
// submitBooking
//
// Submits the completed wizard intake to POST /api/book.
// Builds multipart/form-data with:
//   - `intake`     : JSON string matching WizardIntakeSchema
//   - `voiceNote`  : optional Blob recorded by MediaRecorder
//   - `attachment` : optional File from <input type="file">
//
// Returns BookingSuccess on success.
// Throws an Error with a user-friendly message on failure.
//
// When DEV_MODE = true, returns the canned result after a short delay so the
// wizard behaves identically to production without requiring a running worker.
// ---------------------------------------------------------------------------

export async function submitBooking(state: WizardState): Promise<BookingSuccess> {
  if (DEV_MODE) {
    await new Promise((r) => setTimeout(r, 1200));
    return CANNED_BOOKING_RESULT;
  }

  // Guard: these fields must be set before the budget step completes.
  // In practice the wizard enforces this through step gating, but we validate
  // here so TypeScript is satisfied and the error is explicit.
  if (!state.selectedService || !state.budget || !state.selectedSlot) {
    throw new Error('Booking cannot be submitted — intake is incomplete.');
  }

  const intake = {
    selectedService: state.selectedService,
    budget: state.budget,
    requirements: state.requirements,
    contact: state.contact,
    selectedSlot: state.selectedSlot,
  };

  const form = new FormData();
  form.append('intake', JSON.stringify(intake));

  if (state.voiceNote) {
    form.append('voiceNote', new File([state.voiceNote], 'voice-note.webm', { type: 'audio/webm' }));
  }

  if (state.attachedFile) {
    form.append('attachment', state.attachedFile);
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${apiBase}/api/book`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    let message = 'Something went wrong — please try again.';
    try {
      const body = await res.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      // response was not JSON — keep the default message
    }
    throw new Error(message);
  }

  const data = await res.json();

  // Validate the shape we need from the response before trusting it
  if (typeof data?.meetLink !== 'string' || typeof data?.calendarLink !== 'string') {
    throw new Error('Unexpected response from booking service — please try again.');
  }

  return {
    meetLink: data.meetLink as string,
    calendarLink: data.calendarLink as string,
  };
}

// ---------------------------------------------------------------------------
// saveLead
//
// Persists a lead the moment the contact form is submitted — before booking,
// before qualifying. This captures EVERYONE who shares contact info, even if
// they drop off later. Powers the cold-call pipeline.
//
// DEV_MODE: logs to console and stores a local draft under `octio:leads` so
// you can inspect captured leads in DevTools without a running backend.
// PROD: POSTs to /api/octo/lead, which should return { leadId: string }.
// ---------------------------------------------------------------------------

const LEADS_DRAFT_KEY = 'octio:leads';

interface LeadPayload {
  contact: ContactInfo;
  selectedService: string | null;
  timestamp: number;
  referrer: string;
  userAgent: string;
}

export async function saveLead(
  contact: ContactInfo,
  selectedService: string | null
): Promise<{ leadId: string }> {
  const payload: LeadPayload = {
    contact,
    selectedService,
    timestamp: Date.now(),
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  if (DEV_MODE) {
    // Persist a local draft so you can see captured leads in DevTools
    try {
      const existing = JSON.parse(localStorage.getItem(LEADS_DRAFT_KEY) ?? '[]') as LeadPayload[];
      existing.push(payload);
      localStorage.setItem(LEADS_DRAFT_KEY, JSON.stringify(existing));
    } catch {
      // ignore — localStorage may be unavailable
    }
    console.info('[octio:lead captured]', payload);
    return { leadId: `dev-${Date.now()}` };
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${apiBase}/api/octo/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Failing to save a lead shouldn't block the user's flow. Log and
    // return a synthetic id so the UI continues without friction.
    console.error('saveLead failed:', res.status, res.statusText);
    return { leadId: `err-${Date.now()}` };
  }

  const data = await res.json();
  return { leadId: data.leadId ?? `ok-${Date.now()}` };
}
