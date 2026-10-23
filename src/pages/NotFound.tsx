import { useRef } from 'react'
import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { useGSAP } from '@gsap/react'
import Header from '../components/Header'
import { TLink } from '../components/PageTransition'
import PressureWordmark from '../components/PressureWordmark'
import { works } from '../content'
import { usePageMeta } from '../lib/page-meta'

gsap.registerPlugin(ScrambleTextPlugin, useGSAP)

// Lost visitors: a pressure-reactive 404, the line decodes in, and real ways back.
export default function NotFound() {
  const root = useRef<HTMLElement>(null)
  usePageMeta('Page not found — Ansh')

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.nf-in', { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, delay: 0.3 })
        gsap.to('.nf-line', { scrambleText: { text: '{original}', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/#', speed: 0.5 }, duration: 1.2, delay: 0.4 })
      })
    },
    { scope: root },
  )

  return (
    <>
      <Header />
      <main ref={root} id="content" tabIndex={-1} className="flex min-h-svh flex-col justify-center px-4 pt-24 pb-12 outline-none sm:px-8">
        <h1 className="sr-only">Page not found</h1>
        <div className="nf-in">
          <PressureWordmark text="404" />
        </div>
        <p className="nf-line nf-in label mt-8 text-fg/80!">This page drifted off the loop</p>
        <nav aria-label="Ways back" className="mt-12 flex flex-wrap gap-3">
          <TLink to="/" className="nf-in label inline-flex min-h-11 items-center rounded-full bg-fg px-6 text-bg!">
            ← Home
          </TLink>
          {works.map((w) => (
            <TLink key={w.slug} to={`/work/${w.slug}`} className="nf-in label inline-flex min-h-11 items-center rounded-full border border-grid px-6 text-fg! hover:border-fg">
              {w.title}
            </TLink>
          ))}
        </nav>
      </main>
    </>
  )
}
