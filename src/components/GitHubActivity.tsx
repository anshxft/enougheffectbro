import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import data from '../data/github.json'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const WEEKS = 30 // the account is from spring 2026; a full year would be mostly empty
// recent commits are listed only for the projects shown on this site
const REPOS: Record<string, string> = {
  'anshxft/ArcOdds': 'PredictArc',
  'Snatcher27/heldby': 'Heldby',
  'anshxft/enougheffectbro': 'This site',
}
const LEVEL = ['bg-grid', 'bg-fg/25', 'bg-fg/45', 'bg-fg/70', 'bg-fg']

type Commit = { repo: string; message: string; sha: string; url: string; date: string }

const ago = (iso: string) => {
  const h = Math.round((Date.now() - Date.parse(iso)) / 36e5)
  return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

// Contribution calendar (build-time snapshot, scripts/fetch-github.mjs) plus the latest commits
// fetched live from the public commits API. Cells reveal in a diagonal wave on scroll.
export default function GitHubActivity() {
  const root = useRef<HTMLElement>(null)
  const [commits, setCommits] = useState<Commit[] | null>(null)

  const { weeks, total, active } = useMemo(() => {
    const days = data.days.slice(-WEEKS * 7)
    // pad the first column so weeks start on Sunday, like GitHub
    const pad = new Date(days[0].date + 'T00:00:00Z').getUTCDay()
    const cells = [...Array.from({ length: pad }, () => null), ...days]
    const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, w) => cells.slice(w * 7, w * 7 + 7))
    return { weeks, total: days.reduce((s, d) => s + d.count, 0), active: days.filter((d) => d.count > 0).length }
  }, [])

  useEffect(() => {
    // latest commits of each listed repo (the events API no longer carries commit messages)
    let alive = true
    type ApiCommit = { sha: string; html_url: string; commit: { message: string; author: { date: string } } }
    Promise.all(
      Object.entries(REPOS).map(([repo, label]) =>
        fetch(`https://api.github.com/repos/${repo}/commits?per_page=4`)
          .then((r) => (r.ok ? (r.json() as Promise<ApiCommit[]>) : []))
          .then((list) => list.map((c): Commit => ({ repo: label, message: c.commit.message.split('\n')[0], sha: c.sha.slice(0, 7), url: c.html_url, date: c.commit.author.date })))
          .catch(() => [] as Commit[]),
      ),
    ).then((lists) => {
      if (alive) setCommits(lists.flat().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6))
    })
    return () => {
      alive = false
    }
  }, [])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.gh-in', { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: root.current, start: 'top 75%' } })
        // diagonal wave: each cell's delay grows with week + weekday, 0.9s across the grid
        gsap.from('.gh-cell', {
          autoAlpha: 0,
          scale: 0.6,
          duration: 0.4,
          ease: 'power3.out',
          // DOM order is week by week (7 cells each), so in GSAP's row-major terms: rows = weeks, cols = 7
          stagger: { each: 0.9 / (WEEKS + 7), grid: [weeks.length, 7], from: 'start' },
          scrollTrigger: { trigger: '.gh-grid', start: 'top 85%' },
        })
      })
    },
    { scope: root, dependencies: [weeks.length] },
  )

  useGSAP(
    () => {
      if (!commits?.length) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.gh-commit', { y: 12, autoAlpha: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 })
      })
    },
    { scope: root, dependencies: [commits?.length ?? 0] },
  )

  return (
    <section ref={root} id="activity" aria-labelledby="activity-title" className="relative px-4 py-32 sm:px-8">
      <p className="gh-in label mb-10">/ Activity</p>
      <div className="gh-in flex flex-wrap items-end justify-between gap-6">
        <h2 id="activity-title" className="display text-[clamp(2.5rem,9vw,8rem)]">
          Shipping
        </h2>
        <p className="label text-fg/80!">
          {total} contributions · {active} active days · last {WEEKS} weeks
        </p>
      </div>

      {/* solid panel: the dotted dome backdrop swallows small cells otherwise */}
      <div className="gh-in mt-14 overflow-x-auto border-y border-grid bg-bg py-6 [scrollbar-width:none] sm:px-6">
        <div
          className="gh-grid grid grid-flow-col grid-rows-7 gap-[3px] sm:gap-1"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(10px, 1fr))` }}
          role="img"
          aria-label={`GitHub contributions: ${total} in the last ${WEEKS} weeks, ${active} active days`}
        >
          {weeks.flat().map((d, i) =>
            d ? (
              <span key={d.date} title={`${d.count} contribution${d.count === 1 ? '' : 's'} on ${d.date}`} className={`gh-cell block aspect-square rounded-[2px] ${LEVEL[d.level]}`} />
            ) : (
              <span key={`pad-${i}`} />
            ),
          )}
        </div>
      </div>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div className="gh-in">
          <p className="label">Latest pushes</p>
          <a href={`https://github.com/${data.user}`} target="_blank" rel="noreferrer" className="label mt-4 inline-flex min-h-11 items-center text-fg/80! hover:text-fg!">
            github.com/{data.user} ↗
          </a>
        </div>
        <ol className="border-t border-grid bg-bg">
          {commits === null &&
            Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="border-b border-grid py-5">
                <div className="h-4 w-2/3 rounded bg-grid motion-safe:animate-pulse" />
              </li>
            ))}
          {commits?.length === 0 && <li className="border-b border-grid py-5 text-fg/60">No public pushes in the last few weeks.</li>}
          {commits?.map((c) => (
            <li key={c.sha} className="gh-commit border-b border-grid">
              <a href={c.url} target="_blank" rel="noreferrer" className="group grid gap-1 py-5 sm:grid-cols-[8rem_1fr_auto] sm:items-baseline sm:gap-6">
                <span className="label text-fg/80!">{c.repo}</span>
                <span className="truncate text-fg/90 transition-colors group-hover:text-fg">{c.message}</span>
                <span className="label">
                  {c.sha} · {ago(c.date)}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
