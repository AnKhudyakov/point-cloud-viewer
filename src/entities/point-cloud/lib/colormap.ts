export interface RampStop {
  offset: number;
  color: readonly [number, number, number];
}

export const RAMP_STOPS: readonly RampStop[] = [
  { offset: 0, color: [68, 1, 84] },
  { offset: 0.125, color: [71, 45, 123] },
  { offset: 0.25, color: [59, 82, 139] },
  { offset: 0.375, color: [44, 114, 142] },
  { offset: 0.5, color: [33, 145, 140] },
  { offset: 0.625, color: [39, 173, 129] },
  { offset: 0.75, color: [94, 201, 98] },
  { offset: 0.875, color: [170, 220, 50] },
  { offset: 1, color: [253, 231, 37] },
];

export const RAMP_TEXTURE_WIDTH = 256;

export function sampleRamp(t: number): [number, number, number] {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;

  let lower = RAMP_STOPS[0];
  let upper = RAMP_STOPS[RAMP_STOPS.length - 1];
  for (let i = 0; i < RAMP_STOPS.length - 1; i += 1) {
    if (clamped >= RAMP_STOPS[i].offset && clamped <= RAMP_STOPS[i + 1].offset) {
      lower = RAMP_STOPS[i];
      upper = RAMP_STOPS[i + 1];
      break;
    }
  }

  const span = upper.offset - lower.offset;
  const local = span === 0 ? 0 : (clamped - lower.offset) / span;

  return [
    Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * local),
    Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * local),
    Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * local),
  ];
}

export function buildRampTextureData(width = RAMP_TEXTURE_WIDTH): Uint8Array {
  const data = new Uint8Array(width * 4);

  for (let i = 0; i < width; i += 1) {
    const [r, g, b] = sampleRamp(width === 1 ? 0 : i / (width - 1));
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }

  return data;
}

export function normalizeScalar(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) {
    return 0;
  }
  const t = (value - min) / span;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function rampCssGradient(direction = 'to top'): string {
  const stops = RAMP_STOPS.map(
    ({ offset, color }) => `rgb(${color[0]} ${color[1]} ${color[2]}) ${(offset * 100).toFixed(1)}%`,
  );
  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}
