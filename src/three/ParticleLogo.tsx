import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

// A logo made of ~65k lit beads (after igloo.inc's social links), simulated on the GPU. Each bead
// is sprung to a point sampled from the inflated logo. The cursor acts like wind: its ray shoves
// beads aside and its movement drags them along, far and fast; disturbed beads loosen their spring
// and tumble in turbulence before settling back. A glowing core sits under a closed skin and lights
// up where the skin is parted. Switching logos kicks the beads loose to re-form in a staggered wave.

const SIDE = 256
const COUNT = SIDE * SIDE
const SIZE = 3.4 // logo height in world units
type Sampled = { pos: Float32Array; nrm: Float32Array }

// Every mark is "inflated" like igloo's: the 2D outline is thickened by `grow`, then puffed into a
// pillow whose half-thickness rises in a quarter circle of radius `round` from the edge inwards,
// so strokes become round tubes from every side. Built on a distance field of the outline.
const GRID = 192
const SPAN = 30 // grid covers -3..27 of the 24-unit icon box
const CELL = SPAN / GRID
// the first SURFACE share of beads (by index, the same in every shape) form a closed skin; the rest
// are a glowing core that only shows where the cursor parts the skin
const SURFACE = 0.7

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
function sample(shape: string): Sampled {
  const thin = shape.startsWith('thin:')
  const path = new Path2D(thin ? shape.slice(5) : shape)
  const grow = thin ? 1.0 : 0.35
  const round = thin ? 2.1 : 1.8
  const ctx = document.createElement('canvas').getContext('2d')!
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
  const n = new THREE.Vector3()
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
      n.set(-gx, gy, side).normalize()
    } else {
      z = (Math.random() * 2 - 1) * (h - round * 0.45) // kept well behind the skin
      n.set(0, 0, z >= 0 ? 1 : -1)
    }
    pos.set([x, -y, z], i * 3)
    nrm.set([n.x, n.y, n.z], i * 3)
  }
  // centre and scale so the larger side is SIZE
  const box = new THREE.Box3().setFromArray(pos)
  const c = box.getCenter(new THREE.Vector3())
  const s = SIZE / Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
  for (let i = 0; i < COUNT * 3; i += 3) {
    pos[i] = (pos[i] - c.x) * s
    pos[i + 1] = (pos[i + 1] - c.y) * s
    pos[i + 2] = (pos[i + 2] - c.z) * s
  }
  return { pos, nrm }
}

// ---------- simulation (GPGPU: one texel per bead) ----------
// shared: cursor ray in the logo's space; `fallOff` is 1 on the ray and fades out by uRadius
const CURSOR = /* glsl */ `
  uniform vec3 uRayO;
  uniform vec3 uRayD;
  uniform float uStrength;
  uniform float uRadius;
  vec3 offRay(vec3 p) {
    vec3 w = p - uRayO;
    return w - uRayD * dot(w, uRayD);
  }
  float fallOff(vec3 d) {
    return uStrength * pow(1.0 - smoothstep(0.0, uRadius, length(d)), 2.0);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`

const velocityShader = /* glsl */ `
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform sampler2D tAux; // r delay, g looseness, b core, a phase
  uniform float uTime;
  uniform float uSince;
  uniform float uDt;
  uniform float uKick;
  uniform vec3 uWind;
  ${CURSOR}
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 p = texture2D(texturePosition, uv);
    vec4 v = texture2D(textureVelocity, uv);
    vec4 aux = texture2D(tAux, uv);
    float core = aux.b;
    float ph = aux.a;

    // staggered re-form after a switch; always alive: a quick shimmer, loose beads wisp further
    float k = clamp((uSince - aux.r * 0.6) / 0.25, 0.0, 1.0);
    vec3 target = mix(texture2D(tA, uv).xyz, texture2D(tB, uv).xyz, k);
    float amp = 0.012 + aux.g;
    target += vec3(sin(uTime * 2.1 + ph), cos(uTime * 1.7 + ph * 1.3), sin(uTime * 1.9 + ph * 0.7)) * amp;
    target.y += sin(uTime * 0.5 + ph) * aux.g * 0.5;

    float excite = v.w;
    float free = uSince < 1.2 ? 1.0 - k : 0.0;
    // disturbed beads hang loose for a moment, so a light touch sends them far
    float spring = 24.0 * (1.0 - free * 0.85) / (1.0 + excite * 2.0);
    vec3 f = (target - p.xyz) * spring;

    vec3 d = offRay(p.xyz);
    float fall = fallOff(d);
    float give = core > 0.5 ? 0.12 : 1.0; // the core barely yields, so parting the skin reveals it
    float dl = max(length(d), 1e-4);
    f += (d / dl) * fall * 52.0 * give; // shove away from the ray
    f += uWind * fall * 24.0 * give;    // dragged along with the cursor's movement
    // tumbling turbulence while excited
    vec3 q = p.xyz * 2.3 + uTime * 0.9;
    f += vec3(sin(q.y + ph), sin(q.z + ph * 1.7), sin(q.x + ph * 2.3)) * excite * 2.2;

    excite = max(excite * exp(-uDt * 1.8), clamp(fall * (0.35 + length(uWind) * 0.25), 0.0, 1.0) * give);
    v.xyz = (v.xyz + f * uDt) * exp(-uDt * mix(5.0, 2.2, excite));
    if (uKick > 0.5) v.xyz += (vec3(hash(uv + uTime), hash(uv * 1.7 + uTime), hash(uv * 2.3 - uTime)) - 0.5) * 3.0;
    gl_FragColor = vec4(v.xyz, excite);
  }
`

