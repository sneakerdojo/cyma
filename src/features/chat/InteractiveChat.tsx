/**
 * InteractiveChat — step-based guided discovery conversation.
 *
 * Architecture:
 *   - All conversation state lives here (stepIndex, answers, stepData, history).
 *   - On mount: fetches step 0 from POST /chat/step.
 *   - On answer: stores answer, increments stepIndex, fetches next step.
 *   - History edit: resets stepIndex to edited step, clears downstream answers,
 *     re-fetches the step with updated context.
 *   - The backend is fully stateless — every request carries all prior answers.
 *
 * SOLID adherence:
 *   - Single responsibility: this component owns step sequencing + rendering
 *     dispatch only. Each UI panel is its own component.
 *   - Open/closed: adding new componentTypes only requires a new case in the
 *     renderStep switch — no other logic changes.
 *   - Liskov: all panel components satisfy a consistent props contract.
 *   - Interface segregation: WizardContext and OrbState are imported from the
 *     shared types file, not redeclared here.
 *   - Dependency inversion: fetch is injected via the STEP_ENDPOINT constant;
 *     no direct coupling to a specific HTTP library.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { History } from 'lucide-react';

import ChoiceSelector from './components/ChoiceSelector';
import MultiSelector from './components/MultiSelector';
import TextInputPanel from './components/TextInputPanel';
import FileUploadPanel from './components/FileUploadPanel';
import SchedulerPanel, { type AvailableSlot } from './components/SchedulerPanel';
import HistoryDrawer, { type HistoryEntry } from './components/HistoryDrawer';
import ThinkingState from './components/ThinkingState';
import TextFallback from './components/TextFallback';
import VoiceOverlay from './components/VoiceOverlay';
import type { WizardContext, OrbState } from './types';

// ---------------------------------------------------------------------------
// Re-export OrbState so OctoFreeChat continues to import it from this file
// ---------------------------------------------------------------------------

export type { OrbState };

// ---------------------------------------------------------------------------
// Step response shapes returned by POST /chat/step
// ---------------------------------------------------------------------------

interface BaseStepResponse {
  done: false;
  stepId: string;
}

interface ChoiceStepResponse extends BaseStepResponse {
  componentType: 'choice';
  title: string;
  detail: string;
  options: string[];
}

interface TextStepResponse extends BaseStepResponse {
  componentType: 'text';
  title: string;
  detail: string;
}

interface MultiStepResponse extends BaseStepResponse {
  componentType: 'multi';
  title: string;
  detail: string;
  options: string[];
}

interface UploadStepResponse extends BaseStepResponse {
  componentType: 'upload';
  title: string;
  detail: string;
}

interface SchedulerStepResponse extends BaseStepResponse {
  componentType: 'scheduler';
  title: string;
  detail: string;
  slots: AvailableSlot[];
}

interface SummaryStepResponse extends BaseStepResponse {
  componentType: 'summary';
  title: string;
  detail: string;
  summaryMarkdown: string;
  agenda: string[];
}

type StepResponse =
  | ChoiceStepResponse
  | TextStepResponse
  | MultiStepResponse
  | UploadStepResponse
  | SchedulerStepResponse
  | SummaryStepResponse;

type DoneResponse = { done: true };

type StepApiResponse = StepResponse | DoneResponse;

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface InteractiveChatProps {
  sessionId: string;
  contactId?: string;
  wizardContext: WizardContext;
  onOrbStateChange?: (state: OrbState) => void;
}

// ---------------------------------------------------------------------------
// Voice state — kept minimal, wired to MediaRecorder
// ---------------------------------------------------------------------------

interface VoiceState {
  recording: boolean;
  transcribing: boolean;
  result?: string;
  duration: number;
}

// ---------------------------------------------------------------------------
// API endpoint — resolved relative to the backend base URL.
// In development the Vite proxy forwards /chat/* → http://localhost:3000/chat/*.
// ---------------------------------------------------------------------------

const STEP_ENDPOINT = '/chat/step';

// ---------------------------------------------------------------------------
// QuestionHeader — title + detail above each interactive component
// ---------------------------------------------------------------------------

function QuestionHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mb-4">
      <p className="text-xl font-bold leading-snug text-text">{title}</p>
      {detail && (
        <p className="mt-1 text-[13px] text-text-muted leading-relaxed">{detail}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryView — final step: markdown + agenda + blueprint offer
// ---------------------------------------------------------------------------

function SummaryView({
  summaryMarkdown,
  agenda,
  onBlueprintChoice,
}: {
  summaryMarkdown: string;
  agenda: string[];
  onBlueprintChoice: (choice: string) => void;
}) {
  const [blueprintChosen, setBlueprintChosen] = useState(false);

  const handleChoice = (choice: string) => {
    setBlueprintChosen(true);
    onBlueprintChoice(choice);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Markdown summary */}
      <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:text-orange prose-strong:text-text prose-code:text-orange prose-code:bg-bg prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none text-sm leading-relaxed text-text-muted">
        <Markdown>{summaryMarkdown}</Markdown>
      </div>

      {/* Call agenda */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Your call agenda
        </p>
        <ul className="flex flex-col gap-2">
          {agenda.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text">
              <span className="shrink-0 w-5 h-5 rounded-full bg-orange/20 border border-orange/40 text-orange text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Blueprint offer */}
      {!blueprintChosen && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-text">
            Would you like a project blueprint before the call?
          </p>
          <p className="text-[13px] text-text-muted">
            We'll send a tailored technical outline to your email so you can review
            it before we meet.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Yes, send me a blueprint', 'No thanks'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleChoice(opt)}
                className="px-5 py-2.5 rounded-xl border border-border bg-surface text-sm text-text hover:border-orange hover:bg-orange/10 transition-all duration-200"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {blueprintChosen && (
        <p className="text-sm text-text-muted animate-fade-up">
          Got it — see you on the call.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InteractiveChat — root component
// ---------------------------------------------------------------------------

export default function InteractiveChat({
  sessionId,
  wizardContext,
  onOrbStateChange,
}: InteractiveChatProps) {
  // ------ Conversation state ------
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepData, setStepData] = useState<StepResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // ------ History ------
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ------ Animation key — increments on each new step to re-trigger CSS ------
  const [stepKey, setStepKey] = useState(0);

  // ------ Voice ------
  const [voiceState, setVoiceState] = useState<VoiceState>({
    recording: false,
    transcribing: false,
    duration: 0,
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<number | null>(null);

  // ------ Orb helper ------
  const notifyOrbState = useCallback(
    (state: OrbState) => {
      onOrbStateChange?.(state);
    },
    [onOrbStateChange],
  );

  // ---------------------------------------------------------------------------
  // fetchStep — POST /chat/step with current stepIndex + all answers
  // ---------------------------------------------------------------------------

  const fetchStep = useCallback(
    async (index: number, currentAnswers: Record<string, string>) => {
      setLoading(true);
      setError(null);
      notifyOrbState('thinking');

      try {
        const res = await fetch(STEP_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': sessionId,
          },
          body: JSON.stringify({
            stepIndex: index,
            answers: currentAnswers,
            wizardContext: {
              selectedService: wizardContext.selectedService,
              budget: wizardContext.budget,
              requirements: wizardContext.requirements,
              contact: wizardContext.contact,
            },
          }),
        });

        if (!res.ok) {
          throw new Error(`Step request failed: ${res.status}`);
        }

        const data = (await res.json()) as StepApiResponse;

        if (data.done) {
          setDone(true);
        } else {
          setStepData(data);
          setStepKey((k) => k + 1);
          notifyOrbState('speaking');
          // Brief speaking window then back to idle
          window.setTimeout(() => notifyOrbState('idle'), 500);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error';
        setError(msg);
        notifyOrbState('idle');
      } finally {
        setLoading(false);
      }
    },
    [sessionId, wizardContext, notifyOrbState],
  );

  // ---------------------------------------------------------------------------
  // Mount: fetch step 0
  // ---------------------------------------------------------------------------

  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    void fetchStep(0, {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // handleAnswer — called by every interactive component when user responds
  // ---------------------------------------------------------------------------

  const handleAnswer = useCallback(
    (value: string) => {
      if (!stepData) return;

      const updatedAnswers = { ...answers, [stepData.stepId]: value };
      setAnswers(updatedAnswers);

      // Append to history
      setHistory((prev) => [
        ...prev,
        {
          stepId: stepData.stepId,
          label: stepData.title,
          value,
        },
      ]);

      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      void fetchStep(nextIndex, updatedAnswers);
    },
    [stepData, answers, stepIndex, fetchStep],
  );

  // ---------------------------------------------------------------------------
  // handleHistoryEdit — restart from step N, clear downstream answers
  // ---------------------------------------------------------------------------

  const handleHistoryEdit = useCallback(
    (editedStepId: string) => {
      // Find the index of the edited step in our steps sequence
      const editedHistoryIndex = history.findIndex((e) => e.stepId === editedStepId);
      if (editedHistoryIndex === -1) return;

      // Clear answers for edited step and all steps after it
      const stepsToKeep = history.slice(0, editedHistoryIndex);
      const keptAnswers = stepsToKeep.reduce<Record<string, string>>((acc, e) => {
        acc[e.stepId] = e.value;
        return acc;
      }, {});

      // Map stepId back to stepIndex using STEP_ID_TO_INDEX mapping
      const stepId = editedStepId;
      const stepDefs = [
        'main_problem',   // 0
        'problem_detail', // 1
        'approach',       // 2
        'team_size',      // 3
        'timeline',       // 4
        'pain_points',    // 5
        'files',          // 6
        'schedule',       // 7
        'summary',        // 8
      ];
      const targetIndex = stepDefs.indexOf(stepId);
      if (targetIndex === -1) return;

      setAnswers(keptAnswers);
      setHistory(stepsToKeep);
      setStepIndex(targetIndex);
      setDone(false);
      setHistoryOpen(false);

      void fetchStep(targetIndex, keptAnswers);
    },
    [history, fetchStep],
  );

  // ---------------------------------------------------------------------------
  // Voice handlers
  // ---------------------------------------------------------------------------

  const stopDurationInterval = useCallback(() => {
    if (durationIntervalRef.current !== null) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopDurationInterval();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [stopDurationInterval]);

  const handleMicStart = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = 'audio/webm';
      if (
        typeof MediaRecorder !== 'undefined' &&
        !MediaRecorder.isTypeSupported('audio/webm')
      ) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
          mimeType = 'audio/mpeg';
        } else {
          mimeType = '';
        }
      }

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        setVoiceState((s) => ({ ...s, recording: false, transcribing: true }));
        notifyOrbState('thinking');

        // Stub transcription — /voice/transcribe endpoint is a future task
        void Promise.resolve('[Voice transcription coming soon]').then(
          (transcribed) => {
            setVoiceState({
              recording: false,
              transcribing: false,
              result: transcribed,
              duration: 0,
            });
            notifyOrbState('idle');

            window.setTimeout(() => {
              setVoiceState({
                recording: false,
                transcribing: false,
                result: undefined,
                duration: 0,
              });
            }, 1800);

            console.debug(
              '[InteractiveChat] voice blob ready:',
              blob.size,
              'bytes',
            );
          },
        );
      };

      recorder.start();
      setVoiceState({ recording: true, transcribing: false, duration: 0 });
      notifyOrbState('listening');

      durationIntervalRef.current = window.setInterval(() => {
        setVoiceState((s) => ({ ...s, duration: s.duration + 1 }));
      }, 1000);
    } catch (err) {
      console.error('[InteractiveChat] mic access denied:', err);
    }
  }, [notifyOrbState]);

  const handleMicStop = useCallback(() => {
    stopDurationInterval();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  }, [stopDurationInterval]);

  // ---------------------------------------------------------------------------
  // renderStep — dispatches to the correct panel based on componentType
  // ---------------------------------------------------------------------------

  const renderStep = (data: StepResponse) => {
    switch (data.componentType) {
      case 'choice':
        return (
          <div className="flex flex-col gap-4">
            <QuestionHeader title={data.title} detail={data.detail} />
            <ChoiceSelector
              options={data.options}
              allowCustom={true}
              onSelect={handleAnswer}
            />
          </div>
        );

      case 'text':
        return (
          <div className="flex flex-col gap-4">
            <QuestionHeader title={data.title} detail={data.detail} />
            <TextInputPanel
              multiline={true}
              onSubmit={handleAnswer}
              onMicStart={handleMicStart}
              onMicStop={handleMicStop}
              isRecording={voiceState.recording}
            />
          </div>
        );

      case 'multi':
        return (
          <div className="flex flex-col gap-4">
            <QuestionHeader title={data.title} detail={data.detail} />
            <MultiSelector
              options={data.options}
              minSelect={1}
              onConfirm={(selected) => handleAnswer(selected.join(', '))}
            />
          </div>
        );

      case 'upload':
        return (
          <div className="flex flex-col gap-4">
            <QuestionHeader title={data.title} detail={data.detail} />
            <FileUploadPanel
              allowSkip={true}
              onUpload={(file) => handleAnswer(`[File: ${file.name}]`)}
              onSkip={() => handleAnswer('Skipped')}
              onTextSend={handleAnswer}
              onMicStart={handleMicStart}
              onMicStop={handleMicStop}
              isRecording={voiceState.recording}
            />
          </div>
        );

      case 'scheduler':
        return (
          <div className="flex flex-col gap-4">
            <QuestionHeader title={data.title} detail={data.detail} />
            <SchedulerPanel
              slots={data.slots}
              onSelect={(slot: AvailableSlot) => handleAnswer(slot.label)}
              onTextSend={handleAnswer}
              onMicStart={handleMicStart}
              onMicStop={handleMicStop}
              isRecording={voiceState.recording}
            />
          </div>
        );

      case 'summary':
        return (
          <div className="flex flex-col gap-4">
            <QuestionHeader title={data.title} detail={data.detail} />
            <SummaryView
              summaryMarkdown={data.summaryMarkdown}
              agenda={data.agenda}
              onBlueprintChoice={handleAnswer}
            />
          </div>
        );

      default: {
        // Exhaustive check — TypeScript will error if a new componentType is added
        // to the union without a corresponding case here.
        const _exhaustive: never = data;
        void _exhaustive;
        return null;
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const showVoiceOverlay = voiceState.recording || voiceState.transcribing;

  return (
    <div className="flex flex-col gap-6">
      {/* History toggle header */}
      {history.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            aria-pressed={historyOpen}
            aria-label={historyOpen ? 'Close history' : 'Show your previous answers'}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors px-3 py-2 rounded-lg border border-border/50 hover:border-border bg-surface"
          >
            <History size={13} />
            {historyOpen ? 'Hide history' : 'History'}
            <span className="ml-1 text-orange font-medium">{history.length}</span>
          </button>
        </div>
      )}

      {/* History drawer */}
      <HistoryDrawer
        isOpen={historyOpen}
        entries={history}
        onEdit={handleHistoryEdit}
      />

      {/* Step zone */}
      {loading ? (
        <ThinkingState />
      ) : done ? (
        <div className="flex flex-col gap-3 animate-fade-up">
          <p className="text-lg font-semibold text-text">
            All set — we'll see you on the call.
          </p>
          <p className="text-sm text-text-muted">
            Check your email for the calendar invite with the Meet link.
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col gap-3 animate-fade-up">
          <p className="text-sm text-red-400">
            Something went wrong — {error}
          </p>
          <button
            type="button"
            onClick={() => void fetchStep(stepIndex, answers)}
            className="self-start px-4 py-2 rounded-lg border border-border text-sm text-text hover:border-orange transition-colors"
          >
            Try again
          </button>
        </div>
      ) : stepData ? (
        /* key={stepKey} remounts the node on each step, re-triggering CSS animation */
        <div key={stepKey} className="animate-fade-up">
          {renderStep(stepData)}
        </div>
      ) : null}

      {/* Voice overlay */}
      {showVoiceOverlay && (
        <VoiceOverlay
          isRecording={voiceState.recording}
          isTranscribing={voiceState.transcribing}
          transcriptionResult={voiceState.result}
          recordingDuration={voiceState.duration}
          onStop={handleMicStop}
        />
      )}
    </div>
  );
}
