import {
  BufferAttribute,
  BufferGeometry,
  Points,
  type ShaderMaterial,
  Sphere,
  type Texture,
  type Vector2,
  Vector3,
} from 'three';

import {
  type PointCloudData,
  sampleByStride,
  sampledCount,
  strideFor,
} from '@/entities/point-cloud';

import { autoPointSize, createPointCloudMaterial } from './pointCloudMaterial';

export const SAMPLE_CAPACITY = 8_000_000;

export interface BudgetResult {
  drawn: number;
  stride: number;
  capacity: number;
}

export class PointCloudObject {
  readonly points: Points<BufferGeometry, ShaderMaterial>;

  readonly total: number;

  readonly capacity: number;

  private readonly geometry: BufferGeometry;

  private readonly material: ShaderMaterial;

  private readonly source: PointCloudData;

  private readonly positions: BufferAttribute;

  private readonly scalars: BufferAttribute;

  private readonly positionData: Float32Array;

  private readonly scalarData: Float32Array;

  private drawn = 0;

  constructor(data: PointCloudData, ramp: Texture) {
    this.source = data;
    this.total = data.pointCount;
    this.capacity = Math.min(this.total, SAMPLE_CAPACITY);

    this.positionData = new Float32Array(this.capacity * 3);
    this.scalarData = new Float32Array(this.capacity);
    this.positions = new BufferAttribute(this.positionData, 3);
    this.scalars = new BufferAttribute(this.scalarData, 1);

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', this.positions);
    this.geometry.setAttribute('scalar', this.scalars);
    this.geometry.boundingBox = data.bounds.clone();
    this.geometry.boundingSphere = data.bounds.getBoundingSphere(new Sphere());

    const size = data.bounds.getSize(new Vector3());
    this.material = createPointCloudMaterial({
      ramp,
      scalarRange: data.scalarRange,
      pointSize: autoPointSize(size.x * size.y, data.pointCount),
    });

    this.points = new Points(this.geometry, this.material);
    this.applyBudget(this.capacity);
  }

  applyBudget(budget: number): BudgetResult {
    const stride = strideFor(this.total, Math.min(budget, this.capacity));
    const wanted = Math.min(sampledCount(this.total, stride), this.capacity);

    const written = sampleByStride(this.source.positions, this.positionData, 3, wanted, stride);
    sampleByStride(this.source.scalars, this.scalarData, 1, wanted, stride);

    this.positions.addUpdateRange(0, written * 3);
    this.positions.needsUpdate = true;
    this.scalars.addUpdateRange(0, written);
    this.scalars.needsUpdate = true;

    this.geometry.setDrawRange(0, written);
    this.drawn = written;

    return { drawn: written, stride, capacity: this.capacity };
  }

  get drawnCount(): number {
    return this.drawn;
  }

  setScalarRange(min: number, max: number): void {
    (this.material.uniforms.uScalarRange.value as Vector2).set(min, max);
  }

  setProjectionScale(scale: number): void {
    this.material.uniforms.uProjectionScale.value = scale;
  }

  setPointSize(size: number): void {
    this.material.uniforms.uPointSize.value = size;
  }

  get pointSize(): number {
    return this.material.uniforms.uPointSize.value as number;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
