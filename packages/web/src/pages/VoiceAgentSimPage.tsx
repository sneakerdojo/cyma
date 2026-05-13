import { useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Voice Agent Simulator page.
//
// Lets you "call" the agent from a browser. No telephony — type what the
// caller would say, hit submit, watch the agent respond. Tool calls, latency
// breakdown, and ended-state are surfaced so the behaviour pattern is
// inspectable.
//
// Spec: docs/superpowers/specs/2026-05-12-voice-agent-superseded.md
// Backend: /api/voice-agent/simulate (packages/worker/src/routes/voice-agent.ts)
// ---------------------------------------------------------------------------

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

interface HistoryEntry {
  role: 'user' | 'assistant' | 'tool';
  text: string;
  toolName?: string;
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

export default function VoiceAgentSimPage() {
  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [tenantBrand, setTenantBrand] = useState('Joburg Plumbing');
  const [callerNumber, setCallerNumber] = useState<string>('');
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [turnLog, setTurnLog] = useState<TurnLog[]>([]);
  const [ended, setEnded] = useState(false);
  const [endedReason, setEndedReason] = useState<string | undefined>(undefined);
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Autoscroll
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turnLog, isLoading]);

  // Autofocus input on load / reset
  useEffect(() => {
    if (!ended && !isLoading) {
      transcriptInputRef.current?.focus();
    }
  }, [ended, isLoading, sessionId]);

  const send = async (text?: string) => {
    const utterance = (text ?? transcript).trim();
    if (!utterance || isLoading || ended) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
      const res = await fetch(`${apiBase}/api/voice-agent/simulate`, {
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
        history: HistoryEntry[];
      };

      setHistory(json.history);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
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
      /* non-fatal — the worker will GC it eventually */
    }
    setSessionId(newSessionId());
    setHistory([]);
    setTurnLog([]);
    setEnded(false);
    setEndedReason(undefined);
    setBookedSlot(null);
    setTranscript('');
    setError(null);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const lastLatency = turnLog[turnLog.length - 1]?.latencyMs;

  const realisticP50 = useMemo(() => {
    if (turnLog.length < 3) return null;
    const totals = turnLog
      .map((t) => t.latencyMs.totalMouthToEar)
      .sort((a, b) => a - b);
    return totals[Math.floor(totals.length / 2)];
  }, [turnLog]);

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-text">
              Voice Agent Simulator
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Mock telephony, mock LLM, real orchestrator. Type what the caller
              would say — watch how the agent qualifies, routes, and books.
            </p>
          </div>
          <button
            onClick={resetSession}
            className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-text transition-colors hover:bg-surface hover:text-orange"
            type="button"
          >
            Reset session
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* ── Conversation column ─────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
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
                {turnLog.length === 0 && !isLoading && (
                  <p className="text-sm text-text-muted">
                    Say something to start the call. Try one of the sample
                    prompts on the right →
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

                {isLoading && (
                  <div className="text-sm italic text-text-muted">
                    Agent is processing…
                  </div>
                )}

                <div ref={logEndRef} />
              </div>
            </div>

            <form
              className="rounded-xl border border-border bg-surface p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
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
                  disabled={ended || isLoading}
                  className="flex-1 rounded-md border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-orange focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!transcript.trim() || ended || isLoading}
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
          </section>

          {/* ── Right-hand panel ────────────────────────────────────────── */}
          <aside className="flex flex-col gap-4">
            <Panel title="Session">
              <Field
                label="Session ID"
                value={sessionId}
                onChange={() => {}}
                readOnly
              />
              <Field
                label="Tenant brand"
                value={tenantBrand}
                onChange={setTenantBrand}
              />
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
                    disabled={ended || isLoading}
                    onClick={() => void send(p.text)}
                    className="rounded-md border border-border bg-bg px-3 py-2 text-left text-sm text-text-muted transition-colors hover:border-orange/40 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="block text-xs font-medium text-orange">
                      {p.label}
                    </span>
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
                  <Row
                    label="Mouth-to-ear"
                    value={`${lastLatency.totalMouthToEar} ms`}
                    accent
                  />
                  {realisticP50 !== null && (
                    <Row
                      label="p50 (session)"
                      value={`${realisticP50} ms`}
                      muted
                    />
                  )}
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
                  <span className="block text-xs font-medium text-orange">
                    Confirmed slot
                  </span>
                  {bookedSlot}
                </p>
              </Panel>
            )}

            <Panel title="History (raw)">
              <details>
                <summary className="cursor-pointer text-sm text-text-muted hover:text-text">
                  {history.length} entries — expand
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-bg p-3 text-[10px] leading-relaxed text-text-muted">
                  {JSON.stringify(history, null, 2)}
                </pre>
              </details>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

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

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-text-muted' : 'text-text-muted'}>
        {label}
      </span>
      <span
        className={
          accent
            ? 'font-semibold text-orange'
            : muted
              ? 'text-text-muted italic'
              : 'text-text'
        }
      >
        {value}
      </span>
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
      {Object.keys(call.args).length > 0 && (
        <span className="mx-1 opacity-60">·</span>
      )}
      {Object.keys(call.args).length > 0 && (
        <span className="opacity-70">{JSON.stringify(call.args)}</span>
      )}
    </div>
  );
}

function LatencyLine({ latency }: { latency: LatencyBreakdown }) {
  return (
    <p className="text-[10px] text-text-muted">
      STT {latency.stt}ms · Brain {latency.brain}ms · TTS {latency.tts}ms ·
      total {latency.totalMouthToEar}ms mouth-to-ear
    </p>
  );
}
