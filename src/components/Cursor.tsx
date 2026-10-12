import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Desktop-only cursor: a dot that tracks exactly and a ring that trails, growing over links/buttons.
// Mounted only for fine pointers; the native cursor is hidden only once this is running.
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const d = dot.current!
    const r = ring.current!
    const dx = gsap.quickSetter(d, 'x', 'px')
    const dy = gsap.quickSetter(d, 'y', 'px')
    const rx = still ? gsap.quickSetter(r, 'x', 'px') : gsap.quickTo(r, 'x', { duration: 0.35, ease: 'power3.out' })
    const ry = still ? gsap.quickSetter(r, 'y', 'px') : gsap.quickTo(r, 'y', { duration: 0.35, ease: 'power3.out' })
    let shown = false

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (!shown) {
        shown = true
        gsap.to([d, r], { autoAlpha: 1, duration: 0.2 })
      }
      dx(e.clientX)
      dy(e.clientY)
      rx(e.clientX)
      ry(e.clientY)
      const hot = (e.target as Element | null)?.closest('a, button')
      gsap.to(r, { scale: hot ? 1.8 : 1, duration: 0.25, overwrite: 'auto' })
    }
    const leave = () => {
      shown = false
      gsap.to([d, r], { autoAlpha: 0, duration: 0.2 })
    }
    document.documentElement.classList.add('custom-cursor')
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      document.documentElement.classList.remove('custom-cursor')
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[120] mix-blend-difference">
      <div ref={dot} className="invisible absolute top-0 left-0 -mt-[3px] -ml-[3px] size-1.5 rounded-full bg-fg opacity-0" />
      <div ref={ring} className="invisible absolute top-0 left-0 -mt-[18px] -ml-[18px] size-9 rounded-full border border-fg opacity-0" />
    </div>
  )
}
