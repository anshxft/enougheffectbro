// Project screenshot on a curved screen.
// uReveal: overall fade (0..1). uMix: soft crossfade from uTexA to uTexB.
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uMix;
uniform float uReveal;
uniform float uTime;
uniform float uAspect;
uniform float uDim;   // 1 = full, lower for background cards
uniform float uBack;  // 1 = dark backing plate that gives the screen its thickness
varying vec2 vUv;

void main() {
  // tiny RGB split that grows towards the sides
  float split = 0.0015 + abs(vUv.x - 0.5) * 0.004;
  // only read what's needed: nothing for the backing plate, one screenshot unless a swap is running
  vec3 col = vec3(0.0);
  if (uBack < 0.5) {
    col = vec3(texture2D(uTexB, vUv + vec2(split, 0.0)).r, texture2D(uTexB, vUv).g, texture2D(uTexB, vUv - vec2(split, 0.0)).b);
    if (uMix < 0.999) {
      vec3 a = vec3(texture2D(uTexA, vUv + vec2(split, 0.0)).r, texture2D(uTexA, vUv).g, texture2D(uTexA, vUv - vec2(split, 0.0)).b);
      col = mix(a, col, smoothstep(0.0, 1.0, uMix));
    }
  }

  // scanlines + slow light sweep + dim so light screenshots stay under the bloom threshold
  col *= 0.94 + 0.06 * sin(vUv.y * 900.0);
  col += smoothstep(0.08, 0.0, abs(fract(vUv.y - uTime * 0.07) - 0.5)) * 0.05;
  col *= 0.86;

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

  gl_FragColor = vec4(col, corner * uReveal);
  #include <colorspace_fragment>
}
