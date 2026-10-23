import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { siGithub, siX } from 'simple-icons'
import { site } from '../content'
import { blip, whoosh } from '../lib/sound'

const ParticleLogo = lazy(() => import('../three/ParticleLogo'))

// envelope outline with the flap's V (24×24, filled frame so it extrudes like the brand marks)
const ENVELOPE = 'M2 4h20v16H2z M3.8 7.6v10.6h16.4V7.6L12 13.4z M4.6 5.8L12 11.1l7.4-5.3z'

const LINKS = [
  { label: 'GitHub', href: site.socials.find((s) => s.label === 'GitHub')!.href, path: siGithub.path },
  { label: 'X / Twitter', href: site.socials.find((s) => s.label === 'X')!.href, path: `thin:${siX.path}` },
  { label: 'Email', href: `mailto:${site.email}`, path: ENVELOPE },
]
const SHAPES = LINKS.map((l) => l.path)

// Social links as particle logos: arrows (or ← →) swap the mark, the beads scatter around the
// cursor, a click on the mark or the bracketed label opens the link.
export default function ParticleLinks() {
  const root = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(1)
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)

  // start building the 3D well before the block arrives (a few screens out), but only render it
  // while it's actually on screen
  useEffect(() => {
    const el = root.current!
    const near = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '300% 0px' })
    const seen = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '200px 0px' })
    near.observe(el)
    seen.observe(el)
    // or sooner: once the page has settled, while the visitor is still reading the top
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1))
    const timer = window.setTimeout(() => idle(() => setNear(true), { timeout: 3000 }), 6000)
    return () => {
      near.disconnect()
      seen.disconnect()
      window.clearTimeout(timer)
    }
  }, [])

  const go = (d: number) => {
    setIndex((i) => (i + d + LINKS.length) % LINKS.length)
    blip()
    whoosh(0.5)
  }
  const open = () => {
    const l = LINKS[index]
    if (l.href.startsWith('mailto:')) window.location.href = l.href
    else window.open(l.href, '_blank', 'noopener')
  }
  const at = (d: number) => LINKS[(index + d + LINKS.length) % LINKS.length]

  return (
    <div
      ref={root}
      role="group"
      aria-roledescription="carousel"
      aria-label="Find me elsewhere"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
        if (e.key === 'Enter' && e.target === e.currentTarget) open()
      }}
      className="relative h-[min(64svh,560px)] outline-none sm:h-[min(78svh,760px)]"
    >
      {/* a pool of darkness behind the mark so the busy room doesn't fight the beads, and a soft
          backlight in it so the dark obsidian mark stands out as a silhouette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,rgb(5_5_5/0.9),rgb(5_5_5/0.55)_60%,transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,rgb(242_242_242/0.3),rgb(242_242_242/0.1)_40%,transparent_70%)]" />
      {near && (
        <Suspense fallback={null}>
          <ParticleLogo shapes={SHAPES} index={index} active={visible} onPick={open} />
        </Suspense>
      )}

      {/* thin line arrows either side of the mark */}
      {([-1, 1] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => go(d)}
          aria-label={d < 0 ? `Previous: ${at(-1).label}` : `Next: ${at(1).label}`}
          className={`group absolute top-1/2 grid size-14 -translate-y-1/2 place-items-center ${d < 0 ? 'left-0 sm:left-[12%]' : 'right-0 sm:right-[12%]'}`}
        >
          <svg viewBox="0 0 80 12" aria-hidden className={`w-16 text-fg/70 transition-[transform,color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-fg ${d < 0 ? 'group-hover:-translate-x-1.5' : 'group-hover:translate-x-1.5'}`}>
            <path d={d < 0 ? 'M80 10H2l9-8' : 'M0 10h78l-9-8'} fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      ))}

      {/* bracketed label with the neighbours fading out either side */}
      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-6 sm:gap-10">
        <button type="button" onClick={() => go(-1)} className="label hidden w-28 text-right text-fg/30! transition-colors hover:text-fg/60! sm:block" tabIndex={-1}>
          {at(-1).label}
        </button>
        <a
          href={LINKS[index].href}
          target={LINKS[index].href.startsWith('mailto:') ? undefined : '_blank'}
          rel="noreferrer"
          aria-live="polite"
          className="label relative inline-flex min-h-12 min-w-44 items-center justify-center px-6 text-fg!"
        >
          {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
            <span key={c} aria-hidden className={`absolute size-2.5 border-fg/80 ${c}`} />
          ))}
          {LINKS[index].label}
        </a>
        <button type="button" onClick={() => go(1)} className="label hidden w-28 text-left text-fg/30! transition-colors hover:text-fg/60! sm:block" tabIndex={-1}>
          {at(1).label}
        </button>
      </div>
    </div>
  )
}
