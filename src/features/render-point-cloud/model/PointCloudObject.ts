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

import type { PointCloudData } from '@/entities/point-cloud';

import { autoPointSize, createPointCloudMaterial } from './pointCloudMaterial';

export class PointCloudObject {
  readonly points: Points<BufferGeometry, ShaderMaterial>;

  private readonly geometry: BufferGeometry;

  private readonly material: ShaderMaterial;

  constructor(data: PointCloudData, ramp: Texture) {
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('scalar', new BufferAttribute(data.scalars, 1));

    this.geometry.boundingBox = data.bounds.clone();
    this.geometry.boundingSphere = data.bounds.getBoundingSphere(new Sphere());

    const size = data.bounds.getSize(new Vector3());
    this.material = createPointCloudMaterial({
      ramp,
      scalarRange: data.scalarRange,
      pointSize: autoPointSize(size.x * size.y, data.pointCount),
    });

    this.points = new Points(this.geometry, this.material);
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
