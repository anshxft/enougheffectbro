import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Text, useFBO } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { fx, hud, SCENE_COVERED } from './fx'
import { createMobiusGeometry } from './mobius'
import { LensGlitchEffect } from './LensGlitch'
import { tint } from './palette'
import Backdrop from './Backdrop'
import Story from './Story'
import Works from './Works'
import { input, listenInput, storyProgress } from './input'
import glassVert from './shaders/glass.vert'
import glassFrag from './shaders/glass.frag'

const Perf = lazy(() => import('r3f-perf').then((m) => ({ default: m.Perf })))

const ACCENT = '#2b3bff'
const FONT = '/fonts/archivo-expanded-800.ttf'
const TEXT_GLOW = new THREE.Color(0.97, 0.97, 1.0)
// Debug flags: /?fx=0 no post-processing, /?perf=1 FPS panel, /?dpr=1 force pixel ratio, /?glitch=0.8 pin glitch strength.
const flags = new URLSearchParams(window.location.search)
const isMobile = () => window.matchMedia('(max-width: 768px)').matches
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Prism({ low }: { low: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)
  const geo = useMemo(() => createMobiusGeometry(), [])
  const { viewport, size } = useThree()
  const mobile = useMemo(() => isMobile(), [])
  const still = useMemo(() => reducedMotion(), [])
  const scale = Math.min(viewport.width * (mobile ? 0.75 : 0.52), viewport.height * 0.9, 5.2)
  const pop = useRef(0)
  const frame = useRef(0)
  // The glass re-renders the scene behind it every frame, so it only runs in the hero and the contact finale.
  const [onStage, setOnStage] = useState(true)
  // what the glass refracts: the scene without the prism, at reduced resolution
  const fboScale = low ? 0.25 : 0.35
  const behind = useFBO(Math.round(size.width * fboScale), Math.round(size.height * fboScale), { samples: 0 })
  const uniforms = useMemo(
    () => ({
      uScene: { value: null as THREE.Texture | null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uRefract: { value: 0.035 },
      uBump: { value: 0.12 },
      uTint: { value: tint },
    }),
    [],
  )

  useFrame((state, dt) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime
    const sp = storyProgress() // 0 hero top .. 1 end of the interlude
    // finale: 0 while #contact is below the fold, 1 once its top reaches the top of the viewport
    const contact = document.getElementById('contact')
    const cp = contact ? Math.min(1, Math.max(0, (window.innerHeight - contact.getBoundingClientRect().top) / window.innerHeight)) : 0
    // stays through the works (screens swing in front of it) and leaves as About comes up
    const about = document.getElementById('about')
    const ap = about ? Math.min(1, Math.max(0, (window.innerHeight - about.getBoundingClientRect().top) / window.innerHeight)) : 0
    const active = ap < 0.999 || cp > 0.01
    if (active !== onStage) setOnStage(active)
    const k = 1 - Math.exp(-dt * 4) // frame-rate independent smoothing
    // intro: grow from 55% with a little overshoot while spinning into place
    pop.current += (fx.intro - pop.current) * (1 - Math.exp(-dt * 6))
    const p = pop.current
    m.scale.setScalar(scale * (0.55 + 0.45 * p + Math.sin(p * Math.PI) * 0.12) * (cp > 0 ? (mobile ? 0.5 : 0.43) : 1))
    // idle sway, plus one full turn across the interlude while the words sweep past behind it
    const turn = THREE.MathUtils.smoothstep(sp, 0.04, 0.9) * Math.PI * 2
    const targetY = (still ? 0 : Math.sin(t * 0.35) * 0.55) + turn + input.pointer.x * 0.35 + (1 - p) * Math.PI * 2
    // resting tilt so the loop reads in 3D (you see its depth and the twist), not as a flat ring
    const targetX = 0.42 - input.pointer.y * 0.3 + Math.sin(t * 0.4) * (still ? 0 : 0.08) + Math.sin(turn / 2) * 0.25
    m.rotation.y += (targetY - m.rotation.y) * k
    m.rotation.x += (targetX - m.rotation.x) * k
    m.quaternion.toArray(hud.q)
    hud.yaw = m.rotation.y
    if (cp > 0) {
      // rise from below into the contact section, off to the side of the email on desktop
      const e = 1 - (1 - cp) ** 3
      // up beside the email / buttons, clear of the pressure wordmark below
      m.position.set(mobile ? 0 : viewport.width * 0.35, -viewport.height * 0.9 * (1 - e) + viewport.height * (mobile ? 0.28 : 0.2), 0)
    } else {
      // centre stage through the interlude; steps back as the first project swings in so the
      // screens pass in front of it; lifts away as About arrives
      const back = THREE.MathUtils.smoothstep(sp, 0.86, 1)
      const exit = THREE.MathUtils.smoothstep(ap, 0.1, 0.9)
      m.position.x += (0 - m.position.x) * k
      m.position.y += (exit * viewport.height * 0.9 - m.position.y) * k
      m.position.z += (-back * 2.5 - exit * 2 - m.position.z) * k
    }

    if (!onStage || !mat.current) return
    // the room behind changes slowly: refresh the refracted copy every other frame
    if ((frame.current = (frame.current + 1) % 2) === 0) {
      m.visible = false
      state.gl.setRenderTarget(behind)
      state.gl.render(state.scene, state.camera)
      state.gl.setRenderTarget(null)
      m.visible = true
    }
    const u = mat.current.uniforms
    u.uScene.value = behind.texture
    state.gl.getDrawingBufferSize(u.uResolution.value)
    u.uTime.value = t
  })

  return (
    <mesh ref={ref} geometry={geo} visible={onStage}>
      <shaderMaterial ref={mat} vertexShader={glassVert} fragmentShader={glassFrag} uniforms={uniforms} />
    </mesh>
  )
}

