import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BUNDLED_DATASET, BUNDLED_SOURCE, type CloudSource } from '@/entities/point-cloud';
import { useCloudLoader, usePreventStrayDrop } from '@/features/load-cloud';
import { type Section, SECTIONS } from '@/shared/config/sections';
import { PageFrame } from '@/shared/ui/PageFrame';
import { type TabItem, Tabs } from '@/shared/ui/Tabs';
import { AppHeader } from '@/widgets/app-header';
import { PreviewSection } from '@/widgets/preview-section';
import { SourceSection } from '@/widgets/source-section';

import { useActiveSection } from '../model/useActiveSection';
import styles from './ViewerPage.module.scss';

const TAB_PREFIX = 'viewer';

const SECTION_LABEL_KEY = {
  source: 'sections.source',
  preview: 'sections.preview',
} as const satisfies Record<Section, string>;

export function ViewerPage() {
  const { t } = useTranslation();
  usePreventStrayDrop();

  const [source, setSource] = useState<CloudSource>(BUNDLED_SOURCE);
  const { state, cloud, key, reload } = useCloudLoader(source);
  const { section, select } = useActiveSection(key, state.status === 'ready');
  const isBundled = source.kind === 'url' && source.url === BUNDLED_DATASET.url;

  const tabs: TabItem[] = SECTIONS.map((id) => ({
    id,
    label: t(SECTION_LABEL_KEY[id]),
    disabled: id === 'preview' && cloud === null,
  }));

  return (
    <PageFrame
      header={
        <AppHeader
          nav={
            <Tabs
              items={tabs}
              activeId={section}
              onSelect={(id) => select(id as Section)}
              label={t('sections.label')}
              idPrefix={TAB_PREFIX}
            />
          }
        />
      }
      footer={isBundled ? (BUNDLED_DATASET.attribution ?? t('source.syntheticNotice')) : null}
    >
      <div
        role="tabpanel"
        id={`${TAB_PREFIX}-panel-source`}
        aria-labelledby={`${TAB_PREFIX}-tab-source`}
        className={styles.panel}
        hidden={section !== 'source'}
      >
        <SourceSection
          source={source}
          state={state}
          onPickBundled={() => {
            if (isBundled) {
              reload();
            } else {
              setSource(BUNDLED_SOURCE);
            }
          }}
          onPickFile={(file: File) => setSource({ kind: 'file', file })}
          onRetry={reload}
        />
      </div>
      <div
        role="tabpanel"
        id={`${TAB_PREFIX}-panel-preview`}
        aria-labelledby={`${TAB_PREFIX}-tab-preview`}
        className={styles.panel}
        hidden={section !== 'preview'}
      >
        <PreviewSection cloud={cloud} source={source} />
      </div>
    </PageFrame>
  );
}
