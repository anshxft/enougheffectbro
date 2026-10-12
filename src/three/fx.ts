import gsap from 'gsap'
import { whoosh } from '../lib/sound'

// Animated values the WebGL scene reads every frame; GSAP tweens them from the DOM side.
export const fx = {
  glitch: 0, // 0..1 strength of the block/tear/blue glitch post effect
  intro: 0, // 0..1 hero reveal (text flicker-in, prism pop)
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

// Hero reveal after the loader. Coming back to Home in the same session skips straight to the end state.
export function playIntro(instant = false) {
  const tl = gsap.timeline()
  if (played || instant) {
    played = true
    tl.set(fx, { intro: 1, glitch: 0 })
    return tl
  }
  played = true
  whoosh(1.1)
  tl.set(fx, { intro: 0, glitch: 1 })
    .to(fx, { intro: 1, duration: 1.1, ease: 'steps(9)' }, 0)
    .to(fx, { glitch: 0, duration: 1.4, ease: 'power3.in' }, 0.05)
  return tl
}

// Short glitch hit for transitions.
export function glitchBurst(amount = 0.7, duration = 0.6) {
  whoosh(duration)
  return gsap.fromTo(fx, { glitch: amount }, { glitch: 0, duration, ease: 'power2.in', overwrite: true })
}
