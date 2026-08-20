import { useTranslation } from 'react-i18next';

import { type CloudSource, type PointCloudData, sourceName } from '@/entities/point-cloud';

import { CloudSummary } from './CloudSummary';
import styles from './PreviewSection.module.scss';

interface PreviewSectionProps {
  cloud: PointCloudData | null;
  source: CloudSource;
}

export function PreviewSection({ cloud, source }: PreviewSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      {cloud === null ? (
        <span className={styles.empty}>{t('preview.empty')}</span>
      ) : (
        <CloudSummary cloud={cloud} sourceName={sourceName(source)} />
      )}
    </div>
  );
}
