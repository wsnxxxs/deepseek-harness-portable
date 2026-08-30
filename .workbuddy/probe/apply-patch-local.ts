/**
 * Apply the reviewed directory-picker patches to a built tree in place.
 *
 * Usage: tsx apply-patch-local.ts <resources/app dir>
 *
 * This is the hotfix path: it writes the same three files the packaged build
 * produces, so an installed app picks up the fix without a full rebuild.
 * Close the app first — a running runtime holds the old modules loaded.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { patchDirectoryPickerWorker } from '../../scripts/build/runtime-patches.js'

const require = createRequire(import.meta.url)
const { patchDirectoryPickerAuto } = require('../../patches/dsh-host-directory-picker-auto-index.js') as {
  patchDirectoryPickerAuto(source: string): string
}

const appDir = process.argv[2]
if (appDir === undefined) throw new Error('usage: apply-patch-local.ts <resources/app dir>')

const nativeBase = `${appDir}/node_modules/@deepseek-ai/dsh-host-directory-picker-native/lib`
const autoPath = `${appDir}/node_modules/@deepseek-ai/dsh-host-directory-picker-auto/lib/index.js`

async function patch(path: string, transform: (source: string) => string): Promise<void> {
  const before = await readFile(path, 'utf8')
  const after = transform(before)
  if (before === after) {
    console.log(`unchanged : ${path}`)
    return
  }
  await writeFile(path, after, 'utf8')
  console.log(`patched   : ${path}`)
}

const patchedIndex = await readFile('patches/dsh-host-directory-picker-native-index.js', 'utf8')

await patch(`${nativeBase}/index.js`, () => patchedIndex)
await patch(`${nativeBase}/worker.cjs`, patchDirectoryPickerWorker)
await patch(autoPath, patchDirectoryPickerAuto)

console.log('\nDone. Restart the app so the runtime reloads the modules.')
