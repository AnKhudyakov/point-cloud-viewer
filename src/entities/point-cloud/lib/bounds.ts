import { Box3, Vector3 } from 'three';

export function computeBounds(positions: Float32Array): Box3 {
  const count = Math.floor(positions.length / 3);
  if (count === 0) {
    return new Box3(new Vector3(0, 0, 0), new Vector3(0, 0, 0));
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < count; i += 1) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  return new Box3(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ));
}

export function boundsDiagonal(bounds: Box3): number {
  return bounds.getSize(new Vector3()).length();
}
