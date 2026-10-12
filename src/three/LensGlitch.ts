import { Effect, EffectAttribute } from 'postprocessing'
import { Color, DataTexture, Uniform, Vector2, type WebGLRenderer, type WebGLRenderTarget } from 'three'
import { fx, rippleField } from './fx'
import { input } from './input'

const NO_RIPPLE = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
NO_RIPPLE.needsUpdate = true
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
        ['uRipple', new Uniform(NO_RIPPLE)],
        ['uRippleTexel', new Uniform(new Vector2(1 / 512, 1 / 512))],
        ['uRippleStrength', new Uniform(0.028)],
        ['uAccent', new Uniform(new Color(accent))],
      ]),
    })
    this.force = force
  }

  update(_renderer: WebGLRenderer, _input: WebGLRenderTarget, dt?: number) {
    this.uniforms.get('uTime')!.value += dt ?? 0.016
    this.uniforms.get('uAmount')!.value = this.force ?? fx.glitch
    this.uniforms.get('uRipple')!.value = (rippleField.active && rippleField.texture) || NO_RIPPLE
    this.uniforms.get('uRippleTexel')!.value.copy(rippleField.texel)
    // wobble fades out over the first screen of scrolling
    this.uniforms.get('uWave')!.value = this.still ? 0 : Math.max(0, 1 - input.scroll * 1.5)
  }
}
