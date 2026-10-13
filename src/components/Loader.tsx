import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { lockScroll, prefersReducedMotion } from '../lib/smooth-scroll'
import { playIntro } from '../three/fx'

type P = [number, number]
// Loader drawing in the old glyph's coordinate box (y up): the loop's silhouette, a ring centred at
// C with outer radius RO and inner radius RI, plus construction lines through it.
const C: P = [466, 344]
const RO = 360
const RI = 205
const circle = (r: number) => `M${C[0] - r} ${C[1]}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
const RING = circle(RO) + circle(RI)
const FAR = 6000
const diag = (deg: number): [P, P] => {
  const a = (deg * Math.PI) / 180
  return [
    [C[0] - Math.cos(a) * FAR, C[1] - Math.sin(a) * FAR],
    [C[0] + Math.cos(a) * FAR, C[1] + Math.sin(a) * FAR],
  ]
}
const LINES: [P, P][] = [
  ...[C[1] - RO, C[1] - RI, C[1], C[1] + RI, C[1] + RO].map((y): [P, P] => [[-FAR, y], [FAR, y]]),
  ...[C[0] - RO, C[0], C[0] + RO].map((x): [P, P] => [[x, -FAR], [x, FAR]]),
  diag(30),
  diag(-30),
]
const VIEW = { x: -420, y: -1050, w: 1773, h: 1413 }

// Full-screen intro: guides draw, the loop's ring outline traces itself, a counter runs until the WebGL
// scene has rendered (`ready`), then the ring fills and the screen dissolves in blocks.
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
          // the A fills in softly, the guides and HUD fade, then the whole curtain lifts away
          .to('.ld-a', { fillOpacity: 1, duration: 0.5, ease: 'power2.inOut' })
          .to('.ld-line', { opacity: 0, duration: 0.4 }, '<')
          .to('.ld-hud', { opacity: 0, duration: 0.3 }, '<')
          // the scene's iris starts opening underneath as the curtain begins to lift
          .call(() => void playIntro(prefersReducedMotion()), undefined, '+=0.1')
          .to(root.current, { yPercent: -100, duration: 0.9, ease: 'power3.inOut' }, '<')
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
          <path className="ld-a" d={RING} fillRule="evenodd" pathLength={1} strokeDasharray={1} fill="#f2f2f2" fillOpacity={0} strokeWidth={stroke * 1.5} />
        </g>
      </svg>

      <div aria-hidden className="ld-hud pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-8">
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
