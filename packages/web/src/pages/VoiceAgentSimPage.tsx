import { useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Voice Agent Simulator page — v0.
//
// v0 strategy: Web Speech API for STT (browser-native, free) + Speech-
// SynthesisUtterance for TTS. Validates the full conversation loop +
// orb states + iOS Safari gesture unlock WITHOUT provisioning any
// external services. v1 swaps Web Speech for Deepgram Nova-3 + Cartesia
// Sonic-3 via livekit-server.
//
// Spec: docs/superpowers/specs/2026-05-13-browser-voice-agent-livekit.md
// Backend contract: /api/voice-agent/turn (v1-shape; v0 uses it directly)
// ---------------------------------------------------------------------------

type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface ToolCallDisplay {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

interface LatencyBreakdown {
  stt: number;
  brain: number;
  tts: number;
  totalMouthToEar: number;
}

interface TurnLog {
  id: string;
  transcript: string;
  reply: string;
  toolCalls: ToolCallDisplay[];
  latencyMs: LatencyBreakdown;
}

const SAMPLE_PROMPTS = [
  { label: 'Quick greet', text: 'Hello' },
  { label: 'State a need', text: 'My geyser is leaking' },
  { label: 'Urgent emergency', text: "Help, my house is flooding!" },
  { label: 'Just want to book', text: 'I want to book an appointment' },
  { label: 'Confirm time', text: '10am works' },
  { label: 'Question + location', text: 'I am in Centurion' },
];

function newSessionId(): string {
  return `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Web Speech API typings (the modern + webkit-prefixed variants).
type SR = {
  new (): SpeechRecognitionLike;
  prototype: SpeechRecognitionLike;
};
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognitionLike, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionLike, ev: { error: string }) => void) | null;
  onend: ((this: SpeechRecognitionLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }>;
}

function getSpeechRecognitionCtor(): SR | null {
  const w = window as unknown as {
    SpeechRecognition?: SR;
    webkitSpeechRecognition?: SR;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceAgentSimPage() {
  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [tenantBrand, setTenantBrand] = useState('Joburg Plumbing');
  const [callerNumber, setCallerNumber] = useState<string>('');
  const [transcript, setTranscript] = useState('');
  const [turnLog, setTurnLog] = useState<TurnLog[]>([]);
  const [ended, setEnded] = useState(false);
  const [endedReason, setEndedReason] = useState<string | undefined>(undefined);
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [voiceActivated, setVoiceActivated] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const transcriptInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speakingUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speechRecognitionSupported = useMemo(() => getSpeechRecognitionCtor() !== null, []);
  const speechSynthesisSupported = useMemo(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
    [],
  );

  // Autoscroll
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turnLog, agentState]);

  // Autofocus the text input when in text mode
  useEffect(() => {
    if (mode === 'text' && !ended && agentState === 'idle') {
      transcriptInputRef.current?.focus();
    }
  }, [mode, ended, agentState, sessionId]);

  // Clean up speech recognition + synthesis on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = (text: string): Promise<void> =>
    new Promise((resolve) => {
      if (!speechSynthesisSupported) {
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1.0;
      u.lang = 'en-ZA';
      speakingUtteranceRef.current = u;
      u.onend = () => {
        speakingUtteranceRef.current = null;
        resolve();
      };
      u.onerror = () => {
        speakingUtteranceRef.current = null;
        resolve();
      };
      setAgentState('speaking');
      window.speechSynthesis.speak(u);
    });

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    speakingUtteranceRef.current = null;
  };

  const sendTurn = async (utterance: string): Promise<void> => {
    if (!utterance.trim() || ended) return;

    setAgentState('thinking');
    setError(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
      const res = await fetch(`${apiBase}/api/voice-agent/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          tenantId: 1,
          tenantBrand,
          callerNumber: callerNumber || null,
          transcript: utterance,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      const json = (await res.json()) as {
        reply: string;
        toolCalls: ToolCallDisplay[];
        latencyMs: LatencyBreakdown;
        ended: boolean;
        endedReason: string | undefined;
        bookedSlot: string | null;
      };

      setEnded(json.ended);
      setEndedReason(json.endedReason);
      setBookedSlot(json.bookedSlot);
      setTurnLog((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          transcript: utterance,
          reply: json.reply,
          toolCalls: json.toolCalls,
          latencyMs: json.latencyMs,
        },
      ]);
      setTranscript('');

      // v0: speak the reply via SpeechSynthesisUtterance in voice mode
      if (mode === 'voice' && speechSynthesisSupported) {
        await speak(json.reply);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAgentState('idle');
    }
  };

  const activateVoice = async () => {
    // iOS Safari gesture-unlock dance — must happen inside a click handler.
    setError(null);

    if (!speechRecognitionSupported) {
      setError('Voice mode needs the Web Speech API — try Chrome or Safari on a recent OS.');
      return;
    }

    // Unlock SpeechSynthesis: play a 1-sample silent utterance inside the gesture.
    if (speechSynthesisSupported) {
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    }

    setVoiceActivated(true);
    setMode('voice');

    // Greet on activation so the user knows the bot is listening
    await sendTurn('Hello'); // Triggers the canned greeting via the brain
  };

  const startListening = () => {
    if (!voiceActivated || ended || agentState === 'thinking' || agentState === 'speaking') {
      return;
    }
    stopSpeaking();
    setLiveTranscript('');
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-ZA';

    let finalTranscript = '';

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i] as unknown as {
          0: { transcript: string };
          isFinal: boolean;
        };
        if (r.isFinal) {
          finalTranscript += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      setLiveTranscript((finalTranscript + interim).trim());
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setError(`Mic error: ${e.error}`);
      }
      setAgentState('idle');
    };

    rec.onend = () => {
      const captured = finalTranscript.trim();
      setLiveTranscript('');
      recognitionRef.current = null;
      if (captured && agentState === 'listening') {
        void sendTurn(captured);
      } else {
        setAgentState('idle');
      }
    };

    recognitionRef.current = rec;
    setAgentState('listening');
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const resetSession = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
      await fetch(`${apiBase}/api/voice-agent/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      /* non-fatal */
    }
    recognitionRef.current?.abort();
    stopSpeaking();
    setSessionId(newSessionId());
    setTurnLog([]);
    setEnded(false);
    setEndedReason(undefined);
    setBookedSlot(null);
    setTranscript('');
    setLiveTranscript('');
    setError(null);
    setAgentState('idle');
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendTurn(transcript);
    }
  };

  const lastLatency = turnLog[turnLog.length - 1]?.latencyMs;

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-text">
              Voice Agent Simulator
              <span className="ml-3 rounded bg-orange-dim px-2 py-0.5 align-middle text-xs font-medium text-orange">v0 · mocks + Web Speech API</span>
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Mock STT/TTS via the browser's Web Speech API. Real Mastra brain wiring + v1-shape <code className="text-orange">/turn</code> endpoint already in place — Deepgram + Cartesia + livekit-server swap in for v1.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ModeSwitch mode={mode} setMode={setMode} disabled={ended} />
            <button
              onClick={resetSession}
              className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-text transition-colors hover:bg-surface hover:text-orange"
              type="button"
            >
              Reset
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* ── Conversation column ─────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            {mode === 'voice' && (
              <VoicePanel
                voiceActivated={voiceActivated}
                agentState={agentState}
                liveTranscript={liveTranscript}
                onActivate={activateVoice}
                onStartListening={startListening}
                onStopListening={stopListening}
                ended={ended}
                speechRecognitionSupported={speechRecognitionSupported}
              />
            )}

            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="font-display text-lg">Call transcript</h2>
                {ended && (
                  <span className="rounded-full bg-orange-dim px-3 py-1 text-xs font-medium text-orange">
                    Ended · {endedReason}
                  </span>
                )}
              </div>

              <div className="mt-4 flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-2">
                {turnLog.length === 0 && agentState === 'idle' && (
                  <p className="text-sm text-text-muted">
                    {mode === 'voice'
                      ? 'Tap the orb above to start talking. Speak a sample prompt from the right →'
                      : 'Type or click a sample prompt to begin →'}
                  </p>
                )}

                {turnLog.map((turn) => (
                  <article key={turn.id} className="flex flex-col gap-2">
                    <UserBubble text={turn.transcript} />
                    <AgentBubble text={turn.reply} />
                    {turn.toolCalls.map((tc, i) => (
                      <ToolCallChip key={i} call={tc} />
                    ))}
                    <LatencyLine latency={turn.latencyMs} />
                  </article>
                ))}

                {agentState === 'thinking' && (
                  <div className="text-sm italic text-text-muted">
                    Agent is thinking…
                  </div>
                )}

                <div ref={logEndRef} />
              </div>
            </div>

            {mode === 'text' && (
              <form
                className="rounded-xl border border-border bg-surface p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendTurn(transcript);
                }}
              >
                <div className="flex gap-3">
                  <input
                    ref={transcriptInputRef}
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={
                      ended
                        ? 'Call ended. Reset to start over.'
                        : 'Type what the caller says…'
                    }
                    disabled={ended || agentState !== 'idle'}
                    className="flex-1 rounded-md border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-orange focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!transcript.trim() || ended || agentState !== 'idle'}
                    className="rounded-md bg-orange px-5 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
                {error && (
                  <p className="mt-3 rounded border border-orange/40 bg-orange-dim/30 px-3 py-2 text-sm text-orange-light">
                    {error}
                  </p>
                )}
              </form>
            )}
            {mode === 'voice' && error && (
              <p className="rounded border border-orange/40 bg-orange-dim/30 px-3 py-2 text-sm text-orange-light">
                {error}
              </p>
            )}
          </section>

          {/* ── Right-hand panel ────────────────────────────────────────── */}
          <aside className="flex flex-col gap-4">
            <Panel title="Session">
              <Field label="Session ID" value={sessionId} onChange={() => {}} readOnly />
              <Field label="Tenant brand" value={tenantBrand} onChange={setTenantBrand} />
              <Field
                label="Caller number (optional)"
                value={callerNumber}
                onChange={setCallerNumber}
                placeholder="+27 82 123 4567"
              />
            </Panel>

            <Panel title="Sample prompts">
              <div className="flex flex-col gap-2">
                {SAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    disabled={ended || agentState !== 'idle'}
                    onClick={() => void sendTurn(p.text)}
                    className="rounded-md border border-border bg-bg px-3 py-2 text-left text-sm text-text-muted transition-colors hover:border-orange/40 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="block text-xs font-medium text-orange">{p.label}</span>
                    <span className="text-text">{p.text}</span>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Latency (last turn)">
              {lastLatency ? (
                <div className="space-y-1 text-sm">
                  <Row label="STT" value={`${lastLatency.stt} ms`} />
                  <Row label="Brain" value={`${lastLatency.brain} ms`} />
                  <Row label="TTS" value={`${lastLatency.tts} ms`} />
                  <Row label="Mouth-to-ear" value={`${lastLatency.totalMouthToEar} ms`} accent />
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No turns yet. Latencies appear after the first response.
                </p>
              )}
            </Panel>

            {bookedSlot && (
              <Panel title="Booking">
                <p className="text-sm text-text">
                  <span className="block text-xs font-medium text-orange">Confirmed slot</span>
                  {bookedSlot}
                </p>
              </Panel>
            )}

            <Panel title="v0 mode">
              <p className="text-[11px] leading-relaxed text-text-muted">
                <strong className="text-text">STT:</strong>{' '}
                {speechRecognitionSupported ? 'Web Speech API (browser)' : 'unsupported — text-only'}
                <br />
                <strong className="text-text">TTS:</strong>{' '}
                {speechSynthesisSupported ? 'SpeechSynthesisUtterance' : 'unsupported — silent'}
                <br />
                <strong className="text-text">Brain:</strong> Mock FSM via OctoBrainAdapter
                <br />
                <strong className="text-text">Tools:</strong> Mock (3 stubs)
                <br />
                <strong className="text-text">Transport:</strong> HTTPS POST /turn
                <br />
                <strong className="text-text">SFU:</strong> None (v1 = self-host livekit-server)
              </p>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

function ModeSwitch({
  mode,
  setMode,
  disabled,
}: {
  mode: 'text' | 'voice';
  setMode: (m: 'text' | 'voice') => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border bg-surface-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setMode('text')}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === 'text' ? 'bg-orange text-bg' : 'text-text-muted hover:text-text'
        } disabled:opacity-40`}
      >
        Text
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setMode('voice')}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === 'voice' ? 'bg-orange text-bg' : 'text-text-muted hover:text-text'
        } disabled:opacity-40`}
      >
        Voice
      </button>
    </div>
  );
}

function VoicePanel({
  voiceActivated,
  agentState,
  liveTranscript,
  onActivate,
  onStartListening,
  onStopListening,
  ended,
  speechRecognitionSupported,
}: {
  voiceActivated: boolean;
  agentState: AgentState;
  liveTranscript: string;
  onActivate: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  ended: boolean;
  speechRecognitionSupported: boolean;
}) {
  if (!speechRecognitionSupported) {
    return (
      <div className="rounded-xl border border-orange/30 bg-orange-dim/20 p-5 text-sm text-orange-light">
        Voice mode requires the Web Speech API (Chrome, Edge, Safari 14.5+). Switch to Text mode to continue.
      </div>
    );
  }

  if (!voiceActivated) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-8">
        <p className="text-center text-sm text-text-muted">
          Tap to start the call. Your browser will ask for microphone permission once.
        </p>
        <button
          onClick={onActivate}
          disabled={ended}
          className="rounded-full bg-orange px-6 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
        >
          Start conversation
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6">
      <Orb state={agentState} onClick={agentState === 'idle' ? onStartListening : onStopListening} />
      <p className="text-center text-xs text-text-muted">
        {agentState === 'idle' && 'Tap the orb to talk'}
        {agentState === 'listening' && 'Listening… tap orb to stop'}
        {agentState === 'thinking' && 'Thinking…'}
        {agentState === 'speaking' && 'Agent is speaking… (tap orb to interrupt)'}
      </p>
      {liveTranscript && (
        <p className="rounded bg-orange-dim px-3 py-1 text-sm text-orange-light">
          {liveTranscript}
        </p>
      )}
    </div>
  );
}

function Orb({ state, onClick }: { state: AgentState; onClick: () => void }) {
  const baseClasses =
    'relative h-32 w-32 rounded-full transition-all duration-300 ease-out cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange';
  let stateClasses = '';
  switch (state) {
    case 'idle':
      stateClasses = 'bg-orange-dim/30 hover:bg-orange-dim/50';
      break;
    case 'listening':
      stateClasses = 'bg-orange-dim animate-pulse ring-4 ring-orange/60';
      break;
    case 'thinking':
      stateClasses = 'bg-surface-2 ring-4 ring-text-muted/50';
      break;
    case 'speaking':
      stateClasses = 'bg-orange/80 animate-pulse ring-4 ring-orange-light/60';
      break;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${stateClasses}`}
      aria-label={`Orb state: ${state}. Click to ${state === 'idle' ? 'start talking' : 'stop'}`}
    >
      <span className="sr-only">{state}</span>
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="mb-2 block text-xs text-text-muted">
      <span className="mb-1 block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text focus:border-orange focus:outline-none"
      />
    </label>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={accent ? 'font-semibold text-orange' : 'text-text'}>{value}</span>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="self-end rounded-2xl rounded-br-sm bg-orange-dim px-4 py-2 text-sm text-orange-light">
      <span className="block text-[10px] font-medium uppercase tracking-wider text-orange">
        Caller
      </span>
      {text}
    </div>
  );
}

