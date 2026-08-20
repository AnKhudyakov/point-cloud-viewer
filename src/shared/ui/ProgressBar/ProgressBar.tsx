import styles from './ProgressBar.module.scss';

export interface ProgressBarProps {
  fraction: number | undefined;
  label: string;
}

export function ProgressBar({ fraction, label }: ProgressBarProps) {
  return (
    <div className={styles.block}>
      <span className={styles.label}>{label}</span>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(fraction === undefined ? {} : { 'aria-valuenow': Math.round(fraction * 100) })}
      >
        <div className={styles.fill} style={{ width: `${(fraction ?? 0) * 100}%` }} />
      </div>
    </div>
  );
}
