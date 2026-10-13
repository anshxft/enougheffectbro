import { createContext, useContext, useEffect, useRef, type ComponentProps, type MouseEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import gsap from 'gsap'
import { lockScroll, prefersReducedMotion, scrollToTarget } from '../lib/smooth-scroll'
import { whoosh } from '../lib/sound'

const GoContext = createContext<(to: string) => void>(() => {})
const useGo = () => useContext(GoContext)

// Route changes behind a curtain: a black panel with a curved leading edge rises over the page,
// the route changes underneath, then the panel carries on up and off the new page.
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const wall = useRef<HTMLDivElement>(null)
  const covering = useRef(false)
  const first = useRef(true)

  const go = (to: string) => {
    if (covering.current) return
    const curtain = wall.current
    // same page (e.g. a #hash) or reduced motion: no wall, since the uncover waits for a pathname change.
    // Scroll explicitly too: re-clicking the current #hash doesn't change the location.
    const url = new URL(to, window.location.href)
    if (prefersReducedMotion() || !curtain || url.pathname === pathname) {
      navigate(to)
      if (url.pathname === pathname && url.hash) setTimeout(() => scrollToTarget(url.hash), 60)
      return
    }
    covering.current = true
    whoosh(0.5)
    lockScroll(true)
    gsap
      .timeline({ onComplete: () => navigate(to) })
      .set(curtain, { visibility: 'visible' })
      // rises from below; its top edge starts as a wide arc and flattens as it covers the screen
      .fromTo(curtain, { yPercent: 100, '--arc': '60%' }, { yPercent: 0, '--arc': '0%', duration: 0.7, ease: 'power3.inOut' })
      .fromTo(curtain.firstElementChild, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, '-=0.25')
  }

  // uncover after the new route has rendered
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!covering.current || !wall.current) return
    gsap
      .timeline({
        delay: 0.1,
        onComplete: () => {
          covering.current = false
          lockScroll(false)
        },
      })
      .to(wall.current.firstElementChild, { autoAlpha: 0, duration: 0.25 })
      // carries on upwards, now with the arc on its trailing (bottom) edge
      .fromTo(wall.current, { yPercent: 0, '--arc-b': '0%' }, { yPercent: -100, '--arc-b': '60%', duration: 0.75, ease: 'power3.inOut' }, '<')
      .set(wall.current, { visibility: 'hidden', '--arc-b': '0%' })
  }, [pathname])

  return (
    <GoContext.Provider value={go}>
      {children}
      <div
        ref={wall}
        aria-hidden
        className="pointer-events-none invisible fixed inset-0 z-[95] flex items-center justify-center bg-bg [border-radius:50%_50%_50%_50%/var(--arc)_var(--arc)_var(--arc-b)_var(--arc-b)]"
        style={{ '--arc': '0%', '--arc-b': '0%' } as React.CSSProperties}
      >
        <span className="display text-[clamp(2rem,6vw,5rem)] text-fg/15">Ansh</span>
      </div>
    </GoContext.Provider>
  )
}

// Internal link that goes through the block transition (new-tab clicks still behave normally).
export function TLink({ to, onClick, ...rest }: { to: string } & ComponentProps<'a'>) {
  const go = useGo()
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    go(to)
  }
  return <a href={to} onClick={click} {...rest} />
}
