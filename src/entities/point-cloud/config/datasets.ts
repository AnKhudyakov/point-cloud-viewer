import type { CloudSource } from '../model/source';

export interface BundledDataset {
  url: string;
  name: string;
  attribution: string | null;
}

export const BUNDLED_DATASET: BundledDataset = {
  url: '/clouds/dev.pcb',
  name: 'dev.pcb',
  attribution: null,
};

export const BUNDLED_SOURCE: CloudSource = {
  kind: 'url',
  url: BUNDLED_DATASET.url,
  name: BUNDLED_DATASET.name,
};
