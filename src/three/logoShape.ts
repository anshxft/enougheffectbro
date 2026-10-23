// Logo shapes for the particle logos: sampling points on and inside each inflated mark.
// Pure math, no three.js and no DOM beyond a 2D context, so it runs in a worker (see logoWorker.ts).

export const SIDE = 256
export const COUNT = SIDE * SIDE
export const SIZE = 3.4 // logo height in world units
export type Sampled = { pos: Float32Array; nrm: Float32Array }

// Every mark is "inflated" like igloo's: the 2D outline is thickened by `grow`, then puffed into a
// pillow whose half-thickness rises in a quarter circle of radius `round` from the edge inwards,
// so strokes become round tubes from every side. Built on a distance field of the outline.
const GRID = 192
const SPAN = 30 // grid covers -3..27 of the 24-unit icon box
const CELL = SPAN / GRID
// the first SURFACE share of beads (by index, the same in every shape) form a closed skin; the rest
// are a glowing core that only shows where the cursor parts the skin
export const SURFACE = 0.7

// chamfer distance (in icon units) from each cell to the nearest cell where `hit` is true
function distanceTo(hit: (i: number) => boolean) {
  const d = new Float32Array(GRID * GRID).map((_, i) => (hit(i) ? 0 : 1e9))
  const D = Math.SQRT2
  const relax = (i: number, j: number, c: number) => {
    if (d[j] + c < d[i]) d[i] = d[j] + c
  }
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x
      if (x > 0) relax(i, i - 1, 1)
      if (y > 0) {
        relax(i, i - GRID, 1)
        if (x > 0) relax(i, i - GRID - 1, D)
        if (x < GRID - 1) relax(i, i - GRID + 1, D)
      }
    }
  for (let y = GRID - 1; y >= 0; y--)
    for (let x = GRID - 1; x >= 0; x--) {
      const i = y * GRID + x
      if (x < GRID - 1) relax(i, i + 1, 1)
      if (y < GRID - 1) {
        relax(i, i + GRID, 1)
        if (x < GRID - 1) relax(i, i + GRID + 1, D)
        if (x > 0) relax(i, i + GRID - 1, D)
      }
    }
  return d.map((v) => v * CELL)
}

// shape is an SVG path in a 24×24 box; a leading "thin:" marks a fine-stroked logo that needs more growth
export function sample(shape: string): Sampled {
  const thin = shape.startsWith('thin:')
  const path = new Path2D(thin ? shape.slice(5) : shape)
  const grow = thin ? 1.0 : 0.35
  const round = thin ? 2.1 : 1.8
  const ctx = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1).getContext('2d') : document.createElement('canvas').getContext('2d'))!
  const inside = new Uint8Array(GRID * GRID)
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) inside[y * GRID + x] = ctx.isPointInPath(path, -3 + (x + 0.5) * CELL, -3 + (y + 0.5) * CELL) ? 1 : 0
  const toOut = distanceTo((i) => !inside[i])
  const toIn = distanceTo((i) => !!inside[i])
  // half-thickness of the pillow at each cell (0 outside the grown outline)
  const half = new Float32Array(GRID * GRID).map((_, i) => {
    const e = (inside[i] ? toOut[i] : -toIn[i]) + grow
    if (e <= 0) return 0
    const k = Math.min(e, round)
    return Math.sqrt(round * round - (round - k) ** 2)
  })
  const at = (x: number, y: number) => {
    const fx = Math.min(GRID - 1.001, Math.max(0, (x + 3) / CELL - 0.5))
    const fy = Math.min(GRID - 1.001, Math.max(0, (y + 3) / CELL - 0.5))
    const ix = Math.floor(fx)
    const iy = Math.floor(fy)
    const tx = fx - ix
    const ty = fy - iy
    const i = iy * GRID + ix
    const top = half[i] + (half[i + 1] - half[i]) * tx
    const bot = half[i + GRID] + (half[i + GRID + 1] - half[i + GRID]) * tx
    return top + (bot - top) * ty
  }

  const pos = new Float32Array(COUNT * 3)
  const nrm = new Float32Array(COUNT * 3)
  for (let i = 0; i < COUNT; i++) {
    const skin = i < COUNT * SURFACE
    let x = 0
    let y = 0
    let h = 0
    let gx = 0
    let gy = 0
    for (;;) {
      x = -3 + Math.random() * SPAN
      y = -3 + Math.random() * SPAN
      h = at(x, y)
      if (h <= 0.02) continue
      // the core stays well inside: only where the pillow is thick
      if (!skin) {
        if (h > round * 0.55) break
        continue
      }
      // skin beads: accept in proportion to the surface's slope so steep sides aren't sparse
      gx = (at(x + CELL, y) - at(x - CELL, y)) / (2 * CELL)
      gy = (at(x, y + CELL) - at(x, y - CELL)) / (2 * CELL)
      if (Math.random() * 5 < Math.min(5, Math.sqrt(1 + gx * gx + gy * gy))) break
    }
    const side = Math.random() < 0.5 ? -1 : 1
    let z: number
    if (skin) {
      z = side * h
      // icon y points down; the normal's y flips with it
      const len = Math.hypot(gx, gy, 1)
      nrm.set([-gx / len, gy / len, side / len], i * 3)
    } else {
      z = (Math.random() * 2 - 1) * (h - round * 0.45) // kept well behind the skin
      nrm.set([0, 0, z >= 0 ? 1 : -1], i * 3)
    }
    pos.set([x, -y, z], i * 3)
  }
  // centre and scale so the larger side is SIZE
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < COUNT * 3; i++) {
    min[i % 3] = Math.min(min[i % 3], pos[i])
    max[i % 3] = Math.max(max[i % 3], pos[i])
  }
  const s = SIZE / Math.max(max[0] - min[0], max[1] - min[1])
  for (let i = 0; i < COUNT * 3; i++) pos[i] = (pos[i] - (min[i % 3] + max[i % 3]) / 2) * s
  return { pos, nrm }
}


// xyz triples → RGBA texels (w = 0), the layout the GPU simulation reads; already-RGBA input passes through
export function toRGBA(xyz: Float32Array) {
  if (xyz.length === COUNT * 4) return xyz
  const out = new Float32Array(COUNT * 4)
  for (let i = 0; i < COUNT; i++) {
    out[i * 4] = xyz[i * 3]
    out[i * 4 + 1] = xyz[i * 3 + 1]
    out[i * 4 + 2] = xyz[i * 3 + 2]
  }
  return out
}
