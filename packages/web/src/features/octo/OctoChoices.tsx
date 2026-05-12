import { useState } from 'react';

interface Choice {
  label: string;
  value: string;
}

interface OctoChoicesProps {
  choices: Choice[];
  onSelect: (value: string) => void;
  visible: boolean;
}

export default function OctoChoices({ choices, onSelect, visible }: OctoChoicesProps) {
  // Bug #5: track whether a selection has been made to prevent double-click
  const [selected, setSelected] = useState(false);

  if (!visible) return null;

  const handleClick = (value: string) => {
    if (selected) return;
    setSelected(true);
    onSelect(value);
  };

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-8">
      {choices.map((choice, i) => (
        <button
          key={choice.value}
          onClick={() => handleClick(choice.value)}
          disabled={selected}
          className="px-6 py-3 rounded-full border border-border text-text font-medium text-sm sm:text-base transition-all duration-300 hover:border-orange hover:bg-orange/10 hover:shadow-lg hover:shadow-orange/10 opacity-0 animate-fade-up disabled:pointer-events-none disabled:opacity-50"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
