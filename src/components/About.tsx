import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { site } from '../content'
import { tick, whoosh } from '../lib/sound'
import { setSceneCovered } from '../three/fx'
import Scribble from './Scribble'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

const words = (s: string) => s.split(' ')

type Side = {
  lead: string
  highlight: string
  stats: { value: number; label: string }[]
  about: string
  skills: string[]
}
const DAY: Side = { lead: site.aboutLead, highlight: site.aboutHighlight, stats: site.aboutStats, about: site.about, skills: site.skills }
// the x-ray under the lens: the same words in the same places (so it lines up with the page), inverted
// to night, with the labels swapped for the after-hours notes
const GRID_TILE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><path d="M0 .5H48M.5 0V48" stroke="#f2f2f2" stroke-opacity=".08"/></svg>')}`
const NIGHT: Side = { ...DAY, stats: DAY.stats.map((s, i) => ({ ...s, label: site.night.stats[i] })), skills: site.night.skills }

// A number as odometer wheels: one 0–9 column per digit, rolled into place by the reveal.
function Odometer({ value }: { value: number }) {
  return (
    <span className="inline-flex overflow-hidden" aria-label={String(value)}>
      {String(value)
        .split('')
        .map((d, i) => (
          <span key={i} aria-hidden className="relative block h-[1em] leading-[1]">
            <span className="ab-wheel block" data-digit={d}>
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n} className="block h-[1em]">
                  {n}
                </span>
              ))}
            </span>
          </span>
        ))}
    </span>
  )
}

