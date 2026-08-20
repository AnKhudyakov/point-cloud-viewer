import { useEffect, useRef } from 'react';

import type { PointCloudData } from '@/entities/point-cloud';

import { type RenderStats, Viewer } from '../model/Viewer';
import styles from './PointCloudCanvas.module.scss';

interface PointCloudCanvasProps {
  cloud: PointCloudData;
  scalarRange: readonly [number, number];
  budget: number;
  resetToken: number;
  onStats: (stats: RenderStats) => void;
}

export function PointCloudCanvas({
  cloud,
  scalarRange,
  budget,
  resetToken,
  onStats,
}: PointCloudCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const statsRef = useRef(onStats);

  useEffect(() => {
    statsRef.current = onStats;
  }, [onStats]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const viewer = new Viewer(stage, {
      onStats: (stats) => statsRef.current(stats),
    });
    viewerRef.current = viewer;

    return () => {
      viewerRef.current = null;
      viewer.dispose();
    };
  }, []);

  useEffect(() => {
    viewerRef.current?.setCloud(cloud);
  }, [cloud]);

  useEffect(() => {
    viewerRef.current?.setBudget(budget);
  }, [budget]);

  useEffect(() => {
    viewerRef.current?.setScalarRange(scalarRange[0], scalarRange[1]);
  }, [scalarRange]);

  useEffect(() => {
    if (resetToken > 0) {
      viewerRef.current?.resetView();
    }
  }, [resetToken]);

  return <div ref={stageRef} className={styles.stage} />;
}
