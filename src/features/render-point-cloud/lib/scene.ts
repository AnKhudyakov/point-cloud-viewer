import type { PointCloudData } from '@/entities/point-cloud';

export interface SceneClip {
  normal: readonly [number, number, number];
  constant: number;
  enabled: boolean;
}

export interface SceneMeasurement {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  text: string;
}

/**
 * The whole viewer state React is allowed to describe. Nothing here is a
 * Three.js type, so the React side never touches the graphics library.
 */
export interface SceneState {
  cloud: PointCloudData;
  budget: number;
  scalarRange: readonly [number, number];
  selected: number | null;
  measurement: SceneMeasurement | null;
  clip: SceneClip;
  split: boolean;
  rightInset: number;
}
