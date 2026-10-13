import gsap from 'gsap'
import { whoosh } from '../lib/sound'

// Animated values the WebGL scene reads every frame; GSAP tweens them from the DOM side.
export const fx = {
  glitch: 0, // 0..1 strength of the block/tear/blue glitch post effect
  intro: 0, // 0..1 hero reveal (letters gather in, prism spins into place)
  reveal: 0, // 0..1 iris opening from the centre of the screen
}

// Live numbers for the hero HUD, written by the scene each frame. Plain numbers so the DOM side
// doesn't need to import three.js.
export const hud = {
  q: [0, 0, 0, 1], // prism rotation quaternion
  yaw: 0, // prism rotation around Y, radians
  tint: [0, 0, 0], // room colour, 0..1 (linear)
}

let played = false
export const introPlayed = () => played

// Hero reveal after the loader: an iris of light opens from the centre while the letters gather in
// and the A spins into place. Coming back to Home in the same session skips straight to the end.
export function playIntro(instant = false) {
  const tl = gsap.timeline()
  if (played) return tl // already running or finished (fx keeps its end state)
  if (instant) {
    played = true
    tl.set(fx, { intro: 1, reveal: 1, glitch: 0 })
    return tl
  }
  played = true
  whoosh(1.4)
  tl.set(fx, { intro: 0, reveal: 0, glitch: 0 })
    .to(fx, { reveal: 1, duration: 1.8, ease: 'power3.inOut' }, 0)
    .to(fx, { intro: 1, duration: 2.0, ease: 'power3.out' }, 0.35)
  return tl
}
