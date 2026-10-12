import { LiquidMetal } from '@paper-design/shaders-react'
import { GLYPH_A } from '../three/glyph-a'

// The site's "A" (same Archivo glyph as the 3D prism) as a small liquid-chrome mark for the footer.
// Paper Shaders' LiquidMetal takes an image mask; the glyph path is flipped from font units (y up).
const H = 688
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GLYPH_A.advance} ${H}"><path transform="translate(0 ${H}) scale(1 -1)" d="${GLYPH_A.path}"/></svg>`
const MASK = `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`

export default function LiquidLogo() {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <LiquidMetal
      image={MASK}
      colorBack="#00000000"
      colorTint="#ffffff"
      repetition={4}
      softness={0.35}
      shiftRed={0.3}
      shiftBlue={0.3}
      distortion={0.1}
      contour={0.45}
      angle={70}
      speed={still ? 0 : 0.8}
      scale={0.7}
      style={{ width: 72, height: 56 }}
    />
  )
}
