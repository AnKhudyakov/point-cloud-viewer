import { describe, expect, it } from 'vitest';

import { CLIP_AXES, clipPlaneFor, isKept } from './clipPlane';

describe('clipPlaneFor', () => {
  it('keeps everything below the cut on Z by default', () => {
    const plane = clipPlaneFor('z', 130, false);

    expect(isKept(plane, [0, 0, 120])).toBe(true);
    expect(isKept(plane, [0, 0, 130])).toBe(true);
    expect(isKept(plane, [0, 0, 140])).toBe(false);
  });

  it('keeps everything above the cut once flipped', () => {
    const plane = clipPlaneFor('z', 130, true);

    expect(isKept(plane, [0, 0, 120])).toBe(false);
    expect(isKept(plane, [0, 0, 140])).toBe(true);
  });

  it('cuts on the chosen axis and ignores the others', () => {
    const plane = clipPlaneFor('x', 50, false);

    expect(isKept(plane, [40, 9999, -9999])).toBe(true);
    expect(isKept(plane, [60, 0, 0])).toBe(false);
  });

  it('uses a unit normal on exactly one axis', () => {
    for (const axis of CLIP_AXES) {
      for (const flipped of [false, true]) {
        const { normal } = clipPlaneFor(axis, 12, flipped);
        const nonZero = normal.filter((value) => value !== 0);

        expect(nonZero).toHaveLength(1);
        expect(Math.abs(nonZero[0])).toBe(1);
      }
    }
  });

  it('places the boundary exactly on the requested position', () => {
    for (const axis of CLIP_AXES) {
      const index = CLIP_AXES.indexOf(axis);
      const plane = clipPlaneFor(axis, 7.25, false);
      const onPlane: [number, number, number] = [0, 0, 0];
      onPlane[index] = 7.25;

      expect(isKept(plane, onPlane)).toBe(true);

      const past: [number, number, number] = [0, 0, 0];
      past[index] = 7.2500001;
      expect(isKept(plane, past)).toBe(false);
    }
  });

  it('splits space so flipping keeps the complement, boundary aside', () => {
    const keepBelow = clipPlaneFor('y', 0, false);
    const keepAbove = clipPlaneFor('y', 0, true);

    for (const value of [-10, -0.5, 0.5, 10]) {
      const point: [number, number, number] = [0, value, 0];
      expect(isKept(keepBelow, point)).toBe(!isKept(keepAbove, point));
    }
  });
});
