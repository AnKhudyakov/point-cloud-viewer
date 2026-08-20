export interface ScaleBar {
  meters: number;
  pixels: number;
}

const STEPS = [1, 2, 5];

export function niceScaleBar(metersPerPixel: number, targetPixels: number): ScaleBar {
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0 || targetPixels <= 0) {
    return { meters: 0, pixels: 0 };
  }

  const rough = metersPerPixel * targetPixels;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));

  let meters = magnitude * STEPS[0];
  for (const step of STEPS) {
    const candidate = magnitude * step;
    if (candidate <= rough) {
      meters = candidate;
    }
  }
  if (magnitude * 10 <= rough) {
    meters = magnitude * 10;
  }

  return { meters, pixels: meters / metersPerPixel };
}
