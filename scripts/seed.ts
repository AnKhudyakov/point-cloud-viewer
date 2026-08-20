import { mkdir, open, stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  encodeHeader,
  fileSize,
  positionsOffset,
  scalarsOffset,
  type Vec3,
} from '../src/entities/point-cloud/lib/binaryFormat.ts';
import { createRandom, gaussian } from './lib/random.ts';
import { createScene, densityAt, groundHeight, vegetationAt, type Scene } from './lib/terrain.ts';

const ORIGIN: Vec3 = [412345.678, 5678901.234, 0];

const CHUNK_POINTS = 500_000;

const BUILDING_SHARE = 0.15;

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = 'public/clouds/dev.pcb';

interface Options {
  pointCount: number;
  seed: number;
  out: string;
  force: boolean;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const outPath = resolve(PROJECT_ROOT, options.out);

  if (!options.force && (await exists(outPath))) {
    const size = (await stat(outPath)).size;
    console.log(
      `${relative(PROJECT_ROOT, outPath)} already exists (${formatBytes(size)}), skipping. ` +
        `Pass --force to regenerate.`,
    );
    return;
  }

  const scene = createScene(options.seed, options.pointCount);
  console.log(
    `Generating ${options.pointCount.toLocaleString('en-US')} points, ` +
      `${scene.extent} x ${scene.extent} m, ${scene.buildings.length} buildings, ` +
      `seed ${options.seed}, target ${formatBytes(fileSize(options.pointCount))}`,
  );

  await mkdir(dirname(outPath), { recursive: true });
  const startedAt = Date.now();
  const summary = await write(outPath, scene, options.pointCount);
  const seconds = (Date.now() - startedAt) / 1000;

  console.log(
    `Wrote ${relative(PROJECT_ROOT, outPath)}: ` +
      `${formatBytes(fileSize(options.pointCount))} in ${seconds.toFixed(1)} s`,
  );
  console.log(
    `  origin      ${ORIGIN.map((v) => v.toFixed(3)).join(', ')}\n` +
      `  local bbox  ${summary.min.map((v) => v.toFixed(2)).join(', ')} .. ` +
      `${summary.max.map((v) => v.toFixed(2)).join(', ')}\n` +
      `  scalar      ${summary.scalarMin.toFixed(2)} .. ${summary.scalarMax.toFixed(2)} m`,
  );
}

interface Summary {
  min: Vec3;
  max: Vec3;
  scalarMin: number;
  scalarMax: number;
}

async function write(outPath: string, scene: Scene, pointCount: number): Promise<Summary> {
  const random = createRandom(scene.seed);
  const handle = await open(outPath, 'w');

  try {
    await handle.truncate(fileSize(pointCount));

    const positions = new Float32Array(CHUNK_POINTS * 3);
    const scalars = new Float32Array(CHUNK_POINTS);
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    let scalarMin = Infinity;
    let scalarMax = -Infinity;

    let written = 0;
    let positionCursor = positionsOffset();
    let scalarCursor = scalarsOffset(pointCount);

    while (written < pointCount) {
      const batch = Math.min(CHUNK_POINTS, pointCount - written);

      for (let i = 0; i < batch; i += 1) {
        const point = samplePoint(scene, random);
        const base = i * 3;

        positions[base] = point.x;
        positions[base + 1] = point.y;
        positions[base + 2] = point.z;
        scalars[i] = point.scalar;

        for (let axis = 0; axis < 3; axis += 1) {
          const value = positions[base + axis];
          if (value < min[axis]) min[axis] = value;
          if (value > max[axis]) max[axis] = value;
        }
        const scalar = scalars[i];
        if (scalar < scalarMin) scalarMin = scalar;
        if (scalar > scalarMax) scalarMax = scalar;
      }

      const positionBytes = new Uint8Array(positions.buffer, 0, batch * 12);
      await handle.write(positionBytes, 0, positionBytes.byteLength, positionCursor);
      positionCursor += positionBytes.byteLength;

      const scalarBytes = new Uint8Array(scalars.buffer, 0, batch * 4);
      await handle.write(scalarBytes, 0, scalarBytes.byteLength, scalarCursor);
      scalarCursor += scalarBytes.byteLength;

      written += batch;
      if (pointCount > CHUNK_POINTS) {
        const percent = ((written / pointCount) * 100).toFixed(0);
        console.log(`  ${percent}% (${written.toLocaleString('en-US')} points)`);
      }
    }

    const header = encodeHeader({
      pointCount,
      origin: ORIGIN,
      bboxMin: [ORIGIN[0] + min[0], ORIGIN[1] + min[1], ORIGIN[2] + min[2]],
      bboxMax: [ORIGIN[0] + max[0], ORIGIN[1] + max[1], ORIGIN[2] + max[2]],
      scalarMin,
      scalarMax,
    });
    await handle.write(new Uint8Array(header), 0, header.byteLength, 0);

    return { min, max, scalarMin, scalarMax };
  } finally {
    await handle.close();
  }
}

