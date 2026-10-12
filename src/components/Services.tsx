import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { useGSAP } from '@gsap/react'
import { services } from '../content'
import { typing } from '../lib/sound'

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, useGSAP)

const TITLE = 'What I do'
const corners = ['-top-1.5 -left-1.5', '-top-1.5 -right-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5']

// Title decodes from noise, then the three cards rise in; "+" marks on each corner spin on hover.
export default function Services() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to('.sv-title', {
          scrambleText: { text: TITLE, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%/+', revealDelay: 0.35, speed: 0.5 },
          duration: 1.4,
          onStart: () => typing(18),
          scrollTrigger: { trigger: '.sv-title', start: 'top 80%' },
        })
        gsap.from('.sv-card', { y: 60, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.sv-grid', start: 'top 80%' } })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="services" aria-labelledby="services-title" className="relative px-4 py-32 sm:px-8">
      <p className="label mb-10">/ What I do</p>
      <h2 id="services-title" className="sv-title display mb-20 text-[clamp(3rem,12vw,10rem)]" aria-label={TITLE}>
        {TITLE}
      </h2>
      <div className="sv-grid grid gap-6 sm:grid-cols-3">
        {services.map((s, i) => (
          <article key={s.title} className="sv-card group relative border border-grid bg-bg/90 p-6 transition-colors hover:border-accent sm:p-8">
            {corners.map((c) => (
              <span
                key={c}
                aria-hidden
                className={`absolute ${c} font-mono text-sm leading-none text-muted transition-transform duration-500 group-hover:rotate-90 group-hover:text-accent`}
              >
                +
              </span>
            ))}
            <p className="label">{String(i + 1).padStart(2, '0')}</p>
            <h3 className="display mt-16 text-4xl transition-colors group-hover:text-accent sm:text-5xl">{s.title}</h3>
            <p className="mt-4 text-fg/70">{s.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
