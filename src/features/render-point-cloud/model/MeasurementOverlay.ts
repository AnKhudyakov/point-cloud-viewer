import {
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Line,
  LineBasicMaterial,
  Vector3,
} from 'three';

import { metersPerPixel, projectToScreen } from '../lib/project';
import { niceScaleBar, type ScaleBar } from '../lib/scaleBar';
import type { Rect } from './../lib/viewports';

export const LABEL_CLASS = 'point-cloud-label';
export const SCALE_TARGET_PX = 130;

const LINE_COLOR = 0xffffff;

export interface MeasurementView {
  from: Vector3;
  to: Vector3;
  text: string;
}

/**
 * Everything drawn on top of the cloud: the measurement line in the scene, its
 * label in screen space, and the scale bar.
 *
 * The label is a DOM element the overlay moves itself every frame. Routing it
 * through React would mean a re-render per frame, and at sixty frames a second
 * that is the wrong tool.
 */
export class MeasurementOverlay {
  readonly line: Line<BufferGeometry, LineBasicMaterial>;

  private readonly geometry: BufferGeometry;

  private readonly material: LineBasicMaterial;

  private readonly positions: Float32Array;

  private readonly attribute: BufferAttribute;

  private readonly label: HTMLElement;

  private readonly midpoint = new Vector3();

  private view: MeasurementView | null = null;

  private disposed = false;

  constructor(container: HTMLElement) {
    this.positions = new Float32Array(6);
    this.attribute = new BufferAttribute(this.positions, 3);

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', this.attribute);

    this.material = new LineBasicMaterial({ color: LINE_COLOR, depthTest: false });

    this.line = new Line(this.geometry, this.material);
    this.line.frustumCulled = false;
    this.line.renderOrder = 1;
    this.line.visible = false;

    this.label = document.createElement('span');
    this.label.className = LABEL_CLASS;
    this.label.hidden = true;
    container.append(this.label);
  }

  set(view: MeasurementView | null): void {
    this.view = view;

    if (view === null) {
      this.line.visible = false;
      this.label.hidden = true;
      return;
    }

    this.positions[0] = view.from.x;
    this.positions[1] = view.from.y;
    this.positions[2] = view.from.z;
    this.positions[3] = view.to.x;
    this.positions[4] = view.to.y;
    this.positions[5] = view.to.z;
    this.attribute.needsUpdate = true;

    this.line.visible = true;
    this.label.textContent = view.text;
    this.label.hidden = false;
  }

  /** Repositions the label from the current camera. Called once per frame. */
  update(camera: Camera, viewport: Rect): void {
    if (this.view === null || this.disposed) {
      return;
    }

    this.midpoint.addVectors(this.view.from, this.view.to).multiplyScalar(0.5);
    const screen = projectToScreen(this.midpoint, camera, viewport.width, viewport.height);
    const x = viewport.x + screen.x;
    const y = viewport.y + screen.y;

    this.label.hidden = !screen.visible;
    this.label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }

  scaleBar(distanceToTarget: number, fovDegrees: number, height: number): ScaleBar {
    return niceScaleBar(metersPerPixel(distanceToTarget, fovDegrees, height), SCALE_TARGET_PX);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    this.geometry.dispose();
    this.material.dispose();
    this.label.remove();
  }
}
