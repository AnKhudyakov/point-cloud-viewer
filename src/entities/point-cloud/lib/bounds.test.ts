import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { boundsDiagonal, computeBounds } from './bounds';

describe('computeBounds', () => {
  it('returns a zero box for an empty buffer', () => {
    const bounds = computeBounds(new Float32Array(0));
    expect(bounds.min.toArray()).toEqual([0, 0, 0]);
    expect(bounds.max.toArray()).toEqual([0, 0, 0]);
  });

  it('collapses to a point for a single vertex', () => {
    const bounds = computeBounds(new Float32Array([1, -2, 3]));
    expect(bounds.min.toArray()).toEqual([1, -2, 3]);
    expect(bounds.max.toArray()).toEqual([1, -2, 3]);
  });

  it('spans every axis independently', () => {
    const bounds = computeBounds(new Float32Array([-1, 0, 5, 4, -3, 2, 0, 7, -6]));
    expect(bounds.min.toArray()).toEqual([-1, -3, -6]);
    expect(bounds.max.toArray()).toEqual([4, 7, 5]);
  });

  it('ignores a trailing partial vertex instead of reading past it', () => {
    const bounds = computeBounds(new Float32Array([0, 0, 0, 9, 9]));
    expect(bounds.max.toArray()).toEqual([0, 0, 0]);
  });
});

describe('boundsDiagonal', () => {
  it('measures the box diagonal', () => {
    expect(boundsDiagonal(new Box3(new Vector3(0, 0, 0), new Vector3(2, 3, 6)))).toBe(7);
  });

  it('is zero for a degenerate box', () => {
    expect(boundsDiagonal(new Box3(new Vector3(1, 1, 1), new Vector3(1, 1, 1)))).toBe(0);
  });
});
