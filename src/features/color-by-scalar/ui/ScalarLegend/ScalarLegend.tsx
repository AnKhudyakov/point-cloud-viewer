import { rampCssGradient } from '@/entities/point-cloud';

import styles from './ScalarLegend.module.scss';

interface ScalarLegendProps {
  range: readonly [number, number];
  unit: string;
  ticks?: number;
}

export function ScalarLegend({ range, unit, ticks = 5 }: ScalarLegendProps) {
  const [min, max] = range;
  const labels = Array.from({ length: ticks }, (_, index) => {
    const t = 1 - index / (ticks - 1);
    return min + (max - min) * t;
  });

  return (
    <div className={styles.legend}>
      <div className={styles.bar} style={{ background: rampCssGradient() }} />
      <div className={styles.ticks}>
        {labels.map((value, index) => (
          <span key={index}>
            {value.toFixed(1)} {unit}
          </span>
        ))}
      </div>
    </div>
  );
}
