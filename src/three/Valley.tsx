import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { step } from '../lib/sound'

// Third-person walk through an alpine valley (the /elsewhere page). The page feeds scroll progress
// and look input through `input`; here the hiker follows a winding dirt path, his limbs phase-locked
// to the distance walked (walk blends into a run when you go fast), and the camera trails behind
// his shoulder like a game camera. Everything is procedural and flat-shaded: no models to load.

export type WalkInput = { p: number; lookX: number; lookY: number }

// ---------- noise ----------
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x: number, y: number, octaves = 4) => {
  let s = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    s += a * vnoise(x * f, y * f)
    f *= 2
    a *= 0.5
  }
  return s
}
const ridged = (x: number, y: number) => {
  let s = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < 5; i++) {
    const n = 1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)
    s += a * n * n
    f *= 2.1
    a *= 0.5
  }
  return s
}
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const rand = (() => {
  let s = 12345
  return () => (s = (s * 16807) % 2147483647) / 2147483647
})()

// ---------- the path and the ground ----------
const PATH = new THREE.CatmullRomCurve3(
  [
    [0, 0], [3, -25], [-5, -55], [2, -85], [11, -115], [4, -145], [-7, -175], [-2, -205], [6, -235], [0, -262],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z)),
)
const LENGTH = PATH.getLength()
const Z_END = -262
// the path runs steadily towards -z, so "nearest path point" is just a lookup by z
const LUT = (() => {
  const pts = PATH.getSpacedPoints(2400)
  const xs = new Float32Array(1201)
  for (let i = 0; i <= 1200; i++) {
    const z = (i / 1200) * Z_END
    let best = pts[0]
    for (const q of pts) if (Math.abs(q.z - z) < Math.abs(best.z - z)) best = q
    xs[i] = best.x
  }
  return xs
})()
const pathX = (z: number) => {
  const f = Math.min(1200, Math.max(0, (z / Z_END) * 1200))
  const i = Math.floor(f)
  return LUT[i] + (LUT[Math.min(1200, i + 1)] - LUT[i]) * (f - i)
}
const distToPath = (x: number, z: number) => {
  if (z > 0) return Math.hypot(x - LUT[0], z)
  if (z < Z_END) return Math.hypot(x - LUT[1200], z - Z_END)
  return Math.abs(x - pathX(z))
}
const pathY = (z: number) => (fbm(0.3, z * 0.012) - 0.5) * 7
const ground = (x: number, z: number) => {
  const d = distToPath(x, z)
  const zc = Math.min(0, Math.max(Z_END, z))
  const valley = smoothstep(5, 150, d) ** 1.3 * 75
  const roll = (fbm(x * 0.018, z * 0.018) - 0.5) * 14 * smoothstep(4, 40, d)
  const bumps = (fbm(x * 0.09, z * 0.09, 2) - 0.5) * 1.4 * smoothstep(2.5, 8, d)
  return pathY(zc) + valley + roll + bumps
}

const C = (hex: string) => new THREE.Color(hex)
const GRASS = [C('#6f8f3a'), C('#86a046'), C('#9aa64e')]
const DRY = C('#b8a35c')
const ROCK = C('#d2aea2')

function terrainGeometry(w: number, h: number, sx: number, sz: number, cz: number, far: boolean) {
  const geo = new THREE.PlaneGeometry(w, h, sx, sz)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, 0, cz)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    let y = ground(x, z)
    if (far) {
      // the mountain wall around the valley; sunk out of sight where the near ground covers it
      const d = distToPath(x, z)
      const m = smoothstep(260, 620, d)
      y += m * (ridged(x * 0.0035, z * 0.0035) * 400 + 40)
      if (Math.abs(x) < 300 && z < 140 && z > -560) y -= 6
    }
    pos.setY(i, y)
    const n = fbm(x * 0.05, z * 0.05, 3)
    c.copy(GRASS[Math.min(2, Math.floor(n * 3))])
    c.lerp(DRY, smoothstep(25, 75, y - pathY(Math.min(0, Math.max(Z_END, z)))) * 0.7)
    if (far) c.lerp(ROCK, smoothstep(60, 170, y))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

