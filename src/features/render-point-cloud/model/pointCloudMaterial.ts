import {
  Color,
  DataTexture,
  RGBAFormat,
  ShaderMaterial,
  type Texture,
  UnsignedByteType,
  Vector2,
} from 'three';

import { buildRampTextureData, RAMP_TEXTURE_WIDTH } from '@/entities/point-cloud';

import fragmentShader from '../shaders/pointCloud.frag.glsl?raw';
import vertexShader from '../shaders/pointCloud.vert.glsl?raw';

export const MIN_PIXEL_SIZE = 1;
export const MAX_PIXEL_SIZE = 24;

export const NO_SELECTION = -1;
export const HIGHLIGHT_COLOR = 0xffffff;
export const HIGHLIGHT_RING_COLOR = 0x0d1117;
export const HIGHLIGHT_SCALE = 2.5;
export const HIGHLIGHT_MIN_SIZE = 14;

export function createRampTexture(): DataTexture {
  const texture = new DataTexture(
    buildRampTextureData(),
    RAMP_TEXTURE_WIDTH,
    1,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.needsUpdate = true;
  return texture;
}

export interface PointCloudMaterialOptions {
  ramp: Texture;
  scalarRange: readonly [number, number];
  pointSize: number;
}

export function createPointCloudMaterial({
  ramp,
  scalarRange,
  pointSize,
}: PointCloudMaterialOptions): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uRamp: { value: ramp },
      uScalarRange: { value: new Vector2(scalarRange[0], scalarRange[1]) },
      uPointSize: { value: pointSize },
      uProjectionScale: { value: 1 },
      uMinPixelSize: { value: MIN_PIXEL_SIZE },
      uMaxPixelSize: { value: MAX_PIXEL_SIZE },
      uSelected: { value: NO_SELECTION },
      uHighlight: { value: new Color(HIGHLIGHT_COLOR) },
      uHighlightRing: { value: new Color(HIGHLIGHT_RING_COLOR) },
      uHighlightScale: { value: HIGHLIGHT_SCALE },
      uHighlightMinSize: { value: HIGHLIGHT_MIN_SIZE },
    },
    vertexShader,
    fragmentShader,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  });
}

export function projectionScale(drawingBufferHeight: number, fovDegrees: number): number {
  const halfFov = (fovDegrees * Math.PI) / 360;
  return drawingBufferHeight / (2 * Math.tan(halfFov));
}

export function autoPointSize(footprintArea: number, pointCount: number): number {
  if (pointCount <= 0 || footprintArea <= 0) {
    return 0.2;
  }
  const spacing = Math.sqrt(footprintArea / pointCount);
  return Math.min(Math.max(spacing * 1.6, 0.01), 5);
}
