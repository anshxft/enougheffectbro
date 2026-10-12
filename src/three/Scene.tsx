import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Text, useFBO } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { fx } from './fx'
import { GLYPH_A } from './glyph-a'
import { LensGlitchEffect } from './LensGlitch'
import Works from './Works'
import { input, listenInput } from './input'
import glassVert from './shaders/glass.vert'
import glassFrag from './shaders/glass.frag'
import gridVert from './shaders/grid.vert'
import gridFrag from './shaders/grid.frag'

const Perf = lazy(() => import('r3f-perf').then((m) => ({ default: m.Perf })))

const ACCENT = '#2b3bff'
const FONT = '/fonts/archivo-expanded-800.ttf'
// Debug flags: /?fx=0 no post-processing, /?perf=1 FPS panel, /?dpr=1 force pixel ratio, /?glitch=0.8 pin glitch strength.
const flags = new URLSearchParams(window.location.search)
const isMobile = () => window.matchMedia('(max-width: 768px)').matches
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Extruded "A" from the real Archivo glyph, centred, ~1 unit tall.
function useGlyphGeometry() {
  return useMemo(() => {
    const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${GLYPH_A.path}"/></svg>`)
    const shapes = svg.paths.flatMap((p) => p.toShapes())
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 130,
      bevelEnabled: true,
      bevelThickness: 24,
      bevelSize: 14,
      bevelSegments: 6,
      curveSegments: 24,
    })
    geo.center()
    geo.scale(1 / GLYPH_A.unitsPerEm, 1 / GLYPH_A.unitsPerEm, 1 / GLYPH_A.unitsPerEm)
    geo.computeVertexNormals()
    return geo
  }, [])
}

function Prism({ low }: { low: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)
  const geo = useGlyphGeometry()
  const { viewport, size } = useThree()
  const mobile = useMemo(() => isMobile(), [])
  const still = useMemo(() => reducedMotion(), [])
  const scale = Math.min(viewport.width * (mobile ? 0.75 : 0.52), viewport.height * 0.9, 5.2)
  const pop = useRef(0)
  // The glass re-renders the scene behind it every frame, so it only runs in the hero and the contact finale.
  const [onStage, setOnStage] = useState(true)
  // what the glass refracts: the scene without the prism, at reduced resolution
  const fboScale = low ? 0.35 : 0.5
  const behind = useFBO(Math.round(size.width * fboScale), Math.round(size.height * fboScale), { samples: 0 })
  const uniforms = useMemo(
    () => ({
      uScene: { value: null as THREE.Texture | null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uRefract: { value: 0.022 },
    }),
    [],
  )

  useFrame((state, dt) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime
    const s = input.scroll
    // finale: 0 while #contact is below the fold, 1 once its top reaches the top of the viewport
    const contact = document.getElementById('contact')
    const cp = contact ? Math.min(1, Math.max(0, (window.innerHeight - contact.getBoundingClientRect().top) / window.innerHeight)) : 0
    const active = s < 1.4 || cp > 0.01
    if (active !== onStage) setOnStage(active)
    const k = 1 - Math.exp(-dt * 4) // frame-rate independent smoothing
    // intro: grow from 55% with a little overshoot while spinning into place
    pop.current += (fx.intro - pop.current) * (1 - Math.exp(-dt * 6))
    const p = pop.current
    m.scale.setScalar(scale * (0.55 + 0.45 * p + Math.sin(p * Math.PI) * 0.12) * (cp > 0 ? (mobile ? 0.5 : 0.43) : 1))
    // sway instead of a full spin: a big A seen edge-on reads as a solid slab
    const targetY = (still ? 0 : Math.sin(t * 0.35) * 0.55) + s * Math.PI * 0.6 + input.pointer.x * 0.35 + (1 - p) * Math.PI * 2
    const targetX = -input.pointer.y * 0.3 + Math.sin(t * 0.4) * (still ? 0 : 0.08)
    m.rotation.y += (targetY - m.rotation.y) * k
    m.rotation.x += (targetX - m.rotation.x) * k
    if (cp > 0) {
      // rise from below into the contact section, off to the side of the email on desktop
      const e = 1 - (1 - cp) ** 3
      m.position.set(mobile ? 0 : viewport.width * 0.33, -viewport.height * 0.9 * (1 - e) + (mobile ? viewport.height * 0.2 : 0.15), 0)
    } else {
      // drift up and recede as the hero scrolls away
      m.position.x += (0 - m.position.x) * k
      m.position.y += (s * viewport.height * 0.35 - m.position.y) * k
      m.position.z += (-s * 2 - m.position.z) * k
    }

    if (!onStage || !mat.current) return
    m.visible = false
    state.gl.setRenderTarget(behind)
    state.gl.render(state.scene, state.camera)
    state.gl.setRenderTarget(null)
    m.visible = true
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
    g.position.y += (input.scroll * vp.height * 0.6 - g.position.y) * k
    // flicker in while the intro runs: random full/dim frames, weighted by progress
    if (text.current) text.current.fillOpacity = fx.intro >= 1 ? 1 : Math.random() < fx.intro ? 1 : fx.intro * 0.2
  })

  return (
    <group ref={ref} position={[0, 0, z]}>
      <Text ref={text} fillOpacity={0} font={FONT} fontSize={size} letterSpacing={-0.02} anchorX="center" anchorY="middle" color="#e4e4e4">
        ANSH
      </Text>
    </group>
  )
}

