import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { works, type Work } from '../content'
import { input } from './input'
import screenVert from './shaders/screen.vert'
import screenFrag from './shaders/screen.frag'

const ACCENT = new THREE.Color('#2b3bff')
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
}

function Screen({ mat, meshRef, width, bend, segments, ...rest }: ScreenProps) {
  const uniforms = useMemo(
    () => ({
      uTexA: { value: null as THREE.Texture | null },
      uTexB: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      uReveal: { value: 0 },
      uTime: { value: 0 },
      uBend: { value: bend },
      uAspect: { value: ASPECT },
      uAccent: { value: ACCENT },
    }),
    [bend],
  )
  return (
    <mesh ref={meshRef} {...rest}>
      <planeGeometry args={[width, width / ASPECT, segments, 1]} />
      <shaderMaterial ref={mat} vertexShader={screenVert} fragmentShader={screenFrag} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  )
}

// One project: a big curved screen flanked by two small tilted cards, driven by its DOM section
// (#work-<slug>): fades in block by block, switches screenshot every third of the scroll, fades out.
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
  const group = useRef<THREE.Group>(null)
  const left = useRef<THREE.Mesh>(null)
  const right = useRef<THREE.Mesh>(null)
  const mainMat = useRef<THREE.ShaderMaterial>(null)
  const leftMat = useRef<THREE.ShaderMaterial>(null)
  const rightMat = useRef<THREE.ShaderMaterial>(null)
  const swap = useRef({ from: 0, to: 0, mix: 1 })
  const mobile = viewport.aspect < 0.8

  const mainW = mobile ? viewport.width * 0.9 : Math.min(viewport.width * 0.5, viewport.height * 0.62 * ASPECT)
  const sideW = mainW * 0.32
  const n = textures.length

  useFrame((state, dt) => {
    const g = group.current
    const el = document.getElementById(`work-${work.slug}`)
    if (!g || !el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const p = clamp01((vh - r.top) / (r.height + vh))
    const vis = smooth(0.02, 0.16, p) * (1 - smooth(0.86, 0.98, p))
    g.visible = vis > 0.001
    if (!g.visible) return

    // which screenshot: thirds of the pinned stretch
    const idx = Math.min(n - 1, Math.floor(clamp01((p - 0.16) / 0.68) * n))
    const s = swap.current
    if (idx !== s.to) {
      s.from = s.to
      s.to = idx
      s.mix = 0
    }
    s.mix = Math.min(1, s.mix + dt * 1.6)
    const t = state.clock.elapsedTime

    if (mainMat.current) {
      const m = mainMat.current.uniforms
      m.uTexA.value = textures[s.from]
      m.uTexB.value = textures[s.to]
      m.uMix.value = s.mix
      m.uReveal.value = vis
      m.uTime.value = t
    }
    for (const [ref, off] of [[leftMat, 1], [rightMat, 2]] as const) {
      const mat = ref.current
      if (!mat) continue
      const tex = textures[(s.to + off) % n]
      mat.uniforms.uTexA.value = tex
      mat.uniforms.uTexB.value = tex
      mat.uniforms.uReveal.value = smooth(0.25, 1, vis)
      mat.uniforms.uTime.value = t
    }

    // drift through the viewport while pinned, lean towards the pointer
    const k = 1 - Math.exp(-dt * 4)
    const targetX = mobile ? 0 : viewport.width * 0.1
    const targetY = (0.5 - p) * viewport.height * 0.22 + (mobile ? viewport.height * 0.14 : 0.1)
    g.position.x += (targetX - g.position.x) * k
    g.position.y += (targetY - g.position.y) * k
    g.rotation.y += (input.pointer.x * 0.12 + (0.5 - p) * 0.3 - g.rotation.y) * k
    g.rotation.x += (-input.pointer.y * 0.06 - g.rotation.x) * k
    if (left.current) left.current.position.y = mainW * 0.12 + Math.sin(t * 0.7) * 0.06
    if (right.current) right.current.position.y = -mainW * 0.14 + Math.sin(t * 0.6 + 2) * 0.06
  })

  return (
    <group ref={group} visible={false}>
      <Screen mat={mainMat} width={mainW} bend={0.06} segments={48} />
      {!mobile && (
        <>
          <Screen mat={leftMat} meshRef={left} width={sideW} bend={0.15} segments={16} position={[-(mainW / 2 + sideW * 0.55), 0, 0.4]} rotation-y={0.55} />
          <Screen mat={rightMat} meshRef={right} width={sideW} bend={0.15} segments={16} position={[mainW / 2 + sideW * 0.55, 0, 0.4]} rotation-y={-0.55} />
        </>
      )}
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
