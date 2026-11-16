// All site audio is synthesised with Web Audio: no files to load, nothing to license.
// Off by default; the visitor's choice is remembered in localStorage (best effort).
const KEY = 'ansh-sound'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let droneStarted = false
let on = false
const listeners = new Set<(on: boolean) => void>()

export const soundChoice = (): 'on' | 'off' | null => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'on' || v === 'off' ? v : null
  } catch {
    return null
  }
}
export const isSoundOn = () => on
export const onSoundChange = (fn: (on: boolean) => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
  }
  return { ctx, master: master! }
}

// Background music: slow ambient chords (Fmaj9, Am7, Dm9, Cmaj7, 8 s each) as soft pads, with
// sparse pentatonic plucks echoing through a feedback delay. Notes are scheduled a chord ahead.
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)
const CHORDS = [
  [41, 53, 57, 60, 64, 67],
  [45, 52, 55, 60, 64],
  [38, 50, 57, 60, 64, 65],
  [36, 52, 55, 59, 64],
]
const PLUCKS = [72, 74, 76, 79, 81, 84]
const BAR = 8

function startDrone() {
  if (droneStarted) return
  droneStarted = true
  const { ctx, master } = audio()
  const bus = ctx.createGain()
  bus.gain.value = 0.5
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1800
  const delay = ctx.createDelay(2)
  delay.delayTime.value = 0.42
  const fb = ctx.createGain()
  fb.gain.value = 0.38
  delay.connect(fb).connect(delay)
  delay.connect(lp)
  lp.connect(bus).connect(master)

  const voice = (freq: number, at: number, len: number, peak: number, type: OscillatorType, echo: boolean) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    o.detune.value = (Math.random() - 0.5) * 8
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(peak, at + (echo ? 0.01 : 2.2))
    g.gain.setTargetAtTime(0, at + (echo ? 0.05 : len - 2), echo ? 0.35 : 1.2)
    o.connect(g).connect(lp)
    if (echo) g.connect(delay)
    o.start(at)
    o.stop(at + len + 4)
  }

  let bar = 0
  let next = ctx.currentTime + 0.1
  const schedule = () => {
    while (next < ctx.currentTime + BAR) {
      const chord = CHORDS[bar % CHORDS.length]
      chord.forEach((n, i) => voice(midi(n), next + i * 0.06, BAR + 1, i === 0 ? 0.05 : 0.026, i === 0 ? 'sine' : 'triangle', false))
      // two or three plucks somewhere in the bar
      for (let k = 0; k < 2 + (bar % 2); k++) {
        const n = PLUCKS[Math.floor(Math.random() * PLUCKS.length)]
        voice(midi(n), next + 1 + Math.random() * (BAR - 2), 1.5, 0.03, 'sine', true)
      }
      bar++
      next += BAR
    }
  }
  schedule()
  // ponytail: never cleared; the music lives as long as the page
  window.setInterval(() => ctx.state === 'running' && schedule(), 2000)
}

export function setSound(next: boolean) {
  try {
    localStorage.setItem(KEY, next ? 'on' : 'off')
  } catch {
    // private mode etc.: the choice just won't persist
  }
  on = next
  listeners.forEach((fn) => fn(on))
  if (next) {
    const { ctx, master } = audio()
    void ctx.resume()
    startDrone()
    master.gain.setTargetAtTime(1, ctx.currentTime, 0.4)
  } else if (ctx && master) {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.12)
    const c = ctx
    setTimeout(() => !on && void c.suspend(), 600)
  }
}

function envelope(peak: number, attack: number, decay: number, at = 0) {
  const { ctx, master } = audio()
  const g = ctx.createGain()
  const t = ctx.currentTime + at
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  g.connect(master)
  return { g, t, end: t + attack + decay + 0.02 }
}

// Short keyboard-ish tick.
export function tick(at = 0) {
  if (!on) return
  const { ctx } = audio()
  const { g, t, end } = envelope(0.05, 0.002, 0.04, at)
  const o = ctx.createOscillator()
  o.type = 'square'
  o.frequency.setValueAtTime(1400 + Math.random() * 900, t)
  o.connect(g)
  o.start(t)
  o.stop(end)
}

// A burst of ticks, e.g. while text decodes.
export function typing(count = 8, gap = 0.045) {
  for (let i = 0; i < count; i++) tick(i * gap * (0.7 + Math.random() * 0.6))
}

// Soft hover blip.
export function blip() {
  if (!on) return
  const { ctx } = audio()
  const { g, t, end } = envelope(0.03, 0.004, 0.08)
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(880, t)
  o.frequency.exponentialRampToValueAtTime(1320, t + 0.06)
  o.connect(g)
  o.start(t)
  o.stop(end)
}

// Filtered noise sweep for transitions and glitches.
export function whoosh(duration = 0.6) {
  if (!on) return
  const { ctx } = audio()
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 1.2
  const { g, t } = envelope(0.12, duration * 0.35, duration * 0.65)
  band.frequency.setValueAtTime(280, t)
  band.frequency.exponentialRampToValueAtTime(3200, t + duration)
  src.connect(band).connect(g)
  src.start(t)
}

