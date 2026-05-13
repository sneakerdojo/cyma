import { useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import TextFallback from './TextFallback';

export interface MultiSelectorProps {
  options: string[];
  /** Minimum number of items required before confirm is enabled (default: 1) */
  minSelect?: number;
  /** Maximum number of items that may be selected (no cap if undefined) */
  maxSelect?: number;
  onConfirm: (selected: string[]) => void;
}

/**
 * MultiSelector — checkbox list with a confirm button.
 * Each row is a tappable surface that toggles inclusion.
 * Confirm is disabled until minSelect is met.
 * A TextFallback below lets the user type a custom answer.
 * Single-responsibility: collect a set of selections then confirm.
 */
export default function MultiSelector({
  options,
  minSelect = 1,
  maxSelect,
  onConfirm,
}: MultiSelectorProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);

  const toggleOption = useCallback(
    (option: string) => {
      if (confirmed) return;
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(option)) {
          next.delete(option);
        } else {
          // Respect maxSelect cap
          if (maxSelect !== undefined && next.size >= maxSelect) return prev;
          next.add(option);
        }
        return next;
      });
    },
    [confirmed, maxSelect],
  );

  const handleConfirm = useCallback(() => {
    if (confirmed || checked.size < minSelect) return;
    setConfirmed(true);
    onConfirm(Array.from(checked));
  }, [confirmed, checked, minSelect, onConfirm]);

  const handleCustomSend = useCallback(
    (text: string) => {
      if (confirmed) return;
      setConfirmed(true);
      // Merge typed answer with any checked items
      const selections = checked.size > 0 ? [...Array.from(checked), text] : [text];
      onConfirm(selections);
    },
    [confirmed, checked, onConfirm],
  );

  const canConfirm = checked.size >= minSelect && !confirmed;
  const noop = () => {};

  return (
    <div>
      {/* Checkbox list */}
      <div className="flex flex-col gap-2 mb-3">
        {options.map((option) => {
          const isChecked = checked.has(option);
          return (
            <button
              key={option}
              type="button"
              role="checkbox"
              aria-checked={isChecked}
              onClick={() => toggleOption(option)}
              disabled={confirmed}
              className={[
                'flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl border text-sm text-left transition-all duration-200',
                'disabled:cursor-not-allowed',
                isChecked
                  ? 'border-orange bg-orange/10'
                  : 'border-border bg-surface hover:border-border/80 hover:bg-surface-2 disabled:opacity-50',
              ].join(' ')}
            >
              {/* Checkbox visual */}
              <span
                className={[
                  'w-[18px] h-[18px] flex-shrink-0 rounded flex items-center justify-center border-2 transition-all duration-150',
                  isChecked
                    ? 'bg-orange border-orange'
                    : 'border-border bg-transparent',
                ].join(' ')}
                aria-hidden="true"
              >
                {isChecked && <Check size={11} strokeWidth={3} className="text-bg" />}
              </span>

              <span className={isChecked ? 'text-text font-medium' : 'text-text'}>
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Min/max selection hint */}
      {maxSelect !== undefined && (
        <p className="text-[11px] text-text-muted mb-2">
          Select up to {maxSelect}
          {minSelect > 1 ? ` (at least ${minSelect})` : ''}
        </p>
      )}

      {/* Confirm button */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!canConfirm}
        className="w-full py-2.5 min-h-[44px] rounded-xl bg-orange text-bg text-sm font-semibold transition-all duration-200 hover:bg-orange-light disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Confirm
        {checked.size > 0 && ` (${checked.size})`}
      </button>

      {/* Custom typed answer */}
      <TextFallback
        onSend={handleCustomSend}
        onMicStart={noop}
        onMicStop={noop}
      />
    </div>
  );
}
