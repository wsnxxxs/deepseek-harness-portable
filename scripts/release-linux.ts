/** Build the current Linux package when needed, then publish exact verified bytes. */
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { publishVerifiedTarget } from './release/publish-verified.js'

const root = resolve(import.meta.dirname, '..')
const desktopManifest = join(root, 'apps', 'desktop', 'package.json')
const defaultInput = resolve(root, 'dist-desktop', 'electron', 'verified', 'linux-x64')

function pnpmBin(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

function run(command: string, args: readonly string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, [...args], { cwd: root, stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${signal ?? `code ${String(code)}`}`))
    })
  })
}

async function distributionVersion(): Promise<string> {
  const manifest = JSON.parse(await readFile(desktopManifest, 'utf8')) as { distributionVersion?: unknown }
  if (typeof manifest.distributionVersion !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.distributionVersion)) {
    throw new Error(`invalid Linux distributionVersion in ${desktopManifest}`)
  }
  return manifest.distributionVersion
}

function inputFrom(argv: readonly string[]): string | undefined {
  const index = argv.indexOf('--input')
  return index < 0 ? undefined : resolve(argv[index + 1] ?? '')
}

async function assertCurrentArtifacts(input: string, version: string): Promise<void> {
  // The publish step performs the full bundle/hash verification. Read only
  // the attestation here so the large Linux artifacts are not hashed twice.
  const record = JSON.parse(await readFile(join(input, 'artifact-verification.json'), 'utf8')) as {
    artifacts?: unknown
  }
  const expected = new Set([
    `DeepSeek-Harness-${version}-linux-x64.AppImage`,
    `DeepSeek-Harness-${version}-linux-x64.deb`,
  ])
  const actual = new Set(
    Array.isArray(record.artifacts)
      ? record.artifacts
        .map(artifact => (artifact as { name?: unknown })?.name)
        .filter((name): name is string => typeof name === 'string')
      : [],
  )
  if (actual.size !== expected.size || [...expected].some(name => !actual.has(name))) {
    throw new Error(
      `Linux verified bundle does not contain the current ${version} AppImage and deb: ${[...actual].join(', ')}`,
    )
  }
}

const argv = process.argv.slice(2)
if (argv.includes('--help')) {
  await publishVerifiedTarget('linux-x64', argv)
} else {
  const version = await distributionVersion()
  const suppliedInput = inputFrom(argv)
  if (suppliedInput === undefined) {
    console.log(`release-linux: packaging distribution ${version} on the native Linux host`)
    await run(pnpmBin(), ['run', 'desktop:package:linux', '--', '--no-cache'])
  }

  const input = suppliedInput ?? defaultInput
  await assertCurrentArtifacts(input, version)
  const publishArgs = suppliedInput === undefined ? [...argv, '--input', input] : argv
  await publishVerifiedTarget('linux-x64', publishArgs)
}
