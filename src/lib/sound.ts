// All site audio is synthesised with Web Audio: no files to load, nothing to license.
// Off by default; the visitor's choice is remembered in localStorage (best effort).
const KEY = 'ansh-sound'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let droneStarted = false
let droneBed: GainNode | null = null
let droneDucked = false
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

// Low ambient bed: three detuned voices through a lowpass whose cutoff slowly breathes.
function startDrone() {
  if (droneStarted) return
  droneStarted = true
  const { ctx, master } = audio()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 420
  filter.Q.value = 4
  const lfo = ctx.createOscillator()
  const lfoDepth = ctx.createGain()
  lfo.frequency.value = 0.06
  lfoDepth.gain.value = 220
  lfo.connect(lfoDepth).connect(filter.frequency)
  const bed = ctx.createGain()
  bed.gain.value = droneDucked ? 0 : 0.045
  droneBed = bed
  for (const [type, freq] of [['sawtooth', 55], ['sine', 82.4], ['triangle', 110.6]] as const) {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    o.connect(filter)
    o.start()
  }
  filter.connect(bed).connect(master)
  lfo.start()
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

// Mute the studio drone while somewhere quieter (the elsewhere page) and bring it back after.
function duckDrone(duck: boolean) {
  droneDucked = duck
  if (ctx && droneBed) droneBed.gain.setTargetAtTime(duck ? 0 : 0.045, ctx.currentTime, 0.6)
}

function noiseBuffer(seconds: number) {
  const { ctx } = audio()
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function chirp(at: number, from: number, to: number, peak: number) {
  const { ctx } = audio()
  const { g, t, end } = envelope(peak, 0.01, 0.07, at)
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(from, t)
  o.frequency.exponentialRampToValueAtTime(to, t + 0.06)
  o.connect(g)
  o.start(t)
  o.stop(end)
}

// Outdoor ambience for the elsewhere page: wind that breathes, birds by day, crickets at night.
// setTime(0..1) runs dawn to night. The graph is built only once sound is on.
export function nature() {
  let time = 0
  let wind: { src: AudioBufferSourceNode; gain: GainNode } | null = null
  let timer = 0

  const build = () => {
    if (wind || !on) return
    const { ctx, master } = audio()
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(3)
    src.loop = true
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 380
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.setTargetAtTime(0.09, ctx.currentTime, 1.5)
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = 0.08
    depth.gain.value = 0.05
    lfo.connect(depth).connect(gain.gain)
    src.connect(low).connect(gain).connect(master)
    src.start()
    lfo.start()
    wind = { src, gain }
  }

  const loop = () => {
    if (on) {
      const day = Math.max(0, 1 - Math.abs(time - 0.35) / 0.4)
      const night = Math.min(1, Math.max(0, (time - 0.72) / 0.2))
      if (day > 0.05 && Math.random() < 0.6) {
        const base = 2400 + Math.random() * 1600
        const n = 2 + Math.floor(Math.random() * 3)
        for (let i = 0; i < n; i++) chirp(i * 0.11, base, base * (1.2 + Math.random() * 0.4), 0.025 * day)
      }
      if (night > 0.05) for (let i = 0; i < 3; i++) chirp(i * 0.05, 4600, 4500, 0.012 * night)
    }
    timer = window.setTimeout(loop, 700 + Math.random() * 1800)
  }

  duckDrone(true)
  build()
  const off = onSoundChange(build)
  loop()

  return {
    setTime: (t: number) => {
      time = t
    },
    stop: () => {
      off()
      window.clearTimeout(timer)
      duckDrone(false)
      if (wind && ctx) {
        const w = wind
        w.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
        setTimeout(() => w.src.stop(), 1500)
      }
    },
  }
}

// A soft footstep on a dirt path: a short burst of low noise.
export function step() {
  if (!on) return
  const { ctx } = audio()
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(0.12)
  const low = ctx.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 700 + Math.random() * 300
  const { g, t } = envelope(0.07, 0.005, 0.09)
  src.connect(low).connect(g)
  src.start(t)
}
