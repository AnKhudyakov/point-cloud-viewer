import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import type { PointCloudData } from '@/entities/point-cloud';

import type { SceneState } from './scene';
import { sceneChanges } from './sceneDiff';

function cloud(): PointCloudData {
  return {
    origin: [0, 0, 0],
    positions: new Float32Array([0, 0, 0]),
    scalars: new Float32Array([120]),
    pointCount: 1,
    bounds: new Box3(new Vector3(), new Vector3()),
    scalarRange: [120, 120],
  };
}

function state(overrides: Partial<SceneState> = {}): SceneState {
  return {
    cloud: overrides.cloud ?? cloud(),
    budget: 1000,
    scalarRange: [120, 340],
    selected: null,
    measurement: null,
    annotations: [],
    clip: { normal: [0, 0, -1], constant: 130, enabled: false },
    split: false,
    rightInset: 0,
    ...overrides,
  };
}

describe('sceneChanges', () => {
  it('applies everything on the first pass', () => {
    const changes = sceneChanges(null, state());

    expect(Object.values(changes).every(Boolean)).toBe(true);
  });

  it('applies nothing when a fresh object carries the same values', () => {
    const first = state();
    const second = state({ cloud: first.cloud });

    expect(Object.values(sceneChanges(first, second)).some(Boolean)).toBe(false);
  });

  it('re-applies the budget when the cloud changes, which is the whole point', () => {
    const changes = sceneChanges(state(), state());

    expect(changes.cloud).toBe(true);
    expect(changes.budget).toBe(true);
    expect(changes.scalarRange).toBe(true);
    expect(changes.selected).toBe(true);
    expect(changes.clip).toBe(true);
    expect(changes.measurement).toBe(true);
  });

  it('leaves the layout alone when only the cloud changed', () => {
    expect(sceneChanges(state(), state()).layout).toBe(false);
  });

  it('notices each field on its own', () => {
    const base = state();
    const same = { cloud: base.cloud };

    expect(sceneChanges(base, state({ ...same, budget: 500 })).budget).toBe(true);
    expect(sceneChanges(base, state({ ...same, selected: 7 })).selected).toBe(true);
    expect(sceneChanges(base, state({ ...same, split: true })).layout).toBe(true);
    expect(sceneChanges(base, state({ ...same, rightInset: 300 })).layout).toBe(true);
  });

  it('compares the scalar range by value, not by reference', () => {
    const base = state();
    const same = { cloud: base.cloud };

    expect(sceneChanges(base, state({ ...same, scalarRange: [120, 340] })).scalarRange).toBe(false);
    expect(sceneChanges(base, state({ ...same, scalarRange: [130, 340] })).scalarRange).toBe(true);
  });

  it('compares the clip plane by value, including the normal', () => {
    const base = state();
    const same = { cloud: base.cloud };

    expect(
      sceneChanges(
        base,
        state({ ...same, clip: { normal: [0, 0, -1], constant: 130, enabled: false } }),
      ).clip,
    ).toBe(false);
    expect(
      sceneChanges(
        base,
        state({ ...same, clip: { normal: [0, 0, 1], constant: 130, enabled: false } }),
      ).clip,
    ).toBe(true);
    expect(
      sceneChanges(
        base,
        state({ ...same, clip: { normal: [0, 0, -1], constant: 131, enabled: false } }),
      ).clip,
    ).toBe(true);
    expect(
      sceneChanges(
        base,
        state({ ...same, clip: { normal: [0, 0, -1], constant: 130, enabled: true } }),
      ).clip,
    ).toBe(true);
  });

  it('compares the measurement by value and handles it appearing or going', () => {
    const base = state();
    const same = { cloud: base.cloud };
    const line = { from: [0, 0, 0] as const, to: [1, 1, 1] as const, text: '1.73 m' };

    expect(sceneChanges(base, state({ ...same, measurement: line })).measurement).toBe(true);

    const withLine = state({ ...same, measurement: line });
    expect(sceneChanges(withLine, state({ ...same, measurement: { ...line } })).measurement).toBe(
      false,
    );
    expect(
      sceneChanges(withLine, state({ ...same, measurement: { ...line, to: [2, 2, 2] } }))
        .measurement,
    ).toBe(true);
    expect(sceneChanges(withLine, state({ ...same, measurement: null })).measurement).toBe(true);
  });

  it('compares annotations by id, text and anchor', () => {
    const base = state();
    const same = { cloud: base.cloud };
    const label = { id: 'pick', anchor: [1, 2, 3] as const, text: '120.5 m' };
    const withLabel = state({ ...same, annotations: [label] });

    expect(sceneChanges(base, withLabel).annotations).toBe(true);
    expect(
      sceneChanges(withLabel, state({ ...same, annotations: [{ ...label }] })).annotations,
    ).toBe(false);
    expect(
      sceneChanges(withLabel, state({ ...same, annotations: [{ ...label, text: '121 m' }] }))
        .annotations,
    ).toBe(true);
    expect(
      sceneChanges(withLabel, state({ ...same, annotations: [{ ...label, anchor: [1, 2, 4] }] }))
        .annotations,
    ).toBe(true);
    expect(sceneChanges(withLabel, state({ ...same, annotations: [] })).annotations).toBe(true);
  });
});
