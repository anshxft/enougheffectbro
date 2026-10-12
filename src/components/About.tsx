import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { site } from '../content'
import { tick } from '../lib/sound'
import { glitchBurst } from '../three/fx'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

// The one light section. Pins for ~1.5 screens: the white stage wipes up over the dark page (with a
// glitch hit), a huge outlined ABOUT slides behind, a rainbow light bar swings, and the lead lines
// open in black blocks one after another; the paragraph rises line by line.
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
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top top', scrub: true, onEnter: () => glitchBurst(0.6, 0.5) },
          },
        )

        const pinned = { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true }
        gsap.fromTo('.ab-outline', { xPercent: 12 }, { xPercent: -28, ease: 'none', scrollTrigger: pinned })
        gsap.fromTo('.ab-bar', { rotate: -38, xPercent: -30 }, { rotate: 24, xPercent: 30, ease: 'none', scrollTrigger: { ...pinned, start: 'top bottom' } })

        const lines = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 20%', end: 'top -40%', scrub: true } })
        root.current!.querySelectorAll('.ab-line').forEach((line) => {
          lines
            .call(() => tick())
            .fromTo(line.querySelector('.ab-block'), { scaleX: 0 }, { scaleX: 1, ease: 'power2.inOut', duration: 1 })
            .fromTo(line.querySelector('.ab-text'), { autoAlpha: 0, yPercent: 40 }, { autoAlpha: 1, yPercent: 0, duration: 0.6 }, '-=0.3')
        })

        SplitText.create('.ab-para', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.ab-para', start: 'top 85%' } }),
        })
        gsap.from('.ab-skill', { autoAlpha: 0, y: 16, stagger: 0.06, duration: 0.5, scrollTrigger: { trigger: '.ab-skills', start: 'top 90%' } })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="about" aria-labelledby="about-title" className="relative h-[250vh]">
      <div className="ab-stage sticky top-0 flex h-dvh flex-col justify-between overflow-hidden bg-fg px-4 py-24 text-bg sm:px-8">
        {/* backdrop: outlined word + swinging light bar */}
        <p
          aria-hidden
          className="ab-outline display pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-[34vw] whitespace-nowrap text-transparent [-webkit-text-stroke:1.5px_rgb(5_5_5/0.18)]"
        >
          About
        </p>
        <div
          aria-hidden
          className="ab-bar pointer-events-none absolute top-1/2 left-1/2 h-[3px] w-[90vmin] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,#2b3bff,#ff3cac,#ffb400,transparent)] opacity-80 blur-[0.5px]"
        />

        <p className="label relative text-bg/60!">/ About</p>

        <div className="relative grid items-end gap-12 lg:grid-cols-[1.4fr_1fr]">
          <h2 id="about-title" className="flex flex-col items-start gap-2">
            {site.aboutLead.map((line) => (
              <span key={line} className="ab-line relative inline-block px-3 py-1">
                <span className="ab-block absolute inset-0 origin-left bg-bg" aria-hidden />
                <span className="ab-text display relative block text-[clamp(1.4rem,3.6vw,3.75rem)] whitespace-nowrap text-fg">{line}</span>
              </span>
            ))}
          </h2>
          <div>
            <p className="ab-para text-lg leading-relaxed sm:text-xl">{site.about}</p>
            <ul className="ab-skills mt-8 flex flex-wrap gap-2">
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