interface SampledPoint {
  x: number;
  y: number;
  z: number;
  scalar: number;
}

function samplePoint(scene: Scene, random: () => number): SampledPoint {
  if (scene.buildings.length > 0 && random() < BUILDING_SHARE) {
    return sampleBuilding(scene, random);
  }

  const { x, y } = sampleGroundPosition(scene, random);
  const ground = groundHeight(scene, x, y);
  const vegetation = vegetationAt(scene, x, y);

  if (random() < vegetation) {
    const height = Math.min(-Math.log(Math.max(random(), 1e-6)) * 2.6, 16);
    const z = ground + height;
    return { x: x + gaussian(random) * 0.35, y: y + gaussian(random) * 0.35, z, scalar: z };
  }

  const z = ground + gaussian(random) * 0.02;
  return { x, y, z, scalar: z };
}

function sampleGroundPosition(scene: Scene, random: () => number): { x: number; y: number } {
  for (;;) {
    const x = random() * scene.extent;
    const y = random() * scene.extent;
    if (random() < densityAt(scene, x, y)) {
      return { x, y };
    }
  }
}

function sampleBuilding(scene: Scene, random: () => number): SampledPoint {
  const building = scene.buildings[Math.floor(random() * scene.buildings.length)];
  const base = groundHeight(scene, building.cx, building.cy);
  const cos = Math.cos(building.yaw);
  const sin = Math.sin(building.yaw);

  let localX: number;
  let localY: number;
  let z: number;

  if (random() < 0.4) {
    localX = (random() * 2 - 1) * building.halfWidth;
    localY = (random() * 2 - 1) * building.halfDepth;
    z = base + building.height + gaussian(random) * 0.015;
  } else {
    const along = random() * 2 - 1;
    z = base + random() * building.height + gaussian(random) * 0.01;
    switch (Math.floor(random() * 4)) {
      case 0:
        localX = building.halfWidth;
        localY = along * building.halfDepth;
        break;
      case 1:
        localX = -building.halfWidth;
        localY = along * building.halfDepth;
        break;
      case 2:
        localX = along * building.halfWidth;
        localY = building.halfDepth;
        break;
      default:
        localX = along * building.halfWidth;
        localY = -building.halfDepth;
        break;
    }
  }

  return {
    x: building.cx + localX * cos - localY * sin,
    y: building.cy + localX * sin + localY * cos,
    z,
    scalar: z,
  };
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = { pointCount: 500_000, seed: 1, out: DEFAULT_OUT, force: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--points':
      case '-n':
        options.pointCount = parseCount(requireValue(argv, (i += 1), arg));
        break;
      case '--seed':
        options.seed = Number(requireValue(argv, (i += 1), arg));
        break;
      case '--out':
      case '-o':
        options.out = requireValue(argv, (i += 1), arg);
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--help':
      case '-h':
        console.log(
          'Usage: npm run seed -- [--points 500k] [--seed 1] [--out public/clouds/dev.pcb] [--force]',
        );
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument "${arg}". Try --help.`);
    }
  }

  if (!Number.isSafeInteger(options.pointCount) || options.pointCount <= 0) {
    throw new Error(`Point count must be a positive integer, got ${options.pointCount}`);
  }
  if (!Number.isFinite(options.seed)) {
    throw new Error('Seed must be a number');
  }

  return options;
}

function requireValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index];
  if (value === undefined) {
    throw new Error(`${flag} needs a value`);
  }
  return value;
}

function parseCount(raw: string): number {
  const match = /^(\d+(?:\.\d+)?)([km])?$/i.exec(raw.trim());
  if (!match) {
    throw new Error(`Cannot read point count "${raw}", expected forms like 500000, 500k, 2.5m`);
  }
  const value = Number(match[1]);
  const suffix = match[2]?.toLowerCase();
  const scale = suffix === 'k' ? 1e3 : suffix === 'm' ? 1e6 : 1;
  return Math.round(value * scale);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} kB`;
}

await main();
