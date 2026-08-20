import { describe, expect, it } from 'vitest';

import { sampleByStride, sampledCount, slotForSource, sourceIndexFor, strideFor } from './sampling';

describe('strideFor', () => {
  it('draws everything when the budget covers the cloud', () => {
    expect(strideFor(1000, 1000)).toBe(1);
    expect(strideFor(1000, 5000)).toBe(1);
  });

  it('divides evenly when the budget divides the total', () => {
    expect(strideFor(1000, 100)).toBe(10);
    expect(strideFor(1000, 500)).toBe(2);
  });

  it('rounds up, so the result never exceeds the budget', () => {
    const stride = strideFor(1000, 300);

    expect(stride).toBe(4);
    expect(sampledCount(1000, stride)).toBeLessThanOrEqual(300);
  });

  it('never returns less than one', () => {
    for (const budget of [0, -5, 1]) {
      expect(strideFor(1000, budget)).toBeGreaterThanOrEqual(1);
    }
  });

  it('handles an empty cloud', () => {
    expect(strideFor(0, 100)).toBe(1);
  });
});

describe('sampledCount', () => {
  it('counts the points a stride selects', () => {
    expect(sampledCount(1000, 1)).toBe(1000);
    expect(sampledCount(1000, 10)).toBe(100);
    expect(sampledCount(1001, 10)).toBe(101);
  });

  it('is zero for an empty cloud', () => {
    expect(sampledCount(0, 4)).toBe(0);
  });

  it('stays within the requested budget for every stride it produces', () => {
    const total = 999_983;
    for (const budget of [1000, 12_345, 250_000, 999_982]) {
      expect(sampledCount(total, strideFor(total, budget))).toBeLessThanOrEqual(budget);
    }
  });
});

describe('sampleByStride', () => {
  const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]);

  it('copies every point at stride one', () => {
    const target = new Float32Array(15);
    const written = sampleByStride(positions, target, 3, 5, 1);

    expect(written).toBe(5);
    expect([...target]).toEqual([...positions]);
  });

  it('takes every second point and packs them tightly', () => {
    const target = new Float32Array(9);
    const written = sampleByStride(positions, target, 3, 3, 2);

    expect(written).toBe(3);
    expect([...target]).toEqual([0, 0, 0, 2, 2, 2, 4, 4, 4]);
  });

  it('keeps components together, so xyz never mix between points', () => {
    const target = new Float32Array(6);
    sampleByStride(positions, target, 3, 2, 3);

    expect([...target]).toEqual([0, 0, 0, 3, 3, 3]);
  });

  it('works for a single component attribute', () => {
    const scalars = new Float32Array([10, 20, 30, 40, 50]);
    const target = new Float32Array(3);
    const written = sampleByStride(scalars, target, 1, 3, 2);

    expect(written).toBe(3);
    expect([...target]).toEqual([10, 30, 50]);
  });

  it('stops at the end of the source rather than reading past it', () => {
    const target = new Float32Array(15);
    const written = sampleByStride(positions, target, 3, 5, 2);

    expect(written).toBe(3);
    expect([...target.subarray(9)]).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('stops at the end of the target rather than writing past it', () => {
    const target = new Float32Array(6);
    const written = sampleByStride(positions, target, 3, 5, 1);

    expect(written).toBe(2);
    expect([...target]).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it('leaves the source untouched', () => {
    const copy = new Float32Array(positions);
    sampleByStride(positions, new Float32Array(9), 3, 3, 2);

    expect([...positions]).toEqual([...copy]);
  });
});

describe('sourceIndexFor and slotForSource', () => {
  it('round trips a drawn slot back to the point it came from', () => {
    for (const stride of [1, 2, 7, 100]) {
      for (const slot of [0, 1, 5, 123]) {
        expect(slotForSource(sourceIndexFor(slot, stride), stride)).toBe(slot);
      }
    }
  });

  it('maps a slot to the point the sampler copied into it', () => {
    // The sampler writes source point 0, 10, 20 into slots 0, 1, 2.
    expect(sourceIndexFor(0, 10)).toBe(0);
    expect(sourceIndexFor(1, 10)).toBe(10);
    expect(sourceIndexFor(2, 10)).toBe(20);
  });

  it('reports that a point is not drawn when the stride skips it', () => {
    expect(slotForSource(5, 10)).toBeNull();
    expect(slotForSource(11, 10)).toBeNull();
  });

  it('keeps every point drawn at stride one', () => {
    for (const index of [0, 1, 999]) {
      expect(slotForSource(index, 1)).toBe(index);
    }
  });

  it('rejects a negative index and a broken stride', () => {
    expect(slotForSource(-1, 10)).toBeNull();
    expect(slotForSource(10, 0)).toBeNull();
  });

  it('survives a budget change: a point on the new stride keeps its selection', () => {
    const source = sourceIndexFor(30, 4);

    expect(source).toBe(120);
    expect(slotForSource(source, 8)).toBe(15);
    expect(slotForSource(source, 7)).toBeNull();
  });
});
