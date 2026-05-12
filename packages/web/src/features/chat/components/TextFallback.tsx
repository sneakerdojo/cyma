import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Mic } from 'lucide-react';

export interface TextFallbackProps {
  placeholder?: string;
  onSend: (text: string) => void;
  onMicStart: () => void;
  onMicStop: () => void;
  isRecording?: boolean;
}

/**
 * TextFallback — integrated "or type your answer" row.
 * Used inside ChoiceSelector, MultiSelector, FileUploadPanel, FormPanel.
 * Single-responsibility: text input + mic trigger + send.
 */
export default function TextFallback({
  placeholder = 'Or type your answer…',
  onSend,
  onMicStart,
  onMicStop,
  isRecording = false,
}: TextFallbackProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleMicToggle = useCallback(() => {
    if (isRecording) {
      onMicStop();
    } else {
      onMicStart();
    }
  }, [isRecording, onMicStart, onMicStop]);

  return (
    <div className="mt-3">
      <p className="text-[11px] text-text-muted mb-1.5 uppercase tracking-wide">
        Or type your answer
      </p>

      <div className="flex items-center gap-2">
        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3.5 py-2.5 bg-surface border border-border rounded-xl text-text text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 focus:ring-1 focus:ring-orange/20 transition-all min-h-[44px]"
        />

        {/* Mic button — 44px tap target */}
        <button
          type="button"
          onClick={handleMicToggle}
          aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
          className={[
            'w-11 h-11 flex-shrink-0 rounded-full border flex items-center justify-center transition-all duration-200',
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
          onClick={handleSend}
          disabled={!value.trim()}
          aria-label="Send answer"
          className="w-11 h-11 flex-shrink-0 rounded-full bg-orange flex items-center justify-center transition-all duration-200 hover:bg-orange-light disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} className="text-bg" />
        </button>
      </div>
    </div>
  );
}
