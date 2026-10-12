// Shared Edge-over-DevTools driver for scripts/shot.mjs and scripts/fps.mjs.
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// gpu=true: real (off-screen) window on the GPU; false: headless with SwiftShader.
export async function openEdge({ gpu = false, width = 1280, height = 800 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'edge-script-')) // fresh profile: a leftover one stays locked
  const port = 9333 + Math.floor(Math.random() * 1000)
  spawn(
    EDGE,
    [
      ...(gpu
        ? ['--window-position=-4000,0', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling']
        : ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
      `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run',
      `--window-size=${width},${height}`, 'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  ).unref()

  // Ask Edge to quit itself over the browser-level DevTools socket (Browser.close). Killing it from
  // outside doesn't work here: the sandbox can't terminate the processes, and msedge.exe hands off to
  // another process anyway, so the spawned pid is useless.
  const kill = async () => {
    try {
      const { webSocketDebuggerUrl } = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json())
      const bws = new WebSocket(webSocketDebuggerUrl)
      await new Promise((r, j) => { bws.onopen = r; bws.onerror = j })
      bws.send(JSON.stringify({ id: 1, method: 'Browser.close' }))
      await sleep(500)
    } catch {
      // already gone
    }
  }

  try {
    let target
    for (let i = 0; i < 75 && !target; i++) {
      await sleep(200)
      target = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).then((t) => t.find((x) => x.type === 'page')).catch(() => null)
    }
    if (!target) throw new Error('Edge DevTools did not start')
    const ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })

    let id = 0
    const pending = new Map()
    const logs = []
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data)
      if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg)
      if (msg.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + msg.params.exceptionDetails.exception?.description)
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type))
        logs.push(msg.params.type + ' ' + msg.params.args.map((a) => a.value ?? a.description).join(' '))
    }
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
    const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value

    await send('Runtime.enable')
    await send('Page.enable')
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 })
    const close = async () => {
      ws.close()
      await kill()
    }
    return { send, evaluate, logs, close }
  } catch (e) {
    await kill()
    throw e
  }
}