// Fires once the scene has actually drawn a few frames, i.e. shaders are compiled and the first-frame hitch is over.
function ReadySignal({ onReady, frames = 12 }: { onReady?: () => void; frames?: number }) {
  const n = useRef(0)
  useFrame(() => {
    if (++n.current === frames) onReady?.()
  })
  return null
}

function Grid() {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uCell: { value: 0.9 },
      uBase: { value: new THREE.Color('#050505') },
      uLine: { value: new THREE.Color('#202020') },
      uAccent: { value: new THREE.Color(ACCENT) },
    }),
    [],
  )
  useFrame((state) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = state.clock.elapsedTime
    mat.current.uniforms.uScroll.value = input.scroll * 3
  })
  return (
    <mesh position={[0, 0, -6]}>
      <planeGeometry args={[80, 80]} />
      <shaderMaterial ref={mat} vertexShader={gridVert} fragmentShader={gridFrag} uniforms={uniforms} />
    </mesh>
  )
}

// Which effects to run: /?fx=bcnv (bloom, chromatic aberration + glitch, noise, vignette), /?fx=0 for none.
const fxFlags = flags.get('fx') ?? 'bcnv'

// 8-bit buffers on purpose: half-float targets cost ~35% FPS on integrated GPUs (measured with scripts/fps.mjs).
function Effects() {
  const lens = useMemo(() => new LensGlitchEffect(ACCENT, flags.has('glitch') ? Number(flags.get('glitch')) : undefined), [])
  return (
    <EffectComposer multisampling={0} frameBufferType={THREE.UnsignedByteType}>
      <>{fxFlags.includes('b') && <Bloom mipmapBlur levels={5} resolutionScale={0.5} intensity={0.5} radius={0.6} luminanceThreshold={0.92} luminanceSmoothing={0.05} />}</>
      <>{fxFlags.includes('c') && <primitive object={lens} />}</>
      <>{fxFlags.includes('n') && <Noise premultiply opacity={0.35} blendFunction={BlendFunction.ADD} />}</>
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

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={dpr}
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
        <Grid />
        <BackText />
        <Prism low={low} />
        <Suspense fallback={null}>
          <Works />
        </Suspense>
        <ReadySignal onReady={onReady} />
        {fxFlags !== '0' && <Effects />}
        {flags.get('perf') === '1' && (
          <Suspense fallback={null}>
            <Perf position="bottom-left" />
          </Suspense>
        )}
      </Canvas>
    </div>
  )
}
