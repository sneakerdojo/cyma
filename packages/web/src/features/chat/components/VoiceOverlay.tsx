import { Square } from 'lucide-react';

export interface VoiceOverlayProps {
  isRecording: boolean;
  isTranscribing: boolean;
  transcriptionResult?: string;
  recordingDuration: number; // seconds
  onStop: () => void;
}

/**
 * VoiceOverlay — covers the component area (NOT full screen).
 * Orb + question text sit above this overlay.
 *
 * States:
 *   recording  → animated waveform bars + timer + "Listening..." + stop button
 *   transcribing → flattened bars (low opacity) + "Transcribing..."
 *   transcribed  → result text fades in + "Transcribed"
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function statusLabel(
  isRecording: boolean,
  isTranscribing: boolean,
  hasResult: boolean,
): string {
  if (hasResult) return 'Transcribed';
  if (isTranscribing) return 'Transcribing...';
  return 'Listening...';
}

// 20 bars with staggered animation delays via CSS custom property --i
const BAR_COUNT = 20;

export default function VoiceOverlay({
  isRecording,
  isTranscribing,
  transcriptionResult,
  recordingDuration,
  onStop,
}: VoiceOverlayProps) {
  const hasResult = !!transcriptionResult;
  const isFlattened = isTranscribing || hasResult;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Voice recording overlay"
      className="flex flex-col items-center justify-center gap-5 rounded-xl bg-bg border border-border p-6 animate-fade-in"
    >
      {/* Waveform — 20 animated vertical bars */}
      <div
        className="flex items-end justify-center gap-[3px] h-12"
        aria-hidden="true"
      >
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <span
            key={i}
            className={[
              'w-1 rounded-sm bg-orange transition-all duration-500',
              isFlattened
                ? 'opacity-30'
                : 'animate-[waveBar_1.2s_ease-in-out_infinite]',
            ].join(' ')}
            style={
              isFlattened
                ? { height: '4px' }
                : {
                    // Height varies 8px–40px based on bar index for a natural look
                    height: `${8 + Math.abs(Math.sin((i * 0.7))) * 32}px`,
                    animationDelay: `${(i * 60) % 600}ms`,
                  }
            }
          />
        ))}
      </div>

      {/* Timer */}
      <p
        className="text-3xl font-display font-bold tabular-nums tracking-tight"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        aria-label={`Recording duration: ${formatDuration(recordingDuration)}`}
      >
        {formatDuration(recordingDuration)}
      </p>

      {/* Status */}
      <p className="text-sm text-text-muted">
        {statusLabel(isRecording, isTranscribing, hasResult)}
      </p>

      {/* Transcription result */}
      {hasResult && (
        <p className="text-center text-sm text-text leading-relaxed max-w-xs animate-fade-in">
          &ldquo;{transcriptionResult}&rdquo;
        </p>
      )}

      {/* Stop button — only visible during active recording */}
      {isRecording && !isTranscribing && !hasResult && (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop recording"
          className="w-14 h-14 rounded-full bg-orange flex items-center justify-center hover:bg-orange-light transition-all duration-200 animate-fade-in"
        >
          <Square size={20} className="text-bg" fill="currentColor" />
        </button>
      )}
    </div>
  );
}
