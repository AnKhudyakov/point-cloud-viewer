import type { PointCloudData } from '../model/types';
import { PointCloudFormatError } from './binaryFormat';
import { toAbsolute } from './decode';

export interface PointInfo {
  index: number;
  local: [number, number, number];
  absolute: [number, number, number];
  scalar: number;
}

export function describePoint(cloud: PointCloudData, index: number): PointInfo {
  if (!Number.isInteger(index) || index < 0 || index >= cloud.pointCount) {
    throw new PointCloudFormatError(`Point index ${index} is outside 0..${cloud.pointCount - 1}`);
  }

  const base = index * 3;

  return {
    index,
    local: [cloud.positions[base], cloud.positions[base + 1], cloud.positions[base + 2]],
    absolute: toAbsolute(cloud, index),
    scalar: cloud.scalars[index],
  };
}
