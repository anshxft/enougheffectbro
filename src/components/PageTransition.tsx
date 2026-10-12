import { createContext, useContext, useEffect, useMemo, useRef, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import gsap from 'gsap'
import { lockScroll, prefersReducedMotion, scrollToTarget } from '../lib/smooth-scroll'
import { whoosh } from '../lib/sound'

const GoContext = createContext<(to: string) => void>(() => {})
const useGo = () => useContext(GoContext)

// Route changes behind a wall of blocks: tiles pop in randomly to cover the page, the route
// changes underneath, then they pop out again on the new page.
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const wall = useRef<HTMLDivElement>(null)
  const covering = useRef(false)
  const first = useRef(true)

  const { cols, rows } = useMemo(() => {
    const cols = window.innerWidth < 768 ? 6 : 12
    return { cols, rows: Math.ceil((cols * window.innerHeight) / window.innerWidth) }
  }, [])

  const go = (to: string) => {
    if (covering.current) return
    const tiles = wall.current?.children
    // same page (e.g. a #hash) or reduced motion: no wall, since the uncover waits for a pathname change.
    // Scroll explicitly too: re-clicking the current #hash doesn't change the location.
    const url = new URL(to, window.location.href)
    if (prefersReducedMotion() || !tiles || url.pathname === pathname) {
      navigate(to)
      if (url.pathname === pathname && url.hash) setTimeout(() => scrollToTarget(url.hash), 60)
      return
    }
    covering.current = true
    whoosh(0.5)
    lockScroll(true)
    gsap
      .timeline({ onComplete: () => navigate(to) })
      .set(wall.current, { visibility: 'visible' })
      .fromTo(tiles, { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: { each: 0.006, from: 'random' } })
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
      .to(wall.current.children, { opacity: 0, duration: 0.01, stagger: { each: 0.006, from: 'random' } })
      .set(wall.current, { visibility: 'hidden' })
  }, [pathname])

  return (
    <GoContext.Provider value={go}>
      {children}
      <div
        ref={wall}
        aria-hidden
        className="pointer-events-none invisible fixed inset-0 z-[95] grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {Array.from({ length: cols * rows }, (_, i) => (
          <div key={i} className={`-m-px opacity-0 ${i % 7 === 3 ? 'bg-accent' : 'bg-bg'}`} />
        ))}
      </div>
    </GoContext.Provider>
  )
}

// Internal link that goes through the block transition (new-tab clicks still behave normally).
export function TLink({ to, onClick, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const go = useGo()
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    go(to)
  }
  return <a href={to} onClick={click} {...rest} />
}
