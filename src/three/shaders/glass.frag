// Cheap dispersive glass: refracts a screen-space copy of the scene behind it (uScene), splits R/G/B
// by different amounts, adds a fresnel rainbow (fake iridescence) and two specular glints.
// Replaces drei's MeshTransmissionMaterial, whose physical shader took ~9s to compile on Windows/D3D.
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uTime;
uniform float uRefract;
varying vec3 vNormal;
varying vec3 vViewPos;

vec3 rainbow(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(-vViewPos);
  vec2 uv = gl_FragCoord.xy / uResolution;

  // dispersion: each channel bends a little more
  vec2 off = n.xy * uRefract;
  vec3 refr;
  refr.r = texture2D(uScene, uv - off * 0.8).r;
  refr.g = texture2D(uScene, uv - off * 1.0).g;
  refr.b = texture2D(uScene, uv - off * 1.25).b;

  float facing = max(dot(n, v), 0.0);
  float fresnel = pow(1.0 - facing, 2.5);

  // iridescent film: hue shifts with view angle, surface orientation and time
  vec3 film = rainbow(fresnel * 1.4 + dot(n, vec3(0.4, 0.8, 0.2)) * 0.6 + uTime * 0.04);

  vec3 col = refr * vec3(0.92, 0.95, 1.0);
  col = mix(col, film, fresnel * 0.75);
  col += film * pow(1.0 - facing, 6.0) * 0.6;

  // glints from two fake lights
  vec3 r = reflect(-v, n);
  col += pow(max(dot(r, normalize(vec3(0.5, 0.8, 0.6))), 0.0), 48.0) * 1.4;
  col += pow(max(dot(r, normalize(vec3(-0.7, -0.2, 0.7))), 0.0), 24.0) * vec3(0.3, 0.45, 1.0) * 0.8;

  gl_FragColor = vec4(col, 1.0);
}
