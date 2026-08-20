import {
  Color,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { type PointCloudData, slotForSource, sourceIndexFor } from '@/entities/point-cloud';

import { frameBounds } from '../lib/frameBounds';
import type { SceneClip, SceneMeasurement, SceneState } from '../lib/scene';
import { sceneChanges } from '../lib/sceneDiff';
import { contains, type Rect, splitViewports, toGlViewport, toNdc } from '../lib/viewports';
import { MeasurementOverlay } from './MeasurementOverlay';
import { createRampTexture, projectionScale } from './pointCloudMaterial';
import { PointCloudObject } from './PointCloudObject';

export interface RenderStats {
  fps: number;
  scaleMeters: number;
  scalePixels: number;
  drawn: number;
  total: number;
  capacity: number;
  stride: number;
  geometries: number;
  textures: number;
  programs: number;
}

export interface ViewerCallbacks {
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

  private readonly overlay: MeasurementOverlay;

  private readonly planCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

  private split = false;

  private rightInset = 0;

  private mainViewport: Rect = { x: 0, y: 0, width: 1, height: 1 };

  private planViewport: Rect | null = null;

  private readonly observer: ResizeObserver;

  private cloud: PointCloudObject | null = null;

  private frame = 0;

  private disposed = false;

  private callbacks: ViewerCallbacks = {};

  private applied: SceneState | null = null;

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

  constructor(container: HTMLElement) {
    this.container = container;

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

    this.overlay = new MeasurementOverlay(container);
    this.scene.add(this.overlay.line);

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();

    this.loop();
  }

  setCallbacks(callbacks: ViewerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Brings the scene in line with the state React describes.
   *
   * Called after every render and does nothing when nothing moved, which is why
   * the React side needs no effect per control. Loading a cloud resets the
   * object's budget, selection and uniforms, so a cloud change re-applies
   * everything that hangs off it rather than leaving the two sides disagreeing.
   */
  apply(next: SceneState): void {
    const changed = sceneChanges(this.applied, next);

    if (changed.cloud) this.setCloud(next.cloud);
    if (changed.budget) this.setBudget(next.budget);
    if (changed.scalarRange) this.setScalarRange(next.scalarRange[0], next.scalarRange[1]);
    if (changed.selected) this.setSelection(next.selected);
    if (changed.clip) this.setClip(next.clip);
    if (changed.measurement) this.setMeasurement(next.measurement);
    if (changed.layout) this.setLayout(next.split, next.rightInset);

    this.applied = next;
  }

  private setCloud(data: PointCloudData): void {
    this.clearCloud();

    this.cloud = new PointCloudObject(data, this.ramp);
    this.scene.add(this.cloud.points);
    this.cloud.setProjectionScale(this.currentProjectionScale());
    this.stride = 1;
    this.setSelection(null);
    this.updatePlanCamera();

    this.resetView();
    this.reportStats(true);
  }

  private setLayout(split: boolean, rightInset: number): void {
    this.split = split;
    this.rightInset = rightInset;
    this.resize();
  }

  private setClip(clip: SceneClip): void {
    this.cloud?.setClip(clip.normal, clip.constant, clip.enabled);
  }

  private setMeasurement(measurement: SceneMeasurement | null): void {
    this.overlay.set(
      measurement === null
        ? null
        : {
            from: new Vector3(...measurement.from),
            to: new Vector3(...measurement.to),
            text: measurement.text,
          },
    );
  }

  private setSelection(sourceIndex: number | null): void {
    this.selected = sourceIndex;
    this.applySelection();
  }

  private setBudget(budget: number): void {
    if (!this.cloud) {
      return;
    }

    const result = this.cloud.applyBudget(budget);
    this.stride = result.stride;
    this.applySelection();
    this.reportStats(true);
  }

  private setScalarRange(min: number, max: number): void {
    this.cloud?.setScalarRange(min, max);
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

    this.scene.remove(this.overlay.line);
    this.overlay.dispose();

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

    const viewports = splitViewports(width, height, this.split, this.rightInset);
    this.mainViewport = viewports.main;
    this.planViewport = viewports.plan;

    this.camera.aspect = this.mainViewport.width / this.mainViewport.height;
    this.camera.updateProjectionMatrix();
    this.updatePlanCamera();
    this.cloud?.setProjectionScale(this.currentProjectionScale());
  }

  /** Frames the plan camera on the cloud, looking straight down the Z axis. */
  private updatePlanCamera(): void {
    const rect = this.planViewport;
    const bounds = this.cloud?.points.geometry.boundingBox;
    if (!rect || !bounds) {
      return;
    }

    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const aspect = rect.width / rect.height;
    const padded = Math.max(size.x, size.y) * 0.55 || 1;
    const halfWidth = aspect >= 1 ? padded * aspect : padded;
    const halfHeight = aspect >= 1 ? padded : padded / aspect;

    this.planCamera.left = -halfWidth;
    this.planCamera.right = halfWidth;
    this.planCamera.top = halfHeight;
    this.planCamera.bottom = -halfHeight;
    this.planCamera.near = 0.1;
    this.planCamera.far = size.z * 4 + 100;
    this.planCamera.up.set(0, 1, 0);
    this.planCamera.position.set(center.x, center.y, bounds.max.z + size.z + 10);
    this.planCamera.lookAt(center.x, center.y, bounds.min.z);
    this.planCamera.updateProjectionMatrix();
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
    this.draw();
    this.overlay.update(this.camera, this.mainViewport);
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
    const onPick = this.callbacks.onPick;
    if (!this.cloud || !onPick) {
      return;
    }

    const bounds = this.canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    const plan = this.planViewport;
    const inPlan = plan !== null && contains(plan, x, y);
    const rect = inPlan && plan ? plan : this.mainViewport;
    const camera = inPlan ? this.planCamera : this.camera;

    const ndc = toNdc(rect, x, y);
    this.pointer.set(ndc.x, ndc.y);

    this.raycaster.params.Points.threshold = this.cloud.pointSize * PICK_THRESHOLD_SCALE;
    this.raycaster.setFromCamera(this.pointer, camera);

    const hit = this.raycaster.intersectObject(this.cloud.points, false)[0];
    const slot = hit?.index;

    onPick(slot === undefined ? null : sourceIndexFor(slot, this.stride));
  }

  /**
   * One context, two viewports. The scissor test keeps each pass, including its
   * clear, inside its own half of the canvas.
   */
  private draw(): void {
    const height = this.container.clientHeight;
    const plan = this.planViewport;

    if (!plan) {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, this.mainViewport.width, this.mainViewport.height);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.renderer.setScissorTest(true);

    for (const [rect, camera] of [
      [this.mainViewport, this.camera],
      [plan, this.planCamera],
    ] as const) {
      const gl = toGlViewport(rect, height);
      this.renderer.setViewport(gl.x, gl.y, gl.width, gl.height);
      this.renderer.setScissor(gl.x, gl.y, gl.width, gl.height);
      this.renderer.render(this.scene, camera);
    }
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
    const onStats = this.callbacks.onStats;
    if (!onStats || !this.cloud) {
      return;
    }
    if (force) {
      this.lastReportAt = performance.now();
    }

    const memory = this.renderer.info.memory;
    const bar = this.overlay.scaleBar(
      this.camera.position.distanceTo(this.controls.target),
      FIELD_OF_VIEW,
      this.container.clientHeight,
    );

    onStats({
      fps: Math.round(this.fps),
      scaleMeters: bar.meters,
      scalePixels: bar.pixels,
      drawn: this.cloud.drawnCount,
      total: this.cloud.total,
      capacity: this.cloud.capacity,
      stride: this.stride,
      geometries: memory.geometries,
      textures: memory.textures,
      programs: this.renderer.info.programs?.length ?? 0,
    });
  }
}
