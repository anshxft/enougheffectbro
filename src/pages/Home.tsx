import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useLocation } from 'react-router'
import { TLink } from '../components/PageTransition'
import About from '../components/About'
import Contact from '../components/Contact'
import Experience from '../components/Experience'
import Header from '../components/Header'
import HeroHud from '../components/HeroHud'
import Loader from '../components/Loader'
import Services from '../components/Services'
import Section from '../components/Section'
import { site, works } from '../content'
import { prefersReducedMotion, scrollToTarget, useSmoothScroll } from '../lib/smooth-scroll'
import { introPlayed, playIntro } from '../three/fx'

const Scene = lazy(() => import('../three/Scene'))

export default function Home() {
  useSmoothScroll()
  // WebGL draws "ANSH" itself once it's up; the h1 stays for screen readers and as the no-WebGL fallback.
  const [webgl, setWebgl] = useState(false)
  // Loader plays once per visit; it gives up waiting for WebGL after 8s so a broken GPU never blocks the site.
  const [withLoader] = useState(() => !introPlayed())
  const [loading, setLoading] = useState(withLoader)
  const [timedOut, setTimedOut] = useState(false)
  const heroMeta = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [])

  useLayoutEffect(() => {
    if (withLoader) gsap.set([heroMeta.current, document.querySelector('header')], { autoAlpha: 0 })
    else playIntro(true)
  }, [withLoader])

  // #works etc. from the nav or another page: scroll there once the page (and loader) allow it
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash || loading) return
    const t = setTimeout(() => scrollToTarget(hash), 60)
    return () => clearTimeout(t)
  }, [hash, loading])

  const finishLoading = () => {
    setLoading(false)
    playIntro(prefersReducedMotion())
    // element, not a 'header' selector: this runs from the loader's GSAP context, which scopes selectors to the loader
    gsap.to(document.querySelector('header'), { autoAlpha: 1, duration: 0.6, delay: 0.6 })
    gsap.fromTo(heroMeta.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.8, ease: 'power3.out' })
  }

  return (
    <>
      <Suspense fallback={null}>
        <Scene onReady={() => setWebgl(true)} />
      </Suspense>
      {loading && <Loader ready={webgl || timedOut} onDone={finishLoading} />}
      <Header />
      <main id="content" tabIndex={-1} className="relative z-10 outline-none">
        <section id="top" className="relative flex min-h-svh flex-col justify-end px-4 pb-10 sm:px-8">
          <h1
            className={`display absolute inset-0 flex items-center justify-center text-[clamp(4rem,24vw,24rem)] transition-opacity duration-700 ${webgl ? 'opacity-0' : ''}`}
          >
            {site.name}
          </h1>
          <HeroHud />
          <div ref={heroMeta} className="relative mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="max-w-md text-lg text-fg/80">{site.tagline}</p>
            <p className="label">Based in {site.location}</p>
          </div>
        </section>

        <Section id="works" label="Works">
          <h2 className="display mb-16 text-[clamp(3rem,12vw,10rem)]">Works</h2>
          {/* Each project pins for ~3 screens; the WebGL screen (src/three/Works.tsx) reads this element's scroll position. */}
          {works.map((w, i) => (
            <article key={w.slug} id={`work-${w.slug}`} aria-labelledby={`work-${w.slug}-title`} className="relative h-[300vh]">
              <div className="sticky top-0 flex h-dvh flex-col justify-end pb-10">
                {/* screenshots: shown as a still when there is no WebGL, otherwise kept for screen readers only */}
                <div className={webgl ? 'sr-only' : 'absolute inset-x-0 top-24 grid gap-4 sm:grid-cols-3'}>
                  {w.images.map((img) => (
                    <img key={img.src} src={img.src} alt={img.alt} loading="lazy" className="w-full rounded-lg" />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/70 to-transparent -mx-4 sm:-mx-8" aria-hidden />
                <div className="relative flex flex-wrap items-end justify-between gap-6">
                  <div className="max-w-xl">
                    <p className="font-mono text-sm tracking-widest text-fg/80">
                      {w.year} · {String(i + 1).padStart(2, '0')} / {String(works.length).padStart(2, '0')}
                    </p>
                    <h3 id={`work-${w.slug}-title`} className="mt-2 text-[clamp(2rem,4.2vw,4rem)] leading-tight font-medium tracking-tight">
                      {w.title}
                    </h3>
                    <p className="mt-1 text-fg/80 sm:text-lg">{w.summary}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {w.tags.map((t) => (
                        <li key={t} className="rounded-sm border border-fg/40 bg-bg/50 px-2.5 py-1 font-mono text-xs tracking-wider">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <TLink to={`/work/${w.slug}`} className="group inline-flex min-h-11 items-center gap-2 font-mono text-base tracking-widest sm:text-lg">
                    <span className="border-b border-transparent transition-colors group-hover:border-fg">View case study</span>
                    <span className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
                  </TLink>
                </div>
              </div>
            </article>
          ))}
        </Section>

        <About />
        <Services />
        <Experience />
        <Contact />
      </main>
    </>
  )
}
