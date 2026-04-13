import { useState, useEffect } from 'react';

interface OctoMessageProps {
  text: string;
  onComplete?: () => void;
}

export default function OctoMessage({ text, onComplete }: OctoMessageProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);

    if (!text) return;

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setDisplayed(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text, onComplete]);

  if (!text) return null;

  return (
    <p className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-text text-center leading-tight max-w-3xl mx-auto">
      {displayed}
      {!done && <span className="inline-block w-0.5 h-8 bg-orange animate-pulse ml-1" />}
    </p>
  );
}
