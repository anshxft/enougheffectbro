import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { works, type Work } from '../content'
import { input } from './input'
import { ambient } from './palette'
import { RING_END, RING_START, ringX } from '../lib/work-ring'
import screenVert from './shaders/screen.vert'
import screenFrag from './shaders/screen.frag'

// Screens sit on a concave ring around the viewer: radius RING, centred RING behind the front
// screen (which is at world z = 0, in front of the receded glass A). Side cards on the ring come
// closer and bigger, half off the screen edge, and turning the ring brings them to the centre.
const RING = 6
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

// One project, driven by its DOM section (#work-<slug>): its screenshots stand on the ring one
// step apart. Scrolling turns the ring right-to-left, card by card (each one pauses in front),
// entering with the first card on the right and leaving with the last on the left. The card in
// front also tints the room.
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
  const outer = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Group>(null)
  const mats = useRef<(THREE.ShaderMaterial | null)[]>([])
  const backs = useRef<(THREE.ShaderMaterial | null)[]>([])
  const pos = useRef(-1.2)
  const mobile = viewport.aspect < 0.8
  const n = textures.length

  const w = mobile ? viewport.width * 0.84 : Math.min(viewport.width * 0.58, viewport.height * 0.72 * ASPECT)
  const step = 2 * Math.asin(Math.min(0.95, (w / 2 + w * 0.06) / RING)) // angle between neighbouring cards

  useFrame((state, dt) => {
    const o = outer.current
    const r = ring.current
    const el = document.getElementById(`work-${work.slug}`)
    if (!o || !r || !el) return
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    const p = clamp01((vh - rect.top) / (rect.height + vh))
    // ring position in "cards", easing through each whole number so every card pauses in front
    const x = ringX(p, n)
    const base = Math.floor(x)
    const target = base + smooth(0.22, 0.78, x - base)
    // the ring follows the scroll with a little lag, so a fast flick still shows the cards turning past
    // instead of jumping (and the scroll snaps onto a card once it stops; see Home.tsx)
    const cur = pos.current
    pos.current = Math.abs(target - cur) > n + 2 ? target : cur + (target - cur) * (1 - Math.exp(-dt * 6))
    const ringPos = pos.current
    r.rotation.y = ringPos * step

    const live = p > RING_START && p < RING_END
    let anyVisible = false
    const t = state.clock.elapsedTime
    for (let i = 0; i < n; i++) {
      const a = Math.abs(ringPos - i) * step // this card's angle from the front
      const vis = live ? 1 - smooth(step * 1.05, step * 1.7, a) : 0
      if (vis > 0.001) anyVisible = true
      const dim = 1 - 0.4 * smooth(step * 0.1, step, a)
      for (const m of [mats.current[i], backs.current[i]]) {
        if (!m) continue
        m.uniforms.uTexA.value = textures[i]
        m.uniforms.uTexB.value = textures[i]
        m.uniforms.uMix.value = 1
        m.uniforms.uReveal.value = vis
        m.uniforms.uDim.value = dim
        m.uniforms.uTime.value = t
      }
    }
    o.visible = anyVisible

    const front = Math.min(n - 1, Math.max(0, Math.round(ringPos)))
    if (anyVisible) {
      ambient.owner = work.slug
      ambient.tex = textures[front]
      ambient.amount = live ? 1 - smooth(step * 0.5, step * 1.2, Math.abs(ringPos - front) * step) : 0
    } else if (ambient.owner === work.slug) ambient.amount = 0

    // gentle drift and lean towards the pointer
    const k = 1 - Math.exp(-dt * 4)
    const targetY = (0.5 - p) * viewport.height * 0.08 + (mobile ? viewport.height * 0.14 : viewport.height * 0.05)
    o.position.y += (targetY - o.position.y) * k
    o.rotation.x += (-input.pointer.y * 0.04 - o.rotation.x) * k
    o.rotation.z += (input.pointer.x * 0.01 - o.rotation.z) * k
  })

  return (
    <group ref={outer} position={[0, 0, RING]} visible={false}>
      <group ref={ring}>
        {textures.map((_, i) => (
          // each card stands on its own arm, i steps to the right of the first
          <group key={i} rotation-y={-i * step}>
            <Screen
              mat={(m) => {
                mats.current[i] = m
              }}
              width={w}
              bend={1 / (2 * RING)}
              segments={48}
              position-z={-RING}
            />
            {/* backing plate just behind: the card's thickness as it turns */}
            <Screen
              mat={(m) => {
                backs.current[i] = m
              }}
              width={w * 1.005}
              bend={1 / (2 * RING)}
              segments={48}
              back
              position-z={-RING - 0.12}
            />
          </group>
        ))}
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
