import { describe, expect, it } from 'vitest';

import { describeSegment } from './segment';

describe('describeSegment', () => {
  it('measures a horizontal run with no rise', () => {
    const segment = describeSegment([0, 0, 100], [3, 4, 100]);

    expect(segment.horizontal).toBe(5);
    expect(segment.vertical).toBe(0);
    expect(segment.distance).toBe(5);
    expect(segment.slopeDegrees).toBe(0);
  });

  it('measures a vertical rise with no run', () => {
    const segment = describeSegment([1, 1, 100], [1, 1, 110]);

    expect(segment.horizontal).toBe(0);
    expect(segment.vertical).toBe(10);
    expect(segment.distance).toBe(10);
    expect(segment.slopeDegrees).toBe(90);
  });

  it('separates the slope distance from its horizontal shadow', () => {
    const segment = describeSegment([0, 0, 0], [3, 4, 12]);

    expect(segment.horizontal).toBe(5);
    expect(segment.vertical).toBe(12);
    expect(segment.distance).toBe(13);
    expect(segment.slopeDegrees).toBeCloseTo(67.38, 2);
  });

  it('reports a descent as a negative rise and a negative slope', () => {
    const segment = describeSegment([0, 0, 100], [0, 10, 90]);

    expect(segment.vertical).toBe(-10);
    expect(segment.slopeDegrees).toBeCloseTo(-45, 6);
  });

  it('is symmetric in distance and mirrors the rise', () => {
    const forward = describeSegment([1, 2, 3], [4, 6, 15]);
    const back = describeSegment([4, 6, 15], [1, 2, 3]);

    expect(back.distance).toBeCloseTo(forward.distance, 12);
    expect(back.horizontal).toBeCloseTo(forward.horizontal, 12);
    expect(back.vertical).toBeCloseTo(-forward.vertical, 12);
  });

  it('collapses to zero for the same point twice', () => {
    const segment = describeSegment([5, 5, 5], [5, 5, 5]);

    expect(segment.distance).toBe(0);
    expect(segment.slopeDegrees).toBe(0);
  });

  it('keeps accuracy on a long span, which is why local coordinates are used', () => {
    const segment = describeSegment([0, 0, 120], [1000, 0, 121]);

    expect(segment.distance).toBeCloseTo(1000.0005, 4);
  });
});
