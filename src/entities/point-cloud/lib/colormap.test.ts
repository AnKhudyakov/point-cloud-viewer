import { describe, expect, it } from 'vitest';

import {
  buildRampTextureData,
  normalizeScalar,
  RAMP_STOPS,
  RAMP_TEXTURE_WIDTH,
  rampCssGradient,
  sampleRamp,
} from './colormap';

describe('sampleRamp', () => {
  it('returns the first and last stop at the ends', () => {
    expect(sampleRamp(0)).toEqual([...RAMP_STOPS[0].color]);
    expect(sampleRamp(1)).toEqual([...RAMP_STOPS[RAMP_STOPS.length - 1].color]);
  });

  it('clamps outside the unit range instead of extrapolating', () => {
    expect(sampleRamp(-5)).toEqual(sampleRamp(0));
    expect(sampleRamp(5)).toEqual(sampleRamp(1));
  });

  it('hits every declared stop exactly', () => {
    for (const stop of RAMP_STOPS) {
      expect(sampleRamp(stop.offset)).toEqual([...stop.color]);
    }
  });

  it('interpolates between two stops', () => {
    const [a, b] = [RAMP_STOPS[0], RAMP_STOPS[1]];
    const middle = sampleRamp((a.offset + b.offset) / 2);

    for (let channel = 0; channel < 3; channel += 1) {
      const expected = Math.round((a.color[channel] + b.color[channel]) / 2);
      expect(middle[channel]).toBe(expected);
    }
  });

  it('never leaves the byte range', () => {
    for (let i = 0; i <= 64; i += 1) {
      for (const channel of sampleRamp(i / 64)) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('buildRampTextureData', () => {
  it('fills an opaque RGBA row', () => {
    const data = buildRampTextureData();

    expect(data.length).toBe(RAMP_TEXTURE_WIDTH * 4);
    for (let i = 3; i < data.length; i += 4) {
      expect(data[i]).toBe(255);
    }
  });

  it('starts and ends on the ramp ends', () => {
    const data = buildRampTextureData();
    const last = (RAMP_TEXTURE_WIDTH - 1) * 4;

    expect([data[0], data[1], data[2]]).toEqual([...RAMP_STOPS[0].color]);
    expect([data[last], data[last + 1], data[last + 2]]).toEqual([
      ...RAMP_STOPS[RAMP_STOPS.length - 1].color,
    ]);
  });

  it('handles a single pixel row', () => {
    expect(buildRampTextureData(1).length).toBe(4);
  });
});

describe('normalizeScalar', () => {
  it('maps the range onto 0..1', () => {
    expect(normalizeScalar(120, 120, 340)).toBe(0);
    expect(normalizeScalar(340, 120, 340)).toBe(1);
    expect(normalizeScalar(230, 120, 340)).toBeCloseTo(0.5, 6);
  });

  it('clamps values outside the range', () => {
    expect(normalizeScalar(0, 120, 340)).toBe(0);
    expect(normalizeScalar(9999, 120, 340)).toBe(1);
  });

  it('collapses a degenerate range instead of dividing by zero', () => {
    expect(normalizeScalar(120, 120, 120)).toBe(0);
    expect(normalizeScalar(120, 340, 120)).toBe(0);
  });
});

describe('rampCssGradient', () => {
  it('lists every stop so the legend and the shader cannot drift apart', () => {
    const gradient = rampCssGradient();

    expect(gradient.startsWith('linear-gradient(to top,')).toBe(true);
    for (const { color } of RAMP_STOPS) {
      expect(gradient).toContain(`rgb(${color[0]} ${color[1]} ${color[2]})`);
    }
  });
});
