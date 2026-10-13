// Always-on radial chromatic aberration, a glass lens that follows the cursor, the intro iris, and an
// on-demand block glitch (uAmount 0..1, used by transitions): shifted blocks, torn rows, accent cells.
uniform float uAmount;
uniform float uTime;
uniform float uCA;
uniform float uWave;
uniform float uReveal;  // 0..1 intro iris
uniform float uAspect;  // width / height
uniform vec2 uLens;     // cursor lens centre, uv
uniform float uLensAmt; // 0..1 lens strength
uniform vec3 uAccent;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float a = uAmount;
  // step(hash, 0.0) is 1 wherever hash is exactly 0, so gate every glitch term by "glitch is on"
  float on = step(0.0001, a);
  // positional jitter may re-roll fast (it moves pixels, it doesn't flash); anything that changes
  // brightness re-rolls at most 3x a second (WCAG 2.3.1 three-flashes threshold)
  float t = floor(uTime * 14.0);
  float tl = floor(uTime * 3.0);
  vec2 st = uv;

  // liquid wobble while the hero is on screen: two slow interfering waves nudge every pixel a few px,
  // so letter edges look like they're melting
  float wx = sin(uv.y * 34.0 + uTime * 1.9 + sin(uv.x * 9.0 + uTime * 0.7) * 2.0);
  float wy = cos(uv.x * 27.0 - uTime * 1.5 + sin(uv.y * 7.0 - uTime * 0.6) * 2.0);
  st += vec2(wx, wy) * 0.0016 * uWave;

  // glass lens on the cursor: a soft disc that magnifies what's under it (pulls samples towards its
  // centre), strongest in the middle and falling off smoothly to the rim
  vec2 ld = (uv - uLens) * vec2(uAspect, 1.0);
  float lr = length(ld);
  float R = 0.16;
  float inside = 1.0 - smoothstep(R * 0.7, R, lr);
  st -= (uv - uLens) * inside * 0.34 * uLensAmt;
  // the rim splits colour a little more, like the edge of a glass bead
  float rim = smoothstep(R * 0.55, R * 0.92, lr) * (1.0 - smoothstep(R * 0.92, R * 1.05, lr)) * uLensAmt;

  // intro: everything gently zoomed in until the iris opens
  st = 0.5 + (st - 0.5) * (1.0 - 0.06 * (1.0 - uReveal));

  // blocks: grid size itself jumps between steps
  vec2 grid = vec2(16.0, 9.0) * (1.0 + floor(hash(vec2(t, 7.0)) * 3.0));
  vec2 cell = floor(uv * grid);
  float r = hash(cell + t);
  st.x += on * step(r, a * 0.55) * (hash(cell.yx + t * 1.3) - 0.5) * 0.22 * a;

  // torn rows
  float row = floor(uv.y * 48.0);
  st.x += on * step(hash(vec2(row, t)), a * 0.3) * (hash(vec2(t, row)) - 0.5) * 0.12 * a;

  // chromatic aberration: radial lens + extra split while glitching
  vec2 dir = uv - 0.5;
  float ca = uCA * dot(dir, dir) * 4.0 + a * 0.014;
  vec3 col;
  vec2 lensSplit = (uv - uLens) / max(lr, 0.0001) * rim * 0.004; // spectrum along the lens rim
  col.r = texture2D(inputBuffer, st + dir * ca + lensSplit + vec2(a * 0.004, 0.0)).r;
  col.g = texture2D(inputBuffer, st).g;
  col.b = texture2D(inputBuffer, st - dir * ca - lensSplit - vec2(a * 0.004, 0.0)).b;

  // accent-blue cells keep the underlying luminance so letters still read through them
  vec2 lcell = floor(uv * vec2(16.0, 9.0) * 2.0);
  float blue = on * step(hash(lcell * 1.7 + tl + 3.1), a * 0.2);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, uAccent * (0.35 + lum * 2.2), blue * 0.95);

  // rare white flashes
  col += on * step(hash(lcell * 2.3 + tl + 9.7), a * 0.02) * 0.5;

  // lens rim catches a little light
  col += rim * 0.12;

  // intro iris: a soft circle of light opening from the centre over black
  float iris = length((uv - 0.5) * vec2(uAspect, 1.0));
  float open = uReveal * (0.5 * length(vec2(uAspect, 1.0)) + 0.25);
  col *= smoothstep(open, open - 0.18, iris);

  outputColor = vec4(col, inputColor.a);
}
