import { useTranslation } from 'react-i18next';

import type { MeasurementState } from '../../model/useMeasurement';
import styles from './MeasurementPanel.module.scss';

interface MeasurementPanelProps {
  state: MeasurementState;
  unit: string;
}

export function MeasurementPanel({ state, unit }: MeasurementPanelProps) {
  const { t } = useTranslation();
  const { from, to, segment } = state;

  if (segment === null) {
    return (
      <p className={styles.hint}>
        {from === null ? t('measure.hintFirst') : t('measure.hintSecond')}
      </p>
    );
  }

  const rows: [string, string][] = [
    [t('measure.distance'), `${segment.distance.toFixed(3)} ${unit}`],
    [t('measure.horizontal'), `${segment.horizontal.toFixed(3)} ${unit}`],
    [t('measure.vertical'), `${segment.vertical.toFixed(3)} ${unit}`],
    [t('measure.slope'), `${segment.slopeDegrees.toFixed(1)}°`],
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
      <button type="button" className={styles.clear} onClick={state.clear}>
        {t('measure.clear')}
      </button>
      {to === null && <p className={styles.hint}>{t('measure.hintSecond')}</p>}
    </div>
  );
}
