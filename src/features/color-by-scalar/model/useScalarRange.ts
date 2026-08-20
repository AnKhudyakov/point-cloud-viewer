import { useCallback, useState } from 'react';

export interface ScalarRangeState {
  range: readonly [number, number];
  limits: readonly [number, number];
  isCustom: boolean;
  setMin: (value: number) => void;
  setMax: (value: number) => void;
  reset: () => void;
}

const MIN_SPAN_RATIO = 0.001;

export function useScalarRange(limits: readonly [number, number]): ScalarRangeState {
  const [custom, setCustom] = useState<{ key: string; range: [number, number] } | null>(null);

  const key = `${limits[0]}:${limits[1]}`;
  const range = custom?.key === key ? custom.range : ([limits[0], limits[1]] as [number, number]);
  const minSpan = Math.max((limits[1] - limits[0]) * MIN_SPAN_RATIO, Number.EPSILON);

  const clamp = useCallback(
    (value: number) => Math.min(Math.max(value, limits[0]), limits[1]),
    [limits],
  );

  const setMin = useCallback(
    (value: number) => {
      setCustom((previous) => {
        const current = previous?.key === key ? previous.range : [limits[0], limits[1]];
        const next = Math.min(clamp(value), current[1] - minSpan);
        return { key, range: [next, current[1]] };
      });
    },
    [clamp, key, limits, minSpan],
  );

  const setMax = useCallback(
    (value: number) => {
      setCustom((previous) => {
        const current = previous?.key === key ? previous.range : [limits[0], limits[1]];
        const next = Math.max(clamp(value), current[0] + minSpan);
        return { key, range: [current[0], next] };
      });
    },
    [clamp, key, limits, minSpan],
  );

  const reset = useCallback(() => {
    setCustom(null);
  }, []);

  return {
    range,
    limits,
    isCustom: range[0] !== limits[0] || range[1] !== limits[1],
    setMin,
    setMax,
    reset,
  };
}
