import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import TextFallback from './TextFallback';

export interface AvailableSlot {
  start: string; // ISO datetime
  end: string;
  label: string; // e.g. "Mon 14 Apr · 9:00 AM"
}

export interface SchedulerPanelProps {
  slots: AvailableSlot[];
  onSelect: (slot: AvailableSlot) => void;
  onTextSend?: (text: string) => void;
  onMicStart?: () => void;
  onMicStop?: () => void;
  isRecording?: boolean;
}

// Fixed time slots shown for each day — unavailable ones are greyed out
const FIXED_TIMES = ['09:00', '11:00', '14:00', '16:00'];

function isoDateKey(iso: string): string {
  // Returns "YYYY-MM-DD" portion for grouping
  return iso.slice(0, 10);
}

function slotHour(iso: string): string {
  // Extracts "HH:MM" from ISO datetime for matching
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDayLabel(iso: string): { short: string; num: string; month: string } {
  const d = new Date(iso);
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    short: days[d.getDay()],
    num: String(d.getDate()),
    month: months[d.getMonth()],
  };
}

function formatTimeDisplay(time: string): string {
  const [h] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:00 ${ampm}`;
}

/**
 * SchedulerPanel — groups available slots by date, renders a day picker
 * and a 2-column time grid. Fixed 4 time slots per day are shown;
 * slots not in the available list are greyed out with strikethrough.
 */
export default function SchedulerPanel({
  slots,
  onSelect,
  onTextSend,
  onMicStart,
  onMicStop,
  isRecording = false,
}: SchedulerPanelProps) {
  // Group available slots by date key
  const slotsByDate = useMemo<Record<string, AvailableSlot[]>>(() => {
    return slots.reduce<Record<string, AvailableSlot[]>>((acc, slot) => {
      const key = isoDateKey(slot.start);
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {});
  }, [slots]);

  // Unique sorted date keys that have at least one slot
  const dateKeys = useMemo<string[]>(
    () => Object.keys(slotsByDate).sort(),
    [slotsByDate],
  );

  const [selectedDayKey, setSelectedDayKey] = useState<string>(dateKeys[0] ?? '');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const slotsForDay = slotsByDate[selectedDayKey] ?? [];

  const findSlotForTime = (time: string): AvailableSlot | undefined =>
    slotsForDay.find((s) => slotHour(s.start) === time);

  const handleSlotClick = (slot: AvailableSlot) => {
    if (confirmed) return;
    setSelectedSlot(slot);
    onSelect(slot);
    setConfirmed(true);
  };

  if (dateKeys.length === 0) {
    return (
      <div className="flex flex-col gap-3 animate-fade-up">
        <p className="text-sm text-text-muted">No available slots at this time.</p>
        {onTextSend && (
          <TextFallback
            placeholder="Or type a preferred time…"
            onSend={onTextSend}
            onMicStart={onMicStart ?? (() => {})}
            onMicStop={onMicStop ?? (() => {})}
            isRecording={isRecording}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      {/* Day picker — horizontal scroll */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {dateKeys.map((key) => {
            const { short, num, month } = formatDayLabel(key + 'T00:00:00');
            const isActive = key === selectedDayKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDayKey(key);
                  setSelectedSlot(null);
                  setConfirmed(false);
                }}
                className={[
                  'flex-shrink-0 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 min-h-[44px] min-w-[60px]',
                  isActive
                    ? 'border-orange bg-orange/10 text-text'
                    : 'border-border bg-surface text-text-muted hover:border-orange/40 hover:text-text',
                ].join(' ')}
              >
                <div className="font-bold text-[10px] tracking-widest">{short}</div>
                <div className="text-sm font-display font-bold">{num}</div>
                <div className="text-[10px] opacity-70">{month}</div>
              </button>
            );
          })}
        </div>
        {/* Right-edge fade to indicate scrollability */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg to-transparent pointer-events-none" />
      </div>

      {/* 2-column time slot grid */}
      <div className="grid grid-cols-2 gap-3">
        {FIXED_TIMES.map((time, i) => {
          const slot = findSlotForTime(time);
          const isAvailable = !!slot;
          const isSelected = selectedSlot?.start === slot?.start;

          if (!isAvailable) {
            return (
              <div
                key={time}
                className="flex flex-col items-center gap-1 px-4 py-4 rounded-xl border border-border/40 bg-surface/50 opacity-40 select-none"
                aria-disabled="true"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Clock size={14} className="text-text-muted" />
                <span className="text-sm font-display font-semibold text-text-muted line-through">
                  {formatTimeDisplay(time)}
                </span>
              </div>
            );
          }

          return (
            <button
              key={time}
              type="button"
              onClick={() => handleSlotClick(slot!)}
              disabled={confirmed && !isSelected}
              className={[
                'flex flex-col items-center gap-1 px-4 py-4 rounded-xl border transition-all duration-200 min-h-[44px]',
                'opacity-0 animate-fade-up',
                isSelected
                  ? 'border-orange bg-orange/15 text-orange'
                  : 'border-border bg-surface hover:border-orange hover:bg-orange/10 text-text',
                confirmed && !isSelected ? 'opacity-30 cursor-not-allowed' : '',
              ].join(' ')}
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
            >
              <Clock
                size={14}
                className={isSelected ? 'text-orange' : 'text-text-muted'}
              />
              <span className="text-sm font-display font-semibold">
                {formatTimeDisplay(time)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border border-border/40 bg-surface/50 opacity-40 inline-block" />
          Unavailable
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border border-orange bg-orange/20 inline-block" />
          Selected
        </span>
      </div>

      {/* Integrated text fallback */}
      {onTextSend && (
        <TextFallback
          placeholder="Or type a preferred time…"
          onSend={onTextSend}
          onMicStart={onMicStart ?? (() => {})}
          onMicStop={onMicStop ?? (() => {})}
          isRecording={isRecording}
        />
      )}
    </div>
  );
}
