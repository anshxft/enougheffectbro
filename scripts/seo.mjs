// After `vite build`: per-page HTML for the case studies (so link previews on X, Discord, WhatsApp
// show the right title, text and image; their crawlers don't run JavaScript), plus robots.txt and
// sitemap.xml. Reads the work list straight from src/content.ts (Node strips the types).
//   node scripts/seo.mjs        (runs automatically as npm "postbuild")
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { works } from '../src/content.ts'

const SITE = 'https://enougheffectbro.vercel.app'
const dist = new URL('../dist/', import.meta.url)
const base = readFileSync(new URL('index.html', dist), 'utf8')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const set = (html, re, value) => {
  if (!re.test(html)) throw new Error(`seo: tag not found ${re}`)
  return html.replace(re, value)
}

for (const w of works) {
  const url = `${SITE}/work/${w.slug}`
  const title = esc(`${w.title} — Ansh`)
  const desc = esc(w.summary)
  let html = base
  html = set(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`)
  html = set(html, /(<meta name="description" content=")[^"]*/, `$1${desc}`)
  html = set(html, /(<meta property="og:title" content=")[^"]*/, `$1${title}`)
  html = set(html, /(<meta property="og:description" content=")[^"]*/, `$1${desc}`)
  html = set(html, /(<meta property="og:type" content=")[^"]*/, '$1article')
  html = set(html, /(<meta property="og:url" content=")[^"]*/, `$1${url}`)
  html = set(html, /(<meta property="og:image" content=")[^"]*/, `$1${SITE}/og-${w.slug}.jpg`)
  html = set(html, /(<meta property="og:image:alt" content=")[^"]*/, `$1${esc(w.hero.alt)}`)
  html = set(html, /(<meta name="twitter:image" content=")[^"]*/, `$1${SITE}/og-${w.slug}.jpg`)
  html = set(html, /(<link rel="canonical" href=")[^"]*/, `$1${url}`)
  const dir = new URL(`work/${w.slug}/`, dist)
  mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('index.html', dir), html)
}

const pages = ['/', ...works.map((w) => `/work/${w.slug}`)]
const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
writeFileSync(new URL('robots.txt', dist), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`seo: ${works.length} case-study pages, sitemap (${pages.length} urls), robots.txt`)
