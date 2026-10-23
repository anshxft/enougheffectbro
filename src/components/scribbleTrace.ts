// Tracing the alter-ego pfp into scribble strokes. Pure (pixels in, strokes out), shared by the
// Scribble component's fallback and its worker.

export type Stroke = { pts: Float32Array; kind: 0 | 1 | 2 } // 0 figure, 1 loose background scribble, 2 the eye
export const N = 400 // the source image is N×N

// pixels (N×N RGBA) → strokes. Pure, so it runs in a worker (see scribbleWorker.ts).
export function traceStrokes(px: Uint8ClampedArray): Stroke[] {
  const at = (x: number, y: number) => {
    const i = ((Math.min(N - 1, Math.max(0, y | 0)) * N) + Math.min(N - 1, Math.max(0, x | 0))) * 4
    return [px[i], px[i + 1], px[i + 2]]
  }
  const dark = (x: number, y: number) => {
    const [r, gg, b] = at(x, y)
    return 1 - (0.3 * r + 0.59 * gg + 0.11 * b) / 255
  }
  // the eye only: violet pixels in the eye's area (the jacket has blue-violet strokes too)
  const eye = (x: number, y: number) => {
    if (x < 175 || x > 255 || y < 140 || y > 200) return false
    const [r, gg, b] = at(x, y)
    return b > 110 && b > gg + 30 && r > gg
  }
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const walk = (lo: number, hi: number, count: number, steps: number, step: number, kind: 0 | 1) => {
    const inside = (x: number, y: number) => {
      const d = dark(x, y)
      return d > lo && d < hi
    }
    const out: Stroke[] = []
    for (let guard = 0; out.length < count && guard < count * 40; guard++) {
      let x = rnd() * N
      let y = rnd() * N
      if (!inside(x, y)) continue
      let a = rnd() * 6.283
      const pts = [x, y]
      const isEye = kind === 0 && eye(x, y)
      for (let k = 0; k < steps; k++) {
        a += (rnd() - 0.5) * 1.1
        let moved = false
        for (const da of [0, 0.5, -0.5, 1, -1]) {
          const nx = x + Math.cos(a + da) * step
          const ny = y + Math.sin(a + da) * step
          if (inside(nx, ny)) {
            x = nx
            y = ny
            a += da
            moved = true
            break
          }
        }
        if (!moved) break
        pts.push(x, y)
      }
      if (pts.length > 8) out.push({ pts: new Float32Array(pts), kind: isEye ? 2 : kind })
    }
    return out
  }
  return [...walk(0.09, 0.4, 900, 60, 3, 1), ...walk(0.42, 2, 4200, 70, 2.4, 0)]
}
