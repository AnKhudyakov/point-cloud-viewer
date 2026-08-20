import type { PointCloudData } from '@/entities/point-cloud';

export interface SceneClip {
  normal: readonly [number, number, number];
  constant: number;
  enabled: boolean;
}

/** The measured segment itself, drawn as a line in the scene. */
export interface SceneMeasurement {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
}

/**
 * A label anchored to a world point. The overlay projects the anchor, offsets
 * the label away from it and draws a leader line in the scene between the two.
 */
export interface SceneAnnotation {
  id: string;
  anchor: readonly [number, number, number];
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
  annotations: readonly SceneAnnotation[];
  clip: SceneClip;
  split: boolean;
  rightInset: number;
}
