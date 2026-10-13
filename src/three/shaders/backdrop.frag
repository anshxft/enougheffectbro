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
uniform sampler2D uAmbient;
uniform float uAmbientAmt;
uniform float uMotion; // 0 with prefers-reduced-motion: words, rings and ripple hold still
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
  vec2 warp = (view - c) / max(dist, 0.001) * sin(dist * 3.2 - uTime * 1.6) * 0.12 * exp(-dist * 0.9) * uMotion;

  vec2 w = vWall + warp + vec2(0.0, uScroll);
  vec2 p = w / uCell;

  float minor = gridLine(p, 1.0);
  float major = gridLine(p / 4.0, 3.0);

  // "+" markers on major crossings, small and quiet
  float big = uCell * 4.0;
  vec2 d = abs(fract(w / big + 0.5) - 0.5) * big;
  float arm = uCell * 0.16;
  float thick = max(fwidth(w.x), fwidth(w.y)) * 0.9;
  float plus = max(step(d.x, thick) * step(d.y, arm), step(d.y, thick) * step(d.x, arm));

  // op-art swirl: bold black/white bands spiralling out from a centre that drifts around on a slow
  // figure-eight while the whole spiral turns, bent by a wobble so they read as warped, not geometric
  float tm = uTime * uMotion;
  vec2 centre = vec2(1.8 + sin(tm * 0.13) * 1.6, -0.6 + sin(tm * 0.21) * 1.0);
  vec2 sc = view - centre;
  float wob = sin(view.x * 0.42 + tm * 0.23) * 1.5 + sin(view.y * 0.55 - tm * 0.17) * 1.2;
  float bands = sin(length(sc * vec2(1.0, 1.2)) * 3.4 + atan(sc.y, sc.x) * 2.0 + wob - tm * 0.45 + sin(tm * 0.09) * 2.0);
  float stripe = smoothstep(0.28, 0.48, bands); // narrow light bands, mostly black

  vec2 cell = floor(p);
  float h = hash(cell);
  float panel = hash(floor(p / 4.0));
  float flick = step(0.996, fract(h * 91.7 + floor(uTime * 0.8) * 0.137));

  // words: rows of outlined text around the wall, every other row running the other way
  float rowH = 2.6;
  float row = floor((w.y + 100.0) / rowH);
  float inRow = fract((w.y + 100.0) / rowH);
  float dirRow = mod(row, 2.0) * 2.0 - 1.0;
  float wordsW = rowH * 0.8 * uWordsAspect;
  vec2 wuv = vec2(fract((w.x + uTime * 0.35 * dirRow * uMotion + row * 3.7) / wordsW), (inRow - 0.1) / 0.8);
  // seen from inside the dome the strip runs mirrored, so flip X
  float words = wuv.y > 0.0 && wuv.y < 1.0 ? texture2D(uWords, vec2(1.0 - wuv.x, wuv.y)).a : 0.0;

  // wall: near-black and light-grey bands, each panel a touch different, tinted by the room colour
  vec3 room = mix(uTint, uTint2, smoothstep(-0.5, 0.5, dir.x));
  room /= max(max(room.r, room.g), max(room.b, 0.001)); // hue only; brightness comes from the bands
  // light bands are a clean, slightly cool white kept just under the bloom threshold
  float light = mix(0.018, 0.62, stripe) * (0.9 + panel * 0.1);
  vec3 col = mix(room, vec3(0.96, 0.98, 1.0), stripe) * light;
  col = mix(col, vec3(0.06), minor * 0.4);          // fine grid: dark on white bands, faint on black
  col *= 1.0 - major * 0.9;                          // heavy panel seams
  col += vec3(0.5) * plus * 0.35;
  col += vec3(0.5) * flick * 0.25;
  col += vec3(0.55) * words * (1.0 - stripe * 0.6) * 0.07;

  // LED dot texture: the wall reads like a screen up close, strongest on the white bands
  float dots = smoothstep(0.5, 0.2, length(fract(gl_FragCoord.xy / 3.0) - 0.5));
  col *= mix(0.86 + 0.14 * dots, 0.68 + 0.32 * dots, stripe);

  // works on stage: the room takes on the screenshot's colours (a huge, heavily blurred copy of it
  // behind everything, mip-biased for the blur), grid and markers stay on top
  if (uAmbientAmt > 0.001) {
    vec3 amb = texture2D(uAmbient, view / vec2(16.0, 10.0) + 0.5, 6.0).rgb;
    vec3 lit = amb * (0.05 + glow * 0.3) * (1.0 - major * 0.45) + vec3(0.6) * plus * (0.06 + glow * 0.3);
    col = mix(col, lit, uAmbientAmt * 0.85);
  }

  // dark falloff towards the sides, top and bottom
  col *= 0.12 + 0.88 * pow(front, 2.0);
  // darker strips along the top and bottom of the view so the header and hero captions stay legible
  col *= 1.0 - 0.75 * smoothstep(0.17, 0.29, abs(dir.y));
  gl_FragColor = vec4(col, 1.0);
}
