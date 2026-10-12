// Project screenshot on a curved screen.
// uReveal: cells pop in block by block. uMix: block dissolve from uTexA to uTexB with an accent-blue front.
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uMix;
uniform float uReveal;
uniform float uTime;
uniform float uAspect;
uniform vec3 uAccent;
uniform float uDim;   // 1 = full, lower for background cards
uniform float uBack;  // 1 = dark backing plate that gives the screen its thickness
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 grid = vec2(18.0 * uAspect / 1.6, 11.0);
  vec2 cell = floor(vUv * grid);
  float h = hash(cell);

  // reveal: hidden cells are transparent, cells right at the front flash blue
  float shown = step(h, uReveal * 1.08 - 0.04);
  float revealEdge = (step(h, uReveal * 1.08) - shown) * step(0.001, uReveal);

  // dissolve between screenshots
  float h2 = hash(cell + 17.0);
  float toB = step(h2, uMix);
  float mixEdge = (step(h2, uMix + 0.08) - toB) * step(0.001, uMix) * step(uMix, 0.999);

  // tiny RGB split that grows towards the sides
  float split = 0.0015 + abs(vUv.x - 0.5) * 0.004;
  // only read what's needed: nothing for the backing plate, one screenshot unless a swap is running
  vec3 col = vec3(0.0);
  if (uBack < 0.5) {
    col = vec3(texture2D(uTexB, vUv + vec2(split, 0.0)).r, texture2D(uTexB, vUv).g, texture2D(uTexB, vUv - vec2(split, 0.0)).b);
    if (uMix < 0.999) {
      vec3 a = vec3(texture2D(uTexA, vUv + vec2(split, 0.0)).r, texture2D(uTexA, vUv).g, texture2D(uTexA, vUv - vec2(split, 0.0)).b);
      col = mix(a, col, toB);
    }
  }

  // scanlines + slow light sweep + dim so light screenshots stay under the bloom threshold
  col *= 0.94 + 0.06 * sin(vUv.y * 900.0);
  col += smoothstep(0.08, 0.0, abs(fract(vUv.y - uTime * 0.07) - 0.5)) * 0.05;
  col *= 0.86;

  col = mix(col, uAccent, max(revealEdge, mixEdge) * 0.9);

  // thin lit frame along the edges, like light catching the glass slab
  vec2 e = min(vUv, 1.0 - vUv) * vec2(uAspect, 1.0);
  float edge = smoothstep(0.012, 0.0, min(e.x, e.y));
  col = col * uDim + edge * 0.35;
  col = mix(col, vec3(0.012) + edge * 0.08, uBack);

  // rounded corners
  vec2 q = abs(vUv - 0.5) * vec2(uAspect, 1.0);
  vec2 r = vec2(0.5 * uAspect, 0.5) - 0.025;
  float d = length(max(q - r, 0.0)) - 0.025;
  float corner = 1.0 - smoothstep(0.0, 0.004, d);

  gl_FragColor = vec4(col, corner * max(shown, revealEdge));
  #include <colorspace_fragment>
}
