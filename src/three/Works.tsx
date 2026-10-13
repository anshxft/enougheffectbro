import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { works, type Work } from '../content'
import { input } from './input'
import { ambient } from './palette'
import screenVert from './shaders/screen.vert'
import screenFrag from './shaders/screen.frag'

// screens swing round the same dome centre the interlude words use
const PIVOT = new THREE.Vector3(0, 0, 2)
const SWING = 1.1 // radians either side of centre at entry / exit
const ASPECT = 1.6
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// Curved screenshot plane; its uniforms are driven per frame through the material ref.
type ScreenProps = Omit<React.ComponentProps<'mesh'>, 'ref'> & {
  mat: React.Ref<THREE.ShaderMaterial>
  meshRef?: React.Ref<THREE.Mesh>
  width: number
  bend: number
  segments: number
  dim?: number
  back?: boolean
}

function Screen({ mat, meshRef, width, bend, segments, dim = 1, back = false, ...rest }: ScreenProps) {
  const uniforms = useMemo(
    () => ({
      uTexA: { value: null as THREE.Texture | null },
      uTexB: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      uReveal: { value: 0 },
      uTime: { value: 0 },
      uBend: { value: bend },
      uAspect: { value: ASPECT },
      uDim: { value: dim },
      uBack: { value: back ? 1 : 0 },
    }),
    [bend, dim, back],
  )
  return (
    <mesh ref={meshRef} {...rest}>
      <planeGeometry args={[width, width / ASPECT, segments, 1]} />
      <shaderMaterial ref={mat} vertexShader={screenVert} fragmentShader={screenFrag} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  )
}

// One project, driven by its DOM section (#work-<slug>): a big curved glass slab front and centre,
// the next screenshot on a larger, steeper card half off the right edge, a small faded one on the
// left. The set swings in from the right around the dome centre, settles in front of the glass A,
// swings out to the left, once per screenshot; the current screenshot also tints the room.
function WorkScene({ work }: { work: Work }) {
  const textures = useTexture(
    work.images.map((i) => i.src),
    (loaded) =>
      loaded.forEach((t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
      }),
  )
  const { viewport } = useThree()
  const pivot = useRef<THREE.Group>(null)
  const group = useRef<THREE.Group>(null)
  const left = useRef<THREE.Mesh>(null)
  const right = useRef<THREE.Mesh>(null)
  const mainMat = useRef<THREE.ShaderMaterial>(null)
  const backMat = useRef<THREE.ShaderMaterial>(null)
  const leftMat = useRef<THREE.ShaderMaterial>(null)
  const rightMat = useRef<THREE.ShaderMaterial>(null)
  const mobile = viewport.aspect < 0.8

  const mainW = mobile ? viewport.width * 0.84 : Math.min(viewport.width * 0.6, viewport.height * 0.74 * ASPECT)
  const rightW = mainW * 0.62
  const leftW = mainW * 0.3
  const n = textures.length

  useFrame((state, dt) => {
    const g = group.current
    const pv = pivot.current
    const el = document.getElementById(`work-${work.slug}`)
    if (!g || !pv || !el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const p = clamp01((vh - r.top) / (r.height + vh))
    // Each screenshot is its own slide: it swings in from the right around the dome centre, holds in
    // front of the glass A, and swings out to the left as the next one swings in.
    // Consecutive projects overlap in p by 0.75 (300vh article vs 100vh viewport), so the slides run
    // between 0.1 and 0.84: the next project's first slide starts at its own 0.1 (= 0.85 here).
    const START = 0.1
    const END = 0.84
    const len = (END - START) / n
    const raw = (p - START) / len
    const idx = Math.min(n - 1, Math.max(0, Math.floor(raw)))
    const q = raw - idx // 0..1 within the current slide
    const inRange = raw > 0 && raw < n
    const vis = inRange ? smooth(0, 0.18, q) * (1 - smooth(0.82, 1, q)) : 0
    pv.visible = vis > 0.001
    // swing: from the right into centre, hold, out to the left (positive turn moves things left)
    pv.rotation.y = -SWING * (1 - smooth(0, 0.32, q)) + SWING * smooth(0.68, 1, q)
    if (!pv.visible) {
      if (ambient.owner === work.slug) ambient.amount = 0
      return
    }
    const t = state.clock.elapsedTime

    ambient.owner = work.slug
    ambient.tex = textures[idx]
    ambient.amount = vis

    // the slide's texture only changes while it is fully faded out, so no crossfade is needed
    for (const ref of [mainMat, backMat]) {
      const m = ref.current?.uniforms
      if (!m) continue
      m.uTexA.value = textures[idx]
      m.uTexB.value = textures[idx]
      m.uMix.value = 1
      m.uReveal.value = vis
      m.uTime.value = t
    }
    for (const [ref, off] of [[rightMat, 1], [leftMat, 2]] as const) {
      const mat = ref.current
      if (!mat) continue
      const tex = textures[(idx + off) % n]
      mat.uniforms.uTexA.value = tex
      mat.uniforms.uTexB.value = tex
      mat.uniforms.uMix.value = 1
      mat.uniforms.uReveal.value = vis * 0.9
      mat.uniforms.uTime.value = t
    }

    // drift through the viewport while pinned, lean towards the pointer
    const k = 1 - Math.exp(-dt * 4)
    const targetY = (0.5 - p) * viewport.height * 0.1 + (mobile ? viewport.height * 0.14 : viewport.height * 0.06)
    g.position.y += (targetY - g.position.y) * k
    g.rotation.y += (input.pointer.x * 0.1 - g.rotation.y) * k
    g.rotation.x += (-input.pointer.y * 0.05 - g.rotation.x) * k
    if (right.current) right.current.position.y = -mainW * 0.02 + Math.sin(t * 0.6 + 2) * 0.05
    if (left.current) left.current.position.y = mainW * 0.16 + Math.sin(t * 0.7) * 0.05
  })

  return (
    <group ref={pivot} position={PIVOT} visible={false}>
      {/* screens sit 2 units in front of the pivot, i.e. at world z = 0, in front of the receded A */}
      <group ref={group} position-z={-PIVOT.z}>
      <Screen mat={mainMat} width={mainW} bend={0.05} segments={48} />
      {/* backing plate a little behind: shows as the slab's thickness when it turns */}
      <Screen mat={backMat} width={mainW * 1.005} bend={0.05} segments={48} back position-z={-0.12} />
      {!mobile && (
        <>
          <Screen mat={rightMat} meshRef={right} width={rightW} bend={0.22} segments={24} dim={0.8} position={[mainW / 2 + rightW * 0.42, 0, 0.9]} rotation-y={-0.85} />
          <Screen mat={leftMat} meshRef={left} width={leftW} bend={0.15} segments={16} dim={0.45} position={[-(mainW / 2 + leftW * 0.35), 0, -0.6]} rotation-y={0.6} />
        </>
      )}
      </group>
    </group>
  )
}

export default function Works() {
  return (
    <>
      {works.map((w) => (
        <WorkScene key={w.slug} work={w} />
      ))}
    </>
  )
}
