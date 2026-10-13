import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { input } from './input'
import { hud } from './fx'
import { ambient, tint, tint2, updatePalette } from './palette'
import vert from './shaders/backdrop.vert'
import frag from './shaders/backdrop.frag'

const RADIUS = 9
// The camera (z=8) sits behind the dome's centre, so the far wall is ahead and the sides curve in.
const CENTER = new THREE.Vector3(0, 0, 2)
// stand-in for uAmbient until a works screenshot is on stage
const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
BLACK.needsUpdate = true
const PATTERNS = 6 // see wallPattern in backdrop.frag
const PATTERN_HOLD = 9 // seconds on each pattern
const PATTERN_FADE = 2.5 // seconds crossfading into the next
const wallFlag = new URLSearchParams(window.location.search).get('wall')
const PINNED = wallFlag === null ? null : Number(wallFlag)
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const WORDS = 'ANSH — DEVELOPER — DESIGNER — WEB3 — '

// Outlined words drawn once into a canvas strip, once the display font has loaded.
function useWordsTexture() {
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(document.createElement('canvas'))
    t.wrapS = THREE.RepeatWrapping
    t.generateMipmaps = false
    t.minFilter = THREE.LinearFilter
    return t
  }, [])
  const aspect = useRef(8)

  useEffect(() => {
    let alive = true
    const font = '800 180px "Archivo Variable", Archivo, sans-serif'
    document.fonts.load(font).finally(() => {
      if (!alive) return
      const c = tex.image as HTMLCanvasElement
      const ctx = c.getContext('2d')!
      const style = (x: CanvasRenderingContext2D) => {
        x.font = font
        x.fontStretch = 'expanded'
      }
      style(ctx)
      c.width = Math.ceil(ctx.measureText(WORDS).width)
      c.height = 240
      style(ctx) // resizing the canvas resets its state
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.strokeText(WORDS, 0, c.height / 2)
      aspect.current = c.width / c.height
      tex.needsUpdate = true
    })
    return () => {
      alive = false
    }
  }, [tex])

  return { tex, aspect }
}

export default function Backdrop() {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)
  const words = useWordsTexture()
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uCell: { value: 0.42 },
      uRadius: { value: RADIUS },
      uCenter: { value: CENTER },
      uTint: { value: tint },
      uTint2: { value: tint2 },
      uWords: { value: words.tex },
      uWordsAspect: { value: 8 },
      uAmbient: { value: BLACK },
      uAmbientAmt: { value: 0 },
      uMotion: { value: still ? 0 : 1 },
      uPatternA: { value: 0 },
      uPatternB: { value: 1 },
      uPatternMix: { value: 0 },
    }),
    [words.tex],
  )

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    updatePalette(t)
    tint.toArray(hud.tint)
    if (mat.current) {
      const u = mat.current.uniforms
      u.uTime.value = t
      u.uScroll.value = input.scroll * 3
      u.uWordsAspect.value = words.aspect.current
      u.uAmbient.value = ambient.tex ?? BLACK
      u.uAmbientAmt.value = ambient.tex ? ambient.amount : 0
      // wall pattern cycle: hold each for PATTERN_HOLD s, crossfade over PATTERN_FADE s.
      // /?wall=N pins one (debug); reduced motion stays on the calm topographic lines.
      const pinned = PINNED ?? (still ? 2 : null)
      if (pinned !== null) {
        u.uPatternA.value = pinned
        u.uPatternMix.value = 0
      } else {
        const cycle = PATTERN_HOLD + PATTERN_FADE
        const i = Math.floor(t / cycle)
        const f = t - i * cycle
        u.uPatternA.value = i % PATTERNS
        u.uPatternB.value = (i + 1) % PATTERNS
        u.uPatternMix.value = THREE.MathUtils.smoothstep(f, PATTERN_HOLD, cycle)
      }
    }
    // tiny parallax: the tunnel turns a touch with the pointer
    if (mesh.current) mesh.current.rotation.y += (input.pointer.x * 0.05 - mesh.current.rotation.y) * (1 - Math.exp(-dt * 3))
  })

  return (
    <mesh ref={mesh} position={CENTER}>
      <sphereGeometry args={[RADIUS, 160, 96]} />
      <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} side={THREE.BackSide} />
    </mesh>
  )
}
