/** Verify the directory-picker worker patch output against the real source. */
import { readFile } from 'node:fs/promises'
import { patchDirectoryPickerWorker } from '../../scripts/build/runtime-patches.js'

const source = await readFile(
  'vendor/deepseek-harness/packages/host/directory-picker-native/lib/worker.cjs',
  'utf8',
)

console.log('source contains old guards :', source.includes('if (title === "") throw new Error'))
console.log('source contains old post   :', source.includes('process.disconnect()'))

const output = patchDirectoryPickerWorker(source)

console.log('\n--- guards region ---')
const start = output.indexOf('const title = process.env.DSH_DIALOG_TITLE')
console.log(output.slice(start, start + 700))

console.log('\n--- assertions ---')
console.log('has failStartup        :', output.includes('const failStartup ='))
console.log('has uncaughtException  :', output.includes('process.on("uncaughtException"'))
console.log('has unhandledRejection :', output.includes('process.on("unhandledRejection"'))
console.log('bare send retained     :', output.includes('const post = (message) => {\n\tsend(message);\n};'))
console.log('ipc probe retained     :', output.includes('DSH_DIRECTORY_PICKER_IPC_PROBE'))
console.log('guards still match     :', output.includes('runFolderDialog') && output.includes('process.send'))

// Idempotence: patching the patched output must be a no-op change in meaning.
const twice = patchDirectoryPickerWorker(output)
console.log('idempotent             :', twice === output)
