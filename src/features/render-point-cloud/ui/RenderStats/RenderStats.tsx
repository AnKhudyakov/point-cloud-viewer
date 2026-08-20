import { useTranslation } from 'react-i18next';

import type { RenderStats as Stats } from '../../model/Viewer';
import styles from './RenderStats.module.scss';

interface RenderStatsProps {
  stats: Stats | null;
}

export function RenderStatsPanel({ stats }: RenderStatsProps) {
  const { t, i18n } = useTranslation();

  if (stats === null) {
    return null;
  }

  const locale = i18n.resolvedLanguage;
  const rows: [string, string][] = [
    [t('stats.fps'), String(stats.fps)],
    [
      t('stats.pointsVisible'),
      `${stats.drawn.toLocaleString(locale)} / ${stats.total.toLocaleString(locale)}`,
    ],
    [t('stats.stride'), stats.stride === 1 ? t('stats.everyPoint') : `1 / ${stats.stride}`],
    [t('stats.gpuResources'), `${stats.geometries} / ${stats.textures} / ${stats.programs}`],
  ];

  return (
    <dl className={styles.stats}>
      {rows.map(([term, value]) => (
        <div key={term} style={{ display: 'contents' }}>
          <dt>{term}</dt>
          <dd className={styles.value}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
