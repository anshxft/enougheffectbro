import { Effect, EffectAttribute } from 'postprocessing'
import { Color, Uniform, type WebGLRenderer, type WebGLRenderTarget } from 'three'
import { fx } from './fx'
import { input } from './input'
import fragment from './shaders/lens-glitch.frag'

// Replaces postprocessing's ChromaticAberration: one convolution effect doing lens CA + the glitch.
export class LensGlitchEffect extends Effect {
  // `force` pins the glitch strength (debug flag /?glitch=0.8) instead of following fx.glitch.
  private force?: number
  private still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  constructor(accent: string, force?: number, ca = 0.0016) {
    super('LensGlitchEffect', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uAmount', new Uniform(0)],
        ['uTime', new Uniform(0)],
        ['uCA', new Uniform(ca)],
        ['uWave', new Uniform(1)],
        ['uAccent', new Uniform(new Color(accent))],
      ]),
    })
    this.force = force
  }

  update(_renderer: WebGLRenderer, _input: WebGLRenderTarget, dt?: number) {
    this.uniforms.get('uTime')!.value += dt ?? 0.016
    this.uniforms.get('uAmount')!.value = this.force ?? fx.glitch
    // wobble fades out over the first screen of scrolling
    this.uniforms.get('uWave')!.value = this.still ? 0 : Math.max(0, 1 - input.scroll * 1.5)
  }
}
