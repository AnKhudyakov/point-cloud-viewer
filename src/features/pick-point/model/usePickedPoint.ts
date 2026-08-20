import { useCallback, useMemo, useState } from 'react';

import { describePoint, type PointCloudData, type PointInfo } from '@/entities/point-cloud';

export interface PickedPointState {
  index: number | null;
  point: PointInfo | null;
  select: (index: number | null) => void;
  clear: () => void;
}

export function usePickedPoint(cloud: PointCloudData): PickedPointState {
  const [picked, setPicked] = useState<{ cloud: PointCloudData; index: number } | null>(null);

  const index = picked?.cloud === cloud ? picked.index : null;

  const point = useMemo(() => {
    if (index === null || index >= cloud.pointCount) {
      return null;
    }
    return describePoint(cloud, index);
  }, [cloud, index]);

  const select = useCallback(
    (next: number | null) => {
      setPicked(next === null ? null : { cloud, index: next });
    },
    [cloud],
  );

  const clear = useCallback(() => {
    setPicked(null);
  }, []);

  return { index, point, select, clear };
}