function pathRibbon() {
  const n = 900
  const pos: number[] = []
  const idx: number[] = []
  const t = new THREE.Vector3()
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const p = PATH.getPointAt(u)
    PATH.getTangentAt(u, t)
    const nx = -t.z
    const nz = t.x
    const len = Math.hypot(nx, nz)
    for (const s of [-1.15, 1.15]) {
      const x = p.x + (nx / len) * s
      const z = p.z + (nz / len) * s
      pos.push(x, ground(x, z) + 0.06, z)
    }
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// scatter helper: random spots in the near valley within a distance band from the path
function scatter(count: number, minD: number, maxD: number, zMin = -330, zMax = 60) {
  const out: [number, number, number][] = []
  let guard = 0
  while (out.length < count && guard++ < count * 40) {
    const z = zMin + rand() * (zMax - zMin)
    const side = rand() < 0.5 ? -1 : 1
    const d = minD + (maxD - minD) * rand() ** 1.6
    const x = pathX(Math.min(0, Math.max(Z_END, z))) + side * d
    out.push([x, ground(x, z), z])
  }
  return out
}

function Instanced({ geo, mat, items, scale, tint, shadows = true }: {
  geo: THREE.BufferGeometry
  mat: THREE.Material
  items: [number, number, number][]
  scale: (i: number) => [number, number, number]
  tint?: (i: number) => THREE.Color
  shadows?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current!
    const o = new THREE.Object3D()
    items.forEach(([x, y, z], i) => {
      o.position.set(x, y, z)
      o.rotation.set(0, hash(i, 7) * Math.PI * 2, 0)
      o.scale.set(...scale(i))
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (tint) m.setColorAt(i, tint(i))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [items, scale, tint])
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow={shadows} receiveShadow />
}

function World() {
  const w = useMemo(() => {
    // Lambert is far cheaper than Standard and these surfaces are all matte anyway
    const flat = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true })
    const near = terrainGeometry(640, 720, 256, 288, -140, false)
    const far = terrainGeometry(5200, 5200, 220, 220, -140, true)
    const pine = mergeGeometries([
      new THREE.ConeGeometry(1.5, 3.2, 7).translate(0, 2.6, 0),
      new THREE.ConeGeometry(1.15, 2.6, 7).translate(0, 4.1, 0),
      new THREE.ConeGeometry(0.75, 2, 7).translate(0, 5.4, 0),
    ])
    const crown = new THREE.IcosahedronGeometry(1.9, 0).scale(1, 0.85, 1).translate(0, 3.6, 0)
    const trunk = new THREE.CylinderGeometry(0.16, 0.24, 2.4, 6).translate(0, 1.2, 0)
    const rock = new THREE.DodecahedronGeometry(0.8, 0).scale(1, 0.6, 1)
    const tuft = new THREE.ConeGeometry(0.08, 0.2, 5).translate(0, 0.08, 0)
    const flower = new THREE.OctahedronGeometry(0.045, 0).translate(0, 0.2, 0)
    return {
      near,
      far,
      path: pathRibbon(),
      terrainMat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      pathMat: new THREE.MeshLambertMaterial({ color: '#c9a275', polygonOffset: true, polygonOffsetFactor: -2 }),
      pine,
      crown,
      trunk,
      rock,
      tuft,
      flower,
      leafMat: flat('#ffffff'),
      trunkMat: flat('#5b4330'),
      rockMat: flat('#b7aa9a'),
      tuftMat: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
      pines: scatter(240, 9, 170),
      broad: scatter(130, 7, 120),
      rocks: scatter(110, 2.5, 90),
      tufts: scatter(9000, 1.4, 26, -280, 20),
      flowers: scatter(3200, 1.5, 22, -280, 20),
    }
  }, [])
  const pineTint = useMemo(() => (i: number) => new THREE.Color('#3f5a2c').lerp(new THREE.Color('#5c7434'), hash(i, 1)), [])
  const broadTint = useMemo(() => (i: number) => new THREE.Color('#6f8a35').lerp(new THREE.Color('#9aa344'), hash(i, 2)), [])
  const tuftTint = useMemo(() => (i: number) => new THREE.Color('#5f8233').lerp(new THREE.Color('#9fa64c'), hash(i, 3)), [])
  const FLOWER = useMemo(() => ['#f2c84b', '#f8f4ea', '#a993dc', '#f0a35e'].map(C), [])
  const flowerTint = useMemo(() => (i: number) => FLOWER[Math.floor(hash(i, 4) * 4)], [FLOWER])
  const allTrees = useMemo(() => [...w.pines, ...w.broad], [w])

  // the cabin, a little way off the path on the left
  const cabin = useMemo(() => {
    const p = PATH.getPointAt(0.3)
    const x = p.x - 17
    const z = p.z
    return { x, z, y: ground(x, z) }
  }, [])

  return (
    <>
      <mesh geometry={w.near} material={w.terrainMat} receiveShadow />
      <mesh geometry={w.far} material={w.terrainMat} />
      <mesh geometry={w.path} material={w.pathMat} receiveShadow />
      <Instanced geo={w.pine} mat={w.leafMat} items={w.pines} scale={(i) => [0.9 + hash(i, 5) * 0.8, 0.9 + hash(i, 6) * 0.9, 0.9 + hash(i, 5) * 0.8]} tint={pineTint} />
      <Instanced geo={w.crown} mat={w.leafMat} items={w.broad} scale={(i) => [0.8 + hash(i, 8) * 0.7, 0.8 + hash(i, 9) * 0.6, 0.8 + hash(i, 8) * 0.7]} tint={broadTint} />
      <Instanced geo={w.trunk} mat={w.trunkMat} items={allTrees} scale={(i) => [1, i < w.pines.length ? 0.8 : 1.3, 1]} />
      <Instanced geo={w.rock} mat={w.rockMat} items={w.rocks} scale={(i) => { const s = 0.4 + hash(i, 10) ** 2 * 2.2; return [s, s, s] }} />
      <Instanced geo={w.tuft} mat={w.tuftMat} items={w.tufts} scale={(i) => { const s = 0.7 + hash(i, 11) * 0.9; return [s, s, s] }} tint={tuftTint} shadows={false} />
      <Instanced geo={w.flower} mat={w.tuftMat} items={w.flowers} scale={() => [1, 1, 1]} tint={flowerTint} shadows={false} />
      <group position={[cabin.x, cabin.y, cabin.z]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[5, 2.8, 4]} />
          <meshLambertMaterial color="#8a6646" flatShading />
        </mesh>
        <mesh position={[0, 3.55, 0]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 1.18]} castShadow>
          <boxGeometry args={[2.6, 2.6, 4]} />
          <meshLambertMaterial color="#4a3a32" flatShading />
        </mesh>
        <mesh position={[0.9, 1, 2.01]}>
          <planeGeometry args={[0.9, 1.8]} />
          <meshLambertMaterial color="#3a2a20" />
        </mesh>
      </group>
    </>
  )
}