const positionShader = /* glsl */ `
  uniform float uDt;
  ${CURSOR}
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 p = texture2D(texturePosition, uv);
    vec4 v = texture2D(textureVelocity, uv);
    p.xyz += v.xyz * uDt;
    // glow: on near the cursor or while flying, quick to light, slow to fade
    float want = min(1.0, max(fallOff(offRay(p.xyz)) * 1.4, length(v.xyz) * 0.18));
    p.w += (want - p.w) * min(1.0, uDt * (want > p.w ? 12.0 : 1.6));
    gl_FragColor = p;
  }
`

// ---------- drawing ----------
const beadVertex = /* glsl */ `
  uniform sampler2D tPos;
  uniform sampler2D tNA;
  uniform sampler2D tNB;
  uniform sampler2D tAux;
  uniform float uSize;
  uniform float uSince;
  uniform float uHalo;
  attribute vec2 aRef;
  attribute float aScale;
  varying float vGlow;
  varying float vLight;
  varying float vCore;
  varying float vDepth;
  varying vec3 vN;
  void main() {
    vec4 p = texture2D(tPos, aRef);
    vec4 aux = texture2D(tAux, aRef);
    float k = clamp((uSince - aux.r * 0.6) / 0.25, 0.0, 1.0);
    vec3 nrm = k > 0.5 ? texture2D(tNB, aRef).xyz : texture2D(tNA, aRef).xyz;
    vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
    gl_Position = projectionMatrix * mv;
    // light the bead by the surface it sits on: key light from above-left, soft fill, dark undersides
    vec3 n = normalize(normalMatrix * nrm);
    float key = max(dot(n, normalize(vec3(-0.35, 0.8, 0.45))), 0.0);
    float fill = max(dot(n, normalize(vec3(0.6, -0.2, 0.75))), 0.0);
    vLight = key * 0.85 + fill * 0.25 + 0.06;
    vN = n;
    vGlow = p.w;
    vCore = aux.b;
    vDepth = -mv.z;
    // skin beads overlap into a closed surface, core beads are smaller; the halo pass only draws glowing ones
    float size = uSize * aScale * mix(1.3, 0.75, aux.b) * (1.0 + p.w * 0.3) / -mv.z;
    gl_PointSize = uHalo > 0.5 ? (p.w < 0.05 ? 0.0 : size * 5.0) : size;
  }
`
// obsidian beads: near-black, light only catches the logo's rims and each bead's crisp highlight
const beadFragment = /* glsl */ `
  varying float vGlow;
  varying float vLight;
  varying float vCore;
  varying float vDepth;
  varying vec3 vN;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    c.y = -c.y;
    float r2 = dot(c, c);
    if (r2 > 1.0) discard;
    vec3 n = vec3(c, sqrt(1.0 - r2));
    vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
    vec3 col = vec3(0.004, 0.0045, 0.006) + pow(1.0 - abs(vN.z), 3.0) * 0.35 * (0.4 + vLight) + vLight * spec * 0.9;
    // glowing beads burn cool white from inside, the core brightest
    col = mix(col, vec3(0.92, 0.97, 1.05) * (0.9 + n.z * 0.8) * mix(1.0, 1.6, vCore), vGlow * mix(0.8, 1.0, vCore));
    col *= mix(1.0, 0.55, smoothstep(5.0, 9.0, vDepth));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`
