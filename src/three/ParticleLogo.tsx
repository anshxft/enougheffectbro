import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

// A logo made of a few thousand lit beads (after igloo.inc's social links). Each bead sits on a
// spring tied to a point sampled from the extruded logo; the cursor's ray pushes beads out of the
// way and they drift back when it leaves. Switching logos kicks the beads loose and they re-form
// into the next shape in a staggered wave. The simulation is a small CPU loop; the beads are
// screen-facing points shaded like spheres, so thousands cost almost nothing to draw.

const COUNT = 18000
const SIZE = 3 // logo height in world units

// sample COUNT points over the surface of an SVG path (24×24 viewBox) extruded into a slab
function samplePath(d: string) {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}"/></svg>`)
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p))
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 3.2, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 2, curveSegments: 10 })
  geo.scale(1, -1, 1) // SVG y points down
  geo.computeBoundingBox()
  const box = geo.boundingBox!
  const c = box.getCenter(new THREE.Vector3())
  const s = SIZE / Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
  geo.translate(-c.x, -c.y, -c.z)
  geo.scale(s, s, s)
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build()
  const out = new Float32Array(COUNT * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < COUNT; i++) {
    sampler.sample(v)
    out.set([v.x, v.y, v.z], i * 3)
  }
  geo.dispose()
  return out
}

