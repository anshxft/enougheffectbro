// Snapshot of the public GitHub contribution calendar for the site's activity section.
//   node scripts/fetch-github.mjs
// Runs before every build (npm "prebuild"); the browser can't fetch this page itself (no CORS).
// If GitHub is unreachable the committed snapshot is kept, so builds never fail on it.
import { writeFileSync } from 'node:fs'

const USER = 'anshxft'
const OUT = new URL('../src/data/github.json', import.meta.url)

try {
  const html = await fetch(`https://github.com/users/${USER}/contributions`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.text()
  })
  // day cells carry their date and level; the matching <tool-tip for=id> carries the count
  const counts = new Map()
  for (const m of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^(\d+) contribution/.exec(m[2])
    counts.set(m[1], n ? Number(n[1]) : 0)
  }
  const days = []
  for (const m of html.matchAll(/data-date="([\d-]+)"\s+id="([^"]+)"\s+data-level="(\d)"/g)) {
    days.push({ date: m[1], level: Number(m[3]), count: counts.get(m[2]) ?? 0 })
  }
  if (days.length < 300) throw new Error(`only ${days.length} days parsed`)
  days.sort((a, b) => a.date.localeCompare(b.date))
  writeFileSync(OUT, JSON.stringify({ user: USER, fetched: new Date().toISOString().slice(0, 10), days }) + '\n')
  console.log(`github: ${days.length} days, ${days.reduce((s, d) => s + d.count, 0)} contributions`)
} catch (e) {
  console.warn(`github: kept existing snapshot (${e.message})`)
}
