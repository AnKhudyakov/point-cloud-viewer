import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  encodeHeader,
  fileSize,
  HEADER_BYTES,
  scalarsOffset,
  type Vec3,
} from '../lib/binaryFormat';
import { loadPointCloudFromFile, loadPointCloudFromUrl } from './loader';

const ORIGIN: Vec3 = [412345.678, 5678901.234, 0];
const POINT_COUNT = 4096;

function buildFile(): ArrayBuffer {
  const buffer = new ArrayBuffer(fileSize(POINT_COUNT));
  const positions = new Float32Array(buffer, HEADER_BYTES, POINT_COUNT * 3);
  const scalars = new Float32Array(buffer, scalarsOffset(POINT_COUNT), POINT_COUNT);

  for (let i = 0; i < POINT_COUNT; i += 1) {
    positions[i * 3] = i * 0.01;
    positions[i * 3 + 1] = i * 0.02;
    positions[i * 3 + 2] = 120 + (i % 220);
    scalars[i] = 120 + (i % 220);
  }

  new Uint8Array(buffer).set(
    new Uint8Array(
      encodeHeader({
        pointCount: POINT_COUNT,
        origin: ORIGIN,
        bboxMin: [ORIGIN[0], ORIGIN[1], 120],
        bboxMax: [ORIGIN[0] + (POINT_COUNT - 1) * 0.01, ORIGIN[1] + (POINT_COUNT - 1) * 0.02, 339],
        scalarMin: 120,
        scalarMax: 339,
      }),
    ),
  );

  return buffer;
}

const FILE = buildFile();
let server: Server;
let origin: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === '/cloud.pcb') {
      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(FILE.byteLength),
      });
      response.end(Buffer.from(FILE));
      return;
    }
    if (request.url === '/truncated.pcb') {
      const half = Buffer.from(FILE).subarray(0, FILE.byteLength - 64);
      response.writeHead(200, { 'Content-Length': String(half.byteLength) });
      response.end(half);
      return;
    }
    response.writeHead(404).end('missing');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Test server did not report a port');
  }
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('loadPointCloudFromUrl', () => {
  it('streams a file to completion and decodes it', async () => {
    const cloud = await loadPointCloudFromUrl(`${origin}/cloud.pcb`);

    expect(cloud.pointCount).toBe(POINT_COUNT);
    expect(cloud.origin).toEqual(ORIGIN);
    expect(cloud.scalarRange).toEqual([120, 339]);
    expect(cloud.positions.length).toBe(POINT_COUNT * 3);
  });

  it('reports progress that ends at the full byte count', async () => {
    const seen: number[] = [];
    await loadPointCloudFromUrl(`${origin}/cloud.pcb`, {
      onProgress: (progress) => seen.push(progress.loaded),
    });

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)).toBe(FILE.byteLength);

    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  it('rejects a failed request with the status in the message', async () => {
    await expect(loadPointCloudFromUrl(`${origin}/nope.pcb`)).rejects.toThrow(/404/);
  });

  it('rejects a truncated body instead of handing over a short buffer', async () => {
    await expect(loadPointCloudFromUrl(`${origin}/truncated.pcb`)).rejects.toThrow(
      /Length mismatch/,
    );
  });

  it('stops when the caller aborts', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      loadPointCloudFromUrl(`${origin}/cloud.pcb`, { signal: controller.signal }),
    ).rejects.toThrow();
  });
});

describe('loadPointCloudFromFile', () => {
  it('reads a local blob without any network', async () => {
    const cloud = await loadPointCloudFromFile(new Blob([FILE]));

    expect(cloud.pointCount).toBe(POINT_COUNT);
    expect(cloud.origin).toEqual(ORIGIN);
  });
});
