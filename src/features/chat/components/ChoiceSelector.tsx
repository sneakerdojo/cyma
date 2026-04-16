import { useState, useCallback } from 'react';
import TextFallback from './TextFallback';

export interface ChoiceSelectorProps {
  options: string[];
  /** When true (default), show "Or type your answer" TextFallback below buttons */
  allowCustom?: boolean;
  onSelect: (value: string) => void;
}

/**
 * ChoiceSelector — single-select button grid.
 * Selecting a button highlights it (orange) and calls onSelect.
 * If allowCustom, a TextFallback row appears below for typed answers.
 * Single-responsibility: presents a fixed set of choices for one selection.
 */
export default function ChoiceSelector({
  options,
  allowCustom = true,
  onSelect,
}: ChoiceSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const handleSelect = useCallback(
    (option: string) => {
      if (locked) return;
      setSelected(option);
      setLocked(true);
      onSelect(option);
    },
    [locked, onSelect],
  );

  const handleCustomSend = useCallback(
    (text: string) => {
      if (locked) return;
      setLocked(true);
      onSelect(text);
    },
    [locked, onSelect],
  );

  // Mic handlers are stubs here — the parent orchestrator owns voice state.
  // TextFallback exposes the callbacks; the parent wires them up.
  const noop = () => {};

  return (
    <div>
      {/* Button grid */}
      <div className="flex flex-wrap gap-2 mb-1">
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              disabled={locked}
              aria-pressed={isSelected}
              className={[
                // Base — minimum 44px height for tap target
                'px-4 py-2.5 min-h-[44px] rounded-xl border text-sm font-medium transition-all duration-200',
                'disabled:cursor-not-allowed',
                isSelected
                  ? 'border-orange bg-orange/15 text-orange'
                  : 'border-border bg-surface text-text hover:border-orange/60 hover:bg-surface-2 disabled:opacity-50',
              ].join(' ')}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Optional typed-answer fallback */}
      {allowCustom && (
        <TextFallback
          onSend={handleCustomSend}
          onMicStart={noop}
          onMicStop={noop}
        />
      )}
    </div>
  );
}
