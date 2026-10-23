import { useEffect, useRef } from 'react'

// The alter ego (my X / Discord pfp) redrawn as scribble strokes spread across a whole layer.
// Strokes are random walks traced along the drawing's dark lines, plus the loose grey scribbles of
// its background. Built once from the image, then each layer paints them in its own ink:
// `day` faint graphite on the white page, `night` glowing white on violet for the cursor lens.

type Stroke = { pts: Float32Array; kind: 0 | 1 | 2 } // 0 figure, 1 loose background scribble, 2 the eye
const N = 400 // the source image is N×N

let built: Promise<Stroke[]> | null = null
function strokes() {
  built ??= new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = N
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.drawImage(img, 0, 0, N, N)
      const px = g.getImageData(0, 0, N, N).data
      const at = (x: number, y: number) => {
        const i = ((Math.min(N - 1, Math.max(0, y | 0)) * N) + Math.min(N - 1, Math.max(0, x | 0))) * 4
        return [px[i], px[i + 1], px[i + 2]]
      }
      const dark = (x: number, y: number) => {
        const [r, gg, b] = at(x, y)
        return 1 - (0.3 * r + 0.59 * gg + 0.11 * b) / 255
      }
      // the eye only: violet pixels in the eye's area (the jacket has blue-violet strokes too)
      const eye = (x: number, y: number) => {
        if (x < 175 || x > 255 || y < 140 || y > 200) return false
        const [r, gg, b] = at(x, y)
        return b > 110 && b > gg + 30 && r > gg
      }
      let seed = 7
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
      const walk = (lo: number, hi: number, count: number, steps: number, step: number, kind: 0 | 1) => {
        const inside = (x: number, y: number) => {
          const d = dark(x, y)
          return d > lo && d < hi
        }
        const out: Stroke[] = []
        for (let guard = 0; out.length < count && guard < count * 40; guard++) {
          let x = rnd() * N
          let y = rnd() * N
          if (!inside(x, y)) continue
          let a = rnd() * 6.283
          const pts = [x, y]
          const isEye = kind === 0 && eye(x, y)
          for (let k = 0; k < steps; k++) {
            a += (rnd() - 0.5) * 1.1
            let moved = false
            for (const da of [0, 0.5, -0.5, 1, -1]) {
              const nx = x + Math.cos(a + da) * step
              const ny = y + Math.sin(a + da) * step
              if (inside(nx, ny)) {
                x = nx
                y = ny
                a += da
                moved = true
                break
              }
            }
            if (!moved) break
            pts.push(x, y)
          }
          if (pts.length > 8) out.push({ pts: new Float32Array(pts), kind: isEye ? 2 : kind })
        }
        return out
      }
      resolve([...walk(0.09, 0.4, 900, 60, 3, 1), ...walk(0.42, 2, 4200, 70, 2.4, 0)])
    }
    img.onerror = reject
    img.src = '/alter/pfp.webp'
  })
  return built
}

export default function Scribble({ mode }: { mode: 'day' | 'night' }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current!
    let alive = true
    const paint = async () => {
      const list = await strokes()
      if (!alive) return
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      const W = c.clientWidth
      const H = c.clientHeight
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
      const g = c.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      // the figure fills the height and sits to the right; its loose scribbles reach across the page
      const s = (H * 1.12) / N
      const ox = W - N * s * 0.92
      const oy = H * -0.04
      g.lineCap = 'round'
      g.lineJoin = 'round'
      const night = mode === 'night'
      for (const kind of [1, 0, 2] as const) {
        g.beginPath()
        for (const st of list) {
          if (st.kind !== kind) continue
          const p = st.pts
          // loose scribbles stretch wider so they spread over the whole page
          const sx = kind === 1 ? s * 1.6 : s
          const bx = kind === 1 ? W - N * sx * 0.95 : ox
          g.moveTo(bx + p[0] * sx, oy + p[1] * s)
          for (let i = 2; i < p.length; i += 2) g.lineTo(bx + p[i] * sx, oy + p[i + 1] * s)
        }
        if (night) {
          g.strokeStyle = kind === 2 ? 'rgb(214 180 255 / 0.95)' : kind === 1 ? 'rgb(242 236 255 / 0.16)' : 'rgb(246 242 255 / 0.2)'
          g.lineWidth = kind === 2 ? 1.6 : 0.9
        } else {
          g.strokeStyle = kind === 1 ? 'rgb(5 5 5 / 0.035)' : 'rgb(5 5 5 / 0.045)'
          g.lineWidth = 0.9
        }
        g.stroke()
      }
      if (night) {
        // glow: one blurred copy of the lines added on top (cheap, unlike a shadow per stroke)
        const copy = document.createElement('canvas')
        copy.width = c.width
        copy.height = c.height
        copy.getContext('2d')!.drawImage(c, 0, 0)
        g.setTransform(1, 0, 0, 1, 0, 0)
        g.globalCompositeOperation = 'lighter'
        g.filter = `blur(${4 * dpr}px)`
        g.globalAlpha = 0.55
        g.drawImage(copy, 0, 0)
        g.filter = 'none'
        g.globalAlpha = 1
        g.globalCompositeOperation = 'source-over'
      }
    }
    // build only when the About section is near, then repaint on resize
    let painted = false
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !painted) {
          painted = true
          void paint()
        }
      },
      { rootMargin: '150% 0px' },
    )
    io.observe(c)
    const resize = () => painted && void paint()
    window.addEventListener('resize', resize)
    return () => {
      alive = false
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [mode])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
}
