import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import type { PointCloudData } from '../model/types';
import { describePoint } from './pointInfo';

const ORIGIN: [number, number, number] = [412345.678, 5678901.234, 0];

const cloud: PointCloudData = {
  origin: ORIGIN,
  positions: new Float32Array([0, 0, 120, 10, 20, 130, -5, 40, 150]),
  scalars: new Float32Array([120, 130, 150]),
  pointCount: 3,
  bounds: new Box3(new Vector3(-5, 0, 120), new Vector3(10, 40, 150)),
  scalarRange: [120, 150],
};

describe('describePoint', () => {
  it('reports the position in both spaces', () => {
    const point = describePoint(cloud, 1);

    expect(point.index).toBe(1);
    expect(point.local).toEqual([10, 20, 130]);
    expect(point.absolute[0]).toBeCloseTo(ORIGIN[0] + 10, 6);
    expect(point.absolute[1]).toBeCloseTo(ORIGIN[1] + 20, 6);
    expect(point.absolute[2]).toBe(130);
  });

  it('reports the scalar of that point', () => {
    expect(describePoint(cloud, 2).scalar).toBe(150);
  });

  it('keeps the dataset coordinate accurate at UTM magnitudes', () => {
    const absolute = describePoint(cloud, 1).absolute[0];

    expect(absolute).toBeCloseTo(412355.678, 6);
    expect(Math.fround(absolute)).not.toBe(absolute);
  });

  it('refuses an index outside the cloud', () => {
    expect(() => describePoint(cloud, 3)).toThrow(/outside/);
    expect(() => describePoint(cloud, -1)).toThrow(/outside/);
    expect(() => describePoint(cloud, 1.5)).toThrow(/outside/);
  });
});
