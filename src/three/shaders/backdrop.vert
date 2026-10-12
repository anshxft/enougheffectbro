// Inside of a sphere around the camera (a dome: walls curve away sideways and up/down).
// vWall is the wall unrolled to world units: arc length around, arc length up.
uniform float uRadius;
varying vec2 vWall;
varying vec3 vWorld;

void main() {
  vWall = vec2(uv.x * 6.28318 * uRadius, (uv.y - 0.5) * 3.14159 * uRadius);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
