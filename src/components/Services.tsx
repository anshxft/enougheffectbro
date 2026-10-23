import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { useGSAP } from '@gsap/react'
import { services } from '../content'
import { blip, typing } from '../lib/sound'

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, useGSAP)

const TITLE = 'What I do'

// An index of three full-width rows. Titles sit in outline; hovering a row wipes a white panel in
// from the left (a scaled layer, so it never repaints), fills the title and turns the arrow.
// Rows draw their top rule and slide in as the list scrolls up. Monochrome only.
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
        const list = { trigger: '.sv-list', start: 'top 80%' }
        gsap.from('.sv-rule', { scaleX: 0, transformOrigin: 'left', duration: 1.1, ease: 'expo.out', stagger: 0.12, scrollTrigger: list })
        gsap.from('.sv-in', { yPercent: 60, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, clearProps: 'transform', scrollTrigger: list })
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

      <ul className="sv-list border-b border-fg/20">
        {services.map((s, i) => (
          <li key={s.title} className="group relative overflow-hidden" onPointerEnter={() => blip()}>
            <span aria-hidden className="sv-rule absolute inset-x-0 top-0 h-px bg-fg/20" />
            {/* the hover panel: scaled in from the left */}
            <span
              aria-hidden
              className="absolute inset-0 origin-left scale-x-0 bg-fg transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100"
            />
            <div className="relative grid items-center gap-4 bg-bg/80 py-8 transition-colors duration-300 group-hover:bg-transparent group-hover:text-bg sm:grid-cols-[4rem_1fr_minmax(0,26rem)_3rem] sm:gap-8 sm:px-6 sm:py-10">
              <p className="sv-in label text-current! opacity-60">{String(i + 1).padStart(2, '0')}</p>
              <h3
                className="sv-in display text-[clamp(3rem,9vw,8rem)] text-transparent transition-colors duration-300 [-webkit-text-stroke:1.5px_rgb(242_242_242/0.8)] group-hover:text-bg group-hover:[-webkit-text-stroke:1.5px_transparent] max-sm:text-fg max-sm:[-webkit-text-stroke:0]"
              >
                {s.title}
              </h3>
              <div className="sv-in">
                <p className="text-current opacity-75">{s.body}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.tags.map((t) => (
                    <li key={t} className="label rounded-full border border-current px-3 py-1 text-current! opacity-60">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <span
                aria-hidden
                className="sv-in hidden text-3xl transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:rotate-45 sm:block"
              >
                ↗
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