const vertexShader = /* glsl */ `
  attribute float aGlow;
  attribute float aScale;
  uniform float uSize;
  varying float vGlow;
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale / -mv.z;
    vGlow = aGlow;
    vDepth = -mv.z;
  }
`
const fragmentShader = /* glsl */ `
  varying float vGlow;
  varying float vDepth;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    c.y = -c.y;
    float r2 = dot(c, c);
    if (r2 > 1.0) discard;
    vec3 n = vec3(c, sqrt(1.0 - r2));
    float diff = max(dot(n, normalize(vec3(-0.45, 0.6, 0.65))), 0.0);
    float rim = pow(1.0 - n.z, 2.0);
    // resting beads are a cool slate grey, so the touched (lit) ones read as white
    vec3 col = mix(vec3(0.03, 0.035, 0.045), vec3(0.3, 0.32, 0.36), diff * 0.9 + 0.08); // linear values, shown ~2x brighter
    col += rim * 0.08;
    // touched beads light up from inside: cool white, a touch overexposed
    col = mix(col, vec3(1.0, 1.02, 1.06) * (1.1 + diff * 0.4), vGlow * 0.9);
    // farther beads sink into the dark a little
    col *= mix(1.0, 0.55, smoothstep(5.0, 9.0, vDepth));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

// cursor ray in the logo's space (scratch, one logo on screen)
const local = { o: new THREE.Vector3(), d: new THREE.Vector3(), inv: new THREE.Matrix4() }

function createSim(start: Float32Array) {
  const pos = new Float32Array(start)
  const vel = new Float32Array(COUNT * 3)
  const glow = new Float32Array(COUNT)
  const delay = new Float32Array(COUNT).map(() => Math.random())
  const phase = new Float32Array(COUNT).map(() => Math.random() * 6.283)
  // most beads hold their place; a few are loose and drift off like smoke, more so at the tips
  const loose = new Float32Array(COUNT).map((_, i) => Math.random() ** 14 * (0.15 + (0.35 * Math.hypot(start[i * 3], start[i * 3 + 1])) / SIZE))
  const sinPh = phase.map(Math.sin)
  const cosPh = phase.map(Math.cos)
  const scale = new Float32Array(COUNT).map(() => 0.55 + Math.random() * 0.7)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
  geo.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1).setUsage(THREE.DynamicDrawUsage))
  geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1))
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SIZE * 1.5)
  const mat = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { uSize: { value: 0 } } })
  return { pos, vel, glow, delay, sinPh, cosPh, loose, geo, mat, from: 0, to: 0, switchedAt: -10, strength: 0 }
}

function Beads({ shapes, index, hovered }: { shapes: string[]; index: number; hovered: React.RefObject<boolean> }) {
  const points = useRef<THREE.Points>(null)
  const { camera, raycaster, pointer, gl } = useThree()
  const targets = useMemo(() => shapes.map(samplePath), [shapes])

  // simulation state and the material live in a ref, built once the canvas is up
  const simRef = useRef<ReturnType<typeof createSim> | null>(null)
  useLayoutEffect(() => {
    const sim = createSim(targets[0])
    simRef.current = sim
    points.current!.geometry = sim.geo
    points.current!.material = sim.mat
    return () => {
      sim.geo.dispose()
      sim.mat.dispose()
    }
  }, [targets])

  // a new logo: remember where we came from, kick everything loose
  useEffect(() => {
    const sim = simRef.current
    if (!sim || index === sim.to) return
    sim.from = sim.to
    sim.to = index
    sim.switchedAt = performance.now() / 1000
    for (let i = 0; i < COUNT * 3; i++) sim.vel[i] += (Math.random() - 0.5) * 3
  }, [index])


  useFrame((state, rawDt) => {
    const sim = simRef.current
    if (!sim) return
    const mat = sim.mat
    const dt = Math.min(rawDt, 1 / 30)
    const t = state.clock.elapsedTime
    const p = points.current!
    // keeps turning round, nudged by the pointer
    p.rotation.y = t * 0.4 + pointer.x * 0.3
    p.rotation.x = -0.1 + Math.sin(t * 0.27) * 0.1 - pointer.y * 0.12
    p.updateMatrixWorld()
    mat.uniforms.uSize.value = 0.036 * gl.domElement.height

    // cursor ray in the logo's own space
    raycaster.setFromCamera(pointer, camera)
    local.inv.copy(p.matrixWorld).invert()
    local.o.copy(raycaster.ray.origin).applyMatrix4(local.inv)
    local.d.copy(raycaster.ray.direction).transformDirection(local.inv)
    sim.strength += ((hovered.current ? 1 : 0) - sim.strength) * Math.min(1, dt * 6)

    const { pos, vel, glow, delay, sinPh, cosPh, loose } = sim
    // sin(t·w + phase) per bead without calling sin in the loop: precompute sin/cos(t·w) once
    const s1 = Math.sin(t * 0.9), c1 = Math.cos(t * 0.9)
    const s2 = Math.sin(t * 0.7), c2 = Math.cos(t * 0.7)
    const s3 = Math.sin(t * 0.5), c3 = Math.cos(t * 0.5)
    const since = performance.now() / 1000 - sim.switchedAt
    const a = targets[sim.from]
    const b = targets[sim.to]
    const R = 0.55
    const damp = Math.exp(-dt * 5.5)
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3
      // staggered re-form: each bead switches target after its own delay, drifting loose in between
      const k = Math.min(1, Math.max(0, (since - delay[i] * 0.6) / 0.25))
      let tx = a[j] + (b[j] - a[j]) * k
      let ty = a[j + 1] + (b[j + 1] - a[j + 1]) * k
      let tz = a[j + 2] + (b[j + 2] - a[j + 2]) * k
      // always alive: every bead drifts a little in a slow flow field, the loose ones a lot
      const sp0 = sinPh[i]
      const cp0 = cosPh[i]
      const amp = 0.02 + loose[i]
      tx += (s1 * cp0 + c1 * sp0) * amp
      ty += (c2 * cp0 - s2 * sp0) * amp + (s3 * cp0 + c3 * sp0) * loose[i] * 0.5
      tz += (s2 * sp0 - c1 * cp0) * amp
      const free = since < 1.2 ? 1 - k : 0
      const spring = 22 * (1 - free * 0.85)
      let fx = (tx - pos[j]) * spring
      let fy = (ty - pos[j + 1]) * spring
      let fz = (tz - pos[j + 2]) * spring
      // push away from the cursor ray; beads near it light up
      let lit = 0
      if (sim.strength > 0.01) {
        const wx = pos[j] - local.o.x
        const wy = pos[j + 1] - local.o.y
        const wz = pos[j + 2] - local.o.z
        const along = wx * local.d.x + wy * local.d.y + wz * local.d.z
        const dx = wx - local.d.x * along
        const dy = wy - local.d.y * along
        const dz = wz - local.d.z * along
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 1.1) lit = (1 - dist / 1.1) ** 1.5 * sim.strength
        if (dist < R && dist > 1e-4) {
          const push = (1 - dist / R) ** 2 * 260 * sim.strength
          fx += (dx / dist) * push + local.d.y * push * 0.3
          fy += (dy / dist) * push - local.d.x * push * 0.3
          fz += (dz / dist) * push
        }
      }
      vel[j] = (vel[j] + fx * dt) * damp
      vel[j + 1] = (vel[j + 1] + fy * dt) * damp
      vel[j + 2] = (vel[j + 2] + fz * dt) * damp
      pos[j] += vel[j] * dt
      pos[j + 1] += vel[j + 1] * dt
      pos[j + 2] += vel[j + 2] * dt
      // moving beads catch the light
      const sp = Math.abs(vel[j]) + Math.abs(vel[j + 1]) + Math.abs(vel[j + 2])
      const want = Math.max(lit, Math.min(1, sp * 0.3))
      // light comes on fast and fades slowly, leaving a soft trail
      glow[i] += (want - glow[i]) * Math.min(1, dt * (want > glow[i] ? 10 : 2.5))
    }
    sim.geo.attributes.position.needsUpdate = true
    sim.geo.attributes.aGlow.needsUpdate = true
  })

  return <points ref={points} />
}

// faint concentric rings under the logo, like a display plinth
function Plinth() {
  const rings = useMemo(
    () =>
      [1.6, 2.3, 3.1, 4.1].map((r) => {
        const g = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, r, r).getPoints(96).map((p) => new THREE.Vector3(p.x, 0, p.y)))
        return g
      }),
    [],
  )
  return (
    <group position={[0, -2.1, 0]}>
      {rings.map((g, i) => (
        <lineLoop key={i} geometry={g}>
          <lineBasicMaterial color="#f2f2f2" transparent opacity={0.16 - i * 0.03} />
        </lineLoop>
      ))}
    </group>
  )
}

export default function ParticleLogo({ shapes, index, active, onPick }: { shapes: string[]; index: number; active: boolean; onPick: () => void }) {
  const hovered = useRef(false)
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0.4, 6.4], fov: 40 }}
      gl={{ antialias: false, alpha: true, preserveDrawingBuffer: import.meta.env.DEV }}
      onPointerMove={() => (hovered.current = true)}
      onPointerLeave={() => (hovered.current = false)}
      onClick={(e) => {
        // only a click on the logo itself (the middle of the stage) follows the link
        const r = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - r.left) / r.width) * 2 - 1
        const y = ((e.clientY - r.top) / r.height) * 2 - 1
        if (Math.hypot((x * r.width) / r.height, y) < 0.55) onPick()
      }}
      className="absolute! inset-0"
    >
      <Beads shapes={shapes} index={index} hovered={hovered} />
      <Plinth />
    </Canvas>
  )
}
