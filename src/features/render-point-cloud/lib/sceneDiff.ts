import type { SceneClip, SceneMeasurement, SceneState } from './scene';

export interface SceneChanges {
  cloud: boolean;
  budget: boolean;
  scalarRange: boolean;
  selected: boolean;
  clip: boolean;
  measurement: boolean;
  layout: boolean;
}

/**
 * What the viewer has to redo to match the requested state.
 *
 * Loading a cloud builds a new geometry and material, which resets the budget,
 * the selection and every uniform. So a cloud change marks everything that
 * hangs off the cloud as changed too. Without that rule the two sides drift:
 * the slider keeps saying twenty thousand points while the viewer draws them all.
 */
export function sceneChanges(previous: SceneState | null, next: SceneState): SceneChanges {
  const cloud = previous === null || previous.cloud !== next.cloud;

  return {
    cloud,
    budget: cloud || previous.budget !== next.budget,
    scalarRange: cloud || !sameRange(previous.scalarRange, next.scalarRange),
    selected: cloud || previous.selected !== next.selected,
    clip: cloud || !sameClip(previous.clip, next.clip),
    measurement: cloud || !sameMeasurement(previous.measurement, next.measurement),
    // Layout does not depend on the cloud: the viewport survives a swap.
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
    a.text === b.text &&
    a.from.every((value, index) => value === b.from[index]) &&
    a.to.every((value, index) => value === b.to[index])
  );
}
