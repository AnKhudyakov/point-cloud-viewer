import { Box3, type BufferAttribute, Vector3 } from 'three';
import { beforeEach, describe, expect, it } from 'vitest';

import type { PointCloudData } from '@/entities/point-cloud';

import { createRampTexture } from './pointCloudMaterial';
import { PointCloudObject } from './PointCloudObject';

const TOTAL = 1000;

function makeCloud(total = TOTAL): PointCloudData {
  const positions = new Float32Array(total * 3);
  const scalars = new Float32Array(total);

  for (let i = 0; i < total; i += 1) {
    positions[i * 3] = i;
    positions[i * 3 + 1] = i * 2;
    positions[i * 3 + 2] = i * 3;
    scalars[i] = 120 + i;
  }

  return {
    origin: [412345.678, 5678901.234, 0],
    positions,
    scalars,
    pointCount: total,
    bounds: new Box3(new Vector3(0, 0, 0), new Vector3(total, total * 2, total * 3)),
    scalarRange: [120, 120 + total - 1],
  };
}

describe('PointCloudObject', () => {
  const ramp = createRampTexture();
  let object: PointCloudObject;

  beforeEach(() => {
    object = new PointCloudObject(makeCloud(), ramp);
  });

  it('draws the whole cloud when it fits the capacity', () => {
    expect(object.total).toBe(TOTAL);
    expect(object.capacity).toBe(TOTAL);
    expect(object.drawnCount).toBe(TOTAL);
    expect(object.points.geometry.drawRange.count).toBe(TOTAL);
  });

  it('takes the bounds from the file instead of scanning every point', () => {
    expect(object.points.geometry.boundingBox?.max.toArray()).toEqual([
      TOTAL,
      TOTAL * 2,
      TOTAL * 3,
    ]);
    expect(object.points.geometry.boundingSphere).not.toBeNull();
  });

  it('reduces the drawn count to the budget', () => {
    const result = object.applyBudget(100);

    expect(result.stride).toBe(10);
    expect(result.drawn).toBe(100);
    expect(object.points.geometry.drawRange.count).toBe(100);
  });

  it('never draws more than the budget allows', () => {
    for (const budget of [1, 7, 99, 250, 333, 999]) {
      expect(object.applyBudget(budget).drawn).toBeLessThanOrEqual(budget);
    }
  });

  it('packs the sampled points tightly, taking every stride-th point', () => {
    object.applyBudget(100);

    const positions = object.points.geometry.getAttribute('position');
    const scalars = object.points.geometry.getAttribute('scalar');

    expect(positions.getX(0)).toBe(0);
    expect(positions.getX(1)).toBe(10);
    expect(positions.getX(99)).toBe(990);
    expect(scalars.getX(1)).toBe(130);
  });

  it('uploads only the range it wrote, not the whole buffer', () => {
    const positions = object.points.geometry.getAttribute('position') as BufferAttribute;
    positions.clearUpdateRanges();
    const version = positions.version;

    object.applyBudget(100);

    // needsUpdate is a write only setter in three, version is what it moves.
    expect(positions.version).toBeGreaterThan(version);
    expect(positions.updateRanges).toEqual([{ start: 0, count: 300 }]);
  });

  it('keeps the same geometry, material and object across budget changes', () => {
    const geometry = object.points.geometry;
    const material = object.points.material;
    const points = object.points;
    const positions = geometry.getAttribute('position');

    object.applyBudget(50);
    object.applyBudget(500);
    object.applyBudget(TOTAL);

    expect(object.points).toBe(points);
    expect(object.points.geometry).toBe(geometry);
    expect(object.points.material).toBe(material);
    expect(object.points.geometry.getAttribute('position')).toBe(positions);
  });

  it('returns to the full cloud after being reduced', () => {
    object.applyBudget(10);
    expect(object.drawnCount).toBe(10);

    object.applyBudget(TOTAL);
    expect(object.drawnCount).toBe(TOTAL);

    const positions = object.points.geometry.getAttribute('position');
    expect(positions.getX(1)).toBe(1);
    expect(positions.getX(TOTAL - 1)).toBe(TOTAL - 1);
  });

  it('leaves the decoded source arrays untouched', () => {
    const data = makeCloud(100);
    const copy = new Float32Array(data.positions);
    const local = new PointCloudObject(data, ramp);

    local.applyBudget(10);

    expect([...data.positions]).toEqual([...copy]);
    local.dispose();
  });

  it('does not release the shared ramp texture when it is disposed', () => {
    let disposed = false;
    ramp.addEventListener('dispose', () => {
      disposed = true;
    });

    object.dispose();

    expect(disposed).toBe(false);
  });
});
