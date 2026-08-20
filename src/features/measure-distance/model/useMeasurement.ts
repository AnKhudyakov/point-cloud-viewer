import { useCallback, useMemo, useState } from 'react';

import { describePoint, type PointCloudData, type PointInfo } from '@/entities/point-cloud';

import { describeSegment, type Segment } from '../lib/segment';

export interface MeasurementState {
  from: PointInfo | null;
  to: PointInfo | null;
  segment: Segment | null;
  add: (index: number | null) => void;
  clear: () => void;
}

export function useMeasurement(cloud: PointCloudData): MeasurementState {
  const [ends, setEnds] = useState<{ cloud: PointCloudData; indices: number[] }>({
    cloud,
    indices: [],
  });

  const points = useMemo(() => {
    // Ends belong to the cloud they were picked on; a new cloud starts empty.
    const indices = ends.cloud === cloud ? ends.indices : [];
    return indices
      .filter((index) => index < cloud.pointCount)
      .map((index) => describePoint(cloud, index));
  }, [cloud, ends]);

  const from = points[0] ?? null;
  const to = points[1] ?? null;
  const segment = from && to ? describeSegment(from.local, to.local) : null;

  const add = useCallback(
    (index: number | null) => {
      if (index === null) {
        return;
      }
      setEnds((previous) => {
        const current = previous.cloud === cloud ? previous.indices : [];
        // Two ends is a measurement; a third click starts a new one.
        return { cloud, indices: current.length >= 2 ? [index] : [...current, index] };
      });
    },
    [cloud],
  );

  const clear = useCallback(() => {
    setEnds({ cloud, indices: [] });
  }, [cloud]);

  return { from, to, segment, add, clear };
}
