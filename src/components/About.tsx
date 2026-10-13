import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { site } from '../content'
import { tick, whoosh } from '../lib/sound'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

const words = (s: string) => s.split(' ')

// The one light section. The white stage wipes up over the dark page and pins for ~1.5 screens:
// the statement fills in word by word with the scroll, then "real money moves." gets swept into an
// inverted black block. A huge outlined ABOUT drifts behind; the numbers count up, the bio rises.
export default function About() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.ab-stage',
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top top', scrub: true, onEnter: () => whoosh(0.6) },
          },
        )

        const pinned = { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true }
        gsap.fromTo('.ab-outline', { xPercent: 8 }, { xPercent: -30, ease: 'none', scrollTrigger: { ...pinned, start: 'top bottom' } })

        // statement: words go from ghost to ink, then the highlight block sweeps left to right
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: 'top 15%', end: 'bottom 110%', scrub: 0.6 } })
          .fromTo('.ab-word', { opacity: 0.12 }, { opacity: 1, ease: 'none', duration: 0.3, stagger: 0.12 })
          .call(() => tick())
          .fromTo('.ab-hl-cover', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.6 })
          .to({}, { duration: 0.3 }) // hold the finished line before the section scrolls away

        gsap.from('.ab-stat', { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: root.current, start: 'top 10%' } })
        root.current!.querySelectorAll<HTMLElement>('.ab-num').forEach((el) => {
          const end = Number(el.dataset.value) // not textContent: StrictMode's second setup would read the 0 left by the first
          const o = { v: 0 }
          gsap.to(o, {
            v: end,
            duration: 1.4,
            ease: 'power3.out',
            onUpdate: () => (el.textContent = String(Math.round(o.v))),
            scrollTrigger: { trigger: root.current, start: 'top 10%' },
          })
        })

        SplitText.create('.ab-para', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: root.current, start: 'top 10%' } }),
        })
        gsap.from('.ab-skill', { autoAlpha: 0, y: 16, stagger: 0.06, duration: 0.5, delay: 0.3, scrollTrigger: { trigger: root.current, start: 'top 10%' } })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="about" aria-labelledby="about-title" className="relative h-[250vh]">
      <div className="ab-stage sticky top-0 flex h-dvh flex-col justify-between gap-8 overflow-hidden bg-fg px-4 py-20 text-bg sm:px-8 sm:py-24">
        <p
          aria-hidden
          className="ab-outline display pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-[34vw] whitespace-nowrap text-transparent [-webkit-text-stroke:1.5px_rgb(5_5_5/0.12)]"
        >
          About
        </p>

        <div className="label relative flex justify-between text-bg/60!">
          <p>/ About</p>
          <p>
            {site.location} · since 2020
          </p>
        </div>

        <h2 id="about-title" className="display relative text-[clamp(1.5rem,6vw,6rem)] leading-[1]" aria-label={`${site.aboutLead} ${site.aboutHighlight}`}>
          <span aria-hidden>
            {words(site.aboutLead).map((w, i) => (
              <span key={i} className="ab-word">
                {w}{' '}
              </span>
            ))}
            <span className="relative inline-block whitespace-nowrap">
              {words(site.aboutHighlight).map((w, i) => (
                <span key={i} className="ab-word">
                  {i ? ' ' : ''}
                  {w}
                </span>
              ))}
              {/* inverted copy on a black block, revealed by a left-to-right clip */}
              <span className="ab-hl-cover absolute -inset-x-[0.15em] -inset-y-[0.05em] bg-bg px-[0.15em] py-[0.05em] text-fg">{site.aboutHighlight}</span>
            </span>
          </span>
        </h2>

        <div className="relative grid items-end gap-8 lg:grid-cols-2 lg:gap-16">
          <dl className="grid grid-cols-3 items-start gap-4 border-t border-bg/15 pt-5">
            {site.aboutStats.map((s) => (
              <div key={s.label} className="ab-stat flex flex-col-reverse">
                <dt className="label mt-2 text-bg/60!">{s.label}</dt>
                <dd data-value={s.value} className="ab-num display text-[clamp(2.25rem,5vw,5rem)]">{s.value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="ab-para text-base leading-relaxed sm:text-xl">{site.about}</p>
            <ul className="ab-skills mt-6 flex flex-wrap gap-2">
              {site.skills.map((s) => (
                <li key={s} className="ab-skill label rounded-full border border-bg/25 px-4 py-2 text-bg!">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
