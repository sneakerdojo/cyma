import { useCallback } from 'react';

export interface HistoryEntry {
  stepId: string;
  /** Human-readable field label e.g. "Service" */
  label: string;
  /** The user's answer e.g. "AI Agents & Automations" */
  value: string;
}

export interface HistoryDrawerProps {
  isOpen: boolean;
  entries: HistoryEntry[];
  onEdit: (stepId: string) => void;
}

/**
 * HistoryDrawer — collapsible panel showing the user's past answers.
 * When open it slides down via max-height transition (300ms ease).
 * Each entry shows: label (muted) · value (white bold) · Edit link (orange).
 * Single-responsibility: display and allow editing of completed step answers.
 */
export default function HistoryDrawer({ isOpen, entries, onEdit }: HistoryDrawerProps) {
  const handleEdit = useCallback(
    (stepId: string) => {
      onEdit(stepId);
    },
    [onEdit],
  );

  return (
    <div
      aria-expanded={isOpen}
      aria-label="Your previous answers"
      style={{
        maxHeight: isOpen ? '300px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 300ms ease',
      }}
    >
      {/* Inner content — padding only applies when open to avoid layout shift */}
      <div className="px-5 pb-2.5 pt-1">
        <p className="text-[10px] text-text-muted uppercase tracking-[1px] mb-1.5">
          {entries.length > 3 ? 'Your last 3 answers' : 'Your answers'}
        </p>

        <div className="flex flex-col gap-1.5">
          {entries.length === 0 ? (
            <p className="text-xs text-text-muted italic">No answers yet.</p>
          ) : (
            // Only ever show the most recent 3 — older answers stay editable
            // through the conversation flow but don't clutter the drawer.
            entries.slice(-3).map((entry) => (
              <div
                key={entry.stepId}
                className="flex items-center justify-between px-3 py-2 bg-surface border border-border rounded-lg text-xs"
              >
                {/* Label + value */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-text-muted flex-shrink-0">{entry.label}:</span>
                  <span className="text-text font-medium truncate">{entry.value}</span>
                </div>

                {/* Edit link — minimum 44px tap target via padding */}
                <button
                  type="button"
                  onClick={() => handleEdit(entry.stepId)}
                  aria-label={`Edit ${entry.label} answer`}
                  className="ml-2 flex-shrink-0 text-orange text-[10px] font-medium px-2 py-1.5 min-h-[32px] hover:text-orange-light transition-colors duration-150"
                >
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
