// Always-on radial chromatic aberration + an on-demand block glitch (uAmount 0..1):
// shifted blocks, torn rows, accent-blue cells and white flashes, re-rolled ~14x a second.
uniform float uAmount;
uniform float uTime;
uniform float uCA;
uniform float uWave;
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
  float t = floor(uTime * 14.0);
  vec2 st = uv;

  // liquid wobble while the hero is on screen: two slow interfering waves nudge every pixel a few px,
  // so letter edges look like they're melting
  float wx = sin(uv.y * 34.0 + uTime * 1.9 + sin(uv.x * 9.0 + uTime * 0.7) * 2.0);
  float wy = cos(uv.x * 27.0 - uTime * 1.5 + sin(uv.y * 7.0 - uTime * 0.6) * 2.0);
  st += vec2(wx, wy) * 0.0016 * uWave;

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
  col.r = texture2D(inputBuffer, st + dir * ca + vec2(a * 0.004, 0.0)).r;
  col.g = texture2D(inputBuffer, st).g;
  col.b = texture2D(inputBuffer, st - dir * ca - vec2(a * 0.004, 0.0)).b;

  // accent-blue cells keep the underlying luminance so letters still read through them
  float blue = on * step(hash(cell * 1.7 + t + 3.1), a * 0.32);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, uAccent * (0.35 + lum * 2.2), blue * 0.95);

  // rare white flashes
  col += on * step(hash(cell * 2.3 + t + 9.7), a * 0.05) * 0.85;

  outputColor = vec4(col, inputColor.a);
}
