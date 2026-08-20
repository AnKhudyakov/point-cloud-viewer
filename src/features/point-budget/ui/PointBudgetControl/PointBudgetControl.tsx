import { useTranslation } from 'react-i18next';

import type { PointBudgetState } from '../../model/usePointBudget';
import styles from './PointBudgetControl.module.scss';

interface PointBudgetControlProps {
  state: PointBudgetState;
}

export function PointBudgetControl({ state }: PointBudgetControlProps) {
  const { t, i18n } = useTranslation();
  const atMax = state.step === state.steps;

  return (
    <div className={styles.control}>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={state.steps}
        step={1}
        value={state.step}
        aria-label={t('budget.label')}
        onChange={(event) => state.setStep(event.target.valueAsNumber)}
      />
      <div className={styles.readout}>
        <span>{t('budget.label')}</span>
        <span className={styles.value}>
          {atMax ? t('budget.full') : state.budget.toLocaleString(i18n.resolvedLanguage)}
        </span>
      </div>
    </div>
  );
}