// soft additive light around glowing beads: reads as light leaking out from inside the mark
const haloFragment = /* glsl */ `
  varying float vGlow;
  varying float vCore;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float a = exp(-dot(c, c) * 4.0) * vGlow * mix(0.025, 0.05, vCore);
    // additive with SrcAlpha: colour is weighted by a, and alpha stays tiny so the canvas keeps its transparency
    gl_FragColor = vec4(vec3(0.75, 0.86, 1.0), a);
  }
`

const tex = (data: Float32Array) => {
  const t = new THREE.DataTexture(data, SIDE, SIDE, THREE.RGBAFormat, THREE.FloatType)
  t.needsUpdate = true
  return t
}
const rgba = (xyz: Float32Array) => {
  const out = new Float32Array(COUNT * 4)
  for (let i = 0; i < COUNT; i++) out.set([xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2], 0], i * 4)
  return out
}

// cursor ray, logo-space scratch (one logo on screen)
const local = { o: new THREE.Vector3(), d: new THREE.Vector3(), inv: new THREE.Matrix4(), hit: new THREE.Vector3(), last: new THREE.Vector3(), wind: new THREE.Vector3() }

function buildSim(shapes: string[], gl: THREE.WebGLRenderer) {
  const targets = shapes.map(sample)
  const pos = targets.map((t) => tex(rgba(t.pos)))
  const nrm = targets.map((t) => tex(rgba(t.nrm)))
  // aux: delay, looseness (only the tips shed wisps), core flag, phase
  const auxData = new Float32Array(COUNT * 4)
  const first = targets[0].pos
  for (let i = 0; i < COUNT; i++) {
    const tip = Math.max(0, Math.hypot(first[i * 3], first[i * 3 + 1]) / SIZE - 0.35)
    auxData.set([Math.random(), Math.random() ** 24 * tip * 1.4, i < COUNT * SURFACE ? 0 : 1, Math.random() * 6.283], i * 4)
  }
  const aux = tex(auxData)

  const gpu = new GPUComputationRenderer(SIDE, SIDE, gl)
  const p0 = gpu.createTexture()
  ;(p0.image.data as Float32Array).set(rgba(targets[0].pos))
  const v0 = gpu.createTexture()
  const posVar = gpu.addVariable('texturePosition', positionShader, p0)
  const velVar = gpu.addVariable('textureVelocity', velocityShader, v0)
  gpu.setVariableDependencies(posVar, [posVar, velVar])
  gpu.setVariableDependencies(velVar, [posVar, velVar])
  const cursor = () => ({
    uRayO: { value: new THREE.Vector3() },
    uRayD: { value: new THREE.Vector3(0, 0, -1) },
    uStrength: { value: 0 },
    uRadius: { value: 0.9 },
    uDt: { value: 0 },
  })
  Object.assign(posVar.material.uniforms, cursor())
  Object.assign(velVar.material.uniforms, cursor(), {
    tA: { value: pos[0] },
    tB: { value: pos[0] },
    tAux: { value: aux },
    uTime: { value: 0 },
    uSince: { value: 10 },
    uKick: { value: 0 },
    uWind: { value: new THREE.Vector3() },
  })
  const err = gpu.init()
  if (err) console.error(err)

  const geo = new THREE.BufferGeometry()
  const ref = new Float32Array(COUNT * 2)
  for (let i = 0; i < COUNT; i++) ref.set([((i % SIDE) + 0.5) / SIDE, (Math.floor(i / SIDE) + 0.5) / SIDE], i * 2)
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3))
  geo.setAttribute('aRef', new THREE.BufferAttribute(ref, 2))
  geo.setAttribute('aScale', new THREE.BufferAttribute(new Float32Array(COUNT).map(() => 0.75 + Math.random() * 0.5), 1))
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SIZE * 2)
  const uniforms = {
    tPos: { value: null as THREE.Texture | null },
    tNA: { value: nrm[0] },
    tNB: { value: nrm[0] },
    tAux: { value: aux },
    uSize: { value: 0 },
    uSince: { value: 10 },
    uHalo: { value: 0 },
  }
  const beads = new THREE.ShaderMaterial({ vertexShader: beadVertex, fragmentShader: beadFragment, uniforms })
  // the halo shares the same uniform objects, only uHalo differs
  const halo = new THREE.ShaderMaterial({
    vertexShader: beadVertex,
    fragmentShader: haloFragment,
    uniforms: { ...uniforms, uHalo: { value: 1 } },
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  })
  return { gpu, posVar, velVar, pos, nrm, aux, geo, beads, halo, from: 0, to: 0, switchedAt: -10, strength: 0, kick: false }
}

