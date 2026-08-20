import { useTranslation } from 'react-i18next';
import { Vector3 } from 'three';

import { fileSize, type PointCloudData } from '@/entities/point-cloud';
import { splitBytes } from '@/shared/lib/format';

import styles from './CloudSummary.module.scss';

const UNIT_KEY = {
  kb: 'units.kb',
  mb: 'units.mb',
  gb: 'units.gb',
} as const;

interface CloudSummaryProps {
  cloud: PointCloudData;
  sourceName: string;
}

export function CloudSummary({ cloud, sourceName }: CloudSummaryProps) {
  const { t, i18n } = useTranslation();
  const size = cloud.bounds.getSize(new Vector3());
  const meters = t('summary.meters');
  const bytes = splitBytes(fileSize(cloud.pointCount));

  const rows: [string, string][] = [
    [t('summary.source'), sourceName],
    [t('summary.points'), cloud.pointCount.toLocaleString(i18n.resolvedLanguage)],
    [t('summary.size'), `${bytes.value} ${t(UNIT_KEY[bytes.unit])}`],
    [t('summary.origin'), cloud.origin.map((value) => value.toFixed(3)).join(', ')],
    [t('summary.bounds'), `${vector(cloud.bounds.min)} .. ${vector(cloud.bounds.max)}`],
    [t('summary.extent'), `${vector(size)} ${meters}`],
    [
      t('summary.scalarRange'),
      `${cloud.scalarRange[0].toFixed(2)} .. ${cloud.scalarRange[1].toFixed(2)} ${meters}`,
    ],
  ];

  return (
    <section className={styles.panel}>
      <h2 className={styles.heading}>{t('summary.title')}</h2>
      <dl className={styles.rows}>
        {rows.map(([term, value]) => (
          <div key={term} className={styles.row}>
            <dt className={styles.term}>{term}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function vector(value: Vector3): string {
  return `${value.x.toFixed(2)}, ${value.y.toFixed(2)}, ${value.z.toFixed(2)}`;
}
