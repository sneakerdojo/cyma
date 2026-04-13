import type { WizardStep } from './types';

const STEP_MAP: Record<WizardStep, number> = {
  greeting: 1,
  requirements: 2,
  contact: 3,
  schedule: 4,
  budget: 5,
  complete: 5,
  freechat: 5,
};

const TOTAL_STEPS = 5;

interface OctoStepIndicatorProps {
  step: WizardStep;
}

export default function OctoStepIndicator({ step }: OctoStepIndicatorProps) {
  const current = STEP_MAP[step];

  return (
    <div className="fixed bottom-8 right-8 font-display text-text-muted text-lg">
      <span className="text-text">{String(current).padStart(2, '0')}</span>
      <span className="mx-2 text-border">|</span>
      <span>{String(TOTAL_STEPS).padStart(2, '0')}</span>
    </div>
  );
}
