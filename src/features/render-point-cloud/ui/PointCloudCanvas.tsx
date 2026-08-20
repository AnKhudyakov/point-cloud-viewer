import { type Ref, useImperativeHandle, useRef } from 'react';

import type { SceneState } from '../lib/scene';
import { useViewer } from '../model/useViewer';
import type { RenderStats } from '../model/Viewer';
import styles from './PointCloudCanvas.module.scss';

export interface PointCloudCanvasHandle {
  resetView: () => void;
}

interface PointCloudCanvasProps extends SceneState {
  onStats: (stats: RenderStats) => void;
  onPick: (sourceIndex: number | null) => void;
  ref?: Ref<PointCloudCanvasHandle>;
}

export function PointCloudCanvas({ onStats, onPick, ref, ...scene }: PointCloudCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const { resetView } = useViewer(stageRef, scene, { onStats, onPick });

  useImperativeHandle(ref, () => ({ resetView }), [resetView]);

  return <div ref={stageRef} className={styles.stage} />;
}
