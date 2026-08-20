import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';

import type { PointCloudData } from '@/entities/point-cloud';

import { type RenderStats, Viewer } from '../model/Viewer';
import styles from './PointCloudCanvas.module.scss';

export interface CanvasMeasurement {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  text: string;
}

interface PointCloudCanvasProps {
  cloud: PointCloudData;
  scalarRange: readonly [number, number];
  budget: number;
  selected: number | null;
  measurement: CanvasMeasurement | null;
  resetToken: number;
  onStats: (stats: RenderStats) => void;
  onPick: (sourceIndex: number | null) => void;
}

export function PointCloudCanvas({
  cloud,
  scalarRange,
  budget,
  selected,
  measurement,
  resetToken,
  onStats,
  onPick,
}: PointCloudCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const statsRef = useRef(onStats);
  const pickRef = useRef(onPick);

  useEffect(() => {
    statsRef.current = onStats;
    pickRef.current = onPick;
  }, [onStats, onPick]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const viewer = new Viewer(stage, {
      onStats: (stats) => statsRef.current(stats),
      onPick: (sourceIndex) => pickRef.current(sourceIndex),
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
    viewerRef.current?.setSelection(selected);
  }, [selected]);

  useEffect(() => {
    viewerRef.current?.setMeasurement(
      measurement === null
        ? null
        : {
            from: new Vector3(...measurement.from),
            to: new Vector3(...measurement.to),
            text: measurement.text,
          },
    );
  }, [measurement]);

  useEffect(() => {
    if (resetToken > 0) {
      viewerRef.current?.resetView();
    }
  }, [resetToken]);

  return <div ref={stageRef} className={styles.stage} />;
}
