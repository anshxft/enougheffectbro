import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { elsewhere } from '../content'
import { TLink } from '../components/PageTransition'
import { SoundToggle } from '../components/Sound'
import { nature, step } from '../lib/sound'
import { lenis, prefersReducedMotion, useSmoothScroll } from '../lib/smooth-scroll'

gsap.registerPlugin(ScrollTrigger)

// A quiet alpine valley you walk through. The scroll is hidden behind a little hiker: scrolling
// (or holding → / ←) moves the world past him, his legs step in time with the ground so his feet
// never slide, he rides the slope of the path and turns round when you walk back. The day runs
// from golden morning to night over the walk; far layers take the sky's haze. One click goes back.

const TRAVEL = 4 // screen widths the ground moves over the whole walk
const CHAR_X = 0.36 // where the hiker stands, as a fraction of the screen width

type Rgb = [number, number, number]
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
const css = (c: Rgb) => `rgb(${c.map(Math.round).join(' ')})`
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// golden morning, bright afternoon, sunset, night
const TIMES = [0, 0.45, 0.8, 1]
const PALETTE = {
  skyTop: ['#e6d2c4', '#efd9bd', '#e39469', '#141110'].map(hex),
  skyBot: ['#f9eedb', '#fbe8c6', '#f5c98f', '#2b221d'].map(hex),
  sun: ['#fff5e4', '#fff0cc', '#ffd497', '#f3ead8'].map(hex),
  rock: ['#c39488', '#cf9f86', '#b86a50', '#231b18'].map(hex),
  green: ['#58773a', '#667c35', '#55542a', '#0d0e0a'].map(hex),
  dirt: ['#c8a679', '#cfa874', '#b07a4c', '#2a211b'].map(hex),
  ink: ['#2a2420', '#2a2420', '#2a1e14', '#efe6d8'].map(hex),
  hiker: ['#2b2019', '#2b2019', '#22180f', '#0a0807'].map(hex),
}
const at = (keys: Rgb[], t: number) => {
  let i = 0
  while (i < TIMES.length - 2 && t > TIMES[i + 1]) i++
  return mix(keys[i], keys[i + 1], clamp01((t - TIMES[i]) / (TIMES[i + 1] - TIMES[i])))
}
const FLOWERS = ['#f2c84b', '#f6f1e4', '#a993dc', '#f0a35e']

// seeded noise so the valley is the same on every visit
const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647
const smooth = (t: number) => t * t * (3 - 2 * t)

type Layer = {
  depth: number
  base: number
  amp: number
  freq: number
  seed: number
  kind: 'rock' | 'green'
  jagged?: boolean
  pines?: number
  trees?: number
  cabinAt?: number
  ground?: boolean
}
const LAYERS: Layer[] = [
  { depth: 0.06, base: 500, amp: 330, freq: 3, seed: 11, kind: 'rock', jagged: true },
  { depth: 0.16, base: 640, amp: 520, freq: 2.2, seed: 23, kind: 'rock', jagged: true },
  { depth: 0.32, base: 660, amp: 140, freq: 1.3, seed: 41, kind: 'green', pines: 0.32, trees: 0.06 },
  { depth: 0.55, base: 740, amp: 90, freq: 1.8, seed: 59, kind: 'green', trees: 0.2, pines: 0.12, cabinAt: 0.27 },
  { depth: 1, base: 820, amp: 45, freq: 1.2, seed: 83, kind: 'green', ground: true, trees: 0.03, pines: 0.03 },
]

