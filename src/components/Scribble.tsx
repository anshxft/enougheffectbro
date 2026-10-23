import { useEffect, useRef } from 'react'
import { N, traceStrokes, type Stroke } from './scribbleTrace'

// The alter ego (my X / Discord pfp) redrawn as scribble strokes spread across a whole layer.
// Strokes are random walks traced along the drawing's dark lines, plus the loose grey scribbles of
// its background. Built once from the image, then each layer paints them in its own ink:
// `day` faint graphite on the white page, `night` glowing white on violet for the cursor lens.

let built: Promise<Stroke[]> | null = null
function strokes() {
  built ??= (async () => {
    const res = await fetch('/alter/pfp.webp')
    const bmp = await createImageBitmap(await res.blob(), { resizeWidth: N, resizeHeight: N })
    try {
      // trace off the main thread
      const w = new Worker(new URL('./scribbleWorker.ts', import.meta.url), { type: 'module' })
      return await new Promise<Stroke[]>((resolve, reject) => {
        w.onmessage = (e: MessageEvent<Stroke[]>) => {
          resolve(e.data)
          w.terminate()
        }
        w.onerror = (e) => {
          w.terminate()
          reject(e)
        }
        w.postMessage(bmp, [bmp])
      })
    } catch {
      const c = document.createElement('canvas')
      c.width = c.height = N
      const g = c.getContext('2d')!
      g.drawImage(await createImageBitmap(await (await fetch('/alter/pfp.webp')).blob()), 0, 0, N, N)
      return traceStrokes(g.getImageData(0, 0, N, N).data)
    }
  })()
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
    // or earlier, in idle time after load (night after day, so they don't land in the same frame)
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1))
    const timer = window.setTimeout(
      () =>
        idle(
          () => {
            if (painted) return
            painted = true
            void paint()
          },
          { timeout: 3000 },
        ),
      mode === 'day' ? 11000 : 12500,
    )
    const resize = () => painted && void paint()
    window.addEventListener('resize', resize)
    return () => {
      alive = false
      io.disconnect()
      window.clearTimeout(timer)
      window.removeEventListener('resize', resize)
    }
  }, [mode])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
}
