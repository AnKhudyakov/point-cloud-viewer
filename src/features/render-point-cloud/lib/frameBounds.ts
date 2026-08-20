import { type Box3, Vector3 } from 'three';

export interface CameraFraming {
  target: Vector3;
  position: Vector3;
  distance: number;
  near: number;
  far: number;
}

export const DEFAULT_FIT_PADDING = 1.25;

const AZIMUTH = Math.PI * 0.25;
const ELEVATION = Math.PI * 0.28;

export function fitDistance(radius: number, fovDegrees: number, aspect: number, padding: number) {
  if (radius <= 0) {
    return padding;
  }

  const vertical = (fovDegrees * Math.PI) / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * Math.max(aspect, 1e-3));
  const limiting = Math.min(vertical, horizontal);

  return (radius / Math.sin(limiting / 2)) * padding;
}

export function frameBounds(
  bounds: Box3,
  fovDegrees: number,
  aspect: number,
  padding = DEFAULT_FIT_PADDING,
): CameraFraming {
  const target = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const radius = size.length() / 2;
  const distance = fitDistance(radius, fovDegrees, aspect, padding);

  const horizontal = Math.cos(ELEVATION) * distance;
  const position = new Vector3(
    target.x + Math.cos(AZIMUTH) * horizontal,
    target.y + Math.sin(AZIMUTH) * horizontal,
    target.z + Math.sin(ELEVATION) * distance,
  );

  return {
    target,
    position,
    distance,
    near: Math.max(distance / 5000, 0.01),
    far: distance * 8 + radius * 4,
  };
}