// Shapes are in viewBox units with 1000 units per screen height, so nothing stretches on any aspect.
function buildLayer(l: Layer, aspect: number) {
  const width = 1000 * (1 + TRAVEL * l.depth) * aspect + 200
  const r = rng(l.seed)
  const step = 1000 / l.freq
  const knots = Array.from({ length: Math.ceil(width / step) + 2 }, () => r() ** (l.jagged ? 1.5 : 1))
  const fine = Array.from({ length: Math.ceil(width / (step / 5)) + 2 }, () => r())
  const ease = l.jagged ? (t: number) => t : smooth
  const ridge = (x: number) => {
    const i = Math.max(0, Math.floor(x / step))
    const j = Math.max(0, Math.floor(x / (step / 5)))
    const a = knots[i] + (knots[i + 1] - knots[i]) * ease(x / step - i)
    const b = fine[j] + (fine[j + 1] - fine[j]) * ease(x / (step / 5) - j)
    return l.base - l.amp * (a * (l.jagged ? 0.82 : 0.9) + b * (l.jagged ? 0.18 : 0.1))
  }
  let d = `M0 1000L0 ${ridge(0).toFixed(1)}`
  for (let x = 6; x <= width; x += 6) d += `L${x} ${ridge(x).toFixed(1)}`
  d += `L${width} 1000Z`
  for (let x = 30; x < width; x += 16 + r() * 46) {
    const y = ridge(x) + 4
    const kind = r()
    if (kind < (l.pines ?? 0)) {
      const h = 34 + r() * 40
      const w = h * 0.28
      d += `M${x - w} ${y}L${x} ${y - h}L${x + w} ${y}Z M${x - w * 0.8} ${y - h * 0.38}L${x} ${y - h * 1.12}L${x + w * 0.8} ${y - h * 0.38}Z`
    } else if (kind < (l.pines ?? 0) + (l.trees ?? 0)) {
      // round broadleaf tree: trunk and three overlapping crowns
      const R = 16 + r() * 14
      const cy = y - 12 - R
      d += `M${x - 2} ${y}h4v${-16}h-4Z`
      for (const [ox, oy, k] of [[0, 0, 1], [-R * 0.6, R * 0.25, 0.75], [R * 0.6, R * 0.3, 0.7]]) {
        const rr = R * k
        d += `M${x + ox - rr} ${cy + oy}a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0Z`
      }
    }
  }
  if (l.cabinAt) {
    const x = width * l.cabinAt
    const y = ridge(x) + 6
    d += `M${x - 30} ${y}V${y - 32}H${x - 38}L${x} ${y - 58}L${x + 38} ${y - 32}H${x + 30}V${y}Z`
  }
  // the dirt path the hiker walks on, plus a few stones beside it
  let path = ''
  let stones = ''
  if (l.ground) {
    path = `M0 ${(ridge(0) + 9).toFixed(1)}`
    for (let x = 6; x <= width; x += 6) path += `L${x} ${(ridge(x) + 9).toFixed(1)}`
    for (let x = 80; x < width; x += 120 + r() * 380) {
      const rw = 8 + r() * 16
      const y = ridge(x) + 24 + r() * 30
      stones += `M${x - rw} ${y}a${rw} ${rw * 0.6} 0 1 1 ${rw * 2} 0Z`
    }
  }
  return { d, width, ridge, path, stones }
}

// pose angles (degrees) for one leg/arm given the walk phase a and walk amount w
const thigh = (a: number, w: number) => -26 * Math.sin(a) * w
const knee = (a: number, w: number) => (6 + 48 * Math.max(0, Math.cos(a)) ** 1.5) * w
const arm = (a: number, w: number) => 22 * Math.sin(a) * w
const elbow = (a: number, w: number) => -(12 + 14 * Math.max(0, -Math.sin(a))) * w - 8 * (1 - w)

