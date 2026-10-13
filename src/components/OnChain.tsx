import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import type { ArcStats } from '../lib/arc'
import { arcContracts as CONTRACTS, arcExplorer as EXPLORER } from '../content'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const fmt = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })

// Live PredictArc numbers read straight from Arc mainnet. viem loads only when the section nears the
// viewport; numbers count up once on reveal, the block height refreshes every 4s while on screen.
export default function OnChain() {
  const root = useRef<HTMLElement>(null)
  const [stats, setStats] = useState<ArcStats | null>(null)
  const [failed, setFailed] = useState(false)
  const shown = useRef(false)

  useEffect(() => {
    const el = root.current!
    let timer = 0
    let visible = false
    let lib: typeof import('../lib/arc') | null = null
    const tickBlock = async () => {
      if (!visible || !lib) return
      try {
        const block = Number(await lib.client.getBlockNumber())
        setStats((s) => (s ? { ...s, block } : s))
      } catch {
        // keep the last block
      }
      timer = window.setTimeout(tickBlock, 4000)
    }
    const io = new IntersectionObserver(
      async ([entry]) => {
        visible = entry.isIntersecting
        if (!visible) return window.clearTimeout(timer)
        try {
          lib ??= await import('../lib/arc')
          if (!shown.current) {
            shown.current = true
            setStats(await lib.fetchStats())
          }
          window.clearTimeout(timer)
          timer = window.setTimeout(tickBlock, 4000)
        } catch {
          setFailed(true)
        }
      },
      { rootMargin: '400px 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(timer)
    }
  }, [])

  // count up once the real numbers arrive (marketing reveal: 1.4s strong ease-out, 80ms stagger)
  useGSAP(
    () => {
      if (!stats) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        root.current!.querySelectorAll<HTMLElement>('[data-count]').forEach((el, i) => {
          const end = Number(el.dataset.count)
          const digits = Number(el.dataset.digits ?? 0)
          const o = { v: 0 }
          gsap.to(o, { v: end, duration: 1.4, delay: i * 0.08, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v, digits)) })
        })
      })
    },
    { scope: root, dependencies: [stats === null] },
  )

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.oc-in', { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: root.current, start: 'top 75%' } })
      })
    },
    { scope: root },
  )

  const cells: { label: string; value: number; digits?: number; note: string }[] = stats
    ? [
        { label: 'Markets', value: stats.markets, note: `${stats.open} open for predictions` },
        { label: 'Next close', value: stats.nextClose ?? 0, note: stats.nextClose === null ? 'nothing open right now' : 'days until a market settles' },
        { label: 'USDC in pools', value: stats.pooled, digits: 2, note: 'staked on outcomes' },
        { label: 'Arc block', value: stats.block, note: 'latest, live' },
      ]
    : []

  return (
    <section ref={root} id="onchain" aria-labelledby="onchain-title" className="relative px-4 py-32 sm:px-8">
      <p className="oc-in label mb-10">/ On-chain</p>
      <div className="oc-in flex flex-wrap items-end justify-between gap-6">
        <h2 id="onchain-title" className="display text-[clamp(2.5rem,9vw,8rem)]">
          Live on Arc
        </h2>
        <p className="label flex items-center gap-2 text-fg/80!">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-fg/70 motion-safe:animate-ping" />
            <span className="relative size-2 rounded-full bg-fg" />
          </span>
          Read from Arc mainnet as you scroll
        </p>
      </div>

      <dl className="mt-16 grid gap-px border-y border-grid bg-grid sm:grid-cols-2 xl:grid-cols-4" aria-live="polite" aria-busy={!stats && !failed}>
        {stats
          ? cells.map((c) => (
              <div key={c.label} className="oc-in bg-bg px-6 py-8">
                <dt className="label">{c.label}</dt>
                <dd className="mt-4 font-mono text-[clamp(2rem,3.2vw,4rem)] leading-none tabular-nums">
                  <span data-count={c.label === 'Arc block' ? undefined : c.value} data-digits={c.digits ?? 0}>
                    {fmt(c.value, c.digits)}
                  </span>
                </dd>
                <p className="mt-3 text-sm text-fg/50">{c.note}</p>
              </div>
            ))
          : Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-bg px-6 py-8">
                <div className="h-3 w-24 rounded bg-grid" />
                <div className="mt-5 h-12 w-32 rounded bg-grid motion-safe:animate-pulse" />
              </div>
            ))}
      </dl>
      {failed && <p className="mt-6 text-fg/60">Couldn't reach Arc right now. The contracts are linked below.</p>}

      <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
        {CONTRACTS.map((c) => (
          <li key={c.address} className="oc-in">
            <a
              href={`${EXPLORER}/address/${c.address}`}
              target="_blank"
              rel="noreferrer"
              className="label inline-flex min-h-11 items-center gap-2 text-fg/80! transition-colors hover:text-fg!"
            >
              {c.label} · {c.address.slice(0, 6)}…{c.address.slice(-4)} ↗
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
