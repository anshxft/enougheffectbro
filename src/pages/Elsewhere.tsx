import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { elsewhere } from '../content'
import { TLink } from '../components/PageTransition'
import { SoundToggle } from '../components/Sound'
import { nature } from '../lib/sound'
import { lenis, prefersReducedMotion, useSmoothScroll } from '../lib/smooth-scroll'
import type { WalkInput } from '../three/Valley'

const PATH_METRES = 270 // length of the valley path (src/three/Valley.tsx), for keyboard walking speed

const Valley = lazy(() => import('../three/Valley'))

gsap.registerPlugin(ScrollTrigger)

// A quiet alpine valley seen over a hiker's shoulder. The scroll is hidden: scrolling (or holding
// W / ↑, Shift to run) walks him along the path, the mouse looks around. src/three/Valley.tsx
// draws the world; this page turns input into progress and shows the words on top.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export default function Elsewhere() {
  useSmoothScroll()
  const main = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLAnchorElement>(null)
  const inputRef = useRef<WalkInput>({ p: 0, lookX: 0, lookY: 0 })

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    // the scrollbar would give the trick away
    document.documentElement.classList.add('no-scrollbar')
    return () => document.documentElement.classList.remove('no-scrollbar')
  }, [])

  useEffect(() => {
    const el = stage.current!
    const q = (s: string) => el.querySelector<HTMLElement>(s)!
    const intro = q('[data-intro]')
    const hint = q('[data-hint]')
    const outro = q('[data-outro]')
    const input = inputRef.current
    const sound = nature()
    let walked = 0
    let lastP = 0

    const st = ScrollTrigger.create({ trigger: main.current, start: 'top top', end: 'bottom bottom', onUpdate: (s) => (input.p = s.progress) })

    // keyboard: W / ↑ forward, S / ↓ back, Shift runs
    const keys = new Set<string>()
    const MOVE = ['w', 's', 'arrowup', 'arrowdown', 'shift']
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back.current?.click()
      const k = e.key.toLowerCase()
      if (MOVE.includes(k)) {
        keys.add(k)
        if (k !== 'shift') e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    const blur = () => keys.clear()
    // mouse looks around (fine pointers only; on touch the camera just follows)
    const look = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      input.lookX = (e.clientX / innerWidth) * 2 - 1
      input.lookY = (e.clientY / innerHeight) * 2 - 1
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    window.addEventListener('pointermove', look)

    const frame = (_: number, deltaMs: number) => {
      const dt = Math.min(0.05, deltaMs / 1000)
      const dir = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
      if (dir) {
        const metres = dir * (keys.has('shift') ? 5 : 1.6) * dt
        const range = document.documentElement.scrollHeight - innerHeight
        const delta = (metres / PATH_METRES) * range
        if (lenis) lenis.scrollTo(lenis.targetScroll + delta, { immediate: true })
        else window.scrollBy(0, delta)
      }
      walked += Math.abs(input.p - lastP) * PATH_METRES
      lastP = input.p
      intro.style.opacity = String(1 - clamp01(walked / 12))
      hint.style.opacity = String(1 - clamp01(walked / 30))
      const end = clamp01((input.p - 0.95) / 0.04)
      outro.style.opacity = String(end)
      outro.style.pointerEvents = end > 0.5 ? 'auto' : 'none'
      sound.setTime(input.p * 0.8)
    }
    gsap.ticker.add(frame)

    gsap.to(q('[data-wash]'), { autoAlpha: 0, duration: prefersReducedMotion() ? 0.01 : 1.8, ease: 'power2.out', delay: 0.8 })

    return () => {
      gsap.ticker.remove(frame)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      window.removeEventListener('pointermove', look)
      st.kill()
      sound.stop()
    }
  }, [])

  return (
    <main ref={main} id="content" tabIndex={-1} className="relative h-[1100vh] outline-none">
      <h1 className="sr-only">Elsewhere: a quiet valley to walk through</h1>
      <div ref={stage} className="sticky top-0 h-svh overflow-hidden bg-[#f7e5cd] text-[#2a2420]">
        <Suspense fallback={null}>
          <Valley input={inputRef} />
        </Suspense>

        <div data-intro className="pointer-events-none absolute inset-x-0 top-[18%] px-4 text-center">
          <p className="display text-[clamp(2.5rem,9vw,8rem)] text-[#fff7ec] [text-shadow:0_2px_30px_rgb(80_50_30/0.35)]">{elsewhere.intro}</p>
        </div>
        <p data-hint className="label pointer-events-none absolute inset-x-0 bottom-10 text-center text-[#fff7ec]! [text-shadow:0_1px_8px_rgb(40_25_15/0.6)]">
          <span className="pointer-coarse:hidden">{elsewhere.hint}</span>
          <span className="hidden pointer-coarse:inline">{elsewhere.hintTouch}</span>
        </p>

        <div data-outro className="absolute inset-x-0 top-[20%] px-4 text-center opacity-0">
          <p className="display text-[clamp(2rem,6vw,5.5rem)] text-[#fff7ec] [text-shadow:0_2px_30px_rgb(80_50_30/0.35)]">{elsewhere.outro}</p>
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

        <div data-wash aria-hidden className="pointer-events-none absolute inset-0 bg-[#f7e5cd]" />
      </div>
    </main>
  )
}
