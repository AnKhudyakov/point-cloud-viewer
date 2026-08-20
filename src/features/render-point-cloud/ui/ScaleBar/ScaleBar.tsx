import styles from './ScaleBar.module.scss';

interface ScaleBarProps {
  meters: number;
  pixels: number;
  unit: string;
}

/**
 * Reads correct at any zoom and any window size because both numbers come from
 * the live camera and viewport, recomputed with the stats.
 */
export function ScaleBar({ meters, pixels, unit }: ScaleBarProps) {
  if (meters <= 0 || pixels <= 0) {
    return null;
  }

  const label = meters >= 1 ? meters.toLocaleString('en-US') : meters.toString();

  return (
    <div className={styles.scale}>
      <span>
        {label} {unit}
      </span>
      <div className={styles.bar} style={{ width: `${pixels}px` }} />
    </div>
  );
}
