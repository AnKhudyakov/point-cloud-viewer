import type { CloudSource } from '../model/source';
import type { PointCloudData } from '../model/types';
import { type LoadOptions, loadPointCloudFromFile, loadPointCloudFromUrl } from './loader';

export function loadCloud(source: CloudSource, options: LoadOptions): Promise<PointCloudData> {
  return source.kind === 'url'
    ? loadPointCloudFromUrl(source.url, options)
    : loadPointCloudFromFile(source.file);
}
