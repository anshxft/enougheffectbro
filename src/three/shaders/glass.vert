varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vObj;

void main() {
  vObj = position; // object space: the frost pattern sticks to the glass as it turns
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
