import { useTranslation } from 'react-i18next';

import { CLIP_AXES } from '../../lib/clipPlane';
import type { ClipSectionState } from '../../model/useClipSection';
import styles from './ClipSectionControl.module.scss';

interface ClipSectionControlProps {
  state: ClipSectionState;
  unit: string;
}

const STEPS = 400;

export function ClipSectionControl({ state, unit }: ClipSectionControlProps) {
  const { t } = useTranslation();
  const step = (state.max - state.min) / STEPS || 1;

  return (
    <div className={styles.control}>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={(event) => state.setEnabled(event.target.checked)}
        />
        {t('clip.enable')}
      </label>

      <div className={styles.row}>
        <div className={styles.axes} role="group" aria-label={t('clip.axis')}>
          {CLIP_AXES.map((axis) => (
            <button
              key={axis}
              type="button"
              className={`${styles.axis} ${axis === state.axis ? styles.active : ''}`}
              aria-pressed={axis === state.axis}
              disabled={!state.enabled}
              onClick={() => state.setAxis(axis)}
            >
              {axis}
            </button>
          ))}
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={state.flipped}
            disabled={!state.enabled}
            onChange={(event) => state.setFlipped(event.target.checked)}
          />
          {t('clip.flip')}
        </label>
      </div>

      <div className={styles.row}>
        <input
          className={styles.slider}
          type="range"
          min={state.min}
          max={state.max}
          step={step}
          value={state.position}
          disabled={!state.enabled}
          aria-label={t('clip.position')}
          onChange={(event) => state.setPosition(event.target.valueAsNumber)}
        />
        <span className={styles.value}>
          {state.position.toFixed(2)} {unit}
        </span>
      </div>
    </div>
  );
}
