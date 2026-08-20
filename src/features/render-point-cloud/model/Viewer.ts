import { Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { PointCloudData } from '@/entities/point-cloud';

import { frameBounds } from '../lib/frameBounds';
import { createRampTexture, projectionScale } from './pointCloudMaterial';
import { PointCloudObject } from './PointCloudObject';

export const CANVAS_CLASS = 'point-cloud-canvas';

const FIELD_OF_VIEW = 55;
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

    this.resetView();
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
  };
}