// Big "ANSH" behind the prism so the glass has something to bend.
function BackText() {
  const ref = useRef<THREE.Group>(null)
  const text = useRef<THREE.Mesh & { fillOpacity: number }>(null)
  const { viewport, camera } = useThree()
  const z = -2.5
  const vp = viewport.getCurrentViewport(camera, [0, 0, z])
  const size = Math.min(vp.width / 3.9, vp.height * 0.42)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const k = 1 - Math.exp(-dt * 5)
    // fades out (and eases back a little) over the first stretch of scrolling
    const out = THREE.MathUtils.smoothstep(storyProgress(), 0.02, 0.14)
    g.position.z += (z - out * 1.5 - g.position.z) * k
    g.visible = out < 1
    // intro: the letters gather in from wide apart and fade up
    const i = fx.intro
    g.scale.set(1 + 0.35 * (1 - i), 1, 1)
    if (text.current) text.current.fillOpacity = i ** 1.5 * (1 - out)
  })

  return (
    <group ref={ref} position={[0, 0, z]}>
      <Text ref={text} fillOpacity={0} font={FONT} fontSize={size} letterSpacing={-0.02} anchorX="center" anchorY="middle">
        ANSH
        {/* brighter than white and not tone-mapped, so the letters cross the bloom threshold and glow */}
        <meshBasicMaterial attach="material" color={TEXT_GLOW} toneMapped={false} />
      </Text>
    </group>
  )
}

// The post-processing composer, so Warmup can reach the materials of its passes.
const composer: { current: { passes: unknown[] } | null } = { current: null }

// every THREE.Material reachable from an object (the composer's passes and their nested passes)
function materialsIn(root: unknown) {
  const out = new Set<THREE.Material>()
  const seen = new Set<unknown>()
  const walk = (v: unknown, depth: number) => {
    if (!v || typeof v !== 'object' || seen.has(v) || depth > 5) return
    seen.add(v)
    if (v instanceof THREE.Material) return void out.add(v)
    if (v instanceof THREE.Object3D || v instanceof THREE.Texture || ArrayBuffer.isView(v)) return
    for (const k of Object.keys(v)) walk((v as Record<string, unknown>)[k], depth + 1)
  }
  walk(root, 0)
  return [...out]
}

