import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { site } from '../content'
import ParticleLinks from './ParticleLinks'
import PressureWordmark from './PressureWordmark'

const LiquidLogo = lazy(() => import('./LiquidLogo'))

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

// Pulls its content toward the pointer while hovered, springs back on leave (fine pointers only).
function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useGSAP(() => {
    const el = ref.current!
    if (!window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return
    const x = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' })
    const y = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' })
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      x((e.clientX - (r.left + r.width / 2)) * strength)
      y((e.clientY - (r.top + r.height / 2)) * strength)
    }
    const leave = () => {
      x(0)
      y(0)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  })
  return (
    <span ref={ref} className="inline-block">
      {children}
    </span>
  )
}

// Ansh's local time in India, ticking each minute, with a guess at what he's doing at that hour.
function LocalTime() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })
  const hour = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hourCycle: 'h23' }))
  const status = site.hours.find((h) => hour < h.until)!.status
  return (
    <p className="ct-in label mt-4 flex items-center gap-2 text-fg/80!">
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-fg/60 motion-safe:animate-ping" />
        <span className="relative size-2 rounded-full bg-fg" />
      </span>
      {time} in {site.location} · {status}
    </p>
  )
}

// The liquid-chrome A turns its glyph into a height map on the main thread (a few hundred ms), so it
// only loads once the footer is about a screen away, never during the intro.
function FooterLogo() {
  const ref = useRef<HTMLSpanElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])
  const box = <span ref={ref} className="block h-14 w-[72px]" />
  return near ? <Suspense fallback={box}><LiquidLogo /></Suspense> : box
}

// Finale: the prism comes back (src/three/Scene.tsx watches #contact), "Let's talk" rises letter by letter.
export default function Contact() {
  const root = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        SplitText.create('.ct-title', {
          type: 'words,chars', // words keep a narrow screen from breaking mid-word
          mask: 'chars',
          onSplit: (self) =>
            gsap.from(self.chars, { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.04, scrollTrigger: { trigger: '.ct-title', start: 'top 85%' } }),
        })
        gsap.from('.ct-in', { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.08, scrollTrigger: { trigger: root.current, start: 'top 60%' } })
      })
    },
    { scope: root },
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      window.location.href = `mailto:${site.email}`
    }
  }

  return (
    <section ref={root} id="contact" aria-labelledby="contact-title" className="relative flex min-h-svh flex-col justify-between px-4 pt-32 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-8">
      <div>
        <p className="label mb-10">/ Contact</p>
        <p className="ct-in max-w-xl text-xl text-fg/70 sm:text-2xl">Building something on-chain, or hiring?</p>
        <LocalTime />
      </div>

      <div className="mt-16">
        <h2 id="contact-title">
          <a href={`mailto:${site.email}`} className="group relative inline-flex items-start gap-[0.12em] pb-[0.08em]">
            <span className="ct-title display text-[clamp(3rem,11vw,10rem)]">Let&apos;s talk</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="mt-[0.1em] size-[clamp(2rem,7vw,6.5rem)] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-[0.12em] group-hover:-translate-y-[0.12em]"
            >
              <path d="M7 17 17 7M8 7h9v9" fill="none" stroke="currentColor" strokeWidth="2.25" />
            </svg>
            {/* underline draws in from the left on hover */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-fg transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100"
            />
          </a>
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a href={`mailto:${site.email}`} className="ct-in mr-2 font-mono text-sm text-fg/70 transition-colors hover:text-fg sm:text-base">
            {site.email}
          </a>
          <Magnetic>
            <button type="button" onClick={copy} className="ct-in label inline-flex min-h-11 items-center rounded-full bg-accent px-6 text-fg! transition-colors hover:bg-fg hover:text-bg!" aria-live="polite">
              {copied ? 'Copied ✓' : 'Copy email'}
            </button>
          </Magnetic>
          {site.socials.map((s) => (
            <Magnetic key={s.label}>
              <a href={s.href} target="_blank" rel="noreferrer" className="ct-in label inline-flex min-h-11 items-center rounded-full border border-grid px-6 text-fg! transition-colors hover:border-fg">
                {s.label} ↗
              </a>
            </Magnetic>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <ParticleLinks />
      </div>

      <div className="mt-24">
        <PressureWordmark text={site.name} />
      </div>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-grid pt-6">
        <div className="flex items-center gap-3">
          <FooterLogo />
          <p className="label">© 2026 {site.name}</p>
        </div>
        <p className="label">Built with React, three.js & GSAP · {site.location}</p>
      </footer>
    </section>
  )
}
