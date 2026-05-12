import { useMemo, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import type { TimeSlot } from './types';

interface OctoTimeSlotProps {
  visible: boolean;
  onSelect: (slot: TimeSlot) => void;
}

const TIME_SLOTS = ['09:00', '11:00', '14:00', '16:00'];

function formatTimeLabel(time: string): string {
  const [h] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:00 ${ampm}`;
}

function formatDateLabel(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function generateBusinessDays(count: number): Date[] {
  const days: Date[] = [];
  const current = new Date();
  current.setDate(current.getDate() + 1); // start tomorrow

  while (days.length < count) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export default function OctoTimeSlot({ visible, onSelect }: OctoTimeSlotProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  // Bug #6: prevent double-click on time slots
  const [slotSelected, setSlotSelected] = useState(false);

  const days = useMemo(() => generateBusinessDays(5), []);

  if (!visible) return null;

  const selectedDay = days[selectedDayIdx];

  const handleSlotClick = (time: string) => {
    if (slotSelected) return;
    setSlotSelected(true);
    const slot: TimeSlot = {
      id: `${selectedDay.toISOString()}-${time}`,
      dateLabel: formatDateLabel(selectedDay),
      time,
      label: `${formatDateLabel(selectedDay)} · ${formatTimeLabel(time)}`,
    };
    onSelect(slot);
  };

  return (
    <div className="mt-8 max-w-2xl mx-auto animate-fade-up">
      {/* Date picker */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 justify-center">
          <Calendar size={16} className="text-text-muted mr-2 shrink-0" />
          {days.map((day, i) => (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDayIdx(i)}
              className={`shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300 ${
                selectedDayIdx === i
                  ? 'border-orange bg-orange/10 text-text'
                  : 'border-border text-text-muted hover:border-orange/40 hover:text-text'
              }`}
            >
              <div className="text-xs opacity-60">{formatDateLabel(day).split(' ')[0]}</div>
              <div className="font-display font-bold">
                {formatDateLabel(day).split(' ').slice(1).join(' ')}
              </div>
            </button>
          ))}
        </div>
        {/* Right-edge fade gradient — signals horizontal scroll on narrow screens */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg to-transparent pointer-events-none" />
      </div>

      {/* Time slots */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TIME_SLOTS.map((time, i) => (
          <button
            key={time}
            onClick={() => handleSlotClick(time)}
            disabled={slotSelected}
            className="group flex flex-col items-center gap-1 px-4 py-4 rounded-xl border border-border bg-surface hover:border-orange hover:bg-orange/10 transition-all duration-300 opacity-0 animate-fade-up disabled:pointer-events-none disabled:opacity-50"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
          >
            <Clock size={14} className="text-text-muted group-hover:text-orange transition-colors" />
            <span className="font-display font-semibold text-base text-text">
              {formatTimeLabel(time)}
            </span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-text-muted mt-5">
        30-minute discovery call · Google Meet · You'll get a calendar invite
      </p>
    </div>
  );
}
