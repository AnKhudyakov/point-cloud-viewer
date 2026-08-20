attribute float scalar;

uniform sampler2D uRamp;
uniform vec2 uScalarRange;
uniform float uPointSize;
uniform float uProjectionScale;
uniform float uMinPixelSize;
uniform float uMaxPixelSize;

varying vec3 vColor;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;

  float span = max(uScalarRange.y - uScalarRange.x, 1e-6);
  float t = clamp((scalar - uScalarRange.x) / span, 0.0, 1.0);
  vColor = texture2D(uRamp, vec2(t, 0.5)).rgb;

  float depth = max(-viewPosition.z, 1e-4);
  float pixels = uPointSize * uProjectionScale / depth;
  gl_PointSize = clamp(pixels, uMinPixelSize, uMaxPixelSize);
}
