import { Effect, EffectAttribute } from 'postprocessing'
import { Color, Uniform, Vector2, type WebGLRenderer, type WebGLRenderTarget } from 'three'
import { fx } from './fx'
import { input } from './input'

import fragment from './shaders/lens-glitch.frag'

// Replaces postprocessing's ChromaticAberration: one convolution effect doing lens CA, the glitch,
// the intro iris and the glass lens that follows the cursor.
export class LensGlitchEffect extends Effect {
  // `force` pins the glitch strength (debug flag /?glitch=0.8) instead of following fx.glitch.
  private force?: number
  private still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private fine = window.matchMedia('(pointer: fine)').matches
  // cursor lens: eased position (uv, y up) and strength (grows while the pointer moves, settles when idle)
  private lens = new Vector2(0.5, 0.5)
  private lensAmt = 0
  private last = new Vector2(0.5, 0.5)

  constructor(accent: string, force?: number, ca = 0.0016) {
    super('LensGlitchEffect', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uAmount', new Uniform(0)],
        ['uTime', new Uniform(0)],
        ['uCA', new Uniform(ca)],
        ['uWave', new Uniform(1)],
        ['uReveal', new Uniform(1)],
        ['uAspect', new Uniform(1)],
        ['uLens', new Uniform(new Vector2(0.5, 0.5))],
        ['uLensAmt', new Uniform(0)],
        ['uAccent', new Uniform(new Color(accent))],
      ]),
    })
    this.force = force
  }

  update(_renderer: WebGLRenderer, input_: WebGLRenderTarget, dt = 0.016) {
    this.uniforms.get('uTime')!.value += dt
    this.uniforms.get('uAmount')!.value = this.force ?? fx.glitch
    this.uniforms.get('uReveal')!.value = fx.reveal
    this.uniforms.get('uAspect')!.value = input_.width / Math.max(1, input_.height)

    // lens follows the pointer with a little lag; it swells while moving and relaxes to a small
    // resting lens when the cursor stops (fine pointers only, off with reduced motion)
    const target = new Vector2((input.pointer.x + 1) / 2, (input.pointer.y + 1) / 2)
    const k = 1 - Math.exp(-dt * 7)
    this.lens.lerp(target, k)
    const speed = target.distanceTo(this.last) / Math.max(dt, 0.001)
    this.last.copy(target)
    const want = this.fine && !this.still ? Math.min(1, 0.45 + speed * 0.5) : 0
    this.lensAmt += (want - this.lensAmt) * (1 - Math.exp(-dt * 3))
    this.uniforms.get('uLens')!.value.copy(this.lens)
    this.uniforms.get('uLensAmt')!.value = this.lensAmt
    // wobble fades out over the first screen of scrolling
    this.uniforms.get('uWave')!.value = this.still ? 0 : Math.max(0, 1 - input.scroll * 1.5)
  }
}
