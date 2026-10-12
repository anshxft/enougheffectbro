import { useEffect, useState } from 'react'
import { blip, isSoundOn, onSoundChange, setSound, soundChoice } from '../lib/sound'

function useSoundOn() {
  const [on, setOn] = useState(isSoundOn)
  useEffect(() => onSoundChange(setOn), [])
  return on
}

// Header switch with four little level bars that dance while sound is on.
export function SoundToggle() {
  const on = useSoundOn()
  return (
    <button
      type="button"
      onClick={() => setSound(!on)}
      aria-pressed={on}
      aria-label={on ? 'Turn sound off' : 'Turn sound on'}
      className="label flex min-h-11 min-w-11 items-center justify-center gap-2 text-fg! transition-opacity hover:opacity-70"
    >
      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-[2px] origin-bottom bg-current ${on ? 'animate-[eq_0.9s_ease-in-out_infinite] motion-reduce:animate-none' : ''}`}
            style={{ height: on ? '100%' : '25%', animationDelay: `${i * -0.22}s` }}
          />
        ))}
      </span>
      <span className="hidden sm:inline">Sound {on ? 'on' : 'off'}</span>
    </button>
  )
}

// First visit: ask once at the bottom (ALCHE-style). A saved "on" resumes on the first gesture,
// since browsers only start audio after the visitor interacts.
export function SoundPrompt() {
  const [ask, setAsk] = useState(false)

  useEffect(() => {
    const choice = soundChoice()
    if (choice === 'on') {
      const resume = () => setSound(true)
      window.addEventListener('pointerdown', resume, { once: true })
      window.addEventListener('keydown', resume, { once: true })
      return () => {
        window.removeEventListener('pointerdown', resume)
        window.removeEventListener('keydown', resume)
      }
    }
    if (choice === null) {
      const t = setTimeout(() => setAsk(true), 4500)
      return () => clearTimeout(t)
    }
  }, [])

  // a global hover blip for links and buttons (no-op while sound is off)
  useEffect(() => {
    const over = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest('a, button')
      const from = (e.relatedTarget as Element | null)?.closest?.('a, button')
      if (el && el !== from) blip()
    }
    window.addEventListener('pointerover', over)
    return () => window.removeEventListener('pointerover', over)
  }, [])

  if (!ask) return null
  const choose = (v: boolean) => {
    setSound(v)
    setAsk(false)
  }
  return (
    <div role="dialog" aria-label="Sound" className="fixed inset-x-4 bottom-4 z-[90] flex flex-wrap items-center justify-between gap-3 rounded-full border border-grid bg-bg py-2 pr-2 pl-5 sm:inset-x-auto sm:right-8 sm:bottom-8">
      <p className="label text-fg!">This site has sound. Turn it on?</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => choose(true)} className="label rounded-full bg-accent px-4 py-2 text-fg!">
          Sound on
        </button>
        <button type="button" onClick={() => choose(false)} className="label rounded-full border border-grid px-4 py-2 text-fg!">
          No thanks
        </button>
      </div>
    </div>
  )
}
