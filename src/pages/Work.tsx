import { useLayoutEffect, useRef } from 'react'
import { useParams } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import Header from '../components/Header'
import NotFound from './NotFound'
import { TLink } from '../components/PageTransition'
import { works } from '../content'
import { useSmoothScroll } from '../lib/smooth-scroll'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

// Case study: title rises letter by letter, screenshots open with a clip wipe as they scroll in,
// highlights and stack fade up. The tile-grid backdrop is plain CSS (no WebGL on this page).
// Keyed by slug: SplitText rewrites the title's DOM, so React can't patch it in place when
// "Next work" swaps the project; remounting gives every project a fresh tree and fresh animations.
export default function WorkPage() {
  const { slug } = useParams()
  return <WorkView key={slug} slug={slug} />
}

function WorkView({ slug }: { slug?: string }) {
  const root = useRef<HTMLElement>(null)
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const index = works.findIndex((w) => w.slug === slug)
  const work = works[index]
  const next = works[(index + 1) % works.length]
  useSmoothScroll()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useGSAP(
    () => {
      if (!work) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        SplitText.create('.wk-title', {
          type: 'chars',
          mask: 'chars',
          onSplit: (self) => gsap.from(self.chars, { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.03, delay: 0.35 }),
        })
        gsap.from('.wk-meta', { y: 20, autoAlpha: 0, duration: 0.7, stagger: 0.08, delay: 0.7 })
        gsap.utils.toArray<HTMLElement>('.wk-shot').forEach((el) => {
          gsap.fromTo(el, { clipPath: 'inset(12% 12% 12% 12% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 35%', scrub: true } })
          gsap.fromTo(el.firstElementChild, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 90%', end: 'bottom top', scrub: true } })
        })
        gsap.utils.toArray<HTMLElement>('.wk-up').forEach((el) =>
          gsap.from(el, { y: 40, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } }),
        )
      })
    },
    { scope: root },
  )

  if (!work) return <NotFound />

  return (
    <>
      <Header />
      <main
        ref={root}
        id="content"
        tabIndex={-1}
        className="outline-none bg-[linear-gradient(var(--color-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-grid)_1px,transparent_1px)] bg-[size:72px_72px] px-4 pt-32 pb-20 sm:px-8"
      >
        <TLink to="/#works" className="wk-meta label inline-flex min-h-11 items-center hover:text-fg">
          ← All works
        </TLink>
        <p className="wk-meta label mt-10">
          {String(index + 1).padStart(2, '0')} / {String(works.length).padStart(2, '0')} · {work.year}
        </p>
        <h1 className="wk-title display mt-4 text-[clamp(2rem,8.5vw,10rem)]">{work.title}</h1>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <a href={work.url} target="_blank" rel="noreferrer" className="wk-meta label rounded-full bg-accent px-5 py-3 text-fg! transition-colors hover:bg-fg hover:text-bg!">
            Visit {work.urlLabel} ↗
          </a>
          <ul className="wk-meta flex flex-wrap gap-2">
            {work.tags.map((t) => (
              <li key={t} className="label rounded-full border border-grid bg-bg px-3 py-1">
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* product shot on pure black, screen-blended so it floats on the page grid instead of sitting in a box.
            The blend sits on the figure: its scroll clip-path makes it the group that meets the page. */}
        <figure className="wk-shot mt-20 mix-blend-screen">
          {work.hero.film && !still ? (
            <video
              src={work.hero.film}
              poster={work.hero.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={work.hero.alt}
              className="block aspect-video w-full object-cover"
            />
          ) : (
            <img src={work.hero.image} alt={work.hero.alt} width={1024} height={637} className="block w-full" />
          )}
        </figure>

        <p className="wk-up mt-24 max-w-3xl bg-bg text-2xl leading-snug sm:text-4xl">{work.summary}</p>

        {work.devices && (
          <figure className="wk-shot mt-24 mix-blend-screen">
            <img src={work.devices.src} alt={work.devices.alt} width={1024} height={637} loading="lazy" className="mx-auto block w-full max-w-5xl" />
          </figure>
        )}

        <div className="mt-24 space-y-10 sm:space-y-16">
          {work.images.map((img, i) => (
            <figure key={img.src}>
              <div className="wk-shot overflow-hidden rounded-2xl border border-grid">
                <img src={img.src} alt={img.alt} width={1280} height={800} loading={i ? 'lazy' : 'eager'} className="block w-full" />
              </div>
              <figcaption className="label mt-3 bg-bg">{img.alt}</figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-24 grid gap-12 sm:grid-cols-2">
          <div className="wk-up bg-bg">
            <p className="label mb-6">/ Highlights</p>
            <ul className="space-y-4">
              {work.highlights.map((h) => (
                <li key={h} className="border-t border-grid pt-4 text-fg/80">
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="wk-up bg-bg">
            <p className="label mb-6">/ Stack</p>
            <ul className="flex flex-wrap gap-2">
              {work.tech.map((t) => (
                <li key={t} className="rounded-full border border-grid px-4 py-2 font-mono text-sm">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <TLink to={`/work/${next.slug}`} className="group mt-32 block border-t border-grid bg-bg pt-10">
          <p className="label">Next work →</p>
          <p className="display mt-4 text-[clamp(2rem,8.5vw,10rem)] transition-colors group-hover:text-accent">{next.title}</p>
        </TLink>
      </main>
    </>
  )
}
