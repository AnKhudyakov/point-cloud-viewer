import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/shared/ui/ProgressBar';

import type { CloudState } from '../../model/useCloudLoader';
import styles from './LoadStatus.module.scss';

interface LoadStatusProps {
  state: CloudState;
  onRetry: () => void;
}

export function LoadStatus({ state, onRetry }: LoadStatusProps) {
  const { t } = useTranslation();

  if (state.status === 'loading') {
    const fraction = state.progress?.fraction;
    return (
      <ProgressBar
        fraction={fraction}
        label={
          fraction === undefined
            ? t('data.loadingUnknown')
            : t('data.loading', { percent: Math.round(fraction * 100) })
        }
      />
    );
  }

  if (state.status === 'failed') {
    return (
      <div className={styles.block}>
        <span className={styles.message}>{t('data.failed')}</span>
        <span className={styles.detail}>{state.error.message}</span>
        <button type="button" className={styles.retry} onClick={onRetry}>
          {t('data.retry')}
        </button>
      </div>
    );
  }

  return null;
}
