import { useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { site } from '../content'

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

// Finale: the prism comes back (src/three/Scene.tsx watches #contact), the email rises letter by letter.
export default function Contact() {
  const root = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)
  const [user, domain] = site.email.split('@')

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        SplitText.create('.ct-email', {
          type: 'chars',
          mask: 'chars',
          onSplit: (self) =>
            gsap.from(self.chars, { yPercent: 110, duration: 0.8, ease: 'power3.out', stagger: 0.015, scrollTrigger: { trigger: '.ct-email', start: 'top 85%' } }),
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
        <h2 id="contact-title" className="ct-in max-w-xl text-2xl text-fg/80 sm:text-3xl">
          Building something on-chain, or hiring? Email me.
        </h2>
      </div>

      <div>
        <a href={`mailto:${site.email}`} className="ct-email display block text-[clamp(1.25rem,4.2vw,4rem)] normal-case transition-colors hover:text-accent">
          {/* two inline blocks so a narrow screen wraps at the @, never mid-word */}
          <span className="inline-block">{user}</span>
          <span className="inline-block">@{domain}</span>
        </a>
        <div className="mt-10 flex flex-wrap items-center gap-4">
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

      <footer className="mt-24 flex flex-wrap justify-between gap-4 border-t border-grid pt-6">
        <p className="label">© 2026 {site.name}</p>
        <p className="label">Built with React, three.js & GSAP · {site.location}</p>
      </footer>
    </section>
  )
}
