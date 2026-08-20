import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type CloudSource, type PointCloudData, sourceName } from '@/entities/point-cloud';
import { ScalarLegend, ScalarRangeControl, useScalarRange } from '@/features/color-by-scalar';
import { PointCloudCanvas } from '@/features/render-point-cloud';

import { CloudSummary } from './CloudSummary';
import styles from './PreviewSection.module.scss';

interface PreviewSectionProps {
  cloud: PointCloudData | null;
  source: CloudSource;
}

export function PreviewSection({ cloud, source }: PreviewSectionProps) {
  const { t } = useTranslation();

  if (cloud === null) {
    return <span className={styles.empty}>{t('preview.empty')}</span>;
  }

  return <LoadedPreview cloud={cloud} source={source} />;
}

function LoadedPreview({ cloud, source }: { cloud: PointCloudData; source: CloudSource }) {
  const { t } = useTranslation();
  const scalar = useScalarRange(cloud.scalarRange);
  const [resetToken, setResetToken] = useState(0);

  return (
    <div className={styles.section}>
      <PointCloudCanvas cloud={cloud} scalarRange={scalar.range} resetToken={resetToken} />

      <div className={styles.overlay}>
        <div className={styles.summarySlot}>
          <CloudSummary cloud={cloud} sourceName={sourceName(source)} />
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>{t('scalar.title')}</h3>
          <ScalarLegend range={scalar.range} unit={t('scalar.unit')} />
          <ScalarRangeControl state={scalar} />
          <button
            type="button"
            className={styles.action}
            onClick={() => setResetToken((value) => value + 1)}
          >
            {t('preview.resetView')}
          </button>
        </div>
      </div>

      <span className={styles.footerHint}>{t('preview.hint')}</span>
    </div>
  );
}