// ---------- sky ----------
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() } },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir);
      vec3 c = mix(uHorizon, uTop, pow(max(d.y, 0.0), 0.55));
      float s = max(dot(d, uSunDir), 0.0);
      c += uSun * (pow(s, 900.0) * 3.0 + pow(s, 14.0) * 0.45 + pow(s, 3.0) * 0.12);
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`,
})

// golden morning → sunset across the walk
const TOD = {
  top: [C('#e9c8b5'), C('#b9705e')],
  horizon: [C('#f7e5cd'), C('#f3b88a')],
  sun: [C('#ffe3b5'), C('#ff9a58')],
  hemiSky: [C('#ffe8d2'), C('#f0a57c')],
  hemiGround: [C('#55652f'), C('#3f3524')],
}
const lerpC = (pair: THREE.Color[], t: number, out: THREE.Color) => out.copy(pair[0]).lerp(pair[1], t)

// ---------- the hiker ----------
type Rig = Record<'root' | 'hips' | 'torso' | 'legL' | 'legR' | 'kneeL' | 'kneeR' | 'armL' | 'armR' | 'elbowL' | 'elbowR', THREE.Object3D>

const M = ({ c }: { c: string }) => <meshStandardMaterial color={c} flatShading roughness={0.9} />

function Hiker({ rig }: { rig: React.RefObject<Partial<Rig>> }) {
  const set = (k: keyof Rig) => (o: THREE.Object3D | null) => {
    if (o) rig.current[k] = o
  }
  const jacket = '#b5532e'
  const pants = '#4a4436'
  const skin = '#c99a7a'
  const boot = '#2a2018'
  const leg = (side: 1 | -1) => (
    <group ref={set(side < 0 ? 'legL' : 'legR')} position={[0.1 * side, 0, 0]}>
      <mesh position={[0, -0.22, 0]} castShadow>
        <capsuleGeometry args={[0.075, 0.3, 3, 8]} />
        <M c={pants} />
      </mesh>
      <group ref={set(side < 0 ? 'kneeL' : 'kneeR')} position={[0, -0.45, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.065, 0.3, 3, 8]} />
          <M c={pants} />
        </mesh>
        <mesh position={[0, -0.44, 0.05]} castShadow>
          <boxGeometry args={[0.12, 0.08, 0.26]} />
          <M c={boot} />
        </mesh>
      </group>
    </group>
  )
  const arm = (side: 1 | -1) => (
    <group ref={set(side < 0 ? 'armL' : 'armR')} position={[0.24 * side, 0.52, 0]}>
      <mesh position={[0, -0.14, 0]} castShadow>
        <capsuleGeometry args={[0.055, 0.2, 3, 8]} />
        <M c={jacket} />
      </mesh>
      <group ref={set(side < 0 ? 'elbowL' : 'elbowR')} position={[0, -0.3, 0]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.048, 0.18, 3, 8]} />
          <M c={jacket} />
        </mesh>
        <mesh position={[0, -0.27, 0]} castShadow>
          <sphereGeometry args={[0.05, 8, 6]} />
          <M c={skin} />
        </mesh>
      </group>
    </group>
  )
  return (
    <group ref={set('root')}>
      <group ref={set('hips')} position={[0, 0.94, 0]}>
        {leg(-1)}
        {leg(1)}
        <group ref={set('torso')}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <capsuleGeometry args={[0.18, 0.36, 4, 10]} />
            <M c={jacket} />
          </mesh>
          <mesh position={[0, 0.36, -0.19]} castShadow>
            <boxGeometry args={[0.34, 0.46, 0.2]} />
            <M c="#4d5a36" />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <sphereGeometry args={[0.12, 12, 10]} />
            <M c={skin} />
          </mesh>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 16]} />
            <M c="#5a5236" />
          </mesh>
          <mesh position={[0, 0.86, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.12, 12]} />
            <M c="#5a5236" />
          </mesh>
          {arm(-1)}
          {arm(1)}
        </group>
      </group>
    </group>
  )
}

// per-frame scratch values (there is only ever one valley on screen)
const tmp = { p: new THREE.Vector3(), t: new THREE.Vector3(), dir: new THREE.Vector3(), right: new THREE.Vector3(), want: new THREE.Vector3(), look: new THREE.Vector3(), sunDir: new THREE.Vector3(), c: new THREE.Color() }

function Walk({ input }: { input: React.RefObject<WalkInput> }) {
  const rig = useRef<Partial<Rig>>({})
  const sun = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const { camera, scene } = useThree()
  const s = useRef({ dist: 0, phase: 0, walk: 0, run: 0, yaw: 0, facing: 1, lastStep: 0, look: new THREE.Vector2(), camPos: new THREE.Vector3(0, 3, 8), camLook: new THREE.Vector3(0, 1.4, -4), init: false })

  const sky = useMemo(() => new THREE.Mesh(new THREE.SphereGeometry(4500, 32, 16), skyMat), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const st = s.current
    const r = rig.current as Rig
    if (!r.root) return

    // distance along the path from scroll; speed decides walk vs run
    const dist = input.current.p * (LENGTH - 1)
    const moved = dist - st.dist
    st.dist = dist
    const speed = Math.abs(moved) / dt
    st.walk += (Math.min(1, speed / 0.8) - st.walk) * Math.min(1, dt * 7)
    st.run += (Math.min(1, Math.max(0, (speed - 2.6) / 2.4)) - st.run) * Math.min(1, dt * 4)
    if (Math.abs(moved) > 0.002) st.facing = Math.sign(moved)
    const stride = 1.5 + st.run * 1.1
    st.phase += (Math.abs(moved) / stride) * Math.PI * 2
    const stepIndex = Math.floor(st.phase / Math.PI)
    if (stepIndex !== st.lastStep && st.walk > 0.4) step()
    st.lastStep = stepIndex

    const u = Math.min(1, dist / LENGTH)
    PATH.getPointAt(u, tmp.p)
    PATH.getTangentAt(u, tmp.t)
    tmp.p.y = ground(tmp.p.x, tmp.p.z)
    r.root.position.copy(tmp.p)
    // face along the path, or turn round to walk back towards the camera
    const pathYaw = Math.atan2(tmp.t.x, tmp.t.z)
    const want = pathYaw + (st.facing < 0 ? Math.PI : 0)
    let diff = want - st.yaw
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    st.yaw += diff * Math.min(1, dt * 6)
    r.root.rotation.y = st.yaw

    // limbs: walk cycle that stretches into a run
    const w = st.walk
    const amp = 1 + st.run * 0.6
    const ph = st.phase
    const t = performance.now() / 1000
    const thigh = (a: number) => -0.5 * amp * Math.sin(a) * w
    const knee = (a: number) => (0.1 + (0.85 + st.run * 0.7) * Math.max(0, Math.cos(a)) ** 1.5) * w
    r.legL.rotation.x = thigh(ph)
    r.kneeL.rotation.x = knee(ph)
    r.legR.rotation.x = thigh(ph + Math.PI)
    r.kneeR.rotation.x = knee(ph + Math.PI)
    r.armL.rotation.x = 0.45 * amp * Math.sin(ph) * w
    r.armR.rotation.x = 0.45 * amp * Math.sin(ph + Math.PI) * w
    r.elbowL.rotation.x = -(0.25 + (0.3 + st.run * 0.9) * Math.max(0, -Math.sin(ph))) * w - 0.12 * (1 - w)
    r.elbowR.rotation.x = -(0.25 + (0.3 + st.run * 0.9) * Math.max(0, Math.sin(ph))) * w - 0.12 * (1 - w)
    r.armL.rotation.z = -0.08
    r.armR.rotation.z = 0.08
    r.hips.position.y = 0.94 - (0.03 + st.run * 0.04) * Math.cos(2 * ph) * w + Math.sin(t * 1.6) * 0.006 * (1 - w)
    r.torso.rotation.x = (0.06 + st.run * 0.22) * w
    r.torso.rotation.y = 0.12 * Math.sin(ph) * w

    // camera: behind his shoulder, relative to the path, swung a little by the mouse
    st.look.lerp(new THREE.Vector2(input.current.lookX, input.current.lookY), Math.min(1, dt * 3))
    tmp.dir.set(tmp.t.x, 0, tmp.t.z).normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, -st.look.x * 0.7)
    tmp.right.set(-tmp.dir.z, 0, tmp.dir.x)
    tmp.want.copy(tmp.p).addScaledVector(tmp.dir, -6 - st.run * 0.8).addScaledVector(tmp.right, 0.7)
    tmp.want.y += 2.7 + st.look.y * 0.8
    tmp.want.y = Math.max(tmp.want.y, ground(tmp.want.x, tmp.want.z) + 0.8)
    tmp.look.copy(tmp.p).addScaledVector(tmp.dir, 9)
    tmp.look.y += 2.2 - st.look.y * 2
    if (!st.init) {
      st.camPos.copy(tmp.want)
      st.camLook.copy(tmp.look)
      st.init = true
    }
    const k = 1 - Math.exp(-dt * 4.5)
    st.camPos.lerp(tmp.want, k)
    st.camLook.lerp(tmp.look, k)
    camera.position.copy(st.camPos)
    camera.lookAt(st.camLook)

    // light and sky, golden morning towards sunset; the sun sits ahead and to the right
    const tod = Math.min(1, input.current.p * 1.05)
    const elev = THREE.MathUtils.lerp(0.36, 0.07, tod)
    tmp.sunDir.set(0.55, Math.sin(elev), -0.8).normalize()
    lerpC(TOD.sun, tod, tmp.c)
    sun.current!.color.copy(tmp.c)
    sun.current!.intensity = THREE.MathUtils.lerp(2.8, 2, tod)
    sun.current!.position.copy(tmp.p).addScaledVector(tmp.sunDir, 90)
    sun.current!.target.position.copy(tmp.p)
    sun.current!.target.updateMatrixWorld()
    lerpC(TOD.hemiSky, tod, hemi.current!.color)
    lerpC(TOD.hemiGround, tod, hemi.current!.groundColor)
    hemi.current!.intensity = THREE.MathUtils.lerp(1.15, 0.85, tod)
    lerpC(TOD.top, tod, skyMat.uniforms.uTop.value)
    lerpC(TOD.horizon, tod, skyMat.uniforms.uHorizon.value)
    lerpC(TOD.sun, tod, skyMat.uniforms.uSun.value)
    skyMat.uniforms.uSunDir.value.copy(tmp.sunDir)
    ;(scene.fog as THREE.FogExp2).color.copy(skyMat.uniforms.uHorizon.value)
    sky.position.copy(camera.position)
  })

  return (
    <>
      <fogExp2 attach="fog" args={[TOD.horizon[0].getHex(), 0.0011]} />
      <primitive object={sky} />
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={220}
      />
      <Hiker rig={rig} />
    </>
  )
}

export default function Valley({ input }: { input: React.RefObject<WalkInput> }) {
  return (
    <Canvas shadows dpr={[1, 1.25]} camera={{ fov: 50, near: 0.1, far: 9000 }} gl={{ antialias: true, preserveDrawingBuffer: import.meta.env.DEV }} className="absolute! inset-0">
      <World />
      <Walk input={input} />
    </Canvas>
  )
}
