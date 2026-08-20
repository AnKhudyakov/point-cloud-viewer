import { describe, expect, it } from 'vitest';

import { encodeHeader, fileSize, HEADER_BYTES, scalarsOffset, type Vec3 } from './binaryFormat';
import { decodePointCloud, toAbsolute } from './decode';

const ORIGIN: Vec3 = [412345.678, 5678901.234, 0];

function buildFile(positions: readonly number[], scalars: readonly number[]): ArrayBuffer {
  const pointCount = scalars.length;
  const buffer = new ArrayBuffer(fileSize(pointCount));

  const position = new Float32Array(buffer, HEADER_BYTES, pointCount * 3);
  position.set(positions);
  new Float32Array(buffer, scalarsOffset(pointCount), pointCount).set(scalars);

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pointCount; i += 1) {
    minX = Math.min(minX, position[i * 3]);
    minY = Math.min(minY, position[i * 3 + 1]);
    minZ = Math.min(minZ, position[i * 3 + 2]);
    maxX = Math.max(maxX, position[i * 3]);
    maxY = Math.max(maxY, position[i * 3 + 1]);
    maxZ = Math.max(maxZ, position[i * 3 + 2]);
  }

  const head = encodeHeader({
    pointCount,
    origin: ORIGIN,
    bboxMin: [ORIGIN[0] + minX, ORIGIN[1] + minY, ORIGIN[2] + minZ],
    bboxMax: [ORIGIN[0] + maxX, ORIGIN[1] + maxY, ORIGIN[2] + maxZ],
    scalarMin: Math.min(...scalars),
    scalarMax: Math.max(...scalars),
  });
  new Uint8Array(buffer).set(new Uint8Array(head));

  return buffer;
}

const POSITIONS = [0, 0, 120, 10, 20, 200, -5, 40, 340];
const SCALARS = [120, 200, 340];

describe('decodePointCloud', () => {
  it('exposes the attribute blocks in order', () => {
    const cloud = decodePointCloud(buildFile(POSITIONS, SCALARS));

    expect(cloud.pointCount).toBe(3);
    expect([...cloud.positions]).toEqual(POSITIONS);
    expect([...cloud.scalars]).toEqual(SCALARS);
    expect(cloud.scalarRange).toEqual([120, 340]);
  });

  it('returns views into the source buffer rather than copies', () => {
    const buffer = buildFile(POSITIONS, SCALARS);
    const cloud = decodePointCloud(buffer);

    expect(cloud.positions.buffer).toBe(buffer);
    expect(cloud.scalars.buffer).toBe(buffer);
    expect(cloud.positions.byteOffset).toBe(HEADER_BYTES);
    expect(cloud.scalars.byteOffset).toBe(scalarsOffset(3));
  });

  it('keeps the origin in float64', () => {
    const cloud = decodePointCloud(buildFile(POSITIONS, SCALARS));
    expect(cloud.origin).toEqual(ORIGIN);
  });

  it('reports bounds in the same space as the positions', () => {
    const cloud = decodePointCloud(buildFile(POSITIONS, SCALARS));

    expect(cloud.bounds.min.toArray()).toEqual([-5, 0, 120]);
    expect(cloud.bounds.max.toArray()).toEqual([10, 40, 340]);

    expect(cloud.bounds.containsPoint(cloud.bounds.min)).toBe(true);
  });

  it('handles an empty cloud', () => {
    const cloud = decodePointCloud(buildFile([], []));
    expect(cloud.pointCount).toBe(0);
    expect(cloud.positions.length).toBe(0);
  });
});

describe('toAbsolute', () => {
  it('adds the origin back for a readout in dataset coordinates', () => {
    const cloud = decodePointCloud(buildFile(POSITIONS, SCALARS));

    expect(toAbsolute(cloud, 1)).toEqual([ORIGIN[0] + 10, ORIGIN[1] + 20, 200]);
  });

  it('keeps sub millimeter accuracy at UTM magnitudes', () => {
    const cloud = decodePointCloud(buildFile(POSITIONS, SCALARS));
    const [easting] = toAbsolute(cloud, 1);

    expect(easting).toBeCloseTo(412355.678, 6);
  });

  it('refuses an index outside the cloud', () => {
    const cloud = decodePointCloud(buildFile(POSITIONS, SCALARS));

    expect(() => toAbsolute(cloud, 3)).toThrow(/outside/);
    expect(() => toAbsolute(cloud, -1)).toThrow(/outside/);
  });
});
