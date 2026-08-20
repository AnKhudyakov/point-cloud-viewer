import { useTranslation } from 'react-i18next';

import styles from './ModeSwitch.module.scss';

export type ClickMode = 'inspect' | 'measure';

const MODES = ['inspect', 'measure'] as const;

const LABEL_KEY = {
  inspect: 'mode.inspect',
  measure: 'mode.measure',
} as const satisfies Record<ClickMode, string>;

interface ModeSwitchProps {
  mode: ClickMode;
  onChange: (mode: ClickMode) => void;
}

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.group} role="group" aria-label={t('mode.label')}>
      {MODES.map((option) => (
        <button
          key={option}
          type="button"
          className={`${styles.option} ${option === mode ? styles.active : ''}`}
          aria-pressed={option === mode}
          onClick={() => onChange(option)}
        >
          {t(LABEL_KEY[option])}
        </button>
      ))}
    </div>
  );
}
