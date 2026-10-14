// Samples the logo shapes off the main thread; the arrays are transferred back, not copied.
import { sample } from './logoShape'

self.onmessage = (e: MessageEvent<string[]>) => {
  const out = e.data.map(sample)
  self.postMessage(out, { transfer: out.flatMap((o) => [o.pos.buffer, o.nrm.buffer]) })
}
