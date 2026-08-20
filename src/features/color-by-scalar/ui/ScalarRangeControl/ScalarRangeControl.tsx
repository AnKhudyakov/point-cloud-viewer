import { useTranslation } from 'react-i18next';

import type { ScalarRangeState } from '../../model/useScalarRange';
import styles from './ScalarRangeControl.module.scss';

interface ScalarRangeControlProps {
  state: ScalarRangeState;
}

const STEPS = 500;

export function ScalarRangeControl({ state }: ScalarRangeControlProps) {
  const { t } = useTranslation();
  const { range, limits, isCustom, setMin, setMax, reset } = state;
  const step = (limits[1] - limits[0]) / STEPS || 1;

  return (
    <div className={styles.control}>
      <label className={styles.row}>
        {t('scalar.min')}
        <input
          className={styles.slider}
          type="range"
          min={limits[0]}
          max={limits[1]}
          step={step}
          value={range[0]}
          onChange={(event) => setMin(event.target.valueAsNumber)}
        />
      </label>
      <label className={styles.row}>
        {t('scalar.max')}
        <input
          className={styles.slider}
          type="range"
          min={limits[0]}
          max={limits[1]}
          step={step}
          value={range[1]}
          onChange={(event) => setMax(event.target.valueAsNumber)}
        />
      </label>
      <button type="button" className={styles.reset} onClick={reset} disabled={!isCustom}>
        {t('scalar.reset')}
      </button>
    </div>
  );
}
