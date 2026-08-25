export type ClipAxis = 'x' | 'y' | 'z';

export const CLIP_AXES: readonly ClipAxis[] = ['x', 'y', 'z'];

export interface ClipPlane {
  normal: [number, number, number];
  constant: number;
}

const AXIS_INDEX: Record<ClipAxis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

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
