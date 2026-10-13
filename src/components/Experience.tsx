import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { experience } from '../content'
import { TLink } from './PageTransition'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// Timeline: an accent line draws down with scroll; each entry slides in as it reaches it.
export default function Experience() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo('.ex-progress', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.ex-list', start: 'top 70%', end: 'bottom 60%', scrub: true } })
        gsap.utils.toArray<HTMLElement>('.ex-item').forEach((item) => {
          const tl = gsap.timeline({ scrollTrigger: { trigger: item, start: 'top 75%' } })
          tl.from(item.querySelector('.ex-dot'), { scale: 0, duration: 0.4, ease: 'back.out(3)' }).from(
            item.querySelectorAll('.ex-in'),
            { x: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 },
            '<0.1',
          )
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="experience" aria-labelledby="experience-title" className="relative overflow-x-clip px-4 py-32 sm:px-8">
      <p className="label mb-10">/ Experience</p>
      <div className="mb-20 flex flex-wrap items-end justify-between gap-8">
        <h2 id="experience-title" className="display text-[clamp(3rem,12vw,10rem)]">
          Journey
        </h2>
        {/* door to the journey page: a small dawn sun is the only warm colour on the dark site */}
        <TLink to="/journey" className="group flex min-h-11 items-center gap-4 rounded-full border border-grid bg-bg/90 py-2 pr-6 pl-2 transition-colors hover:border-fg">
          <span
            aria-hidden
            className="size-12 rounded-full bg-[radial-gradient(circle_at_50%_70%,#fff1dc_0_28%,#f4cf93_29%_45%,#d98e62_46%_70%,#3a2e22_71%)] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110 group-hover:rotate-12"
          />
          <span>
            <span className="block text-lg font-medium">Step outside</span>
            <span className="label">Walk the timeline →</span>
          </span>
        </TLink>
      </div>
      <ol className="ex-list relative ml-1.5 max-w-3xl">
        <span aria-hidden className="absolute top-0 bottom-0 left-0 w-px bg-grid" />
        <span aria-hidden className="ex-progress absolute top-0 bottom-0 left-0 w-px origin-top bg-accent" />
        {experience.map((e) => (
          <li key={e.title} className="ex-item relative grid gap-2 py-10 pl-10 sm:grid-cols-[10rem_1fr] sm:gap-8">
            <span aria-hidden className="ex-dot absolute top-12 -left-[5px] size-[11px] rounded-full bg-accent ring-4 ring-bg" />
            <p className="ex-in display text-4xl text-fg/90">{e.year}</p>
            <div className="ex-in">
              <h3 className="text-2xl font-medium">{e.title}</h3>
              <p className="mt-1 text-fg/60">{e.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