// Compiles every shader before the first frame is drawn, in parallel on the GPU driver where supported
// (KHR_parallel_shader_compile), so the main thread and the loader's animation keep running. That covers
// hidden objects (works ring, story), which would otherwise stall the page the first time they appear,
// and the post-processing passes. Each is compiled for the screen and for a render target, since the
// composer draws the scene into one and three keys programs by output colour space. Rendering starts
// once it's done.
function Warmup({ onDone }: { onDone: () => void }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let alive = true
    const hidden: THREE.Object3D[] = []
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o)
        o.visible = true
      }
    })
    const passes = new THREE.Scene()
    const quad = new THREE.PlaneGeometry(1, 1)
    for (const m of materialsIn(composer.current?.passes)) passes.add(new THREE.Mesh(quad, m))
    const target = new THREE.WebGLRenderTarget(4, 4)
    const prev = gl.getRenderTarget()
    const jobs: Promise<unknown>[] = []
    for (const t of [null, target]) {
      gl.setRenderTarget(t)
      jobs.push(gl.compileAsync(scene, camera), gl.compileAsync(passes, camera))
    }
    gl.setRenderTarget(prev)
    for (const o of hidden) o.visible = false // compileAsync has already collected what it needs
    Promise.all(jobs)
      .catch(() => {})
      .then(() => {
        target.dispose()
        quad.dispose()
        if (alive) onDone()
      })
    return () => {
      alive = false
    }
  }, [gl, scene, camera, onDone])
  return null
}

// Fires once the scene has actually drawn a few frames, i.e. the first-frame hitch is over.
function ReadySignal({ onReady, frames = 12 }: { onReady?: () => void; frames?: number }) {
  const n = useRef(0)
  useFrame(() => {
    if (++n.current === frames) onReady?.()
  })
  return null
}


// Which effects to run: /?fx=bcnv (bloom, chromatic aberration + glitch, noise, vignette), /?fx=0 for none.
const fxFlags = flags.get('fx') ?? 'bcnv'

// 8-bit buffers on purpose: half-float targets cost ~35% FPS on integrated GPUs (measured with scripts/fps.mjs).
function Effects() {
  const lens = useMemo(() => new LensGlitchEffect(ACCENT, flags.has('glitch') ? Number(flags.get('glitch')) : undefined), [])
  return (
    <EffectComposer ref={composer as never} multisampling={0} frameBufferType={THREE.UnsignedByteType}>
      <>{fxFlags.includes('b') && <Bloom mipmapBlur levels={5} resolutionScale={0.5} intensity={0.55} radius={0.6} luminanceThreshold={0.8} luminanceSmoothing={0.15} />}</>
      <>{fxFlags.includes('c') && <primitive object={lens} />}</>
      <>{fxFlags.includes('n') && <Noise premultiply opacity={0.15} blendFunction={BlendFunction.ADD} />}</>
      <>{fxFlags.includes('v') && <Vignette darkness={0.65} offset={0.3} />}</>
    </EffectComposer>
  )
}

export default function Scene({ onReady }: { onReady?: () => void }) {
  useEffect(listenInput, [])
  // Quality tier: phones start low; PerformanceMonitor drops to low when FPS sags and climbs back when it recovers.
  const mobile = useMemo(() => isMobile(), [])
  const maxDpr = Number(flags.get('dpr')) || Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5)
  const [low, setLow] = useState(mobile)
  const [dpr, setDpr] = useState(maxDpr)
  const [warm, setWarm] = useState(false)
  // nothing to draw while an opaque section covers the screen
  const [covered, setCovered] = useState(false)
  useEffect(() => {
    const on = (e: Event) => setCovered((e as CustomEvent<boolean>).detail)
    window.addEventListener(SCENE_COVERED, on)
    return () => window.removeEventListener(SCENE_COVERED, on)
  }, [])
  const warmed = useCallback(() => setWarm(true), [])

  return (
    <div className="pointer-events-none fixed top-0 left-0 z-0 h-lvh w-full" aria-hidden>
      <Canvas
        dpr={dpr}
        frameloop={warm && !covered ? 'always' : 'never'}
        gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [0, 0, 8], fov: 35 }}
        onCreated={(state) => {
          if (import.meta.env.DEV) Object.assign(window, { __r3f: state }) // inspect from devtools / scripts/shot.mjs
        }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => {
            setLow(true)
            setDpr(1)
          }}
          onIncline={() => {
            setLow(mobile)
            setDpr(maxDpr)
          }}
          onFallback={() => {
            setLow(true)
            setDpr(1)
          }}
        />
        <color attach="background" args={['#050505']} />
        <Backdrop />
        <BackText />
        <Story />
        <Prism low={low} />
        <Suspense fallback={null}>
          <Works />
        </Suspense>
        <Warmup onDone={warmed} />
        <ReadySignal onReady={onReady} />
        {fxFlags !== '0' && (
          <Effects />
        )}
        {flags.get('perf') === '1' && (
          <Suspense fallback={null}>
            <Perf position="bottom-left" />
          </Suspense>
        )}
      </Canvas>
    </div>
  )
}
