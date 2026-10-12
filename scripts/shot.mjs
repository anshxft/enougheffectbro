// Screenshots of WebGL pages (the app's browser pane stops drawing WebGL when hidden).
//   node scripts/shot.mjs [url] [out.png] [width] [height] [scrollY] [waitMs]
//   SHOT_EVAL="js expression" also prints that expression's value from the page.
//   SHOT_GPU=1 runs a real (off-screen) window on the GPU instead of headless, so WebGL is captured too.
// Headless Edge doesn't composite WebGL into Page.captureScreenshot, so the first <canvas>
// (dev builds keep preserveDrawingBuffer on) is also saved as <out>-gl.png.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { openEdge, sleep } from './edge.mjs'

const [url = 'http://localhost:5180/', out = '.shots/shot.png', w = '1280', h = '800', scrollY = '0', wait = '5000'] = process.argv.slice(2)
const edge = await openEdge({ gpu: process.env.SHOT_GPU === '1', width: +w, height: +h })
try {
  await edge.send('Page.navigate', { url })
  await sleep(+wait)
  if (+scrollY) {
    await edge.evaluate(`window.scrollTo(0, ${+scrollY})`)
    await sleep(2000)
  }
  if (process.env.SHOT_EVAL) console.log('eval:', JSON.stringify(await edge.evaluate(process.env.SHOT_EVAL)))

  mkdirSync(dirname(resolve(out)), { recursive: true })
  const glData = await edge.evaluate("document.querySelector('canvas')?.toDataURL('image/png') ?? ''")
  if (glData) {
    const glOut = out.replace(/\.png$/, '') + '-gl.png'
    writeFileSync(glOut, Buffer.from(glData.split(',')[1], 'base64'))
    console.log('saved', glOut)
  }
  const shot = await edge.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
  console.log('saved', out)
  if (edge.logs.length) console.log(edge.logs.slice(0, 15).join('\n'))
} finally {
  await edge.close()
}
