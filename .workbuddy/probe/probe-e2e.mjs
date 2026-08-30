/**
 * End-to-end probe for the Win32 folder dialog.
 *
 * Reproduces the real process chain:
 *   Electron main --(pipe stdio)--> runtime process --(inherit+ipc)--> worker
 *
 * argv[2] = packaged app dir
 * argv[3] = "pick" to drive the real pickNativeDirectory, "probe" to only spawn the worker
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const appDir = process.argv[2] ?? process.cwd()
const mode = process.argv[3] ?? 'probe'
const hostLib = path.join(appDir, 'node_modules', '@deepseek-ai', 'dsh-host-directory-picker-native', 'lib')

console.log('[runtime-sim] execPath :', process.execPath)
console.log('[runtime-sim] cwd      :', process.cwd())
console.log('[runtime-sim] stdout tty:', process.stdout.isTTY === true, '| stderr tty:', process.stderr.isTTY === true)
console.log('[runtime-sim] mode     :', mode)

if (mode === 'pick') {
  // Drive the real capability through the patched index.js.
  const indexUrl = pathToFileURL(path.join(hostLib, 'index.js')).href
  const mod = await import(indexUrl)
  const { pickNativeDirectory } = mod
  const controller = new AbortController()

  const timer = setTimeout(() => {
    console.log('[runtime-sim] 8s elapsed, aborting pick')
    controller.abort()
  }, 8000)

  try {
    const picked = await pickNativeDirectory(controller.signal)
    console.log('[RESULT] picked =', JSON.stringify(picked))
  } catch (error) {
    console.log('[RESULT] threw =', error instanceof Error ? error.message : String(error))
  } finally {
    clearTimeout(timer)
  }
} else {
  const workerPath = path.join(hostLib, 'worker.cjs')
  console.log('[runtime-sim] worker   :', workerPath, '| exists:', existsSync(workerPath))
  const child = spawn(process.execPath, [workerPath], {
    env: { ...process.env, DSH_DIALOG_TITLE: 'Probe Dialog', ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    windowsHide: true,
  })
  child.on('message', (m) => console.log('[IPC]', JSON.stringify(m).slice(0, 300)))
  child.on('error', (e) => console.log('[SPAWN ERROR]', e.message))
  child.on('exit', (code, signal) => {
    console.log('[EXIT] code:', code, 'signal:', signal)
    process.exit(0)
  })
  setTimeout(() => { console.log('[runtime-sim] 6s elapsed, killing worker'); child.kill() }, 6000)
}
