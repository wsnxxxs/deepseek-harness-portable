'use strict'

const { spawn, spawnSync } = require('node:child_process')
const { mkdirSync, mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { dirname, join, resolve } = require('node:path')
const { performance } = require('node:perf_hooks')

const root = resolve(__dirname, '..')
const DEFAULT_RUNTIME = join(
  root,
  'dist-desktop',
  'electron',
  'DeepSeek Harness-win32-x64',
  'runtime',
  'DeepSeek Harness.exe',
)

function parseArgs(argv) {
  const result = {
    runtime: process.env.DSH_BENCHMARK_RUNTIME || DEFAULT_RUNTIME,
    entry: process.env.DSH_BENCHMARK_ENTRY,
    runs: 3,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--runtime') result.runtime = argv[++index]
    else if (arg === '--entry') result.entry = argv[++index]
    else if (arg === '--runs') result.runs = Number(argv[++index])
    else if (arg === '--help') {
      console.log('Usage: pnpm run startup:benchmark [--runtime path] [--entry path] [--runs 3]')
      process.exit(0)
    } else {
      throw new Error(`unknown argument: ${arg}`)
    }
  }
  if (!Number.isInteger(result.runs) || result.runs < 1 || result.runs > 10) {
    throw new Error('--runs must be an integer from 1 to 10')
  }
  result.runtime = resolve(result.runtime)
  result.entry = resolve(result.entry || join(dirname(result.runtime), 'resources', 'app', 'lib', 'packaged-bin.js'))
  return result
}

function protocolEnvironment(home) {
  return {
    ...process.env,
    DSH_CWD: home,
    DSH_HOME: home,
    DSH_TELEMETRY_DISABLED: '1',
    ELECTRON_RUN_AS_NODE: '1',
    DSH_RUNTIME_PROTOCOL_VERSION: '1',
    NODE_COMPILE_CACHE: join(home, 'compile-cache'),
  }
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true })
  } else {
    child.kill('SIGTERM')
  }
  await Promise.race([
    new Promise(resolvePromise => child.once('close', resolvePromise)),
    new Promise(resolvePromise => setTimeout(resolvePromise, 5_000)),
  ])
}

async function measure(runtime, entry, home) {
  mkdirSync(home, { recursive: true })
  const startedAt = performance.now()
  const child = spawn(runtime, [entry, '--host', '127.0.0.1', '--port', '0', '--no-open'], {
    cwd: home,
    env: protocolEnvironment(home),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  let output = ''
  let pending = ''
  let listening = false
  let listeningUrl
  const accept = line => {
    if (!line.startsWith('@@DSH_RUNTIME@@')) return
    const event = JSON.parse(line.slice('@@DSH_RUNTIME@@'.length))
    if (event.type === 'listening') {
      listening = true
      listeningUrl = event.url
    }
  }
  const onChunk = chunk => {
    output = `${output}${chunk.toString()}`.slice(-16_384)
    pending += chunk.toString()
    const lines = pending.split(/\r?\n/)
    pending = lines.pop() || ''
    for (const line of lines) accept(line)
  }
  child.stdout.on('data', onChunk)
  child.stderr.on('data', chunk => { output = `${output}${chunk.toString()}`.slice(-16_384) })

  try {
    await new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`startup timed out\n${output}`)), 180_000)
      timer.unref()
      const check = () => {
        if (listening) {
          clearTimeout(timer)
          resolvePromise()
        } else if (child.exitCode !== null || child.signalCode !== null) {
          clearTimeout(timer)
          reject(new Error(`runtime exited before listening\n${output}`))
        } else {
          setImmediate(check)
        }
      }
      check()
      child.once('error', error => {
        clearTimeout(timer)
        reject(error)
      })
    })
    return { elapsedMs: Math.round(performance.now() - startedAt), url: listeningUrl }
  } finally {
    await stopChild(child)
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2))
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'dsh-startup-benchmark-'))
  const cold = []
  const warm = []
  try {
    for (let index = 0; index < options.runs; index += 1) {
      const home = join(temporaryRoot, `cold-${String(index)}`)
      cold.push(await measure(options.runtime, options.entry, home))
    }
    const warmHome = join(temporaryRoot, 'warm')
    for (let index = 0; index < options.runs; index += 1) {
      warm.push(await measure(options.runtime, options.entry, warmHome))
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
  const format = values => values.map(item => `${item.elapsedMs}ms`).join('  ')
  console.log(`cold: ${format(cold)}`)
  console.log(`warm: ${format(warm)}`)
}

run().catch(error => {
  console.error(`startup benchmark failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
