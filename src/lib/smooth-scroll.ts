import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
// mobile URL bar showing/hiding resizes the viewport; don't recompute every pinned section for it
ScrollTrigger.config({ ignoreMobileResize: true })

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Current Lenis instance (null with reduced motion), so the loader can pause scrolling.
export let lenis: Lenis | null = null

// Lenis driven by GSAP's ticker so ScrollTrigger and smooth scroll share one clock.
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const instance = new Lenis({ lerp: 0.1, anchors: true })
    lenis = instance
    instance.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      instance.destroy()
      if (lenis === instance) lenis = null
    }
  }, [])
}

// Jump/scroll to an element, through Lenis when it's running.
export function scrollToTarget(selector: string, immediate = false) {
  const el = document.querySelector(selector)
  if (!(el instanceof HTMLElement)) return
  if (lenis) lenis.scrollTo(el, { immediate })
  else el.scrollIntoView({ behavior: immediate ? 'instant' : 'smooth' })
}

// Freeze page scroll (wheel, touch, keys) e.g. while the loader is up.
export function lockScroll(locked: boolean) {
  document.documentElement.style.overflow = locked ? 'hidden' : ''
  if (locked) lenis?.stop()
  else lenis?.start()
}
