import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { stack } from '../content'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

// Tool wall. Title letters rise out of a mask, tiles wipe up in a wave across the grid, and the
// 1px gaps between tiles catch a soft spotlight that follows the cursor.
export default function Stack() {
  const root = useRef<HTMLElement>(null)
  const grid = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const split = SplitText.create('.st-title', { type: 'chars', mask: 'chars' })
        gsap.from(split.chars, { yPercent: 105, duration: 1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.st-title', start: 'top 85%' } })
        gsap.from('.st-meta', { y: 16, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.st-title', start: 'top 85%' } })

        const wave = { each: 0.06, grid: 'auto', from: 'start' } as const
        gsap
          .timeline({ scrollTrigger: { trigger: grid.current, start: 'top 80%' } })
          .fromTo(
            '.st-tile',
            { clipPath: 'inset(100% 0% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.out', stagger: wave, clearProps: 'clipPath' },
          )
          .from('.st-logo', { yPercent: 40, scale: 0.9, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: wave }, 0.15)
          .from('.st-text', { y: 12, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: wave }, 0.25)
        return () => split.revert()
      })
    },
    { scope: root },
  )

  // spotlight: only the grid's own background moves, tiles stay untouched
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  const leave = (e: React.PointerEvent<HTMLDivElement>) => e.currentTarget.style.setProperty('--mx', '-999px')

  return (
    <section ref={root} id="stack" aria-labelledby="stack-title" className="relative px-4 py-32 sm:px-8">
      <p className="label mb-10">/ Stack</p>
      <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
        <h2 id="stack-title" className="st-title display text-[clamp(3rem,12vw,10rem)]">
          Stack
        </h2>
        <p className="st-meta label text-fg/80!">{stack.length} tools I ship with</p>
      </div>

      <div
        ref={grid}
        onPointerMove={move}
        onPointerLeave={leave}
        className="grid grid-cols-2 gap-px border border-grid lg:grid-cols-4"
        style={{
          ['--mx' as string]: '-999px',
          ['--my' as string]: '-999px',
          background: 'radial-gradient(380px circle at var(--mx) var(--my), rgb(242 242 242 / 0.7), transparent 70%), var(--color-grid)',
        }}
      >
        {stack.map((t, i) => (
          <article key={t.name} className="st-tile group relative flex aspect-square flex-col justify-between bg-bg/90 p-4 sm:p-6 lg:aspect-[5/4]">
            <div className="label flex justify-between">
              <span>{t.group}</span>
              <span>{String(i + 1).padStart(2, '0')}</span>
            </div>

            <div className="st-logo self-center">
              <div className="size-11 text-fg/85 transition-[transform,color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1.5 group-hover:scale-110 group-hover:text-fg sm:size-14">
                {t.icon ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-full">
                    <path d={t.icon.path} />
                  </svg>
                ) : (
                  <span aria-hidden className="display grid size-full place-items-center rounded-lg bg-current text-2xl sm:text-3xl">
                    <span className="text-bg">{t.name[0]}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="st-text">
              <h3 className="display text-[clamp(0.8rem,3.6vw,1.5rem)]">{t.name}</h3>
              <p className="mt-1 min-h-[2lh] text-xs text-fg/50 sm:min-h-0 transition-colors duration-300 group-hover:text-fg/80 sm:text-sm">{t.note}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
