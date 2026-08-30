/** Verify the directory-picker auto patch (WSL mapping + backend override). */
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { patchDirectoryPickerAuto } = require('../../patches/dsh-host-directory-picker-auto-index.js') as {
  patchDirectoryPickerAuto(source: string): string
}

// Use the pristine upstream build output: apps/runtime's copy may already
// carry a previously applied patch (the function short-circuits on `dshIsWsl`).
const source = await readFile(
  'vendor/deepseek-harness/packages/host/directory-picker-auto/lib/index.js',
  'utf8',
)
console.log('source already patched:', source.includes('dshIsWsl'))

const output = patchDirectoryPickerAuto(source)

const start = output.indexOf('function resolveDirectoryPickerBackend(facts) {')
console.log('--- resolve function ---')
console.log(output.slice(start, start + 480))

console.log('\n--- assertions ---')
console.log('has WSL mapping   :', output.includes('dshIsWsl'))
console.log('has override      :', output.includes('DSH_DIRECTORY_PICKER_BACKEND'))
console.log('guards intact     :',
  output.includes('resolveDirectoryPickerBackend') &&
  output.includes('platform: process.platform') &&
  output.includes('hasLinuxChooserBinary'))
console.log('idempotent        :', patchDirectoryPickerAuto(output) === output)

// Exercise the override against the real built module shape.
const mod = await import('data:text/javascript;base64,' + Buffer.from(
  output.replace(/export \{[^}]*\};?/, '') + '\nexport { resolveDirectoryPickerBackend };',
).toString('base64'))
const win32Facts = { bindHost: '127.0.0.1', platform: 'win32', env: {}, linuxChooser: false }
const cases: Array<[string | undefined, string]> = [
  [undefined, mod.resolveDirectoryPickerBackend(win32Facts)],
  ['browse', (process.env.DSH_DIRECTORY_PICKER_BACKEND = 'browse', mod.resolveDirectoryPickerBackend(win32Facts))],
  ['native', (process.env.DSH_DIRECTORY_PICKER_BACKEND = 'native', mod.resolveDirectoryPickerBackend(win32Facts))],
]
console.log('\n--- resolution matrix (win32, loopback) ---')
for (const [override, backend] of cases) console.log(`  ${String(override).padEnd(8)} -> ${backend}`)
