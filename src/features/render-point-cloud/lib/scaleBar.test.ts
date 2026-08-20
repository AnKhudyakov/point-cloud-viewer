import { describe, expect, it } from 'vitest';

import { niceScaleBar } from './scaleBar';

describe('niceScaleBar', () => {
  it('only ever picks 1, 2 or 5 times a power of ten', () => {
    for (let exponent = -3; exponent <= 4; exponent += 1) {
      for (const factor of [1, 1.4, 2.3, 4.9, 7.5, 9.9]) {
        const { meters } = niceScaleBar((factor * Math.pow(10, exponent)) / 120, 120);
        const mantissa = meters / Math.pow(10, Math.floor(Math.log10(meters)));

        expect([1, 2, 5, 10]).toContain(Math.round(mantissa));
      }
    }
  });

  it('never draws a bar longer than the target width', () => {
    for (const scale of [0.001, 0.05, 1, 37, 1200]) {
      const bar = niceScaleBar(scale, 120);

      expect(bar.pixels).toBeLessThanOrEqual(120 + 1e-9);
      expect(bar.pixels).toBeGreaterThan(0);
    }
  });

  it('reports a length that agrees with its own pixel width', () => {
    const perPixel = 0.37;
    const bar = niceScaleBar(perPixel, 150);

    expect(bar.meters).toBeCloseTo(bar.pixels * perPixel, 9);
  });

  it('shows a shorter bar as the camera moves closer', () => {
    const far = niceScaleBar(1, 120);
    const near = niceScaleBar(0.01, 120);

    expect(near.meters).toBeLessThan(far.meters);
  });

  it('refuses to invent a bar without a scale', () => {
    expect(niceScaleBar(0, 120)).toEqual({ meters: 0, pixels: 0 });
    expect(niceScaleBar(Number.NaN, 120)).toEqual({ meters: 0, pixels: 0 });
    expect(niceScaleBar(1, 0)).toEqual({ meters: 0, pixels: 0 });
  });
});
