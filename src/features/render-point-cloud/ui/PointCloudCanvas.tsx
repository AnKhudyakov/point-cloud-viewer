import { useEffect, useRef } from 'react';

import type { PointCloudData } from '@/entities/point-cloud';

import { Viewer } from '../model/Viewer';
import styles from './PointCloudCanvas.module.scss';

interface PointCloudCanvasProps {
  cloud: PointCloudData;
  scalarRange: readonly [number, number];
  resetToken: number;
}

export function PointCloudCanvas({ cloud, scalarRange, resetToken }: PointCloudCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
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
  }, []);

  useEffect(() => {
    viewerRef.current?.setCloud(cloud);
  }, [cloud]);

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
