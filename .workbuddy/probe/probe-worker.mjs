/**
 * Diagnostic probe: reproduce exactly what win32-dialog-host.ts does when it
 * spawns the folder-dialog worker, from inside a real Electron-as-Node parent.
 *
 * Run with:
 *   ELECTRON_RUN_AS_NODE=1 "<DeepSeek Harness.exe>" probe-worker.mjs
 * Pass the packaged app dir as argv[2] (defaults to process.cwd()).
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const appDir = process.argv[2] ?? process.cwd()
const hostDir = path.join(appDir, 'node_modules', '@deepseek-ai', 'dsh-host-directory-picker-native', 'lib')
const hostIndex = path.join(hostDir, 'index.js')
const workerPath = path.join(hostDir, 'worker.cjs')

const label = (text) => console.log(`\n=== ${text} ===`)

label('Parent process facts')
console.log('process.execPath :', process.execPath)
console.log('process.cwd()    :', process.cwd())
console.log('ELECTRON_RUN_AS_NODE:', JSON.stringify(process.env.ELECTRON_RUN_AS_NODE))
console.log('process.version  :', process.version)

label('Paths (as spawnDialogWorker would resolve them)')
console.log('host index       :', hostIndex, '| exists:', existsSync(hostIndex))
console.log('worker path      :', workerPath, '| exists:', existsSync(workerPath))

label('koffi availability in Electron-as-Node')
try {
  const koffiUrl = pathToFileURL(path.join(appDir, 'node_modules', 'koffi', 'index.js')).href
  const koffi = (await import(koffiUrl)).default
  console.log('koffi loaded     : yes')
  const ole32 = koffi.load('ole32.dll')
  const coInit = ole32.func('__stdcall', 'CoInitializeEx', 'int32', ['void *', 'uint32'])
  const hr = coInit(null, 0x2)
  console.log('CoInitializeEx hr:', hr, hr >= 0 ? '(OK)' : '(FAILED)')
  const user32 = koffi.load('user32.dll')
  console.log('user32 loaded    : yes')
  const kernel32 = koffi.load('kernel32.dll')
  console.log('kernel32 loaded  : yes')
} catch (error) {
  console.log('koffi FAILED     :', error instanceof Error ? `${error.message}\n${error.stack}` : String(error))
}

label('Spawn worker with process.execPath (real code path)')
if (!existsSync(workerPath)) {
  console.log('SKIP: worker path does not exist')
} else {
  const env = { ...process.env, DSH_DIALOG_TITLE: 'Probe Dialog' }
  const stdio = ['ignore', 'pipe', 'pipe', 'ipc']
  const child = spawn(process.execPath, [workerPath], { env, stdio, windowsHide: true })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (d) => { stdout += d })
  child.stderr.on('data', (d) => { stderr += d })
  child.on('message', (m) => console.log('[IPC]', JSON.stringify(m).slice(0, 300)))
  child.on('error', (e) => console.log('[SPAWN ERROR]', e.message))
  child.on('exit', (code, signal) => {
    console.log('[EXIT] code:', code, 'signal:', signal)
    if (stdout.trim()) console.log('[STDOUT]\n' + stdout.slice(0, 2000))
    if (stderr.trim()) console.log('[STDERR]\n' + stderr.slice(0, 2000))
    process.exit(0)
  })

  setTimeout(() => {
    console.log('[TIMEOUT] worker still alive after 6s — dialog is up. Killing.')
    child.kill()
  }, 6000)
}
