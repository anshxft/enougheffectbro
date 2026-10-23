// Samples the logo shapes off the main thread, already laid out as RGBA texels; the arrays are
// transferred back, not copied.
import { sample, toRGBA } from './logoShape'

self.onmessage = (e: MessageEvent<string[]>) => {
  const out = e.data.map(sample).map((o) => ({ pos: toRGBA(o.pos), nrm: toRGBA(o.nrm) }))
  self.postMessage(out, { transfer: out.flatMap((o) => [o.pos.buffer, o.nrm.buffer]) })
}
