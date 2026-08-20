import { useTranslation } from 'react-i18next';

import { BUNDLED_DATASET, type CloudSource, sourceName } from '@/entities/point-cloud';
import { type CloudState, DropZone, LoadStatus } from '@/features/load-cloud';

import styles from './SourceSection.module.scss';

interface SourceSectionProps {
  source: CloudSource;
  state: CloudState;
  onPickBundled: () => void;
  onPickFile: (file: File) => void;
  onRetry: () => void;
}

export function SourceSection({
  source,
  state,
  onPickBundled,
  onPickFile,
  onRetry,
}: SourceSectionProps) {
  const { t, i18n } = useTranslation();
  const isBundledActive = source.kind === 'url' && source.url === BUNDLED_DATASET.url;
  const loaded = state.status === 'ready' ? state.cloud : null;

  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>{t('source.heading')}</h2>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{t('source.bundledTitle')}</span>
        <span className={styles.cardMeta}>{BUNDLED_DATASET.name}</span>
        <span className={styles.cardDescription}>{t('source.bundledDescription')}</span>
        {isBundledActive && loaded !== null && (
          <span className={styles.cardMeta}>
            {t('source.pointCount', {
              count: loaded.pointCount.toLocaleString(i18n.resolvedLanguage),
            })}
          </span>
        )}
        <button type="button" className={styles.button} onClick={onPickBundled}>
          {isBundledActive ? t('source.reload') : t('source.load')}
        </button>
      </div>

      <DropZone onFile={onPickFile} />

      <div className={styles.status}>
        {state.status === 'ready' ? (
          <span className={styles.cardMeta}>
            {t('source.active')}: {sourceName(source)}
          </span>
        ) : (
          <LoadStatus state={state} onRetry={onRetry} />
        )}
      </div>
    </div>
  );
}
