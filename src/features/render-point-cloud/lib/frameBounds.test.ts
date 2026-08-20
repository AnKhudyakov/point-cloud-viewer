import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { DEFAULT_FIT_PADDING, fitDistance, frameBounds } from './frameBounds';

const CUBE = new Box3(new Vector3(-50, -50, 0), new Vector3(50, 50, 100));

describe('fitDistance', () => {
  it('grows with the radius', () => {
    const near = fitDistance(10, 50, 1.6, 1);
    const far = fitDistance(100, 50, 1.6, 1);

    expect(far).toBeCloseTo(near * 10, 6);
  });

  it('scales linearly with padding', () => {
    const plain = fitDistance(25, 50, 1.6, 1);

    expect(fitDistance(25, 50, 1.6, 2)).toBeCloseTo(plain * 2, 6);
  });

  it('pulls back further on a narrow viewport, where width is the limit', () => {
    const wide = fitDistance(25, 50, 2, 1);
    const narrow = fitDistance(25, 50, 0.5, 1);

    expect(narrow).toBeGreaterThan(wide);
  });

  it('is not limited by width once the viewport is wider than tall', () => {
    expect(fitDistance(25, 50, 2, 1)).toBeCloseTo(fitDistance(25, 50, 4, 1), 6);
  });

  it('places the sphere edge exactly on the frustum edge', () => {
    const radius = 25;
    const fov = 50;
    const distance = fitDistance(radius, fov, 1, 1);
    const halfAngle = Math.asin(radius / distance);

    expect(halfAngle).toBeCloseTo((fov * Math.PI) / 360, 6);
  });

  it('falls back to the padding for a degenerate cloud', () => {
    expect(fitDistance(0, 50, 1.6, 1.25)).toBe(1.25);
  });
});

describe('frameBounds', () => {
  it('targets the center of the bounds', () => {
    expect(frameBounds(CUBE, 50, 1.6).target.toArray()).toEqual([0, 0, 50]);
  });

  it('stands the camera off by the fitted distance', () => {
    const framing = frameBounds(CUBE, 50, 1.6);

    expect(framing.position.distanceTo(framing.target)).toBeCloseTo(framing.distance, 6);
  });

  it('looks down on the cloud, as suits Z up data', () => {
    const framing = frameBounds(CUBE, 50, 1.6);

    expect(framing.position.z).toBeGreaterThan(framing.target.z);
  });

  it('keeps the whole cloud between the near and far planes', () => {
    const framing = frameBounds(CUBE, 50, 1.6);
    const radius = CUBE.getSize(new Vector3()).length() / 2;

    expect(framing.near).toBeLessThan(framing.distance - radius);
    expect(framing.far).toBeGreaterThan(framing.distance + radius);
  });

  it('leaves headroom around the cloud by default', () => {
    const tight = frameBounds(CUBE, 50, 1.6, 1);
    const padded = frameBounds(CUBE, 50, 1.6);

    expect(padded.distance).toBeCloseTo(tight.distance * DEFAULT_FIT_PADDING, 6);
  });

  it('survives a cloud collapsed to a single point', () => {
    const point = new Box3(new Vector3(5, 5, 5), new Vector3(5, 5, 5));
    const framing = frameBounds(point, 50, 1.6);

    expect(framing.distance).toBeGreaterThan(0);
    expect(framing.near).toBeGreaterThan(0);
    expect(framing.far).toBeGreaterThan(framing.near);
  });
});
