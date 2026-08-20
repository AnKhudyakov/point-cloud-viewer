import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  type Object3D,
  type PerspectiveCamera,
  Vector3,
} from 'three';

import { metersPerPixel, projectToScreen } from '../lib/project';
import { niceScaleBar, type ScaleBar } from '../lib/scaleBar';
import type { SceneAnnotation, SceneMeasurement } from '../lib/scene';
import type { Rect } from '../lib/viewports';

export const LABEL_CLASS = 'point-cloud-label';
export const SCALE_TARGET_PX = 130;

/** How far the label sits from its anchor, in screen pixels. */
const LEADER_LENGTH_PX = 42;
const MAX_ANNOTATIONS = 8;
const LINE_COLOR = 0xffffff;
const LEADER_COLOR = 0x8b949e;

/**
 * Everything drawn on top of the cloud: the measured segment, the leader lines,
 * the labels, and the scale bar.
 *
 * Labels are DOM elements the overlay moves itself every frame. Routing them
 * through React would mean a re-render per frame, and at sixty frames a second
 * that is the wrong tool.
 *
 * The leaders live in the scene rather than in screen space, so they sit at the
 * right depth among the points. Their length is still chosen in pixels and
 * converted to world units at each anchor's distance, which keeps them the same
 * size on screen however far the camera is.
 */
export class AnnotationOverlay {
  readonly objects: readonly Object3D[];

  private readonly measurementLine: Line<BufferGeometry, LineBasicMaterial>;

  private readonly measurementPositions: Float32Array;

  private readonly measurementAttribute: BufferAttribute;

  private readonly leaders: LineSegments<BufferGeometry, LineBasicMaterial>;

  private readonly leaderPositions: Float32Array;

  private readonly leaderAttribute: BufferAttribute;

  private readonly container: HTMLElement;

  private readonly labels = new Map<string, HTMLElement>();

  private annotations: readonly SceneAnnotation[] = [];

  private readonly anchor = new Vector3();

  private readonly tip = new Vector3();

  private disposed = false;

  constructor(container: HTMLElement) {
    this.container = container;

    this.measurementPositions = new Float32Array(6);
    this.measurementAttribute = new BufferAttribute(this.measurementPositions, 3);
    const measurementGeometry = new BufferGeometry();
    measurementGeometry.setAttribute('position', this.measurementAttribute);
    this.measurementLine = new Line(
      measurementGeometry,
      new LineBasicMaterial({ color: LINE_COLOR, depthTest: false }),
    );
    this.measurementLine.frustumCulled = false;
    this.measurementLine.renderOrder = 1;
    this.measurementLine.visible = false;

    this.leaderPositions = new Float32Array(MAX_ANNOTATIONS * 6);
    this.leaderAttribute = new BufferAttribute(this.leaderPositions, 3);
    const leaderGeometry = new BufferGeometry();
    leaderGeometry.setAttribute('position', this.leaderAttribute);
    leaderGeometry.setDrawRange(0, 0);
    this.leaders = new LineSegments(
      leaderGeometry,
      new LineBasicMaterial({ color: LEADER_COLOR, depthTest: false }),
    );
    this.leaders.frustumCulled = false;
    this.leaders.renderOrder = 1;

    this.objects = [this.measurementLine, this.leaders];
  }

  setMeasurement(segment: SceneMeasurement | null): void {
    if (segment === null) {
      this.measurementLine.visible = false;
      return;
    }

    this.measurementPositions.set([...segment.from, ...segment.to]);
    this.measurementAttribute.needsUpdate = true;
    this.measurementLine.visible = true;
  }

  setAnnotations(annotations: readonly SceneAnnotation[]): void {
    this.annotations = annotations.slice(0, MAX_ANNOTATIONS);

    const wanted = new Set(this.annotations.map((annotation) => annotation.id));
    for (const [id, element] of this.labels) {
      if (!wanted.has(id)) {
        element.remove();
        this.labels.delete(id);
      }
    }

    for (const annotation of this.annotations) {
      let element = this.labels.get(annotation.id);
      if (!element) {
        element = document.createElement('span');
        element.className = LABEL_CLASS;
        this.container.append(element);
        this.labels.set(annotation.id, element);
      }
      element.textContent = annotation.text;
    }

    this.leaders.geometry.setDrawRange(0, this.annotations.length * 2);
  }

  /** Repositions labels and rebuilds the leaders. Called once per frame. */
  update(camera: PerspectiveCamera, viewport: Rect): void {
    if (this.disposed) {
      return;
    }

    let vertex = 0;
    for (const annotation of this.annotations) {
      const element = this.labels.get(annotation.id);
      if (!element) {
        continue;
      }

      this.anchor.set(annotation.anchor[0], annotation.anchor[1], annotation.anchor[2]);
      const perPixel = metersPerPixel(
        camera.position.distanceTo(this.anchor),
        camera.fov,
        viewport.height,
      );
      this.tip.copy(this.anchor).addScaledVector(camera.up, LEADER_LENGTH_PX * perPixel);

      this.leaderPositions[vertex * 3] = this.anchor.x;
      this.leaderPositions[vertex * 3 + 1] = this.anchor.y;
      this.leaderPositions[vertex * 3 + 2] = this.anchor.z;
      this.leaderPositions[vertex * 3 + 3] = this.tip.x;
      this.leaderPositions[vertex * 3 + 4] = this.tip.y;
      this.leaderPositions[vertex * 3 + 5] = this.tip.z;
      vertex += 2;

      const screen = projectToScreen(this.tip, camera, viewport.width, viewport.height);
      element.hidden = !screen.visible;
      element.style.transform =
        `translate(${viewport.x + screen.x}px, ${viewport.y + screen.y}px) ` +
        `translate(-50%, -100%)`;
    }

    if (vertex > 0) {
      this.leaderAttribute.addUpdateRange(0, vertex * 3);
      this.leaderAttribute.needsUpdate = true;
    }
  }

  scaleBar(distanceToTarget: number, fovDegrees: number, height: number): ScaleBar {
    return niceScaleBar(metersPerPixel(distanceToTarget, fovDegrees, height), SCALE_TARGET_PX);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    for (const element of this.labels.values()) {
      element.remove();
    }
    this.labels.clear();

    for (const object of [this.measurementLine, this.leaders]) {
      object.geometry.dispose();
      object.material.dispose();
    }
  }
}
