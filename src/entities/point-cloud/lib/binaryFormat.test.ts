import { describe, expect, it } from 'vitest';

import {
  BYTES_PER_POINT,
  decodeHeader,
  encodeHeader,
  fileSize,
  FORMAT_VERSION,
  HEADER_BYTES,
  PointCloudFormatError,
  positionsOffset,
  scalarsOffset,
  type Vec3,
} from './binaryFormat';

const ORIGIN: Vec3 = [412345.678, 5678901.234, 0];

function header(pointCount: number) {
  return {
    pointCount,
    origin: ORIGIN,
    bboxMin: [ORIGIN[0], ORIGIN[1], 120] as Vec3,
    bboxMax: [ORIGIN[0] + 141, ORIGIN[1] + 141, 340] as Vec3,
    scalarMin: 120,
    scalarMax: 340,
  };
}

function buildFile(pointCount: number): ArrayBuffer {
  const buffer = new ArrayBuffer(fileSize(pointCount));
  new Uint8Array(buffer).set(new Uint8Array(encodeHeader(header(pointCount))));
  return buffer;
}

describe('layout', () => {
  it('keeps both attribute blocks aligned for typed array views', () => {
    expect(HEADER_BYTES % 4).toBe(0);
    for (const pointCount of [0, 1, 7, 500_000, 30_000_000]) {
      expect(positionsOffset() % 4).toBe(0);
      expect(scalarsOffset(pointCount) % 4).toBe(0);
    }
  });

  it('sizes a file from the point count', () => {
    expect(fileSize(0)).toBe(HEADER_BYTES);
    expect(fileSize(1)).toBe(HEADER_BYTES + BYTES_PER_POINT);
    expect(fileSize(500_000)).toBe(HEADER_BYTES + 500_000 * 16);
  });

  it('places the scalar block after every position', () => {
    expect(scalarsOffset(10)).toBe(positionsOffset() + 10 * 12);
  });
});

describe('encodeHeader and decodeHeader', () => {
  it('round trips every field', () => {
    const decoded = decodeHeader(buildFile(1234));

    expect(decoded.version).toBe(FORMAT_VERSION);
    expect(decoded.pointCount).toBe(1234);
    expect(decoded.origin).toEqual(ORIGIN);
    expect(decoded.bboxMin).toEqual([ORIGIN[0], ORIGIN[1], 120]);
    expect(decoded.bboxMax).toEqual([ORIGIN[0] + 141, ORIGIN[1] + 141, 340]);
    expect(decoded.scalarMin).toBe(120);
    expect(decoded.scalarMax).toBe(340);
  });

  it('writes exactly the header length', () => {
    expect(encodeHeader(header(1)).byteLength).toBe(HEADER_BYTES);
  });

  it('keeps float64 precision on a UTM sized origin', () => {
    const decoded = decodeHeader(buildFile(1));
    expect(decoded.origin[1]).toBe(5678901.234);
    expect(Math.fround(5678901.234)).not.toBe(5678901.234);
  });
});

describe('decodeHeader validation', () => {
  it('rejects a buffer shorter than the header', () => {
    expect(() => decodeHeader(new ArrayBuffer(HEADER_BYTES - 1))).toThrow(PointCloudFormatError);
  });

  it('rejects a wrong magic', () => {
    const buffer = buildFile(4);
    new DataView(buffer).setUint8(0, 'X'.charCodeAt(0));
    expect(() => decodeHeader(buffer)).toThrow(/Bad magic/);
  });

  it('rejects an unsupported version', () => {
    const buffer = buildFile(4);
    new DataView(buffer).setUint32(4, FORMAT_VERSION + 1, true);
    expect(() => decodeHeader(buffer)).toThrow(/Unsupported format version/);
  });

  it('rejects a truncated file', () => {
    const buffer = buildFile(100).slice(0, fileSize(100) - 16);
    expect(() => decodeHeader(buffer)).toThrow(/Length mismatch/);
  });

  it('rejects trailing bytes', () => {
    const full = buildFile(10);
    const padded = new ArrayBuffer(full.byteLength + 4);
    new Uint8Array(padded).set(new Uint8Array(full));
    expect(() => decodeHeader(padded)).toThrow(/Length mismatch/);
  });
});
