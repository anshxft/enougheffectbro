import { ShaderMount } from '@paper-design/shaders-react'
import { getShaderColorFromString, LiquidMetalShapes, liquidMetalFragmentShader, ShaderFitOptions } from '@paper-design/shaders'

// The site's "A" (same Archivo glyph as the 3D prism) as a small liquid-chrome mark for the footer.
// Paper Shaders' LiquidMetal normally turns its mask into a height map on the main thread (a Poisson
// solve, ~0.5–1s). That map never changes, so it's precomputed once (public/alter/liquid-a.png, from
// toProcessedLiquidMetal on a 256px render of the glyph) and fed straight to the shader.
const MAP = '/alter/liquid-a.png'

export default function LiquidLogo() {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <ShaderMount
      fragmentShader={liquidMetalFragmentShader}
      mipmaps={['u_image']}
      speed={still ? 0 : 0.8}
      style={{ width: 72, height: 56 }}
      uniforms={{
        u_colorBack: getShaderColorFromString('#00000000'),
        u_colorTint: getShaderColorFromString('#ffffff'),
        u_image: MAP,
        u_contour: 0.45,
        u_distortion: 0.1,
        u_softness: 0.35,
        u_repetition: 4,
        u_shiftRed: 0.3,
        u_shiftBlue: 0.3,
        u_angle: 70,
        u_isImage: true,
        u_shape: LiquidMetalShapes.diamond,
        u_fit: ShaderFitOptions.contain,
        u_scale: 0.7,
        u_rotation: 0,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 0,
        u_worldHeight: 0,
      }}
    />
  )
}
