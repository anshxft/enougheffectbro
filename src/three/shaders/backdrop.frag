// Curved tunnel backdrop: fine tile grid with "+" markers on the inside of a cylinder, a glow in front
// of the camera whose colour drifts through a palette, rare accent tiles, and faint outlined words
// running around the wall in alternating directions.
uniform float uTime;
uniform float uScroll;
uniform float uCell;
uniform vec3 uCenter;
uniform vec3 uTint;
uniform sampler2D uWords;
uniform float uWordsAspect;
varying vec2 vWall;
varying vec3 vWorld;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 w = vWall + vec2(0.0, uScroll);
  vec2 p = w / uCell;

  // how directly this bit of wall faces the camera (1 straight ahead, falls off around the curve)
  vec2 dir = normalize(vWorld.xz - uCenter.xz);
  float front = max(dot(dir, vec2(0.0, -1.0)), 0.0);
  float glow = pow(front, 6.0) * exp(-vWorld.y * vWorld.y / 18.0);

  // anti-aliased hairlines
  vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
  float line = 1.0 - min(min(g.x, g.y), 1.0);

  // "+" markers every 4 cells
  float big = uCell * 4.0;
  vec2 d = abs(fract(w / big + 0.5) - 0.5) * big;
  float arm = uCell * 0.22;
  float thick = max(fwidth(w.x), fwidth(w.y)) * 1.1;
  float plus = max(step(d.x, thick) * step(d.y, arm), step(d.y, thick) * step(d.x, arm));

  // per-tile tone + rare tint flicker
  vec2 cell = floor(p);
  float h = hash(cell);
  float flick = step(0.996, fract(h * 91.7 + floor(uTime * 0.8) * 0.137));

  // words: rows of outlined text wrapping the wall, every other row running the other way
  float rowH = 2.6;
  float row = floor((w.y + 100.0) / rowH);
  float inRow = fract((w.y + 100.0) / rowH);
  float dirRow = mod(row, 2.0) * 2.0 - 1.0;
  float wordsW = rowH * 0.8 * uWordsAspect;
  vec2 wuv = vec2(fract((w.x + uTime * 0.35 * dirRow + row * 3.7) / wordsW), (inRow - 0.1) / 0.8);
  // seen from inside the cylinder the strip runs mirrored, so flip X
  float words = wuv.y > 0.0 && wuv.y < 1.0 ? texture2D(uWords, vec2(1.0 - wuv.x, wuv.y)).a : 0.0;

  vec3 base = vec3(0.012, 0.013, 0.02) + h * 0.01;
  vec3 col = base + uTint * glow * 0.2;
  col += mix(vec3(0.06), uTint * 0.6, 0.5) * line * (0.25 + glow * 0.9);
  col += vec3(0.55) * plus * (0.1 + glow * 0.6);
  col += uTint * flick * (0.2 + glow * 0.6);
  col += mix(vec3(0.5), uTint, 0.4) * words * (0.04 + glow * 0.07);

  // darker towards the sides and top/bottom of the tunnel
  col *= 0.35 + 0.65 * pow(front, 1.5);
  gl_FragColor = vec4(col, 1.0);
}
