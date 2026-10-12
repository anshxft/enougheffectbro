// Dome backdrop. The wall in front of the camera is lit by the room colour (uTint, drifting into uTint2
// across the screen); a two-level grid sits on it, heavy dark major lines and fine light minor lines,
// with "+" markers; a slow ripple bends the grid like a lens on one side; faint outlined words run
// around the wall in alternating rows; rare tiles flash the tint.
uniform float uTime;
uniform float uScroll;
uniform float uCell;
uniform float uRadius;
uniform vec3 uCenter;
uniform vec3 uTint;
uniform vec3 uTint2;
uniform sampler2D uWords;
uniform float uWordsAspect;
varying vec2 vWall;
varying vec3 vWorld;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// anti-aliased grid line mask, `width` in pixels
float gridLine(vec2 p, float width) {
  vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
  return 1.0 - min(min(g.x, g.y) / width, 1.0);
}

void main() {
  vec3 rel = vWorld - uCenter;
  vec3 dir = normalize(rel);
  // 1 straight ahead of the camera, falling off around the dome
  float front = max(-dir.z, 0.0);
  float glow = pow(front, 5.0) * exp(-vWorld.y * vWorld.y / 22.0);

  // lens ripple: rings expanding from a point that wanders on the left of the view
  vec2 view = vec2(atan(dir.x, -dir.z), asin(clamp(dir.y, -1.0, 1.0))) * uRadius;
  vec2 c = vec2(-3.6 + sin(uTime * 0.17) * 0.9, 0.6 + cos(uTime * 0.13) * 0.7);
  float dist = length(view - c);
  vec2 warp = (view - c) / max(dist, 0.001) * sin(dist * 3.2 - uTime * 1.6) * 0.12 * exp(-dist * 0.9);

  vec2 w = vWall + warp + vec2(0.0, uScroll);
  vec2 p = w / uCell;

  float minor = gridLine(p, 1.0);
  float major = gridLine(p / 4.0, 2.2);

  // "+" markers on major crossings
  float big = uCell * 4.0;
  vec2 d = abs(fract(w / big + 0.5) - 0.5) * big;
  float arm = uCell * 0.3;
  float thick = max(fwidth(w.x), fwidth(w.y)) * 1.1;
  float plus = max(step(d.x, thick) * step(d.y, arm), step(d.y, thick) * step(d.x, arm));

  vec2 cell = floor(p);
  float h = hash(cell);
  float flick = step(0.996, fract(h * 91.7 + floor(uTime * 0.8) * 0.137));

  // words: rows of outlined text around the wall, every other row running the other way
  float rowH = 2.6;
  float row = floor((w.y + 100.0) / rowH);
  float inRow = fract((w.y + 100.0) / rowH);
  float dirRow = mod(row, 2.0) * 2.0 - 1.0;
  float wordsW = rowH * 0.8 * uWordsAspect;
  vec2 wuv = vec2(fract((w.x + uTime * 0.35 * dirRow + row * 3.7) / wordsW), (inRow - 0.1) / 0.8);
  // seen from inside the dome the strip runs mirrored, so flip X
  float words = wuv.y > 0.0 && wuv.y < 1.0 ? texture2D(uWords, vec2(1.0 - wuv.x, wuv.y)).a : 0.0;

  // lit wall: room colour across the screen, brightest straight ahead
  vec3 room = mix(uTint, uTint2, smoothstep(-0.5, 0.5, dir.x));
  vec3 col = vec3(0.01, 0.011, 0.018) + room * (0.06 + glow * 0.42) + h * 0.008;
  col += (vec3(0.5) + room) * minor * (0.03 + glow * 0.1);
  col *= 1.0 - major * (0.35 + glow * 0.35); // heavy lines read dark on the lit wall
  col += vec3(0.6) * plus * (0.08 + glow * 0.5);
  col += room * flick * (0.2 + glow * 0.6);
  col += mix(vec3(0.6), room, 0.4) * words * (0.03 + glow * 0.08);

  // dark falloff towards the sides, top and bottom
  col *= 0.25 + 0.75 * pow(front, 1.8);
  gl_FragColor = vec4(col, 1.0);
}
