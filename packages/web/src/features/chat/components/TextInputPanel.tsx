import { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { Send, Mic } from 'lucide-react';

export interface TextInputPanelProps {
  placeholder?: string;
  /** When true, renders a textarea with multiple rows instead of a single-line input */
  multiline?: boolean;
  onSubmit: (text: string) => void;
  /** Voice input callbacks — wired from the InteractiveChat orchestrator */
  onMicStart?: () => void;
  onMicStop?: () => void;
  isRecording?: boolean;
}

/**
 * TextInputPanel — the primary text-entry component for show_text_input tool calls.
 * This IS the full component — no TextFallback below (it IS the fallback for this type).
 * Send button + mic button aligned to the bottom-right.
 * Single-responsibility: capture and submit free-form text (or kick off voice).
 */
export default function TextInputPanel({
  placeholder = 'Type your answer…',
  multiline = false,
  onSubmit,
  onMicStart,
  onMicStop,
  isRecording = false,
}: TextInputPanelProps) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || submitted) return;
    setSubmitted(true);
    onSubmit(trimmed);
  }, [value, submitted, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      // For single-line: Enter submits. For multiline: Shift+Enter = newline, Enter alone submits.
      if (e.key === 'Enter') {
        if (!multiline || !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }
    },
    [multiline, handleSubmit],
  );

  const handleMicToggle = useCallback(() => {
    if (isRecording) {
      onMicStop?.();
    } else {
      onMicStart?.();
    }
  }, [isRecording, onMicStart, onMicStop]);

  const sharedInputClasses = [
    'flex-1 min-w-0 px-4 py-3 bg-surface border border-border rounded-xl',
    'text-text text-sm placeholder:text-text-muted/50',
    'focus:outline-none focus:border-orange/50 focus:ring-1 focus:ring-orange/20',
    'transition-all resize-none',
  ].join(' ');

  return (
    <div className="flex flex-col gap-2">
      {multiline ? (
        /* Multiline textarea */
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={5}
            maxLength={5000}
            disabled={submitted}
            className={[sharedInputClasses, 'w-full leading-relaxed disabled:opacity-50'].join(' ')}
          />
          {value.length > 4000 && (
            <p className="absolute bottom-2 right-3 text-[10px] text-text-muted/60">
              {value.length} / 5000
            </p>
          )}
        </div>
      ) : (
        /* Single-line input */
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={1000}
          disabled={submitted}
          className={[sharedInputClasses, 'min-h-[44px] disabled:opacity-50'].join(' ')}
        />
      )}

      {/* Action row — mic + send aligned right */}
      <div className="flex items-center justify-end gap-2">
        {/* Mic button — 44px tap target */}
        <button
          type="button"
          onClick={handleMicToggle}
          disabled={submitted}
          aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
          className={[
            'w-11 h-11 flex-shrink-0 rounded-full border flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
            isRecording
              ? 'bg-orange border-orange text-bg animate-pulse'
              : 'bg-surface border-border text-text-muted hover:border-orange/60 hover:text-orange',
          ].join(' ')}
        >
          <Mic size={16} />
        </button>

        {/* Send button — 44px tap target */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || submitted}
          aria-label="Submit answer"
          className="w-11 h-11 flex-shrink-0 rounded-full bg-orange flex items-center justify-center transition-all duration-200 hover:bg-orange-light disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} className="text-bg" />
        </button>
      </div>

      {multiline && (
        <p className="text-[11px] text-text-muted/60">
          Press Enter to send · Shift+Enter for new line
        </p>
      )}
    </div>
  );
}
