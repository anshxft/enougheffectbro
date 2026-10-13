import * as THREE from 'three'

// A thick Möbius band: a rounded-rectangle cross-section swept around a circle while turning half a
// revolution. Because the section is symmetric under a half turn, the last ring joins the first with
// its points shifted by half the section, which closes the band into one continuous surface.
// Sizes are in scene units before the prism's scale (~1 unit across, like the old A glyph).
export function createMobiusGeometry({
  radius = 0.36, // centre line of the loop
  width = 0.27, // band width
  thickness = 0.065, // band thickness
  segments = 260, // around the loop
  sectionPoints = 32, // around the cross-section (even)
  roundness = 4, // superellipse exponent: 2 = ellipse, higher = squarer with soft corners
} = {}) {
  const N = sectionPoints
  const section: [number, number][] = []
  for (let k = 0; k < N; k++) {
    const t = (k / N) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const sx = Math.sign(c) * Math.abs(c) ** (2 / roundness)
    const sy = Math.sign(s) * Math.abs(s) ** (2 / roundness)
    section.push([(sx * width) / 2, (sy * thickness) / 2])
  }

  const positions = new Float32Array(segments * N * 3)
  for (let i = 0; i < segments; i++) {
    const u = (i / segments) * Math.PI * 2
    const radial = new THREE.Vector3(Math.cos(u), Math.sin(u), 0)
    const up = new THREE.Vector3(0, 0, 1)
    const twist = u / 2
    const ct = Math.cos(twist)
    const st = Math.sin(twist)
    for (let k = 0; k < N; k++) {
      const [a, b] = section[k]
      const p = radial
        .clone()
        .multiplyScalar(radius + a * ct - b * st)
        .addScaledVector(up, a * st + b * ct)
      positions.set([p.x, p.y, p.z], (i * N + k) * 3)
    }
  }

  const index: number[] = []
  for (let i = 0; i < segments; i++) {
    const last = i === segments - 1
    const next = last ? 0 : i + 1
    const shift = last ? N / 2 : 0 // the half twist: the section comes back rotated by 180°
    for (let k = 0; k < N; k++) {
      const a = i * N + k
      const b = i * N + ((k + 1) % N)
      const c = next * N + ((k + shift) % N)
      const d = next * N + ((k + 1 + shift) % N)
      index.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(index)
  geo.computeVertexNormals()
  return geo
}
