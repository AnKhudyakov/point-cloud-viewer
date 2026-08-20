export type ClipAxis = 'x' | 'y' | 'z';

export const CLIP_AXES: readonly ClipAxis[] = ['x', 'y', 'z'];

export interface ClipPlane {
  normal: [number, number, number];
  constant: number;
}

const AXIS_INDEX: Record<ClipAxis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

/**
 * A half space to keep, expressed the way the shader reads it: a point survives
 * when `dot(normal, position) + constant >= 0`.
 *
 * Not flipped keeps the side below the cut along that axis, which for Z up data
 * means looking down into the cloud. Flipped keeps the other side.
 */
export function clipPlaneFor(axis: ClipAxis, position: number, flipped: boolean): ClipPlane {
  const normal: [number, number, number] = [0, 0, 0];
  const sign = flipped ? 1 : -1;
  normal[AXIS_INDEX[axis]] = sign;

  return { normal, constant: -sign * position };
}

export function isKept(plane: ClipPlane, point: readonly [number, number, number]): boolean {
  return (
    plane.normal[0] * point[0] +
      plane.normal[1] * point[1] +
      plane.normal[2] * point[2] +
      plane.constant >=
    0
  );
}