function Beads({ shapes, index, hovered }: { shapes: string[]; index: number; hovered: React.RefObject<boolean> }) {
  const group = useRef<THREE.Group>(null)
  const { camera, raycaster, pointer, gl } = useThree()
  const simRef = useRef<ReturnType<typeof buildSim> | null>(null)
  const beads = useRef<THREE.Points>(null)
  const halo = useRef<THREE.Points>(null)

  useEffect(() => {
    const sim = buildSim(shapes, gl)
    simRef.current = sim
    beads.current!.geometry = sim.geo
    beads.current!.material = sim.beads
    halo.current!.geometry = sim.geo
    halo.current!.material = sim.halo
    return () => {
      simRef.current = null
      sim.gpu.dispose()
      sim.geo.dispose()
      sim.beads.dispose()
      sim.halo.dispose()
      for (const t of [...sim.pos, ...sim.nrm, sim.aux]) t.dispose()
    }
  }, [shapes, gl])

  // a new logo: remember where we came from, kick everything loose
  useEffect(() => {
    const sim = simRef.current
    if (!sim || index === sim.to) return
    sim.from = sim.to
    sim.to = index
    sim.switchedAt = performance.now() / 1000
    sim.kick = true
  }, [index])

  useFrame((state, rawDt) => {
    const sim = simRef.current
    if (!sim) return
    const dt = Math.min(rawDt, 1 / 30)
    const t = state.clock.elapsedTime
    const g = group.current!
    // keeps turning round, lingering face-on (front and back) and sweeping past the edge-on views
    const turn = t * 0.45
    g.rotation.y = turn - 0.45 * Math.sin(2 * turn) + pointer.x * 0.3
    g.rotation.x = -0.1 + Math.sin(t * 0.27) * 0.1 - pointer.y * 0.12
    g.updateMatrixWorld()

    // cursor ray in the logo's own space, and how fast its crossing point moves (the wind)
    raycaster.setFromCamera(pointer, camera)
    local.inv.copy(g.matrixWorld).invert()
    local.o.copy(raycaster.ray.origin).applyMatrix4(local.inv)
    local.d.copy(raycaster.ray.direction).transformDirection(local.inv)
    local.hit.copy(local.o).addScaledVector(local.d, -local.o.z / (local.d.z || 1e-4))
    local.wind.subVectors(local.hit, local.last).divideScalar(Math.max(dt, 1e-3)).clampLength(0, 12)
    local.last.copy(local.hit)
    sim.strength += ((hovered.current ? 1 : 0) - sim.strength) * Math.min(1, dt * 6)

    const since = performance.now() / 1000 - sim.switchedAt
    for (const v of [sim.posVar, sim.velVar]) {
      const u = v.material.uniforms
      u.uRayO.value.copy(local.o)
      u.uRayD.value.copy(local.d)
      u.uStrength.value = sim.strength
      u.uDt.value = dt
    }
    const vu = sim.velVar.material.uniforms
    vu.tA.value = sim.pos[sim.from]
    vu.tB.value = sim.pos[sim.to]
    vu.uTime.value = t
    vu.uSince.value = since
    vu.uKick.value = sim.kick ? 1 : 0
    vu.uWind.value.copy(local.wind).multiplyScalar(hovered.current ? 1 : 0)
    sim.kick = false
    sim.gpu.compute()

    const ru = sim.beads.uniforms
    ru.tPos.value = sim.gpu.getCurrentRenderTarget(sim.posVar).texture
    ru.tNA.value = sim.nrm[sim.from]
    ru.tNB.value = sim.nrm[sim.to]
    ru.uSince.value = since
    ru.uSize.value = 0.032 * gl.domElement.height
  })

  return (
    <group ref={group} position={[0, 0.18, 0]}>
      <points ref={beads} />
      <points ref={halo} renderOrder={1} />
    </group>
  )
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
