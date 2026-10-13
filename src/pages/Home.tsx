import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
import { useLocation } from 'react-router'
import { TLink } from '../components/PageTransition'
import About from '../components/About'
import Contact from '../components/Contact'
import Experience from '../components/Experience'
import Header from '../components/Header'
import HeroHud from '../components/HeroHud'
import { ThinkingOrb } from 'thinking-orbs'
import Loader from '../components/Loader'
import Services from '../components/Services'
import Section from '../components/Section'
import { site, works } from '../content'
import { prefersReducedMotion, scrollToTarget, scrollToY, useSmoothScroll } from '../lib/smooth-scroll'
import { cardP, RING_END, RING_START, WORK_VH } from '../lib/work-ring'
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
  const heroFade = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [])

  useLayoutEffect(() => {
    if (withLoader) gsap.set([heroMeta.current, document.querySelector('header'), document.getElementById('hero-hud')], { autoAlpha: 0 })
    else playIntro(true)
  }, [withLoader])

  // hero captions + HUD fade out over the first ~third of a screen of scrolling
  useEffect(() => {
    const tween = gsap.to(heroFade.current, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: '#top', start: 'top top', end: '35% top', scrub: true },
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])

  // works captions: fade in once the screens have swung in, out before they swing away
  // (article progress p = (vh - top) / (height + vh); see src/three/Works.tsx)
  useEffect(() => {
    const triggers = gsap.utils.toArray<HTMLElement>('[id^="work-"]').map((article) => {
      const caption = article.querySelectorAll('.wk-caption > *')
      const pAt = (v: number) => `top ${100 - v * (WORK_VH + 100)}%` // article top position at progress p
      return gsap.timeline({ scrollTrigger: { trigger: article, start: pAt(0.18), end: pAt(0.8), scrub: true } })
        .fromTo(caption, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: 'none' })
        .to(caption, { opacity: 1, duration: 0.8 })
        .to(caption, { opacity: 0, duration: 0.1, ease: 'none' })
    })
    return () => triggers.forEach((tl) => {
      tl.scrollTrigger?.kill()
      tl.kill()
    })
  }, [])

  // works ring snap: once scrolling settles inside a project, glide to the nearest card so a quick
  // flick never leaves a card half-turned or skipped
  useEffect(() => {
    let timer = 0
    let snapping = false
    const settle = () => {
      if (snapping || document.documentElement.style.overflow === 'hidden') return
      const vh = window.innerHeight
      for (const [k, w] of works.entries()) {
        const el = document.getElementById(`work-${w.slug}`)
        if (!el) continue
        const top = el.getBoundingClientRect().top + window.scrollY
        const span = el.offsetHeight + vh
        const p = (window.scrollY + vh - top) / span
        if (p <= RING_START || p >= RING_END) continue
        const n = works[k].images.length
        let best = window.scrollY
        let bestD = Infinity
        for (let i = 0; i < n; i++) {
          const y = cardP(i, n) * span - vh + top
          const d = Math.abs(y - window.scrollY)
          if (d < bestD) {
            bestD = d
            best = y
          }
        }
        // only between the first and last card: entering / leaving stays free
        const first = cardP(0, n) * span - vh + top
        const last = cardP(n - 1, n) * span - vh + top
        if (window.scrollY < first - vh * 0.35 || window.scrollY > last + vh * 0.35) return
        if (bestD > 2) {
          snapping = true
          scrollToY(best, 0.7)
          window.setTimeout(() => (snapping = false), 800)
        }
        return
      }
    }
    const onScroll = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(settle, 160)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [])

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
    gsap.to(document.getElementById('hero-hud'), { autoAlpha: 1, duration: 0.8, delay: 1 })
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
          {/* captions + HUD fade out as the hero scrolls away, so they never ride up under the header */}
          <div ref={heroFade}>
          <HeroHud />
          <div ref={heroMeta} className="relative mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="max-w-md text-lg text-fg/80">{site.tagline}</p>
            <div className="flex items-center gap-4">
              <p className="label flex items-center gap-2 text-fg/80!">
                <ThinkingOrb state="breathing" size={20} theme="dark" aria-hidden />
                {site.status}
              </p>
              <p className="label">Based in {site.location}</p>
            </div>
          </div>
          </div>
        </section>

        <Section id="works" label="Works">
          {/* scroll stretch where the glass A turns and big words sweep round the dome (src/three/Story.tsx) */}
          <div id="interlude" className="relative h-[260vh]">
            <h2 className="sr-only">Works</h2>
          </div>
          {/* Each project pins for ~3 screens; the WebGL screen (src/three/Works.tsx) reads this element's scroll position. */}
          {works.map((w, i) => (
            <article key={w.slug} id={`work-${w.slug}`} aria-labelledby={`work-${w.slug}-title`} className="relative" style={{ height: `${WORK_VH}vh` }}>
              <div className="sticky top-0 flex h-dvh flex-col justify-end pb-10">
                {/* screenshots: shown as a still when there is no WebGL, otherwise kept for screen readers only */}
                <div className={webgl ? 'sr-only' : 'absolute inset-x-0 top-24 grid gap-4 sm:grid-cols-3'}>
                  {w.images.map((img) => (
                    <img key={img.src} src={img.src} alt={img.alt} loading="lazy" className="w-full rounded-lg" />
                  ))}
                </div>
                {/* caption fades with the screens (in after they swing in, out before they swing away) */}
                <div className="wk-caption contents">
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
