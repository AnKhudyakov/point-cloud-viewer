import { decodePointCloud } from '../lib/decode';
import type { PointCloudData } from '../model/types';

export interface LoadProgress {
  loaded: number;
  total: number;
  fraction: number | undefined;
}

export interface LoadOptions {
  onProgress?: (progress: LoadProgress) => void;
  signal?: AbortSignal;
}

export async function loadPointCloudFromUrl(
  url: string,
  options: LoadOptions = {},
): Promise<PointCloudData> {
  const response = await fetch(url, options.signal ? { signal: options.signal } : {});
  if (!response.ok) {
    throw new Error(`Request for ${url} failed with ${response.status} ${response.statusText}`);
  }

  const total = Number(response.headers.get('Content-Length') ?? '') || 0;
  const body = response.body;

  if (!body) {
    const buffer = await response.arrayBuffer();
    options.onProgress?.({ loaded: buffer.byteLength, total, fraction: 1 });
    return decodePointCloud(buffer);
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    options.onProgress?.({
      loaded,
      total,
      fraction: total > 0 ? Math.min(loaded / total, 1) : undefined,
    });
  }

  return decodePointCloud(join(chunks, loaded));
}

export async function loadPointCloudFromFile(file: Blob): Promise<PointCloudData> {
  return decodePointCloud(await file.arrayBuffer());
}

function join(chunks: readonly Uint8Array[], byteLength: number): ArrayBuffer {
  const merged = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}
