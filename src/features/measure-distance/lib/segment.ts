export interface Segment {
  distance: number;
  horizontal: number;
  vertical: number;
  slopeDegrees: number;
}

export function describeSegment(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): Segment {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];

  const horizontal = Math.hypot(dx, dy);
  const distance = Math.hypot(horizontal, dz);
  const slopeDegrees =
    horizontal === 0 ? (dz === 0 ? 0 : 90) : (Math.atan2(dz, horizontal) * 180) / Math.PI;

  return { distance, horizontal, vertical: dz, slopeDegrees };
}
