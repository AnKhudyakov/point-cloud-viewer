import { Box3, Vector3 } from 'three';

import type { PointCloudData } from '../model/types';
import {
  decodeHeader,
  HEADER_BYTES,
  PointCloudFormatError,
  type PointCloudHeader,
  scalarsOffset,
  type Vec3,
} from './binaryFormat';

export function decodePointCloud(buffer: ArrayBuffer): PointCloudData {
  const header = decodeHeader(buffer);
  const { pointCount, origin } = header;

  const positions = new Float32Array(buffer, HEADER_BYTES, pointCount * 3);
  const scalars = new Float32Array(buffer, scalarsOffset(pointCount), pointCount);

  return {
    origin,
    positions,
    scalars,
    pointCount,
    bounds: localBounds(header),
    scalarRange: [header.scalarMin, header.scalarMax],
  };
}

function localBounds(header: PointCloudHeader): Box3 {
  const shift = (v: Vec3): Vector3 =>
    new Vector3(v[0] - header.origin[0], v[1] - header.origin[1], v[2] - header.origin[2]);
  return new Box3(shift(header.bboxMin), shift(header.bboxMax));
}

export function toAbsolute(data: PointCloudData, index: number): Vec3 {
  if (index < 0 || index >= data.pointCount) {
    throw new PointCloudFormatError(`Point index ${index} is outside 0..${data.pointCount - 1}`);
  }
  const base = index * 3;
  return [
    data.origin[0] + data.positions[base],
    data.origin[1] + data.positions[base + 1],
    data.origin[2] + data.positions[base + 2],
  ];
}
