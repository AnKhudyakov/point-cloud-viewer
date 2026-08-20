import { type Camera, Vector3 } from 'three';

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

const projected = new Vector3();

export function projectToScreen(
  world: Vector3,
  camera: Camera,
  width: number,
  height: number,
): ScreenPoint {
  projected.copy(world).project(camera);

  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (1 - (projected.y * 0.5 + 0.5)) * height,
    visible: projected.z >= -1 && projected.z <= 1,
  };
}

export function metersPerPixel(
  distanceToTarget: number,
  fovDegrees: number,
  viewportHeight: number,
): number {
  if (viewportHeight <= 0) {
    return 0;
  }
  const visibleHeight = 2 * Math.tan((fovDegrees * Math.PI) / 360) * distanceToTarget;
  return visibleHeight / viewportHeight;
}
