import type { Box3 } from 'three';

export interface PointCloudData {
  origin: [number, number, number];
  positions: Float32Array;
  scalars: Float32Array;
  pointCount: number;
  bounds: Box3;
  scalarRange: [number, number];
}
