import { type RefObject, useCallback, useEffect, useRef } from 'react';

import type { SceneState } from '../lib/scene';
import { Viewer, type ViewerCallbacks } from './Viewer';

export interface ViewerActions {
  resetView: () => void;
}

export function useViewer(
  stageRef: RefObject<HTMLDivElement | null>,
  state: SceneState,
  callbacks: ViewerCallbacks,
): ViewerActions {
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const viewer = new Viewer(stage);
    viewerRef.current = viewer;

    return () => {
      viewerRef.current = null;
      viewer.dispose();
    };
  }, [stageRef]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }
    viewer.setCallbacks(callbacks);
    viewer.apply(state);
  });

  const resetView = useCallback(() => {
    viewerRef.current?.resetView();
  }, []);

  return { resetView };
}