export default function Elsewhere() {
  useSmoothScroll()
  const main = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLAnchorElement>(null)
  const layers = useMemo(() => LAYERS.map((l) => buildLayer(l, window.innerWidth / window.innerHeight)), [])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    // the scrollbar would give the trick away
    document.documentElement.classList.add('no-scrollbar')
    return () => document.documentElement.classList.remove('no-scrollbar')
  }, [])

  useEffect(() => {
    const el = stage.current!
    const q = <T extends Element>(s: string) => el.querySelector<T>(s)!
    const svgs = Array.from(el.querySelectorAll<SVGSVGElement>('[data-layer]'))
    const sun = q<HTMLElement>('[data-sun]')
    const moon = q<HTMLElement>('[data-moon]')
    const intro = q<HTMLElement>('[data-intro]')
    const hint = q<HTMLElement>('[data-hint]')
    const outro = q<HTMLElement>('[data-outro]')
    const hiker = q<SVGGElement>('[data-hiker]')
    const bob = q<SVGGElement>('[data-bob]')
    const limbs = {
      legF: q<SVGGElement>('[data-leg-f]'),
      shinF: q<SVGGElement>('[data-shin-f]'),
      legB: q<SVGGElement>('[data-leg-b]'),
      shinB: q<SVGGElement>('[data-shin-b]'),
      armF: q<SVGGElement>('[data-arm-f]'),
      foreF: q<SVGGElement>('[data-fore-f]'),
      armB: q<SVGGElement>('[data-arm-b]'),
      foreB: q<SVGGElement>('[data-fore-b]'),
    }
    const canvas = q<HTMLCanvasElement>('canvas')
    const g = canvas.getContext('2d')!
    const still = prefersReducedMotion()
    const sound = nature()
    const ground = layers[layers.length - 1]

    let p = 0
    const st = ScrollTrigger.create({ trigger: main.current, start: 'top top', end: 'bottom bottom', onUpdate: (s) => (p = s.progress) })

    // walking with the keyboard: hold → / ← (or D / A)
    const keys = new Set<string>()
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back.current?.click()
      if (['ArrowRight', 'ArrowLeft', 'd', 'a', 'D', 'A'].includes(e.key)) {
        keys.add(e.key.toLowerCase())
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)

    let W = 0
    let H = 0
    let blades: { x: number; h: number; lean: number; phase: number; flower: number }[] = []
    let motes: { x: number; y: number; r: number; phase: number }[] = []
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      W = el.clientWidth
      H = el.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const r = rng(3)
      blades = Array.from({ length: Math.round(W / 3.5) }, () => ({
        x: r() * W,
        h: H * (0.04 + r() * 0.09),
        lean: (r() - 0.5) * 0.5,
        phase: r() * 6.28,
        flower: r() < 0.16 ? Math.floor(r() * FLOWERS.length) : -1,
      }))
      motes = Array.from({ length: 40 }, () => ({ x: r() * W, y: H * (0.3 + r() * 0.55), r: 1 + r() * 1.6, phase: r() * 6.28 }))
    }
    resize()
    window.addEventListener('resize', resize)

    // hiker state
    let phase = 0
    let walk = 0
    let facing = 1
    let lastShift = 0
    let lastStep = 0
    let walked = 0
    let lastTime = 0

    const frame = (time: number) => {
      const dt = Math.min(0.05, lastTime ? time - lastTime : 0.016)
      lastTime = time
      const t = still ? 0 : time

      const dir = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0)
      if (dir) {
        // a calm walking pace, converted from screen pixels to scroll pixels
        const range = document.documentElement.scrollHeight - innerHeight
        const delta = dir * H * 0.2 * dt * (range / (TRAVEL * W))
        if (lenis) lenis.scrollTo(lenis.targetScroll + delta, { immediate: true })
        else window.scrollBy(0, delta)
      }

      const set = (k: string, v: string) => el.style.setProperty(k, v)
      const skyBot = at(PALETTE.skyBot, p)
      const sunC = at(PALETTE.sun, p)
      const rock = at(PALETTE.rock, p)
      const green = at(PALETTE.green, p)
      const night = clamp01((p - 0.82) / 0.14)
      set('--sky-top', css(at(PALETTE.skyTop, p)))
      set('--sky-bot', css(skyBot))
      set('--sun', css(sunC))
      set('--ink', css(mix(PALETTE.ink[0], PALETTE.ink[3], clamp01((p - 0.82) / 0.06))))
      set('--dirt', css(at(PALETTE.dirt, p)))
      set('--stone', css(mix(at(PALETTE.dirt, p), skyBot, 0.25)))
      const hikerC = at(PALETTE.hiker, p)
      set('--hiker', css(hikerC))
      set('--hiker-back', css(mix(hikerC, skyBot, 0.1)))
      set('--night', night.toFixed(3))

      LAYERS.forEach((l, i) => {
        svgs[i].style.transform = `translate3d(${(-p * TRAVEL * l.depth * W).toFixed(1)}px,0,0)`
        if (l.kind === 'rock') {
          set(`--top-${i}`, css(mix(mix(skyBot, rock, 0.5 + l.depth * 2.4), sunC, 0.28 * (1 - night * 0.8))))
          set(`--bot-${i}`, css(mix(skyBot, rock, 0.3 + l.depth * 2.2)))
        } else {
          const base = mix(skyBot, green, 0.25 + 0.75 * l.depth ** 0.7)
          set(`--top-${i}`, css(mix(base, sunC, 0.22 * (1 - night))))
          set(`--bot-${i}`, css(mix(base, [0, 0, 0], 0.12)))
        }
      })

      // sun high on the right, sinking behind the peaks; the moon after it
      const sd = clamp01(p / 0.86)
      const sx = (0.66 + 0.22 * sd) * W
      const sy = (0.13 + 0.5 * sd ** 1.4) * H
      sun.style.transform = `translate3d(${sx}px, ${sy}px, 0)`
      sun.style.opacity = String(1 - clamp01((p - 0.84) / 0.06))
      set('--sx', `${sx}px`)
      set('--sy', `${sy}px`)
      const md = clamp01((p - 0.86) / 0.14)
      moon.style.transform = `translate3d(${0.24 * W}px, ${(0.5 - 0.32 * md) * H}px, 0)`
      moon.style.opacity = String(night)

      // --- the hiker ---
      const shift = p * TRAVEL * W
      const moved = shift - lastShift
      lastShift = shift
      const size = Math.max(90, H * 0.15) / 100 // hiker is ~100 units tall
      const stride = 100 * size * 1.15
      const speed = Math.abs(moved) / dt
      walk += (clamp01(speed / (stride * 0.8)) - walk) * Math.min(1, dt * 8)
      if (Math.abs(moved) > 0.3) facing = Math.sign(moved)
      phase += (Math.abs(moved) / stride) * Math.PI * 2
      walked += Math.abs(moved)
      // a footstep each time a foot plants
      const stepIndex = Math.floor(phase / Math.PI)
      if (stepIndex !== lastStep && walk > 0.35) step()
      lastStep = stepIndex

      const x = CHAR_X * W
      const u = ((x + shift) * 1000) / H
      const y = ((ground.ridge(u) + 9) * H) / 1000
      hiker.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${size * facing} ${size})`)
      const breathe = still ? 0 : Math.sin(t * 1.6) * 0.6
      bob.setAttribute('transform', `translate(0 ${(-2.5 * Math.cos(2 * phase) * walk + breathe * (1 - walk)).toFixed(2)}) rotate(${(4 * walk).toFixed(2)} 0 -46)`)
      const rot = (n: SVGGElement, tx: number, ty: number, deg: number) => n.setAttribute('transform', `translate(${tx} ${ty}) rotate(${deg.toFixed(2)})`)
      rot(limbs.legF, 0, -46, thigh(phase, walk))
      rot(limbs.shinF, 0, 23, knee(phase, walk))
      rot(limbs.legB, 0, -46, thigh(phase + Math.PI, walk))
      rot(limbs.shinB, 0, 23, knee(phase + Math.PI, walk))
      rot(limbs.armF, 0, -75, arm(phase, walk))
      rot(limbs.foreF, 0, 15, elbow(phase, walk))
      rot(limbs.armB, 0, -75, arm(phase + Math.PI, walk))
      rot(limbs.foreB, 0, 15, elbow(phase + Math.PI, walk))

      intro.style.opacity = String(1 - clamp01(walked / (W * 0.25)))
      hint.style.opacity = String(1 - clamp01(walked / (W * 0.6)))
      const end = clamp01((p - 0.94) / 0.05)
      outro.style.opacity = String(end)
      outro.style.pointerEvents = end > 0.5 ? 'auto' : 'none'
      sound.setTime(p)

      // canvas: drifting pollen / fireflies, then the meadow in front of the hiker
      g.clearRect(0, 0, W, H)
      for (const m of motes) {
        const mx = (((m.x - shift * 0.8 + Math.sin(t * 0.3 + m.phase) * 30) % W) + W) % W
        const my = m.y + Math.sin(t * 0.5 + m.phase * 2) * 14
        const blink = night > 0 ? 0.5 + 0.5 * Math.sin(t * 2 + m.phase * 3) : 1
        g.fillStyle = night > 0.3 ? `rgb(255 214 130 / ${(0.85 * blink * night).toFixed(3)})` : `rgb(255 250 235 / ${(0.5 * (1 - night)).toFixed(3)})`
        g.shadowColor = 'rgb(255 214 130)'
        g.shadowBlur = night * 12
        g.beginPath()
        g.arc(mx, my, m.r, 0, 6.283)
        g.fill()
      }
      g.shadowBlur = 0
      const front = shift * 1.35
      const bladeC = css(mix(green, [0, 0, 0], 0.2))
      g.strokeStyle = bladeC
      g.lineWidth = 1.5
      g.beginPath()
      const heads: [number, number, number][] = []
      for (const b of blades) {
        const bx = (((b.x - front) % W) + W) % W
        const sway = Math.sin(t * 1.3 + b.phase + bx * 0.004) * 0.18 + b.lean
        const tx = bx + sway * b.h
        g.moveTo(bx, H)
        g.quadraticCurveTo(bx, H - b.h * 0.6, tx, H - b.h)
        if (b.flower >= 0) heads.push([tx, H - b.h, b.flower])
      }
      g.stroke()
      const dim = 1 - night * 0.85
      for (const [fx, fy, c] of heads) {
        g.fillStyle = css(mix(hex(FLOWERS[c]), [20, 16, 14], 1 - dim))
        g.beginPath()
        g.arc(fx, fy, 3.2, 0, 6.283)
        g.fill()
      }
    }
    gsap.ticker.add(frame)

    const wash = q<HTMLElement>('[data-wash]')
    gsap.to(wash, { autoAlpha: 0, duration: still ? 0.01 : 1.6, ease: 'power2.out', delay: 0.4 })

    return () => {
      gsap.ticker.remove(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      st.kill()
      sound.stop()
    }
  }, [layers])

  return (
    <main ref={main} id="content" tabIndex={-1} className="relative h-[900vh] outline-none">
      <h1 className="sr-only">Elsewhere: a quiet valley to walk through</h1>
      <div
        ref={stage}
        className="sticky top-0 h-svh overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bot) 70%)', color: 'var(--ink)' }}
      >
        <svg aria-hidden className="absolute size-0">
          <defs>
            {/* every layer is lit from above: sunlit ridge fading into its shade / the valley haze */}
            {LAYERS.map((l, i) => (
              <linearGradient key={i} id={`lit-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset={l.kind === 'rock' ? 0.2 : 0} style={{ stopColor: `var(--top-${i})` }} />
                <stop offset={l.kind === 'rock' ? 0.75 : 0.45} style={{ stopColor: `var(--bot-${i})` }} />
              </linearGradient>
            ))}
          </defs>
        </svg>
        <div aria-hidden className="absolute top-0 left-0 size-px" style={{ boxShadow: STARS, opacity: 'var(--night)' }} />
        <div
          data-sun
          aria-hidden
          className="absolute top-0 left-0 -mt-[4.5vmin] -ml-[4.5vmin] size-[9vmin] rounded-full"
          style={{ background: 'var(--sun)', boxShadow: '0 0 90px 40px color-mix(in srgb, var(--sun) 50%, transparent)' }}
        />
        <div
          data-moon
          aria-hidden
          className="absolute top-0 left-0 -mt-[3.5vmin] -ml-[3.5vmin] size-[7vmin] rounded-full"
          style={{ background: 'var(--sun)', boxShadow: '0 0 60px 16px rgb(243 234 216 / 0.25)' }}
        />

        {layers.map(({ d, width, path, stones }, i) => (
          <div key={i} className="contents">
            {i === 2 && (
              // golden-hour glare from the sun, over the far peaks and behind the near hills
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 mix-blend-screen"
                style={{
                  background: 'radial-gradient(70vmax circle at var(--sx) var(--sy), color-mix(in srgb, var(--sun) 55%, transparent), transparent 55%)',
                  opacity: 'calc(1 - var(--night))',
                }}
              />
            )}
            {(i === 2 || i === 3) && (
              <div
                aria-hidden
                className="absolute left-0 h-[22%] w-[200%] opacity-70 motion-safe:animate-[mist_70s_linear_infinite]"
                style={{
                  top: i === 2 ? '48%' : '60%',
                  // one soft bank per tile, centred so no bank is cut off at a tile edge
                  background: 'radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--sky-bot) 80%, transparent), transparent)',
                  backgroundSize: i === 2 ? '25% 100%' : '18% 100%',
                }}
              />
            )}
            <svg
              data-layer
              aria-hidden
              viewBox={`0 0 ${width} 1000`}
              preserveAspectRatio="none"
              className="absolute inset-y-0 left-0 h-full will-change-transform"
              style={{ width: `${(width / 1000) * (100 / (window.innerWidth / window.innerHeight))}vw`, fill: `url(#lit-${i})` }}
            >
              <path d={d} />
              {path && <path d={path} fill="none" strokeWidth="16" strokeLinecap="round" style={{ stroke: 'var(--dirt)' }} />}
              {stones && <path d={stones} style={{ fill: 'var(--stone)' }} />}
            </svg>
          </div>
        ))}

        {/* the hiker: origin at his feet, ~100 units tall, facing right */}
        <svg aria-hidden className="absolute top-0 left-0 overflow-visible" width="1" height="1">
          <g data-hiker strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="0" cy="1" rx="16" ry="2.5" fill="rgb(0 0 0 / 0.18)" />
            <g data-bob>
              <g style={{ color: 'var(--hiker-back)' }} stroke="currentColor" fill="currentColor">
                <g data-arm-b>
                  <line y2="15" strokeWidth="5" />
                  <g data-fore-b>
                    <line y2="14" strokeWidth="4.5" />
                  </g>
                </g>
                <g data-leg-b>
                  <line y2="23" strokeWidth="7" />
                  <g data-shin-b>
                    <line y2="22" strokeWidth="6.5" />
                    <line x1="-1" y1="22" x2="6" y2="22" strokeWidth="5" />
                  </g>
                </g>
              </g>
              <g style={{ color: 'var(--hiker)' }} stroke="currentColor" fill="currentColor">
                <rect x="-17" y="-80" width="12" height="27" rx="4" stroke="none" />
                <rect x="-7.5" y="-81" width="15" height="37" rx="7" stroke="none" />
                <circle cx="1.5" cy="-89" r="8" stroke="none" />
                <rect x="-9" y="-95" width="21" height="3" rx="1.5" stroke="none" />
                <rect x="-4.5" y="-102" width="11" height="8" rx="3" stroke="none" />
                <g data-leg-f>
                  <line y2="23" strokeWidth="7" />
                  <g data-shin-f>
                    <line y2="22" strokeWidth="6.5" />
                    <line x1="-1" y1="22" x2="6" y2="22" strokeWidth="5" />
                  </g>
                </g>
                <g data-arm-f>
                  <line y2="15" strokeWidth="5" />
                  <g data-fore-f>
                    <line y2="14" strokeWidth="4.5" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </svg>

        <canvas aria-hidden className="absolute inset-0 size-full" />

        <div data-intro className="pointer-events-none absolute inset-x-0 top-[24%] px-4 text-center">
          <p className="display text-[clamp(2.5rem,9vw,8rem)]">{elsewhere.intro}</p>
        </div>
        <p data-hint className="label pointer-events-none absolute inset-x-0 bottom-10 text-center text-current! opacity-80">
          <span className="pointer-coarse:hidden">{elsewhere.hint}</span>
          <span className="hidden pointer-coarse:inline">{elsewhere.hintTouch}</span>
        </p>

        <div data-outro className="absolute inset-x-0 top-[24%] px-4 text-center opacity-0">
          <p className="display text-[clamp(2rem,6vw,5.5rem)]">{elsewhere.outro}</p>
          <TLink to="/#experience" className="label mt-10 inline-flex min-h-12 items-center rounded-full bg-[#efe6d8] px-7 text-[#0f0d0c]! transition-transform duration-300 hover:scale-[1.04]">
            ← {elsewhere.back}
          </TLink>
        </div>

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-8">
          <TLink
            ref={back}
            to="/#experience"
            className="label inline-flex min-h-11 items-center gap-2 rounded-full bg-[#14110f]/75 px-5 text-[#efe6d8]! transition-colors hover:bg-[#14110f]"
          >
            ← {elsewhere.back}
          </TLink>
          <div className="rounded-full bg-[#14110f]/75 px-3">
            <SoundToggle />
          </div>
        </div>

        <div data-wash aria-hidden className="pointer-events-none absolute inset-0 bg-[#f9eedb]" />
      </div>
    </main>
  )
}

const STARS = (() => {
  const r = rng(5)
  return Array.from({ length: 140 }, () => `${(r() * 100).toFixed(2)}vw ${(r() * 60).toFixed(2)}vh 0 ${r() > 0.85 ? 1 : 0}px rgb(255 248 235 / ${(0.4 + r() * 0.6).toFixed(2)})`).join(',')
})()
