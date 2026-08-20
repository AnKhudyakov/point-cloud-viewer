import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { metersPerPixel, projectToScreen } from './project';

/**
 * A Z up camera standing south of the origin and looking north, the way the
 * viewer sets one up. Looking straight down the Z axis would put `up` parallel
 * to the view direction, where the orientation is undefined.
 */
function zUpCamera(fov = 55, aspect = 2, distance = 100): PerspectiveCamera {
  const camera = new PerspectiveCamera(fov, aspect, 0.1, 1000);
  camera.up.set(0, 0, 1);
  camera.position.set(0, -distance, 0);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

describe('projectToScreen', () => {
  it('puts a point on the view axis at the middle of the viewport', () => {
    const point = projectToScreen(new Vector3(0, 0, 0), zUpCamera(), 800, 400);

    expect(point.x).toBeCloseTo(400, 6);
    expect(point.y).toBeCloseTo(200, 6);
    expect(point.visible).toBe(true);
  });

  it('grows to the right and downward, matching CSS coordinates', () => {
    const camera = zUpCamera();
    const east = projectToScreen(new Vector3(10, 0, 0), camera, 800, 400);
    const above = projectToScreen(new Vector3(0, 0, 10), camera, 800, 400);

    expect(east.x).toBeGreaterThan(400);
    expect(east.y).toBeCloseTo(200, 6);
    expect(above.y).toBeLessThan(200);
    expect(above.x).toBeCloseTo(400, 6);
  });

  it('scales with the viewport, so a resize moves labels correctly', () => {
    const camera = zUpCamera();
    const small = projectToScreen(new Vector3(10, 0, 5), camera, 800, 400);
    const large = projectToScreen(new Vector3(10, 0, 5), camera, 1600, 800);

    expect(large.x).toBeCloseTo(small.x * 2, 6);
    expect(large.y).toBeCloseTo(small.y * 2, 6);
  });

  it('marks a point behind the camera as not visible', () => {
    const behind = projectToScreen(new Vector3(0, -200, 0), zUpCamera(), 800, 400);

    expect(behind.visible).toBe(false);
  });

  it('marks a point past the far plane as not visible', () => {
    const far = projectToScreen(new Vector3(0, 2000, 0), zUpCamera(), 800, 400);

    expect(far.visible).toBe(false);
  });
});

describe('metersPerPixel', () => {
  it('matches the frustum height at the target distance', () => {
    const fov = 60;
    const distance = 100;
    const height = 500;
    const visible = 2 * Math.tan((fov * Math.PI) / 360) * distance;

    expect(metersPerPixel(distance, fov, height)).toBeCloseTo(visible / height, 12);
  });

  it('halves when the camera comes twice as close', () => {
    const far = metersPerPixel(200, 55, 600);
    const near = metersPerPixel(100, 55, 600);

    expect(near).toBeCloseTo(far / 2, 12);
  });

  it('halves when the viewport doubles in height', () => {
    const short = metersPerPixel(100, 55, 300);
    const tall = metersPerPixel(100, 55, 600);

    expect(tall).toBeCloseTo(short / 2, 12);
  });

  it('is zero for a collapsed viewport instead of dividing by zero', () => {
    expect(metersPerPixel(100, 55, 0)).toBe(0);
  });
});
