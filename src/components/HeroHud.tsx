import { useEffect, useRef } from 'react'
import { hud } from '../three/fx'

const toHex = (lin: number) =>
  Math.round(Math.min(1, Math.max(0, lin)) ** (1 / 2.2) * 255)
    .toString(16)
    .padStart(2, '0')

// Lab-style readout beside the hero: the glass A's live rotation, a dial that turns with it, and the
// room colour. Decorative (aria-hidden), desktop only; updated straight from the scene every frame.
export default function HeroHud() {
  const quat = useRef<HTMLSpanElement[]>([])
  const needle = useRef<SVGGElement>(null)
  const swatch = useRef<HTMLSpanElement>(null)
  const hex = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      hud.q.forEach((v, i) => {
        const el = quat.current[i]
        // ".42" style like a debug readout, but keep "1.00"
        const s = Math.abs(v).toFixed(2)
        if (el) el.textContent = (v < 0 ? '-' : ' ') + (s.startsWith('0') ? s.slice(1) : s)
      })
      needle.current?.setAttribute('transform', `rotate(${((hud.yaw * 180) / Math.PI).toFixed(1)} 40 40)`)
      const color = '#' + hud.tint.map(toHex).join('')
      if (swatch.current) swatch.current.style.background = color
      if (hex.current) hex.current.textContent = color.toUpperCase()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div aria-hidden className="pointer-events-none absolute top-24 right-8 hidden w-44 flex-col items-end gap-5 lg:flex">
      <div className="text-right">
        <p className="label mb-1.5">A / Rotation</p>
        <p className="flex gap-2 font-mono text-[11px] text-fg/80 tabular-nums">
          {['x', 'y', 'z', 'w'].map((axis, i) => (
            <span key={axis} className="border-l border-fg/25 pl-1.5">
              <span
                ref={(el) => {
                  if (el) quat.current[i] = el
                }}
              >
                .00
              </span>
            </span>
          ))}
        </p>
      </div>

      <svg viewBox="0 0 80 80" className="size-20 text-fg/70">
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="40" cy="40" r="28" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="2 3" />
        <path d="M40 6v8M40 66v8M6 40h8M66 40h8" stroke="currentColor" />
        <g ref={needle}>
          <path d="M40 40V12" stroke="var(--color-accent)" strokeWidth="2" />
          <circle cx="40" cy="12" r="3" fill="var(--color-accent)" />
          <path d="M40 40h22" stroke="currentColor" strokeOpacity="0.6" />
          <circle cx="62" cy="40" r="2.5" fill="currentColor" />
        </g>
        <circle cx="40" cy="40" r="3" fill="currentColor" />
      </svg>

      <div className="flex items-center gap-2">
        <span className="label">Tint</span>
        <span ref={swatch} className="size-3 rounded-full border border-fg/40" />
        <span ref={hex} className="font-mono text-[11px] text-fg/80 tabular-nums">
          #000000
        </span>
      </div>
    </div>
  )
}
