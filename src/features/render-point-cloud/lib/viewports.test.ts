import { describe, expect, it } from 'vitest';

import { contains, splitViewports, toGlViewport, toNdc } from './viewports';

describe('splitViewports', () => {
  it('gives the whole canvas to the main view when the split is off', () => {
    const { main, plan } = splitViewports(1000, 600, false);

    expect(main).toEqual({ x: 0, y: 0, width: 1000, height: 600 });
    expect(plan).toBeNull();
  });

  it('halves the canvas without losing a pixel on an odd width', () => {
    const { main, plan } = splitViewports(1001, 600, true);

    expect(main.width + (plan?.width ?? 0)).toBe(1001);
    expect(plan?.x).toBe(main.width);
  });

  it('keeps both halves full height', () => {
    const { main, plan } = splitViewports(800, 600, true);

    expect(main.height).toBe(600);
    expect(plan?.height).toBe(600);
  });

  it('refuses to split a canvas too narrow to halve', () => {
    expect(splitViewports(1, 600, true).plan).toBeNull();
  });

  it('leaves room on the right for the control panel', () => {
    const { main, plan } = splitViewports(1000, 600, true, 300);

    expect(main.x).toBe(0);
    expect(main.width + (plan?.width ?? 0)).toBe(700);
    expect((plan?.x ?? 0) + (plan?.width ?? 0)).toBe(700);
  });

  it('gives up the split when the panel leaves nothing to halve', () => {
    expect(splitViewports(320, 600, true, 320).plan).toBeNull();
  });

  it('ignores the inset when the split is off, so the view stays full width', () => {
    expect(splitViewports(1000, 600, false, 300).main.width).toBe(1000);
  });
});

describe('toGlViewport', () => {
  it('flips the origin from the top left to the bottom left', () => {
    const rect = { x: 100, y: 0, width: 300, height: 200 };

    expect(toGlViewport(rect, 500)).toEqual({ x: 100, y: 300, width: 300, height: 200 });
  });

  it('leaves a full height viewport at the bottom', () => {
    expect(toGlViewport({ x: 0, y: 0, width: 400, height: 500 }, 500).y).toBe(0);
  });
});

describe('contains', () => {
  const rect = { x: 100, y: 50, width: 200, height: 100 };

  it('includes the top left corner and excludes the far edges', () => {
    expect(contains(rect, 100, 50)).toBe(true);
    expect(contains(rect, 299, 149)).toBe(true);
    expect(contains(rect, 300, 100)).toBe(false);
    expect(contains(rect, 200, 150)).toBe(false);
  });

  it('rejects points outside on every side', () => {
    expect(contains(rect, 99, 100)).toBe(false);
    expect(contains(rect, 200, 49)).toBe(false);
  });

  it('splits a canvas so every point belongs to exactly one viewport', () => {
    const { main, plan } = splitViewports(800, 600, true);
    if (plan === null) throw new Error('expected a split');

    for (const x of [0, 399, 400, 799]) {
      const hits = [main, plan].filter((rect) => contains(rect, x, 300));
      expect(hits).toHaveLength(1);
    }
  });
});

describe('toNdc', () => {
  it('maps the centre of a viewport to the origin', () => {
    expect(toNdc({ x: 400, y: 0, width: 400, height: 600 }, 600, 300)).toEqual({ x: 0, y: 0 });
  });

  it('maps the corners to the unit square, with y pointing up', () => {
    const rect = { x: 0, y: 0, width: 800, height: 600 };

    expect(toNdc(rect, 0, 0)).toEqual({ x: -1, y: 1 });
    expect(toNdc(rect, 800, 600)).toEqual({ x: 1, y: -1 });
  });

  it('is relative to the viewport, not the canvas', () => {
    const offset = { x: 400, y: 0, width: 400, height: 600 };

    // A click on the left edge of the right hand viewport is at x = -1 there.
    expect(toNdc(offset, 400, 300).x).toBe(-1);
  });
});
