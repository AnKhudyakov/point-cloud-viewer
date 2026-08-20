import { useCallback, useEffect, useState } from 'react';

import {
  type CloudSource,
  loadCloud,
  type LoadProgress,
  type PointCloudData,
  sourceKey,
} from '@/entities/point-cloud';

export type CloudState =
  | { status: 'loading'; progress: LoadProgress | undefined }
  | { status: 'ready'; cloud: PointCloudData }
  | { status: 'failed'; error: Error };

const PENDING: CloudState = { status: 'loading', progress: undefined };

export interface CloudLoader {
  state: CloudState;
  cloud: PointCloudData | null;
  key: string;
  reload: () => void;
}

export function useCloudLoader(source: CloudSource): CloudLoader {
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; state: CloudState } | null>(null);
  const [loaded, setLoaded] = useState<PointCloudData | null>(null);

  const key = `${sourceKey(source)}#${attempt}`;
  const state = outcome?.key === key ? outcome.state : PENDING;

  useEffect(() => {
    const controller = new AbortController();

    loadCloud(source, {
      signal: controller.signal,
      onProgress: (progress) => {
        if (!controller.signal.aborted) {
          setOutcome({ key, state: { status: 'loading', progress } });
        }
      },
    })
      .then((cloud) => {
        if (!controller.signal.aborted) {
          setOutcome({ key, state: { status: 'ready', cloud } });
          setLoaded(cloud);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setOutcome({
          key,
          state: {
            status: 'failed',
            error: error instanceof Error ? error : new Error(String(error)),
          },
        });
      });

    return () => {
      controller.abort();
    };
  }, [source, key]);

  const reload = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { state, cloud: loaded, key, reload };
}
