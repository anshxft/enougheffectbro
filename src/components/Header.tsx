import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { site } from '../content'
import { lockScroll } from '../lib/smooth-scroll'
import { TLink } from './PageTransition'
import { LOOP_PATH } from '../lib/logo'
import { SoundToggle } from './Sound'

const nav = [
  { label: 'Works', href: '/#works' },
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
]

// Phone menu: full-screen sheet, links rise in; Escape or any link closes it and focus returns to the button.
function MobileMenu({ onClose }: { onClose: () => void }) {
  const sheet = useRef<HTMLDivElement>(null)

  useEffect(() => {
    lockScroll(true)
    // everything behind the sheet is unreachable (keyboard and screen readers) while it's open
    const main = document.querySelector('main')
    if (main) main.inert = true
    sheet.current?.querySelector('a')?.focus()
    gsap.fromTo(sheet.current!.querySelectorAll('.mm-link'), { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 })
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('keydown', esc)
      if (main) main.inert = false
      lockScroll(false)
    }
  }, [onClose])

  return (
    <div ref={sheet} id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] flex flex-col justify-between overscroll-contain bg-bg px-4 pt-24 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <nav aria-label="Menu" className="flex flex-col gap-2">
        {nav.map((n, i) => (
          <span key={n.href} className="overflow-hidden">
            <TLink to={n.href} onClick={onClose} className="mm-link display block text-[clamp(2.5rem,13vw,5rem)]">
              <span className="label mr-3 align-top">{String(i + 1).padStart(2, '0')}</span>
              {n.label}
            </TLink>
          </span>
        ))}
      </nav>
      <a href={`mailto:${site.email}`} className="label text-fg!">
        {site.email}
      </a>
    </div>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    button.current?.focus()
  }, [])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[70] flex items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 mix-blend-difference select-none sm:px-8">
        <TLink to="/" className="group display inline-flex min-h-11 items-center gap-2.5 text-lg" aria-label={`${site.name}, home`}>
          {/* the mark (the hero loop) turns a little on hover */}
          <svg viewBox="0 0 100 100" aria-hidden className="size-6 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:rotate-[24deg]">
            <path d={LOOP_PATH} fillRule="evenodd" fill="currentColor" />
          </svg>
          {site.name}
        </TLink>
        <nav className="hidden gap-8 sm:flex" aria-label="Main">
          {nav.map((n) => (
            <TLink key={n.href} to={n.href} className="label text-fg! transition-opacity hover:opacity-60">
              {n.label}
            </TLink>
          ))}
        </nav>
        <div className="flex items-center gap-4 sm:gap-6">
          <SoundToggle />
          <a href={`mailto:${site.email}`} className="label hidden min-h-11 items-center rounded-full border border-fg/40 px-5 text-fg! transition-colors hover:border-fg sm:inline-flex">
            Contact
          </a>
          <button
            ref={button}
            type="button"
            onClick={() => (open ? close() : setOpen(true))}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="label inline-flex min-h-11 items-center rounded-full border border-fg/40 px-5 text-fg! sm:hidden"
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>
      {open && <MobileMenu onClose={close} />}
    </>
  )
}
