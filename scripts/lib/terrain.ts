import { createRandom, fbm } from './random.ts';

export const TARGET_DENSITY = 25;

export const GROUND_BASE = 120;

export const RELIEF_RATIO = 0.22;
export const MIN_RELIEF = 8;
export const MAX_RELIEF = 400;

const CALIBRATION_STEPS = 128;

export interface Building {
  cx: number;
  cy: number;
  halfWidth: number;
  halfDepth: number;
  height: number;
  yaw: number;
}

export interface Scene {
  seed: number;
  extent: number;
  relief: number;
  buildings: Building[];
  fieldMin: number;
  fieldMax: number;
}

export function createScene(seed: number, pointCount: number): Scene {
  const extent = Math.round(Math.sqrt(pointCount / TARGET_DENSITY));
  const relief = Math.min(Math.max(extent * RELIEF_RATIO, MIN_RELIEF), MAX_RELIEF);
  const draft: Scene = {
    seed,
    extent,
    relief,
    buildings: createBuildings(seed, extent),
    fieldMin: 0,
    fieldMax: 1,
  };

  let fieldMin = Infinity;
  let fieldMax = -Infinity;
  for (let iy = 0; iy <= CALIBRATION_STEPS; iy += 1) {
    for (let ix = 0; ix <= CALIBRATION_STEPS; ix += 1) {
      const value = heightField(
        draft,
        (ix / CALIBRATION_STEPS) * extent,
        (iy / CALIBRATION_STEPS) * extent,
      );
      if (value < fieldMin) fieldMin = value;
      if (value > fieldMax) fieldMax = value;
    }
  }

  return { ...draft, fieldMin, fieldMax };
}

function heightField(scene: Scene, x: number, y: number): number {
  const large = fbm(x / 620, y / 620, scene.seed + 11, 5);
  const ridges = fbm(x / 150, y / 150, scene.seed + 29, 4);
  return large * 0.75 + ridges * 0.25;
}

export function groundHeight(scene: Scene, x: number, y: number): number {
  const span = scene.fieldMax - scene.fieldMin || 1;
  const t = (heightField(scene, x, y) - scene.fieldMin) / span;

  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return GROUND_BASE + clamped * scene.relief;
}

export function densityAt(scene: Scene, x: number, y: number): number {
  const field = fbm(x / 240, y / 240, scene.seed + 53, 4);

  return 0.1 + 0.9 * field * field;
}

export function vegetationAt(scene: Scene, x: number, y: number): number {
  const field = fbm(x / 95, y / 95, scene.seed + 71, 4);
  return Math.max(0, field - 0.42) * 1.7;
}

function createBuildings(seed: number, extent: number): Building[] {
  const random = createRandom(seed + 977);
  const count = Math.max(2, Math.round((extent * extent) / 3500));
  const maxHalfSize = Math.max(Math.min(20, extent * 0.08), 2);
  const maxHeight = Math.max(Math.min(28, extent * 0.2), 3);
  const buildings: Building[] = [];

  for (let i = 0; i < count; i += 1) {
    buildings.push({
      cx: random() * extent,
      cy: random() * extent,
      halfWidth: maxHalfSize * (0.4 + random() * 0.6),
      halfDepth: maxHalfSize * (0.4 + random() * 0.6),
      height: maxHeight * (0.3 + random() * 0.7),
      yaw: random() * Math.PI,
    });
  }

  return buildings;
}
