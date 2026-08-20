import { useTranslation } from 'react-i18next';

import type { PointInfo } from '@/entities/point-cloud';

import styles from './PickedPointPanel.module.scss';

interface PickedPointPanelProps {
  point: PointInfo | null;
  unit: string;
  onClear: () => void;
}

function triplet(values: readonly [number, number, number], digits: number): string {
  return values.map((value) => value.toFixed(digits)).join(', ');
}

export function PickedPointPanel({ point, unit, onClear }: PickedPointPanelProps) {
  const { t, i18n } = useTranslation();

  if (point === null) {
    return <p className={styles.hint}>{t('pick.hint')}</p>;
  }

  const rows: [string, string][] = [
    [t('pick.index'), point.index.toLocaleString(i18n.resolvedLanguage)],
    [t('pick.dataset'), triplet(point.absolute, 3)],
    [t('pick.local'), triplet(point.local, 3)],
    [t('pick.scalar'), `${point.scalar.toFixed(3)} ${unit}`],
  ];

  return (
    <div className={styles.panel}>
      <dl className={styles.rows}>
        {rows.map(([term, value]) => (
          <div key={term} className={styles.row}>
            <dt>{term}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className={styles.clear} onClick={onClear}>
        {t('pick.clear')}
      </button>
    </div>
  );
}
