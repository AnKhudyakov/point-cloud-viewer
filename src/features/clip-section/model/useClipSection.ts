import { useCallback, useMemo, useState } from 'react';

import type { PointCloudData } from '@/entities/point-cloud';

import { type ClipAxis, type ClipPlane, clipPlaneFor } from '../lib/clipPlane';

export interface ClipSectionState {
  enabled: boolean;
  axis: ClipAxis;
  position: number;
  flipped: boolean;
  min: number;
  max: number;
  plane: ClipPlane;
  setEnabled: (enabled: boolean) => void;
  setAxis: (axis: ClipAxis) => void;
  setPosition: (position: number) => void;
  setFlipped: (flipped: boolean) => void;
}

interface Settings {
  enabled: boolean;
  axis: ClipAxis;
  offset: number;
  flipped: boolean;
}

const INITIAL: Settings = { enabled: false, axis: 'z', offset: 0.6, flipped: false };

export function useClipSection(cloud: PointCloudData): ClipSectionState {
  const [settings, setSettings] = useState<Settings>(INITIAL);

  const [min, max] = useMemo(() => {
    const { min: low, max: high } = cloud.bounds;
    const axis = settings.axis;
    return [low[axis], high[axis]];
  }, [cloud, settings.axis]);

  const position = min + (max - min) * settings.offset;
  const plane = clipPlaneFor(settings.axis, position, settings.flipped);

  const setPosition = useCallback(
    (next: number) => {
      setSettings((previous) => {
        const span = max - min;
        return { ...previous, offset: span === 0 ? 0.5 : (next - min) / span };
      });
    },
    [min, max],
  );

  return {
    enabled: settings.enabled,
    axis: settings.axis,
    position,
    flipped: settings.flipped,
    min,
    max,
    plane,
    setEnabled: useCallback((enabled: boolean) => setSettings((p) => ({ ...p, enabled })), []),
    setAxis: useCallback((axis: ClipAxis) => setSettings((p) => ({ ...p, axis })), []),
    setFlipped: useCallback((flipped: boolean) => setSettings((p) => ({ ...p, flipped })), []),
    setPosition,
  };
}
