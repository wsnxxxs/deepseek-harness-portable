/**
 * Simulates the Electron main process: spawns the "runtime" process with
 * pipe stdio (exactly like runtime-supervisor.cjs does) and relays whatever
 * the runtime writes, so nothing is lost.
 *
 * argv[2] = packaged app dir
 * argv[3] = "pick" | "probe"
 */
import { spawn } from 'node:child_process'
import path from 'node:path'

const appDir = process.argv[2]
const mode = process.argv[3] ?? 'probe'
const electronExe = path.join(appDir, '..', '..', 'DeepSeek Harness.exe')
const probe = new URL('./probe-e2e.mjs', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')

console.log('[main-sim] app dir  :', appDir)
console.log('[main-sim] electron :', electronExe)

const child = spawn(electronExe, [probe, appDir, mode], {
  cwd: appDir,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', DSH_RUNTIME_PROTOCOL: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})

child.stdout.on('data', (d) => process.stdout.write(`[out] ${d}`))
child.stderr.on('data', (d) => process.stderr.write(`[err] ${d}`))
child.on('exit', (code, signal) => {
  console.log(`[main-sim] runtime exited code=${code} signal=${signal}`)
  process.exit(0)
})
setTimeout(() => { console.log('[main-sim] 15s elapsed, killing runtime'); child.kill() }, 15000)