function AgentBubble({ text }: { text: string }) {
  return (
    <div className="self-start rounded-2xl rounded-bl-sm border border-border bg-surface-2 px-4 py-2 text-sm text-text">
      <span className="block text-[10px] font-medium uppercase tracking-wider text-text-muted">
        Agent
      </span>
      {text}
    </div>
  );
}

function ToolCallChip({ call }: { call: ToolCallDisplay }) {
  const ok = !call.error;
  return (
    <div
      className={`mx-1 self-start rounded-md border px-3 py-1.5 text-[11px] ${
        ok
          ? 'border-border bg-bg text-text-muted'
          : 'border-orange/40 bg-orange-dim/20 text-orange-light'
      }`}
    >
      <span className="font-semibold text-orange">{call.name}</span>
      <span className="mx-1 opacity-60">·</span>
      <span>{call.error ? `error: ${call.error}` : 'ok'}</span>
      {Object.keys(call.args).length > 0 && <span className="mx-1 opacity-60">·</span>}
      {Object.keys(call.args).length > 0 && (
        <span className="opacity-70">{JSON.stringify(call.args)}</span>
      )}
    </div>
  );
}

function LatencyLine({ latency }: { latency: LatencyBreakdown }) {
  return (
    <p className="text-[10px] text-text-muted">
      STT {latency.stt}ms · Brain {latency.brain}ms · TTS {latency.tts}ms · total{' '}
      {latency.totalMouthToEar}ms mouth-to-ear
    </p>
  );
}
