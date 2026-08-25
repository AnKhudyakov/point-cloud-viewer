import type { SceneAnnotation, SceneClip, SceneMeasurement, SceneState } from './scene';

export interface SceneChanges {
  cloud: boolean;
  budget: boolean;
  scalarRange: boolean;
  selected: boolean;
  clip: boolean;
  measurement: boolean;
  annotations: boolean;
  layout: boolean;
}

export function sceneChanges(previous: SceneState | null, next: SceneState): SceneChanges {
  const cloud = previous === null || previous.cloud !== next.cloud;

  return {
    cloud,
    budget: cloud || previous.budget !== next.budget,
    scalarRange: cloud || !sameRange(previous.scalarRange, next.scalarRange),
    selected: cloud || previous.selected !== next.selected,
    clip: cloud || !sameClip(previous.clip, next.clip),
    measurement: cloud || !sameMeasurement(previous.measurement, next.measurement),
    annotations: cloud || !sameAnnotations(previous.annotations, next.annotations),

    layout:
      previous === null || previous.split !== next.split || previous.rightInset !== next.rightInset,
  };
}

function sameRange(a: readonly [number, number], b: readonly [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function sameClip(a: SceneClip, b: SceneClip): boolean {
  return (
    a.enabled === b.enabled &&
    a.constant === b.constant &&
    a.normal[0] === b.normal[0] &&
    a.normal[1] === b.normal[1] &&
    a.normal[2] === b.normal[2]
  );
}

function sameMeasurement(a: SceneMeasurement | null, b: SceneMeasurement | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.from.every((value, index) => value === b.from[index]) &&
    a.to.every((value, index) => value === b.to[index])
  );
}

function sameAnnotations(a: readonly SceneAnnotation[], b: readonly SceneAnnotation[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((annotation, index) => {
    const other = b[index];
    return (
      annotation.id === other.id &&
      annotation.text === other.text &&
      annotation.anchor.every((value, axis) => value === other.anchor[axis])
    );
  });
}
