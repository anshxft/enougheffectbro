import { useEffect, useRef } from 'react'

// Giant wordmark whose letters respond to the cursor through Archivo's variable axes: the letter
// nearest the pointer goes wide and heavy, distant ones narrow and light. Idea from React Bits'
// TextPressure, rebuilt lean: our own font's wdth/wght axes, one rect read per letter per frame,
// and the loop runs only while the wordmark is on screen. Touch and reduced motion get the
// resting state (full width, heavy).
const WIDTH = { min: 62, max: 125 }
const WEIGHT = { min: 200, max: 900 }

export default function PressureWordmark({ text }: { text: string }) {
  const root = useRef<HTMLParagraphElement>(null)
  const letters = useRef<HTMLSpanElement[]>([])

  useEffect(() => {
    const el = root.current
    if (!el || !window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return
    const target = { x: -1e4, y: -1e4 }
    const eased = { x: -1e4, y: -1e4 }
    let raf = 0
    let visible = false
    let hasPointer = false // stay at the heavy resting state until the cursor actually moves

    const onMove = (e: PointerEvent) => {
      if (!hasPointer) {
        hasPointer = true
        eased.x = e.clientX
        eased.y = e.clientY
      }
      target.x = e.clientX
      target.y = e.clientY
    }
    const frame = () => {
      if (!visible) return
      raf = requestAnimationFrame(frame)
      if (!hasPointer) return
      eased.x += (target.x - eased.x) * 0.12
      eased.y += (target.y - eased.y) * 0.12
      const reach = el.getBoundingClientRect().width * 0.45
      for (const span of letters.current) {
        const r = span.getBoundingClientRect()
        const d = Math.hypot(eased.x - (r.left + r.width / 2), eased.y - (r.top + r.height / 2))
        const k = Math.max(0, 1 - d / reach) // 1 under the cursor, 0 beyond reach
        const wdth = WIDTH.min + (WIDTH.max - WIDTH.min) * k
        const wght = WEIGHT.min + (WEIGHT.max - WEIGHT.min) * k
        span.style.fontVariationSettings = `'wdth' ${wdth.toFixed(1)}, 'wght' ${wght.toFixed(0)}`
      }
    }
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      cancelAnimationFrame(raf)
      if (visible) raf = requestAnimationFrame(frame)
    })
    io.observe(el)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <p
      ref={root}
      aria-label={text}
      className="flex justify-between font-display text-[clamp(4rem,22vw,22rem)] leading-[0.8] tracking-tight uppercase select-none [font-variation-settings:'wdth'_125,'wght'_900]"
    >
      {text.split('').map((ch, i) => (
        <span
          key={i}
          aria-hidden
          ref={(s) => {
            if (s) letters.current[i] = s
          }}
          className="inline-block [font-variation-settings:inherit]"
        >
          {ch}
        </span>
      ))}
    </p>
  )
}
