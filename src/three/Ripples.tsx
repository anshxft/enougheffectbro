import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rippleField } from './fx'

// Ripple distortion, ported from React Bits' RippleDistortion (ogl, single image) into this scene:
// the pointer leaves soft ring-shaped "waves" that grow and fade; they are drawn additively into a
// low-res displacement field, and LensGlitch bends the whole frame by it (plus a small glint on the
// slopes). Hover leaves a trail, a click/tap drops a bigger wave. Off with reduced motion.

const MAX_WAVES = 100
const START_SCALE = 1.5
const LIFE = Math.log(500)
const BRUSH = 150 // px
const SPREAD = 5
const FADE = 2.6 // s
const SPACING = 15 // px between trail waves
const CLICK = 1.6
const FIELD_SCALE = 0.4
const tmpColor = new THREE.Color()

const vertex = /* glsl */ `
precision highp float;
attribute vec2 position;
attribute vec2 uv;
attribute vec2 iOffset;
attribute vec2 iScale;
attribute float iOpacity;
varying vec2 vUv;
varying float vOpacity;
void main() {
  vUv = uv;
  vOpacity = iOpacity;
  gl_Position = vec4(iOffset + position * iScale, 0.0, 1.0);
}
`
const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying float vOpacity;
uniform float uRings;
const float PI = 3.141592653589793;
const float EDGE = 0.006737947;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float brush = (exp(-r * 5.0) - EDGE) / (1.0 - EDGE);
  brush *= 0.55 + 0.45 * cos(sqrt(r) * PI * 2.0 * uRings);
  gl_FragColor = vec4(vec3(brush * vOpacity * vOpacity), 1.0);
}
`

type Wave = { x: number; y: number; scale: number; target: number; opacity: number }

function createField() {
  const target = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false, type: THREE.HalfFloatType })
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), 2))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), 2))
  const offsets = new THREE.InstancedBufferAttribute(new Float32Array(MAX_WAVES * 2), 2)
  const scales = new THREE.InstancedBufferAttribute(new Float32Array(MAX_WAVES * 2), 2)
  const opacities = new THREE.InstancedBufferAttribute(new Float32Array(MAX_WAVES), 1)
  geometry.setAttribute('iOffset', offsets)
  geometry.setAttribute('iScale', scales)
  geometry.setAttribute('iOpacity', opacities)
  geometry.instanceCount = MAX_WAVES
  // positions are 2D clip-space quads: give three a bounding sphere instead of letting it compute NaN
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity)
  const material = new THREE.RawShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uRings: { value: 4 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  const scene = new THREE.Scene()
  scene.add(mesh)
  const waves: Wave[] = Array.from({ length: MAX_WAVES }, () => ({ x: 0, y: 0, scale: START_SCALE, target: START_SCALE, opacity: 0 }))
  return {
    target, scene, camera: new THREE.Camera(), offsets, scales, opacities, waves, current: 0,
    dispose() {
      geometry.dispose()
      material.dispose()
      target.dispose()
    },
  }
}

export default function Ripples() {
  const { size } = useThree()
  const ref = useRef<ReturnType<typeof createField> | null>(null)

  useEffect(() => {
    const f = createField()
    ref.current = f
    rippleField.texture = f.target.texture
    return () => {
      f.dispose()
      ref.current = null
      rippleField.texture = null
    }
  }, [])

  useEffect(() => {
    const f = ref.current
    if (!f) return
    const w = Math.max(2, Math.round(size.width * FIELD_SCALE))
    const h = Math.max(2, Math.round(size.height * FIELD_SCALE))
    f.target.setSize(w, h)
    rippleField.texel.set(1 / w, 1 / h)
  }, [size])

  // pointer -> waves (window listeners: the canvas itself ignores pointer events)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let px = -1e4
    let py = -1e4
    const add = (x: number, y: number, power: number) => {
      const f = ref.current
      if (!f) return
      const w = f.waves[f.current]
      f.current = (f.current + 1) % MAX_WAVES
      w.x = x
      w.y = window.innerHeight - y // GL y is up
      w.scale = START_SCALE * power
      w.target = START_SCALE * SPREAD * power
      w.opacity = 1
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return // touch: taps only, no trail while scrolling
      if (Math.abs(e.clientX - px) > SPACING || Math.abs(e.clientY - py) > SPACING) {
        add(e.clientX, e.clientY, 1)
        px = e.clientX
        py = e.clientY
      }
    }
    const down = (e: PointerEvent) => add(e.clientX, e.clientY, CLICK)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
    }
  }, [])

  useFrame((state, delta) => {
    const f = ref.current
    if (!f) return
    const dt = Math.min(0.05, delta)
    const growth = 1 - Math.exp(-dt * 1.09)
    const decay = Math.exp((-dt * LIFE) / FADE)
    const w = window.innerWidth
    const h = window.innerHeight
    let alive = false
    for (let i = 0; i < MAX_WAVES; i++) {
      const wave = f.waves[i]
      if (wave.opacity > 0) {
        wave.opacity *= decay
        wave.scale += (wave.target - wave.scale) * growth
        if (wave.opacity < 0.002) wave.opacity = 0
      }
      const o = wave.opacity
      f.opacities.array[i] = o
      if (o === 0) continue
      alive = true
      const half = (wave.scale * BRUSH) / 2
      f.offsets.array[i * 2] = (wave.x / w) * 2 - 1
      f.offsets.array[i * 2 + 1] = (wave.y / h) * 2 - 1
      f.scales.array[i * 2] = (half / w) * 2
      f.scales.array[i * 2 + 1] = (half / h) * 2
    }
    f.offsets.needsUpdate = true
    f.scales.needsUpdate = true
    f.opacities.needsUpdate = true
    rippleField.active = alive

    const gl = state.gl
    const prev = gl.getRenderTarget()
    const clear = gl.getClearColor(tmpColor)
    const alpha = gl.getClearAlpha()
    gl.setRenderTarget(f.target)
    gl.setClearColor(0x000000, 1)
    gl.clear(true, false, false)
    if (alive) gl.render(f.scene, f.camera)
    gl.setRenderTarget(prev)
    gl.setClearColor(clear, alpha)
  })

  return null
}
