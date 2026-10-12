import * as THREE from 'three'

// The scene's drifting light colour. Backdrop advances it once per frame; anything that should pick
// up the room's colour (backdrop glow, glass tint) uses these same Color objects as uniform values.
// Monochrome only (no blue): the room drifts between neutral silver and graphite tones.
const PALETTE = ['#bfc0c2', '#98999c', '#d0d0d0', '#86878a'].map((c) => new THREE.Color(c))
const HOLD = 7 // seconds per colour

export const tint = PALETTE[0].clone() // main glow
export const tint2 = PALETTE[1].clone() // the colour coming next, used for the cross-screen gradient

export function updatePalette(t: number) {
  const seg = (t / HOLD) % PALETTE.length
  const i = Math.floor(seg)
  const f = THREE.MathUtils.smoothstep(seg - i, 0.6, 1)
  const a = PALETTE[i]
  const b = PALETTE[(i + 1) % PALETTE.length]
  const c = PALETTE[(i + 2) % PALETTE.length]
  tint.copy(a).lerp(b, f)
  tint2.copy(b).lerp(c, f)
}

// The works screenshot currently on stage. Backdrop washes the dome with a huge blurred copy of it,
// so the room takes on the project's colours (amount 0..1 follows the section's visibility).
export const ambient = {
  tex: null as THREE.Texture | null,
  amount: 0,
  owner: '',
}