// One full layout of the stage; drawn twice, the night copy inverted and clipped to the lens.
function Stage({ side, night }: { side: Side; night?: boolean }) {
  const ink = night ? 'text-fg' : 'text-bg'
  return (
    <>
      <p
        aria-hidden
        className={`ab-outline display pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-[34vw] whitespace-nowrap text-transparent ${
          night ? '[-webkit-text-stroke:1.5px_rgb(242_242_242/0.12)]' : '[-webkit-text-stroke:1.5px_rgb(5_5_5/0.12)]'
        }`}
      >
        About
      </p>

      <div className={`label relative flex justify-between ${night ? 'text-fg/60!' : 'text-bg/60!'}`}>
        <p>{night ? '/ About · x-ray' : '/ About'}</p>
        <p>{night ? site.night.corner : `${site.location} · since 2020`}</p>
      </div>

      <h2
        id={night ? undefined : 'about-title'}
        aria-hidden={night}
        className={`display relative text-[clamp(1.5rem,6vw,6rem)] leading-[1] ${ink}`}
        aria-label={night ? undefined : `${side.lead} ${side.highlight}`}
      >
        <span aria-hidden>
          {words(side.lead).map((w, i) => (
            <span key={i} className="ab-word">
              {w}{' '}
            </span>
          ))}
          <span className="relative inline-block whitespace-nowrap">
            {words(side.highlight).map((w, i) => (
              <span key={i} className="ab-word">
                {i ? ' ' : ''}
                {w}
              </span>
            ))}
            {/* inverted copy on a solid block, revealed by a left-to-right clip */}
            <span
              className={`ab-hl-cover absolute -inset-x-[0.15em] -inset-y-[0.05em] px-[0.15em] py-[0.05em] ${night ? 'bg-fg text-bg' : 'bg-bg text-fg'}`}
            >
              {side.highlight}
            </span>
          </span>
        </span>
      </h2>

      <div className={`relative grid items-end gap-8 lg:grid-cols-2 lg:gap-16 ${ink}`} aria-hidden={night}>
        <dl className={`grid grid-cols-3 items-start gap-4 border-t pt-5 ${night ? 'border-fg/15' : 'border-bg/15'}`}>
          {side.stats.map((s) => (
            <div key={s.label} className="ab-stat flex flex-col-reverse">
              <dt className={`label mt-2 ${night ? 'text-fg/60!' : 'text-bg/60!'}`}>{s.label}</dt>
              <dd className="display text-[clamp(2.25rem,5vw,5rem)]">
                <Odometer value={s.value} />
              </dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="ab-para text-base leading-relaxed sm:text-xl">{side.about}</p>
          <ul className="ab-skills mt-6 flex flex-wrap gap-2">
            {side.skills.map((s) => (
              <li key={s} className={`ab-skill label rounded-full border px-4 py-2 ${night ? 'border-fg/25 text-fg!' : 'border-bg/25 text-bg!'}`}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

// The one light section. The white stage wipes up over the dark page and pins for ~1.5 screens:
// the statement fills in word by word with the scroll, then the highlight gets swept into an
// inverted block; the numbers roll in like odometers. The cursor carries a lens that reveals the
// x-ray of the section underneath: the same words inverted to night, the labels swapped for notes.
export default function About() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const night = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.ab-stage',
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top top', scrub: true, onEnter: () => whoosh(0.6) },
          },
        )

        const pinned = { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true }
        gsap.fromTo('.ab-outline', { xPercent: 8 }, { xPercent: -30, ease: 'none', scrollTrigger: { ...pinned, start: 'top bottom' } })

        // statement: words go from ghost to ink, then the highlight block sweeps left to right
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: 'top 15%', end: 'bottom 110%', scrub: 0.6 } })
          // both layers fill in over the same stretch, whatever their word counts
          .fromTo('.ab-day .ab-word', { opacity: 0.12 }, { opacity: 1, ease: 'none', duration: 0.3, stagger: { amount: 1 } })
          .fromTo('.ab-night .ab-word', { opacity: 0.12 }, { opacity: 1, ease: 'none', duration: 0.3, stagger: { amount: 1 } }, '<')
          .call(() => tick())
          .fromTo('.ab-hl-cover', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.6 })
          .to({}, { duration: 0.3 }) // hold the finished line before the section scrolls away

        const reveal = { trigger: root.current, start: 'top 10%' }
        gsap.from('.ab-stat', { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, scrollTrigger: reveal })

        SplitText.create('.ab-para', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: reveal }),
        })
        gsap.from('.ab-skill', { autoAlpha: 0, y: 16, stagger: 0.06, duration: 0.5, delay: 0.3, scrollTrigger: reveal })
      })

      // odometers: each wheel spins past a full turn and settles on its digit (static with reduced motion)
      // (one tween per wheel only: a set plus a tween would stack, GSAP reads the first back as px)
      mm.add('(prefers-reduced-motion: reduce)', () => {
        root.current!.querySelectorAll<HTMLElement>('.ab-wheel').forEach((wheel) => gsap.set(wheel, { yPercent: -Number(wheel.dataset.digit) * 10 }))
      })
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        root.current!.querySelectorAll<HTMLElement>('.ab-wheel').forEach((wheel, i) => {
          const digit = Number(wheel.dataset.digit)
          gsap.fromTo(
            wheel,
            { yPercent: 0 },
            { yPercent: -digit * 10, duration: 1.6 + (i % 2) * 0.35, ease: 'expo.out', delay: (i % 3) * 0.08, scrollTrigger: { trigger: root.current, start: 'top 10%' } },
          )
        })
      })

      // while the white stage fills the screen the WebGL scene behind it can't be seen: pause it
      const cover = ScrollTrigger.create({ trigger: root.current, start: 'top top', end: 'bottom bottom', onToggle: (self) => setSceneCovered(self.isActive) })

      // the lens: follows the pointer with a little lag, opens over the stage, closes when it leaves
      const s = stage.current!
      const lens = { x: -999, y: -999, r: 0 }
      const draw = () => {
        night.current!.style.clipPath = `circle(${lens.r}px at ${lens.x}px ${lens.y}px)`
        ring.current!.style.transform = `translate(${lens.x - lens.r}px, ${lens.y - lens.r}px)`
        ring.current!.style.width = ring.current!.style.height = `${lens.r * 2}px`
      }
      const toX = gsap.quickTo(lens, 'x', { duration: 0.25, ease: 'power3.out', onUpdate: draw })
      const toY = gsap.quickTo(lens, 'y', { duration: 0.25, ease: 'power3.out', onUpdate: draw })
      const toR = gsap.quickTo(lens, 'r', { duration: 0.6, ease: 'power3.out', onUpdate: draw })
      const size = () => Math.min(s.clientWidth, s.clientHeight) * (window.matchMedia('(pointer: coarse)').matches ? 0.32 : 0.26)
      let inside = false
      const move = (e: PointerEvent) => {
        const r = s.getBoundingClientRect()
        const x = e.clientX - r.left
        const y = e.clientY - r.top
        if (!inside) {
          // appear where the pointer is instead of sliding in from the last spot
          gsap.set(lens, { x, y })
          inside = true
        }
        toX(x)
        toY(y)
        toR(size())
      }
      const leave = (e: PointerEvent) => {
        // on touch the lens stays where it was tapped (lifting a finger also fires pointerleave)
        if (e.pointerType !== 'mouse') return
        inside = false
        toR(0)
      }
      s.addEventListener('pointermove', move)
      s.addEventListener('pointerdown', move)
      s.addEventListener('pointerleave', leave)
      return () => {
        s.removeEventListener('pointermove', move)
        s.removeEventListener('pointerdown', move)
        s.removeEventListener('pointerleave', leave)
        cover.kill()
        setSceneCovered(false)
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} id="about" aria-labelledby="about-title" className="relative h-[250vh]">
      <div ref={stage} className="ab-stage sticky top-0 h-dvh overflow-hidden bg-fg">
        {/* the alter ego, faint scribbles spread behind the page */}
        <Scribble mode="day" />
        <div className="ab-day absolute inset-0 flex flex-col justify-between gap-8 px-4 py-20 sm:px-8 sm:py-24">
          <Stage side={DAY} />
        </div>
        {/* the night shift, only visible inside the lens */}
        <div
          ref={night}
          className="ab-night pointer-events-none absolute inset-0 flex flex-col justify-between gap-8 px-4 py-20 sm:px-8 sm:py-24"
          // deep violet with the site's grid (an image tile: far cheaper to repaint than a gradient grid)
          style={{
            clipPath: 'circle(0px at -999px -999px)',
            backgroundColor: '#140a26',
            backgroundImage: `url("${GRID_TILE}")`,
            backgroundSize: '48px 48px',
          }}
        >
          {/* the same scribbles, glowing white: the alter ego shows through the lens */}
          <Scribble mode="night" />
          <Stage side={NIGHT} night />
        </div>
        <div ref={ring} aria-hidden className="pointer-events-none absolute top-0 left-0 size-0 rounded-full shadow-[0_0_0_1px_rgb(242_242_242/0.5),0_0_0_2px_rgb(5_5_5/0.25),inset_0_0_28px_rgb(190_150_255/0.22)]" />
        <p className="label pointer-events-none absolute right-4 bottom-5 text-bg/50! sm:right-8">
          <span className="pointer-coarse:hidden">{site.night.hint} ↖</span>
          <span className="hidden pointer-coarse:inline">{site.night.hintTouch}</span>
        </p>
      </div>
    </section>
  )
}
