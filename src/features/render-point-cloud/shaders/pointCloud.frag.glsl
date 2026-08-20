precision mediump float;

varying vec3 vColor;

void main() {
  vec2 offset = gl_PointCoord - vec2(0.5);
  if (dot(offset, offset) > 0.25) {
    discard;
  }

  gl_FragColor = vec4(vColor, 1.0);
}
