import { useCallback, useMemo, useState } from 'react';

export const MIN_BUDGET = 10_000;

export interface PointBudgetState {
  budget: number;
  min: number;
  max: number;
  steps: number;
  step: number;
  setStep: (step: number) => void;
  reset: () => void;
  isCustom: boolean;
}

const STEPS = 200;

function toStep(budget: number, min: number, max: number): number {
  if (max <= min) {
    return STEPS;
  }
  const ratio = Math.log(budget / min) / Math.log(max / min);
  return Math.round(ratio * STEPS);
}

function fromStep(step: number, min: number, max: number): number {
  if (max <= min) {
    return max;
  }
  const ratio = Math.min(Math.max(step / STEPS, 0), 1);
  return Math.round(min * Math.pow(max / min, ratio));
}

export function usePointBudget(capacity: number): PointBudgetState {
  const min = Math.min(MIN_BUDGET, capacity);
  const max = Math.max(capacity, min);
  const [custom, setCustom] = useState<{ key: number; step: number } | null>(null);

  const step = custom?.key === max ? custom.step : STEPS;
  const budget = useMemo(() => fromStep(step, min, max), [step, min, max]);

  const setStep = useCallback(
    (next: number) => {
      setCustom({ key: max, step: next });
    },
    [max],
  );

  const reset = useCallback(() => {
    setCustom(null);
  }, []);

  return {
    budget,
    min,
    max,
    steps: STEPS,
    step,
    setStep,
    reset,
    isCustom: step !== STEPS,
  };
}

export { toStep };
