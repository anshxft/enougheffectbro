// Measure real-GPU FPS for several URL variants in a windowed (off-screen) Edge.
//   node scripts/fps.mjs [width] [height] [query ...]
//   e.g. node scripts/fps.mjs 1920 1080 "warm" "" "fx=0"   (the first variant is a warm-up: shaders compile)
import { openEdge, sleep } from './edge.mjs'

const [w = '1920', h = '1080', ...queries] = process.argv.slice(2)
const variants = queries.length ? queries : ['warm', '', 'fx=0']
const edge = await openEdge({ gpu: true, width: +w, height: +h })
try {
  for (const q of variants) {
    await edge.send('Page.navigate', { url: `http://localhost:5180/${q ? '?' + q : ''}` })
    await sleep(6000)
    const r = await edge.evaluate(`new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }).then(fps => {
      const s = window.__r3f; const gl = s?.gl.getContext(); const e = gl?.getExtension('WEBGL_debug_renderer_info');
      return { fps: Math.round(fps), dpr: s?.viewport.dpr, gpu: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL).replace(/ANGLE \\(|Direct3D.*/g, '') : 'n/a' } })`)
    console.log((q || 'default').padEnd(14), JSON.stringify(r))
  }
} finally {
  await edge.close()
}
