import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { GLYPH_A } from '../three/glyph-a'
import { lockScroll, prefersReducedMotion } from '../lib/smooth-scroll'

type P = [number, number]
// Construction lines in glyph units (y up): guides through the A's edges, extended far past the screen.
const extend = (a: P, b: P, k = 14): [P, P] => [
  [a[0] + (a[0] - b[0]) * k, a[1] + (a[1] - b[1]) * k],
  [b[0] + (b[0] - a[0]) * k, b[1] + (b[1] - a[1]) * k],
]
const FAR = 6000
const LINES: [P, P][] = [
  ...[0, 110, 259, 523, 687].map((y): [P, P] => [[-FAR, y], [FAR, y]]),
  ...[353, 466, 579].map((x): [P, P] => [[x, -FAR], [x, FAR]]),
  extend([15, 0], [353, 687]),
  extend([917, 0], [579, 687]),
  extend([344.7, 259], [458, 523]),
  extend([577.3, 259], [465.5, 523]),
]
const VIEW = { x: -420, y: -1050, w: 1773, h: 1413 }

// Full-screen intro: guides draw, the A outline traces itself, a counter runs until the WebGL
// scene has rendered (`ready`), then the A flashes solid and the screen dissolves in blocks.
export default function Loader({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const drawn = useRef<gsap.core.Timeline | null>(null)
  const progress = useRef({ p: 0 })
  const exiting = useRef(false)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])

  const { cols, rows, stroke } = useMemo(() => {
    const cols = window.innerWidth < 768 ? 8 : 16
    const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h)
    return { cols, rows: Math.ceil((cols * window.innerHeight) / window.innerWidth), stroke: 1 / scale }
  }, [])

  const render = () => {
    if (counter.current) counter.current.textContent = String(Math.round(progress.current.p * 100)).padStart(3, '0')
  }

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    lockScroll(true)
    const still = prefersReducedMotion()
    const ctx = gsap.context(() => {
      drawn.current = gsap
        .timeline()
        .fromTo('.ld-line', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: still ? 0 : 1, ease: 'power2.inOut', stagger: still ? 0 : 0.05 })
        .fromTo('.ld-a', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: still ? 0 : 1.3, ease: 'power2.inOut' }, still ? 0 : 0.35)
      // eases towards 90% on its own; the last 10% waits for the real scene
      gsap.to(progress.current, { p: 0.9, duration: 2.4, ease: 'power1.out', onUpdate: render })
    }, root)
    return () => {
      ctx.revert()
      lockScroll(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || exiting.current || !drawn.current) return
    exiting.current = true
    drawn.current.then(() => {
      gsap.context(() => {
        gsap
          .timeline({
            onComplete: () => {
              lockScroll(false)
              done.current()
            },
          })
          .to(progress.current, { p: 1, duration: 0.35, ease: 'power2.out', onUpdate: render })
          .to('.ld-a', { fillOpacity: 1, duration: 0.07, repeat: 4, yoyo: true, ease: 'steps(1)' })
          .to('.ld-line', { opacity: 0, duration: 0.25 }, '<')
          .to('.ld-hud', { opacity: 0, duration: 0.2 }, '<')
          .to('.ld-svg', { opacity: 0, duration: 0.12 })
          .to('.ld-tile', { opacity: 0, duration: 0.01, stagger: { each: 0.004, from: 'random' } }, '<')
      }, root)
    })
  }, [ready])

  return (
    <div ref={root} className="fixed inset-0 z-[100]" role="status" aria-label="Loading">
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {Array.from({ length: cols * rows }, (_, i) => (
          <div key={i} className="ld-tile -m-px bg-bg" />
        ))}
      </div>

      <svg
        className="ld-svg absolute inset-0 size-full overflow-visible"
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <g transform="scale(1,-1)" fill="none" stroke="#f2f2f2">
          {LINES.map(([a, b], i) => (
            <line key={i} className="ld-line" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} pathLength={1} strokeDasharray={1} strokeOpacity={0.2} strokeWidth={stroke} />
          ))}
          <path className="ld-a" d={GLYPH_A.path} pathLength={1} strokeDasharray={1} fill="#f2f2f2" fillOpacity={0} strokeWidth={stroke * 1.5} />
        </g>
      </svg>

      <div className="ld-hud pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-8">
        <div className="flex justify-between">
          <p className="label">Loading</p>
          <p className="label">Portfolio · 2026</p>
        </div>
        <div className="flex items-end justify-between">
          <p className="label">Ansh / Developer · Designer · Web3</p>
          <p className="display text-5xl tabular-nums sm:text-7xl">
            <span ref={counter}>000</span>
            <span className="text-accent">%</span>
          </p>
        </div>
      </div>
    </div>
  )
}
