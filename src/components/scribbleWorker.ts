// Traces the alter-ego scribbles off the main thread: bitmap in, strokes out (buffers transferred).
import { N, traceStrokes } from './scribbleTrace'

self.onmessage = (e: MessageEvent<ImageBitmap>) => {
  const g = new OffscreenCanvas(N, N).getContext('2d')!
  g.drawImage(e.data, 0, 0, N, N)
  const out = traceStrokes(g.getImageData(0, 0, N, N).data)
  self.postMessage(out, { transfer: out.map((s) => s.pts.buffer) })
}
