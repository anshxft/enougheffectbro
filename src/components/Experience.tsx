import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { experience } from '../content'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// Timeline: a white line draws down with scroll; each entry slides in as it reaches it.
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
      <h2 id="experience-title" className="display mb-20 text-[clamp(3rem,12vw,10rem)]">
        Journey
      </h2>
      <ol className="ex-list relative ml-1.5 max-w-3xl">
        <span aria-hidden className="absolute top-0 bottom-0 left-0 w-px bg-grid" />
        <span aria-hidden className="ex-progress absolute top-0 bottom-0 left-0 w-px origin-top bg-accent" />
        {experience.map((e) => (
          <li key={e.title} className="ex-item relative grid gap-2 py-10 pl-10 sm:grid-cols-[10rem_1fr] sm:gap-8">
            <span aria-hidden className="ex-dot absolute top-12 -left-[5px] size-[11px] rounded-full bg-accent ring-4 ring-bg" />
            <p className="ex-in display self-start text-4xl text-fg/90">{e.year}</p>
            <div className="ex-in -mx-3 rounded-lg bg-bg/75 px-3 py-2">
              <h3 className="text-2xl font-medium">{e.title}</h3>
              <p className="mt-1 text-fg/60">{e.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
