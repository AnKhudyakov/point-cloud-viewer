import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type CloudSource, type PointCloudData, sourceName } from '@/entities/point-cloud';
import { ClipSectionControl, useClipSection } from '@/features/clip-section';
import { ScalarLegend, ScalarRangeControl, useScalarRange } from '@/features/color-by-scalar';
import { MeasurementPanel, useMeasurement } from '@/features/measure-distance';
import { PickedPointPanel, usePickedPoint } from '@/features/pick-point';
import { PointBudgetControl, usePointBudget } from '@/features/point-budget';
import {
  PointCloudCanvas,
  type PointCloudCanvasHandle,
  type RenderStats,
  RenderStatsPanel,
  SAMPLE_CAPACITY,
  ScaleBar,
} from '@/features/render-point-cloud';

import { CloudSummary } from './CloudSummary';
import { type ClickMode, ModeSwitch } from './ModeSwitch';
import styles from './PreviewSection.module.scss';

/** Kept in TypeScript so the canvas can reserve exactly this much room. */
const SIDEBAR_WIDTH = 340;
const SIDEBAR_MARGIN = 32;

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
  const measurement = useMeasurement(cloud);
  const clip = useClipSection(cloud);
  const [mode, setMode] = useState<ClickMode>('inspect');
  const [split, setSplit] = useState(false);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const canvasRef = useRef<PointCloudCanvasHandle>(null);

  const unit = t('scalar.unit');

  const handlePick = (index: number | null) => {
    picked.select(index);
    if (mode === 'measure') {
      measurement.add(index);
    }
  };

  const line =
    measurement.from && measurement.to && measurement.segment
      ? {
          from: measurement.from.local,
          to: measurement.to.local,
          text: `${measurement.segment.distance.toFixed(2)} ${unit}`,
        }
      : null;

  return (
    <div className={styles.section}>
      <PointCloudCanvas
        ref={canvasRef}
        cloud={cloud}
        scalarRange={scalar.range}
        budget={budget.budget}
        selected={picked.index}
        measurement={line}
        clip={{ ...clip.plane, enabled: clip.enabled }}
        split={split}
        rightInset={SIDEBAR_WIDTH + SIDEBAR_MARGIN}
        onStats={setStats}
        onPick={handlePick}
      />

      <div className={styles.overlay}>
        <div className={styles.summarySlot}>
          <CloudSummary cloud={cloud} sourceName={sourceName(source)} />
        </div>

        <div className={styles.sidebar} style={{ width: SIDEBAR_WIDTH }}>
          <div className={styles.toolbar}>
            <ModeSwitch mode={mode} onChange={setMode} />
            <button
              type="button"
              className={`${styles.action} ${split ? styles.actionActive : ''}`}
              aria-pressed={split}
              onClick={() => setSplit((value) => !value)}
            >
              {t('clip.split')}
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => canvasRef.current?.resetView()}
            >
              {t('preview.resetView')}
            </button>
          </div>

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
              <ScalarLegend range={scalar.range} unit={unit} />
              <ScalarRangeControl state={scalar} />
            </section>

            <section className={styles.group}>
              <h3 className={styles.groupTitle}>{t('clip.title')}</h3>
              <ClipSectionControl state={clip} unit={unit} />
            </section>

            <section className={styles.group}>
              <h3 className={styles.groupTitle}>{t('measure.title')}</h3>
              <MeasurementPanel state={measurement} unit={unit} />
            </section>

            <section className={styles.group}>
              <h3 className={styles.groupTitle}>{t('pick.title')}</h3>
              <PickedPointPanel point={picked.point} unit={unit} onClear={picked.clear} />
            </section>
          </div>
        </div>
      </div>

      <div className={styles.bottomBar}>
        {stats && <ScaleBar meters={stats.scaleMeters} pixels={stats.scalePixels} unit={unit} />}
        <span className={styles.hint}>{t('preview.hint')}</span>
      </div>
    </div>
  );
}
