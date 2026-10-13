import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { experience, journey } from '../content'
import { TLink } from '../components/PageTransition'
import { SoundToggle } from '../components/Sound'
import { nature } from '../lib/sound'
import { prefersReducedMotion, useSmoothScroll } from '../lib/smooth-scroll'

gsap.registerPlugin(ScrollTrigger)

// The timeline, walked. Scrolling moves you sideways through layered hills (parallax by depth) while
// the day runs from dawn to night: every colour on the page is mixed from four times of day, and
// the far hills take the sky's colour (atmospheric haze). One click (or Esc) goes back.

const TRAVEL = 3 // viewport widths the nearest layer moves over the whole walk

type Rgb = [number, number, number]
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
const css = (c: Rgb) => `rgb(${c.map(Math.round).join(' ')})`
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// dawn, day, golden hour, night (warm all the way down, no blue)
const TIMES = [0, 0.35, 0.65, 1]
const PALETTE = {
  skyTop: ['#d9b8a6', '#d8dccd', '#d98e62', '#0f0d0c'].map(hex),
  skyBot: ['#f6e3cf', '#f5f2e6', '#f4cf93', '#2a221d'].map(hex),
  ground: ['#2f3a2e', '#3b4a35', '#3a2e22', '#090807'].map(hex),
  ink: ['#2a2420', '#23241f', '#2a1e14', '#efe6d8'].map(hex),
  sun: ['#fff1dc', '#fffaf0', '#ffe2a8', '#f3ead8'].map(hex),
}
const at = (keys: Rgb[], t: number) => {
  let i = 0
  while (i < TIMES.length - 2 && t > TIMES[i + 1]) i++
  return mix(keys[i], keys[i + 1], clamp01((t - TIMES[i]) / (TIMES[i + 1] - TIMES[i])))
}

// seeded value noise for the ridgelines, so the hills are the same on every visit
const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647
const smooth = (t: number) => t * t * (3 - 2 * t)

type Layer = { depth: number; base: number; amp: number; freq: number; seed: number; trees: number }
const LAYERS: Layer[] = [
  { depth: 0.12, base: 470, amp: 210, freq: 1.1, seed: 7, trees: 0 },
  { depth: 0.3, base: 560, amp: 150, freq: 1.6, seed: 19, trees: 0 },
  { depth: 0.5, base: 650, amp: 110, freq: 2.2, seed: 41, trees: 0.25 },
  { depth: 0.7, base: 735, amp: 80, freq: 3, seed: 73, trees: 0.45 },
  { depth: 0.9, base: 830, amp: 45, freq: 4, seed: 97, trees: 0 },
]

// viewBox units match screen pixels at 1000 units per screen height, so pines keep their shape on any aspect
function hillPath({ depth, base, amp, freq, seed, trees }: Layer, aspect: number) {
  const width = 1000 * (1 + TRAVEL * depth) * aspect
  const r = rng(seed)
  const step = 1000 / freq
  const knots = Array.from({ length: Math.ceil(width / step) + 2 }, () => r())
  const fine = Array.from({ length: Math.ceil(width / (step / 4)) + 2 }, () => r())
  const ridge = (x: number) => {
    const i = Math.floor(x / step)
    const j = Math.floor(x / (step / 4))
    const a = knots[i] + (knots[i + 1] - knots[i]) * smooth(x / step - i)
    const b = fine[j] + (fine[j + 1] - fine[j]) * smooth(x / (step / 4) - j)
    return base - amp * (a * 0.85 + b * 0.15)
  }
  let d = `M0 1000L0 ${ridge(0).toFixed(1)}`
  for (let x = 8; x <= width; x += 8) d += `L${x} ${ridge(x).toFixed(1)}`
  d += `L${width} 1000Z`
  // pines standing on the ridge, two tiers each
  for (let x = 20; x < width; x += 14 + r() * 40) {
    if (r() > trees) continue
    const y = ridge(x) + 4
    const h = 26 + r() * 34
    const w = h * 0.3
    d += `M${x - w} ${y}L${x} ${y - h}L${x + w} ${y}Z M${x - w * 0.75} ${y - h * 0.35}L${x} ${y - h * 1.15}L${x + w * 0.75} ${y - h * 0.35}Z`
  }
  return { d, width }
}

