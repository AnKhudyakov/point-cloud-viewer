import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type CloudSource, type PointCloudData, sourceName } from '@/entities/point-cloud';
import { ScalarLegend, ScalarRangeControl, useScalarRange } from '@/features/color-by-scalar';
import { PickedPointPanel, usePickedPoint } from '@/features/pick-point';
import { PointBudgetControl, usePointBudget } from '@/features/point-budget';
import {
  PointCloudCanvas,
  type RenderStats,
  RenderStatsPanel,
  SAMPLE_CAPACITY,
} from '@/features/render-point-cloud';

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
  const { t, i18n } = useTranslation();
  const scalar = useScalarRange(cloud.scalarRange);
  const capacity = Math.min(cloud.pointCount, SAMPLE_CAPACITY);
  const budget = usePointBudget(capacity);
  const picked = usePickedPoint(cloud);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [resetToken, setResetToken] = useState(0);

  return (
    <div className={styles.section}>
      <PointCloudCanvas
        cloud={cloud}
        scalarRange={scalar.range}
        budget={budget.budget}
        selected={picked.index}
        resetToken={resetToken}
        onStats={setStats}
        onPick={picked.select}
      />

      <div className={styles.overlay}>
        <div className={styles.summarySlot}>
          <CloudSummary cloud={cloud} sourceName={sourceName(source)} />
        </div>

        <div className={styles.sidebar}>
          <button
            type="button"
            className={styles.action}
            onClick={() => setResetToken((value) => value + 1)}
          >
            {t('preview.resetView')}
          </button>

          <div className={styles.panel}>
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>{t('budget.title')}</h3>
              <PointBudgetControl state={budget} />
              <RenderStatsPanel stats={stats} />
              {capacity < cloud.pointCount && (
                <p className={styles.note}>
                  {t('budget.capped', { capacity: capacity.toLocaleString(i18n.resolvedLanguage) })}
                </p>
              )}
            </section>

            <section className={styles.group}>
              <h3 className={styles.groupTitle}>{t('scalar.title')}</h3>
              <ScalarLegend range={scalar.range} unit={t('scalar.unit')} />
              <ScalarRangeControl state={scalar} />
            </section>

            <section className={styles.group}>
              <h3 className={styles.groupTitle}>{t('pick.title')}</h3>
              <PickedPointPanel
                point={picked.point}
                unit={t('scalar.unit')}
                onClear={picked.clear}
              />
            </section>
          </div>
        </div>
      </div>

      <span className={styles.footerHint}>{t('preview.hint')}</span>
    </div>
  );
}
