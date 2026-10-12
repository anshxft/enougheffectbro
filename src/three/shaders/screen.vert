// Plane bent into a concave arc (edges toward the viewer, like a curved monitor) with a slow breathing wave.
uniform float uBend;
uniform float uTime;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;
  p.z += p.x * p.x * uBend;
  p.z += sin(uv.x * 3.14159 * 2.0 + uTime * 0.8) * 0.015;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
