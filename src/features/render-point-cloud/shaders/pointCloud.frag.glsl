precision mediump float;

uniform vec3 uHighlightRing;

varying vec3 vColor;
varying float vSelected;

void main() {
  vec2 offset = gl_PointCoord - vec2(0.5);
  float radiusSquared = dot(offset, offset);
  if (radiusSquared > 0.25) {
    discard;
  }

  vec3 marker = mix(vColor, uHighlightRing, step(0.09, radiusSquared));
  gl_FragColor = vec4(mix(vColor, marker, vSelected), 1.0);
}
