import { Color, PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { type PointCloudData, slotForSource, sourceIndexFor } from '@/entities/point-cloud';

import { frameBounds } from '../lib/frameBounds';
import { createRampTexture, projectionScale } from './pointCloudMaterial';
import { PointCloudObject } from './PointCloudObject';

export interface RenderStats {
  fps: number;
  drawn: number;
  total: number;
  capacity: number;
  stride: number;
}

export interface ViewerOptions {
  onStats?: (stats: RenderStats) => void;
  onPick?: (sourceIndex: number | null) => void;
}

export const CANVAS_CLASS = 'point-cloud-canvas';

const FIELD_OF_VIEW = 55;
const STATS_INTERVAL_MS = 250;
const FPS_SMOOTHING = 0.1;
const CLICK_SLOP_PX = 4;
const PICK_THRESHOLD_SCALE = 2;
const BACKGROUND = 0x0d1117;
const MAX_PIXEL_RATIO = 2;

export class Viewer {
  private readonly renderer: WebGLRenderer;

  private readonly scene = new Scene();

  private readonly camera: PerspectiveCamera;

  private readonly controls: OrbitControls;

  private readonly ramp = createRampTexture();

  private readonly observer: ResizeObserver;

  private cloud: PointCloudObject | null = null;

  private frame = 0;

  private disposed = false;

  private readonly onStats: ((stats: RenderStats) => void) | undefined;

  private readonly onPick: ((sourceIndex: number | null) => void) | undefined;

  private readonly raycaster = new Raycaster();

  private readonly pointer = new Vector2();

  private pressedAt: { x: number; y: number } | null = null;

  private selected: number | null = null;

  private stride = 1;

  private fps = 0;

  private lastFrameAt = 0;

  private lastReportAt = 0;

  private readonly container: HTMLElement;

  private readonly canvas: HTMLCanvasElement;

  constructor(container: HTMLElement, options: ViewerOptions = {}) {
    this.container = container;
    this.onStats = options.onStats;
    this.onPick = options.onPick;

    this.canvas = document.createElement('canvas');
    this.canvas.className = CANVAS_CLASS;
    container.append(this.canvas);

    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setClearColor(new Color(BACKGROUND), 1);

    this.camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 1000);
    this.camera.up.set(0, 0, 1);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.screenSpacePanning = false;

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();

    this.loop();
  }

  setCloud(data: PointCloudData): void {
    this.clearCloud();

    this.cloud = new PointCloudObject(data, this.ramp);
    this.scene.add(this.cloud.points);
    this.cloud.setProjectionScale(this.currentProjectionScale());
    this.stride = 1;
    this.setSelection(null);

    this.resetView();
    this.reportStats(true);
  }

  setSelection(sourceIndex: number | null): void {
    this.selected = sourceIndex;
    this.applySelection();
  }

  setBudget(budget: number): void {
    if (!this.cloud) {
      return;
    }

    const result = this.cloud.applyBudget(budget);
    this.stride = result.stride;
    this.applySelection();
    this.reportStats(true);
  }

  get capacity(): number {
    return this.cloud?.capacity ?? 0;
  }

  setScalarRange(min: number, max: number): void {
    this.cloud?.setScalarRange(min, max);
  }

  setPointSize(size: number): void {
    this.cloud?.setPointSize(size);
  }

  get pointSize(): number {
    return this.cloud?.pointSize ?? 0;
  }

  resetView(): void {
    if (!this.cloud) {
      return;
    }

    const bounds = this.cloud.points.geometry.boundingBox;
    if (!bounds) {
      return;
    }

    const framing = frameBounds(bounds, FIELD_OF_VIEW, this.camera.aspect);
    this.camera.position.copy(framing.position);
    this.camera.near = framing.near;
    this.camera.far = framing.far;
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(framing.target);
    this.controls.maxDistance = framing.far * 0.5;
    this.controls.update();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.controls.dispose();

    this.clearCloud();

    this.ramp.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private clearCloud(): void {
    if (!this.cloud) {
      return;
    }

    this.scene.remove(this.cloud.points);
    this.cloud.dispose();
    this.cloud = null;
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.cloud?.setProjectionScale(this.currentProjectionScale());
  }

  private currentProjectionScale(): number {
    return projectionScale(this.renderer.getContext().drawingBufferHeight, FIELD_OF_VIEW);
  }

  private loop = (): void => {
    if (this.disposed) {
      return;
    }

    this.frame = requestAnimationFrame(this.loop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.measure();
  };

  private applySelection(): void {
    if (!this.cloud) {
      return;
    }
    this.cloud.setSelectedSlot(
      this.selected === null ? null : slotForSource(this.selected, this.stride),
    );
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.pressedAt = { x: event.clientX, y: event.clientY };
  };

  private handlePointerUp = (event: PointerEvent): void => {
    const pressed = this.pressedAt;
    this.pressedAt = null;

    if (!pressed || event.button !== 0) {
      return;
    }
    const moved = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
    if (moved > CLICK_SLOP_PX) {
      return;
    }

    this.pick(event);
  };

  private pick(event: PointerEvent): void {
    if (!this.cloud || !this.onPick) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    this.raycaster.params.Points.threshold = this.cloud.pointSize * PICK_THRESHOLD_SCALE;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = this.raycaster.intersectObject(this.cloud.points, false)[0];
    const slot = hit?.index;

    this.onPick(slot === undefined ? null : sourceIndexFor(slot, this.stride));
  }

  private measure(): void {
    const now = performance.now();

    if (this.lastFrameAt > 0) {
      const delta = now - this.lastFrameAt;
      if (delta > 0) {
        const instant = 1000 / delta;
        this.fps =
          this.fps === 0 ? instant : this.fps * (1 - FPS_SMOOTHING) + instant * FPS_SMOOTHING;
      }
    }
    this.lastFrameAt = now;

    if (now - this.lastReportAt >= STATS_INTERVAL_MS) {
      this.lastReportAt = now;
      this.reportStats(false);
    }
  }

  private reportStats(force: boolean): void {
    if (!this.onStats || !this.cloud) {
      return;
    }
    if (force) {
      this.lastReportAt = performance.now();
    }

    this.onStats({
      fps: Math.round(this.fps),
      drawn: this.cloud.drawnCount,
      total: this.cloud.total,
      capacity: this.cloud.capacity,
      stride: this.stride,
    });
  }
}
