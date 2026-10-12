// Frosted dispersive glass. Refracts a screen-space copy of the scene behind it (uScene):
// - a frost field (fbm in object space) bends the refraction further via its screen-space slope,
//   blurs it where the frost is thick and whitens those patches; thin streaks read as scratches
// - R/G/B bend by different amounts, the body is tinted by the room colour (uTint)
// - fresnel rainbow film and bright rims on the bevels, plus two glints
// Bright refracted text pushes past 1.0 and blooms.
// (Custom on purpose: drei's MeshTransmissionMaterial took ~9s to compile on Windows/D3D.)
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uTime;
uniform float uRefract;
uniform float uBump;
uniform vec3 uTint;
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vObj;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}

vec3 rainbow(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vViewPos);
  vec2 uv = gl_FragCoord.xy / uResolution;

  // frost: stretched sideways into smears, slow drift so they feel alive
  vec3 q = vObj * vec3(1.6, 5.0, 3.0);
  float frost = fbm(q + vec3(0.0, uTime * 0.04, 0.0));
  float thick = smoothstep(0.42, 0.72, frost);
  // the frost's slope on screen, free from derivatives, acts as a bump map for refraction
  vec2 bump = vec2(dFdx(frost), dFdy(frost)) * uBump * 60.0;
  float streak = smoothstep(0.86, 0.98, noise(vec3(vObj.x * 9.0 + vObj.y * 3.5, vObj.y * 0.6, vObj.z * 0.6)));

  vec2 off = n.xy * uRefract * (0.6 + frost) + bump;
  vec3 sharp;
  sharp.r = texture2D(uScene, uv - off * 0.85).r;
  sharp.g = texture2D(uScene, uv - off).g;
  sharp.b = texture2D(uScene, uv - off * 1.2).b;
  vec3 blurred = 0.5 * (texture2D(uScene, uv - off + vec2(0.012, 0.007)).rgb + texture2D(uScene, uv - off - vec2(0.009, 0.011)).rgb);
  vec3 col = mix(sharp, blurred, thick * 0.8);

  // tinted body, whitened frost, scratches
  col *= mix(vec3(1.0), 0.55 + uTint * 1.5, 0.25);
  col += (vec3(0.8) + uTint * 0.25) * thick * 0.22;
  col += streak * 0.3;

  float facing = max(dot(n, v), 0.0);
  float fresnel = pow(1.0 - facing, 3.0);
  vec3 film = rainbow(fresnel * 1.4 + dot(n, vec3(0.4, 0.8, 0.2)) * 0.6 + uTime * 0.04);
  col = mix(col, film, fresnel * 0.28);
  col += vec3(0.9, 0.95, 1.0) * fresnel * fresnel * 0.9; // bright bevel rims

  vec3 r = reflect(-v, n);
  col += pow(max(dot(r, normalize(vec3(0.5, 0.8, 0.6))), 0.0), 64.0) * 1.4;
  col += pow(max(dot(r, normalize(vec3(-0.7, -0.2, 0.7))), 0.0), 24.0) * (uTint + 0.3) * 0.9;

  // refracted highlights (white text behind) go past 1.0 so bloom picks them up
  col *= 1.15;
  gl_FragColor = vec4(col, 1.0);
}
