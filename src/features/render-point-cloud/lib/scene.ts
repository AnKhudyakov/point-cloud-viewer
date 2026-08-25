import type { PointCloudData } from '@/entities/point-cloud';

export interface SceneClip {
  normal: readonly [number, number, number];
  constant: number;
  enabled: boolean;
}

export interface SceneMeasurement {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
}

export interface SceneAnnotation {
  id: string;
  anchor: readonly [number, number, number];
  text: string;
}

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
