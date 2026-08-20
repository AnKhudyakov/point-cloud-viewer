attribute float scalar;
attribute float slot;

uniform sampler2D uRamp;
uniform vec2 uScalarRange;
uniform float uPointSize;
uniform float uProjectionScale;
uniform float uMinPixelSize;
uniform float uMaxPixelSize;
uniform float uSelected;
uniform vec3 uHighlight;
uniform float uHighlightScale;
uniform float uHighlightMinSize;

varying vec3 vColor;
varying float vSelected;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;

  float span = max(uScalarRange.y - uScalarRange.x, 1e-6);
  float t = clamp((scalar - uScalarRange.x) / span, 0.0, 1.0);

  vSelected = 1.0 - step(0.5, abs(slot - uSelected));
  vColor = mix(texture2D(uRamp, vec2(t, 0.5)).rgb, uHighlight, vSelected);

  float depth = max(-viewPosition.z, 1e-4);
  float pixels = clamp(uPointSize * uProjectionScale / depth, uMinPixelSize, uMaxPixelSize);
  float marker = max(pixels * uHighlightScale, uHighlightMinSize);
  gl_PointSize = mix(pixels, marker, vSelected);
}