const STARS = (() => {
  const r = rng(5)
  return Array.from({ length: 140 }, () => `${(r() * 100).toFixed(2)}vw ${(r() * 60).toFixed(2)}vh 0 ${r() > 0.85 ? 1 : 0}px rgb(255 248 235 / ${(0.4 + r() * 0.6).toFixed(2)})`).join(',')
})()

export default function Journey() {
  useSmoothScroll()
  const main = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLAnchorElement>(null)
  const hills = useMemo(() => LAYERS.map((l) => hillPath(l, window.innerWidth / window.innerHeight)), [])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Esc walks back too
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && back.current?.click()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    const el = stage.current!
    const q = <T extends Element>(s: string) => Array.from(el.querySelectorAll<T>(s))
    const layers = q<SVGSVGElement>('[data-layer]')
    const cards = q<HTMLElement>('[data-stop]')
    const sun = el.querySelector<HTMLElement>('[data-sun]')!
    const moon = el.querySelector<HTMLElement>('[data-moon]')!
    const intro = el.querySelector<HTMLElement>('[data-intro]')!
    const outro = el.querySelector<HTMLElement>('[data-outro]')!
    const bar = el.querySelector<HTMLElement>('[data-bar]')!
    const canvas = el.querySelector('canvas')!
    const g = canvas.getContext('2d')!
    const still = prefersReducedMotion()
    const sound = nature()

    let p = 0
    const st = ScrollTrigger.create({ trigger: main.current, start: 'top top', end: 'bottom bottom', onUpdate: (s) => (p = s.progress) })

    // grass blades and floating motes, generated once per size
    let W = 0
    let H = 0
    let blades: { x: number; h: number; lean: number; phase: number }[] = []
    let motes: { x: number; y: number; r: number; phase: number }[] = []
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      W = el.clientWidth
      H = el.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const r = rng(3)
      blades = Array.from({ length: Math.round(W / 4) }, () => ({ x: r() * W, h: H * (0.05 + r() * 0.08), lean: (r() - 0.5) * 0.5, phase: r() * 6.28 }))
      motes = Array.from({ length: 46 }, () => ({ x: r() * W, y: H * (0.35 + r() * 0.55), r: 1 + r() * 1.8, phase: r() * 6.28 }))
    }
    resize()
    window.addEventListener('resize', resize)

    const frame = (time: number) => {
      const t = still ? 0 : time
      const vw = W
      const set = (k: string, v: string) => el.style.setProperty(k, v)
      const skyBot = at(PALETTE.skyBot, p)
      const ground = at(PALETTE.ground, p)
      // text flips to light as soon as the sky turns dark, not halfway through the night
      const ink = mix(at(PALETTE.ink, Math.min(p, 0.65)), PALETTE.ink[3], clamp01((p - 0.7) / 0.08))
      const sunC = at(PALETTE.sun, p)
      set('--sky-top', css(at(PALETTE.skyTop, p)))
      set('--sky-bot', css(skyBot))
      set('--ink', css(ink))
      set('--sun', css(sunC))
      const night = clamp01((p - 0.72) / 0.22)
      set('--night', night.toFixed(3))

      layers.forEach((svg, i) => {
        const { depth } = LAYERS[i]
        svg.style.transform = `translate3d(${(-p * TRAVEL * depth * vw).toFixed(1)}px,0,0)`
        svg.style.fill = css(mix(skyBot, ground, depth ** 0.8))
      })

      // sun arcs over the day and sinks behind the hills; the moon rises after it
      const sd = clamp01(p / 0.78)
      sun.style.transform = `translate3d(${(0.12 + 0.72 * sd) * vw}px, ${(0.58 - 0.46 * Math.sin(Math.PI * sd)) * H}px, 0)`
      sun.style.opacity = String(1 - clamp01((p - 0.74) / 0.06))
      const md = clamp01((p - 0.76) / 0.24)
      moon.style.transform = `translate3d(${(0.62 + 0.22 * md) * vw}px, ${(0.6 - 0.44 * md) * H}px, 0)`
      moon.style.opacity = String(night)

      cards.forEach((card) => {
        const f = Number(card.dataset.stop)
        card.style.transform = `translate3d(${(0.5 * vw + (f - p) * TRAVEL * 0.9 * vw).toFixed(1)}px,0,0) translateX(-50%)`
        card.style.opacity = clamp01(1 - Math.abs(p - f) * 6).toFixed(3)
      })
      intro.style.opacity = String(1 - clamp01(p / 0.07))
      const end = clamp01((p - 0.92) / 0.06)
      outro.style.opacity = String(end)
      outro.style.pointerEvents = end > 0.5 ? 'auto' : 'none'
      bar.style.transform = `scaleX(${p})`
      sound.setTime(p)

      // canvas: motes (pollen by day, blinking fireflies at night), then the meadow grass in front
      g.clearRect(0, 0, W, H)
      const shift = p * TRAVEL * 0.95 * vw
      for (const m of motes) {
        const x = (((m.x - shift * 0.8 + Math.sin(t * 0.3 + m.phase) * 30) % W) + W) % W
        const y = m.y + Math.sin(t * 0.5 + m.phase * 2) * 14
        const blink = night > 0 ? 0.5 + 0.5 * Math.sin(t * 2 + m.phase * 3) : 1
        g.fillStyle = night > 0.3 ? `rgb(255 214 130 / ${(0.85 * blink * night).toFixed(3)})` : `rgb(255 250 235 / ${(0.45 * (1 - night)).toFixed(3)})`
        g.shadowColor = 'rgb(255 214 130)'
        g.shadowBlur = night * 12
        g.beginPath()
        g.arc(x, y, m.r, 0, 6.283)
        g.fill()
      }
      g.shadowBlur = 0
      g.strokeStyle = css(mix(ground, [0, 0, 0], 0.25))
      g.lineWidth = 1.4
      g.beginPath()
      for (const b of blades) {
        const x = (((b.x - shift) % W) + W) % W
        const sway = Math.sin(t * 1.3 + b.phase + x * 0.004) * 0.18 + b.lean
        g.moveTo(x, H)
        g.quadraticCurveTo(x, H - b.h * 0.6, x + sway * b.h, H - b.h)
      }
      g.stroke()
    }
    gsap.ticker.add(frame)

    // arrive through a soft wash of morning light
    const wash = el.querySelector<HTMLElement>('[data-wash]')!
    gsap.to(wash, { autoAlpha: 0, duration: still ? 0.01 : 1.6, ease: 'power2.out', delay: 0.4 })

    return () => {
      gsap.ticker.remove(frame)
      window.removeEventListener('resize', resize)
      st.kill()
      sound.stop()
    }
  }, [])

  return (
    <main ref={main} id="content" tabIndex={-1} className="relative h-[700vh] outline-none">
      <h1 className="sr-only">Journey: from my first line of code to now</h1>
      <div
        ref={stage}
        className="sticky top-0 h-svh overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bot) 75%)', color: 'var(--ink)' }}
      >
        <div aria-hidden className="absolute top-0 left-0 size-px" style={{ boxShadow: STARS, opacity: 'var(--night)' }} />
        <div
          data-sun
          aria-hidden
          className="absolute top-0 left-0 -mt-[5vmin] -ml-[5vmin] size-[10vmin] rounded-full"
          style={{ background: 'var(--sun)', boxShadow: '0 0 90px 40px color-mix(in srgb, var(--sun) 45%, transparent)' }}
        />
        <div
          data-moon
          aria-hidden
          className="absolute top-0 left-0 -mt-[3.5vmin] -ml-[3.5vmin] size-[7vmin] rounded-full"
          style={{ background: 'var(--sun)', boxShadow: '0 0 60px 16px rgb(243 234 216 / 0.25)' }}
        />

        {hills.map(({ d, width }, i) => (
          <svg
            key={i}
            data-layer
            aria-hidden
            viewBox={`0 0 ${width} 1000`}
            preserveAspectRatio="none"
            className="absolute inset-y-0 left-0 h-full will-change-transform"
            style={{ width: `${(1 + TRAVEL * LAYERS[i].depth) * 100}vw` }}
          >
            <path d={d} />
          </svg>
        )).flatMap((svg, i) =>
          // drifting mist between the middle layers
          i === 2 || i === 3
            ? [
                <div
                  key={`mist-${i}`}
                  aria-hidden
                  className="absolute left-0 h-[22%] w-[200%] opacity-70 motion-safe:animate-[mist_70s_linear_infinite]"
                  style={{
                    top: i === 2 ? '50%' : '60%',
                    background:
                      'radial-gradient(40% 50% at 20% 50%, color-mix(in srgb, var(--sky-bot) 85%, transparent), transparent 70%), radial-gradient(35% 45% at 65% 55%, color-mix(in srgb, var(--sky-bot) 70%, transparent), transparent 70%)',
                    backgroundSize: '50% 100%',
                  }}
                />,
                svg,
              ]
            : [svg],
        )}

        <canvas aria-hidden className="absolute inset-0 size-full" />

        {/* milestones stand in the meadow and drift past */}
        <ol>
          {experience.map((e, i) => (
            <li key={e.title} data-stop={journey.stops[i]} className="absolute bottom-[14%] left-0 flex w-[min(80vw,26rem)] flex-col items-center text-center opacity-0">
              <p className="display text-[clamp(3rem,9vw,7.5rem)]">{e.year}</p>
              <h2 className="mt-3 text-2xl font-medium sm:text-3xl">{e.title}</h2>
              <p className="mt-2 opacity-70">{e.body}</p>
              <span aria-hidden className="mt-6 h-[9vh] w-px bg-current opacity-50" />
            </li>
          ))}
        </ol>

        <div data-intro className="pointer-events-none absolute inset-x-0 top-[22%] px-4 text-center">
          <p className="display text-[clamp(2.5rem,9vw,8rem)]">{journey.intro}</p>
          <p className="label mt-6 opacity-70">{journey.hint} ↓</p>
        </div>

        <div data-outro className="absolute inset-x-0 top-[24%] px-4 text-center opacity-0">
          <p className="display text-[clamp(2rem,6vw,5.5rem)]">{journey.outro}</p>
          <TLink to="/#experience" className="label mt-10 inline-flex min-h-12 items-center rounded-full bg-[#efe6d8] px-7 text-[#0f0d0c]! transition-transform duration-300 hover:scale-[1.04]">
            ← {journey.back}
          </TLink>
        </div>

        {/* top bar: one click back, sound */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-8">
          <TLink
            ref={back}
            to="/#experience"
            className="label inline-flex min-h-11 items-center gap-2 rounded-full bg-[#14110f]/75 px-5 text-[#efe6d8]! transition-colors hover:bg-[#14110f]"
          >
            ← {journey.back}
          </TLink>
          <div className="rounded-full bg-[#14110f]/75 px-3">
            <SoundToggle />
          </div>
        </div>

        <div aria-hidden className="absolute inset-x-4 bottom-6 h-px bg-current/20 sm:inset-x-8">
          <div data-bar className="h-full origin-left bg-current" />
        </div>

        <div data-wash aria-hidden className="pointer-events-none absolute inset-0 bg-[#f6e3cf]" />
      </div>
    </main>
  )
}
