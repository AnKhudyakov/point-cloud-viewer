export const MAGIC = 'PCVB';
export const FORMAT_VERSION = 1;
export const HEADER_BYTES = 92;

export const BYTES_PER_POINT = 16;

const OFFSET = {
  magic: 0,
  version: 4,
  pointCount: 8,
  origin: 12,
  bboxMin: 36,
  bboxMax: 60,
  scalarMin: 84,
  scalarMax: 88,
} as const;

export type Vec3 = [number, number, number];

export interface PointCloudHeader {
  version: number;
  pointCount: number;
  origin: Vec3;
  bboxMin: Vec3;
  bboxMax: Vec3;
  scalarMin: number;
  scalarMax: number;
}

export class PointCloudFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PointCloudFormatError';
  }
}

export function positionsOffset(): number {
  return HEADER_BYTES;
}

export function scalarsOffset(pointCount: number): number {
  return HEADER_BYTES + pointCount * 12;
}

export function fileSize(pointCount: number): number {
  return HEADER_BYTES + pointCount * BYTES_PER_POINT;
}

function writeVec3(view: DataView, offset: number, value: Vec3): void {
  view.setFloat64(offset, value[0], true);
  view.setFloat64(offset + 8, value[1], true);
  view.setFloat64(offset + 16, value[2], true);
}

function readVec3(view: DataView, offset: number): Vec3 {
  return [
    view.getFloat64(offset, true),
    view.getFloat64(offset + 8, true),
    view.getFloat64(offset + 16, true),
  ];
}

export function encodeHeader(header: Omit<PointCloudHeader, 'version'>): ArrayBuffer {
  const buffer = new ArrayBuffer(HEADER_BYTES);
  const view = new DataView(buffer);

  for (let i = 0; i < MAGIC.length; i += 1) {
    view.setUint8(OFFSET.magic + i, MAGIC.charCodeAt(i));
  }
  view.setUint32(OFFSET.version, FORMAT_VERSION, true);
  view.setUint32(OFFSET.pointCount, header.pointCount, true);
  writeVec3(view, OFFSET.origin, header.origin);
  writeVec3(view, OFFSET.bboxMin, header.bboxMin);
  writeVec3(view, OFFSET.bboxMax, header.bboxMax);
  view.setFloat32(OFFSET.scalarMin, header.scalarMin, true);
  view.setFloat32(OFFSET.scalarMax, header.scalarMax, true);

  return buffer;
}

export function decodeHeader(buffer: ArrayBuffer): PointCloudHeader {
  if (buffer.byteLength < HEADER_BYTES) {
    throw new PointCloudFormatError(
      `File is shorter than the ${HEADER_BYTES} byte header (${buffer.byteLength} bytes)`,
    );
  }

  const view = new DataView(buffer);

  let magic = '';
  for (let i = 0; i < MAGIC.length; i += 1) {
    magic += String.fromCharCode(view.getUint8(OFFSET.magic + i));
  }
  if (magic !== MAGIC) {
    throw new PointCloudFormatError(`Bad magic "${magic}", expected "${MAGIC}"`);
  }

  const version = view.getUint32(OFFSET.version, true);
  if (version !== FORMAT_VERSION) {
    throw new PointCloudFormatError(
      `Unsupported format version ${version}, this build reads version ${FORMAT_VERSION}`,
    );
  }

  const pointCount = view.getUint32(OFFSET.pointCount, true);
  const expected = fileSize(pointCount);
  if (buffer.byteLength !== expected) {
    throw new PointCloudFormatError(
      `Length mismatch: header declares ${pointCount} points (${expected} bytes) ` +
        `but the file is ${buffer.byteLength} bytes`,
    );
  }

  return {
    version,
    pointCount,
    origin: readVec3(view, OFFSET.origin),
    bboxMin: readVec3(view, OFFSET.bboxMin),
    bboxMax: readVec3(view, OFFSET.bboxMax),
    scalarMin: view.getFloat32(OFFSET.scalarMin, true),
    scalarMax: view.getFloat32(OFFSET.scalarMax, true),
  };
}
