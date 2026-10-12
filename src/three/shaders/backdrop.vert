// Inside wall of a cylinder around the camera: pass the wall position unrolled to world units
// (arc length around, height up) plus the world position for lighting.
uniform float uRadius;
uniform float uHeight;
varying vec2 vWall;
varying vec3 vWorld;

void main() {
  vWall = vec2(uv.x * 6.28318 * uRadius, (uv.y - 0.5) * uHeight);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
