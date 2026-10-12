// Tile grid backdrop: hairlines, "+" markers on every 3rd crossing,
// and a few cells that flick to the accent colour.
uniform float uTime;
uniform float uScroll;
uniform float uCell;
uniform vec3 uBase;
uniform vec3 uLine;
uniform vec3 uAccent;
varying vec3 vWorld;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 w = vWorld.xy + vec2(0.0, uScroll);
  vec2 p = w / uCell;

  // anti-aliased hairlines
  vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
  float line = 1.0 - min(min(g.x, g.y), 1.0);

  // "+" markers every 3 cells
  vec2 d = abs(fract(w / (uCell * 3.0) + 0.5) - 0.5) * uCell * 3.0;
  float arm = uCell * 0.09;
  float thick = max(fwidth(w.x), fwidth(w.y)) * 1.2;
  float plus = max(step(d.x, thick) * step(d.y, arm), step(d.y, thick) * step(d.x, arm));

  // per-cell tone + rare accent flicker
  vec2 cell = floor(p);
  float h = hash(cell);
  float tone = h * 0.012;
  float flick = step(0.992, fract(h * 91.7 + floor(uTime * 0.8) * 0.137));

  // fade towards the edges of view so the grid sits in a pool of light
  float fade = 1.0 - smoothstep(4.0, 16.0, length(vWorld.xy));

  vec3 col = uBase + tone;
  col = mix(col, uLine, line * 0.9 * fade);
  col += uAccent * flick * 0.35 * fade;
  col += vec3(plus) * 0.32 * fade;
  gl_FragColor = vec4(col, 1.0);
}
