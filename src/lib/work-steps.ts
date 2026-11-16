import { useEffect } from 'react'
import { works } from '../content'
import { autoScrolling, lenis, setScrollGate } from './smooth-scroll'
import { cardP, RING_END, RING_START } from './work-ring'

// Card-by-card scrolling through the works ring. Stops: just before the first project's first card,
// every card of every project dead centre (in order), and just after the last project's last card.
// Inside that range one wheel or swipe gesture moves exactly one stop, so a hard flick can't skip
// cards or projects (the last card of one project steps straight to the first of the next), and if the
// page ever comes to rest between stops it glides to the nearest one: no card stays parked at the side.
const STEP_S = 0.75
const QUIET_MS = 120 // a gap this long between wheel events (or a change of direction) starts a new gesture
const TOUCH_MIN = 12 // px of finger travel before a swipe counts
const EDGE = 4

const ease = (t: number) => 1 - (1 - t) ** 3

// measured once and again only when the page height changes (resize, fonts, images), never per scroll event
let cache: { key: number; stops: number[] } | null = null
function workStops(): number[] {
  const key = document.documentElement.scrollHeight * 10000 + window.innerHeight
  if (cache?.key === key) return cache.stops
  const stops = measureStops()
  cache = { key, stops }
  return stops
}

function measureStops(): number[] {
  const vh = window.innerHeight
  const per = works.flatMap((w) => {
    const el = document.getElementById(`work-${w.slug}`)
    if (!el) return []
    const top = el.getBoundingClientRect().top + window.scrollY
    const span = el.offsetHeight + vh
    const y = (p: number) => Math.round(p * span - vh + top)
    const n = w.images.length
    return [{ start: y(RING_START), cards: Array.from({ length: n }, (_, i) => y(cardP(i, n))), end: y(RING_END) }]
  })
  if (!per.length) return []
  return [per[0].start, ...per.flatMap((p) => p.cards), per[per.length - 1].end]
}

const inZone = (s: number[], y: number) => s.length > 0 && y >= s[0] - EDGE && y <= s[s.length - 1] + EDGE

export function useWorkSteps() {
  useEffect(() => {
    let busyUntil = 0
    const isBusy = () => performance.now() < busyUntil
    let last = 0
    let lastDir = 0
    let aim = 0 // the stop the current glide is heading for
    let wasInZone = false
    let touchTravel = 0
    let touchSpent = false // this finger-down has already moved a card
    let settleTimer = 0
    const locked = () => autoScrolling || document.documentElement.style.overflow === 'hidden'

    // cards of one project are close; stepping across to the next project takes a little longer
    const go = (y: number) => {
      const dist = Math.abs(y - window.scrollY) / window.innerHeight
      const dur = Math.min(1.6, Math.max(STEP_S, dist * 0.9))
      aim = y
      // whatever gesture caused this glide is spent; only a new one moves on
      wasInZone = true
      touchSpent = true
      last = performance.now()
      busyUntil = performance.now() + dur * 1000 + 60
      if (lenis) lenis.scrollTo(y, { duration: dur, easing: ease, force: true })
      else window.scrollTo({ top: y })
    }

    setScrollGate(({ deltaY, event }) => {
      if (event.type === 'touchstart') {
        touchSpent = false
        touchTravel = 0
        return true
      }
      if (!lenis || locked() || Math.abs(deltaY) < 0.5) return true
      const down = deltaY > 0
      // mid-glide, a new gesture continues from where the glide is heading, not from where it is now
      const y = isBusy() ? aim : lenis.animatedScroll
      const stops = workStops()
      const target = inZone(stops, y) ? (down ? stops.find((s) => s > y + EDGE) : [...stops].reverse().find((s) => s < y - EDGE)) : undefined
      if (target === undefined) {
        wasInZone = false
        return true // outside the works, or leaving a project at its ends: scroll freely
      }
      if (event.cancelable) event.preventDefault()
      const now = performance.now()
      const dir = down ? 1 : -1
      const fresh = now - last > QUIET_MS || dir !== lastDir
      lastDir = dir
      const entering = !wasInZone
      wasInZone = true
      last = now
      if (event.type.startsWith('touch')) {
        // one swipe moves at most one card; lifting the finger (Lenis forwards touchend with the
        // fling's velocity) is not a new swipe
        if (event.type === 'touchend' || touchSpent) return false
        touchTravel += deltaY
        if (Math.abs(touchTravel) < TOUCH_MIN) return false
        touchTravel = 0
        go(target)
        return false
      }
      if (!(fresh || entering)) return false
      touchTravel = 0
      go(target)
      return false
    })

    // a native touch fling (no events reach the gate) that coasts into a project stops at its first card
    let prevY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (!isBusy() && !locked()) {
        const s = workStops()
        if (s.length && prevY < s[0] - EDGE && y >= s[0] - EDGE) go(s[1])
        else if (s.length && prevY > s[s.length - 1] + EDGE && y <= s[s.length - 1] + EDGE) go(s[s.length - 2])
      }
      prevY = y
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(settle, 180)
    }
    // resting between stops (scrollbar drag, keys, an interrupted glide): go to the nearest
    const settle = () => {
      if (isBusy() || locked()) return
      const y = window.scrollY
      const stops = workStops()
      if (!inZone(stops, y)) return
      const best = stops.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a))
      if (Math.abs(best - y) > 2) go(best)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      setScrollGate(null)
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(settleTimer)
    }
  }, [])
}
