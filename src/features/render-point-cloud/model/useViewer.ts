import { type RefObject, useCallback, useEffect, useRef } from 'react';

import type { SceneState } from '../lib/scene';
import { Viewer, type ViewerCallbacks } from './Viewer';

export interface ViewerActions {
  resetView: () => void;
}

/**
 * Owns the imperative viewer and keeps it in step with the state React holds.
 *
 * Two effects and no more. One creates and disposes the viewer, the other hands
 * it the current state after every render; the viewer decides what actually
 * changed. Adding a control means adding a field to `SceneState`, not another
 * effect here.
 *
 * The stage ref is passed in rather than returned, so nothing has to read a ref
 * during render to get at it.
 */
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

  // No dependency list: reconciling after every render is the point, and the
  // viewer skips the work when the state it is handed has not moved.
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
