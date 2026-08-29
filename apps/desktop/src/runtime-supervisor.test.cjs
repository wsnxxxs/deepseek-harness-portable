const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { PassThrough } = require('node:stream')
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const test = require('node:test')
const { join, resolve } = require('node:path')
const { encodeRuntimeEvent } = require('../../../packages/desktop-protocol/src/index.cjs')
const { RuntimeSupervisor } = require('./runtime-supervisor.cjs')

function fakeChild(pid = 42) {
  const child = new EventEmitter()
  child.pid = pid
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  return child
}

test('supervisor launches through protocol and waits for Harness readiness', async () => {
  const child = fakeChild()
  let spawnCall
  let readinessUrl
  let readinessOptions
  const supervisor = new RuntimeSupervisor({
    spawnProcess(executable, args, options) {
      spawnCall = { executable, args, options }
      return child
    },
    waitUntilReady: async (url, options) => {
      readinessUrl = url
      readinessOptions = options
    },
  })
  const entry = resolve(__filename)
  const started = supervisor.start({
    executable: process.execPath,
    entry,
    cwd: process.cwd(),
    env: { SAMPLE: 'yes' },
    startupTimeoutMs: 12_345,
  })
  const hello = encodeRuntimeEvent({ protocolVersion: 1, type: 'hello', pid: child.pid })
  const listening = encodeRuntimeEvent({ protocolVersion: 1, type: 'listening', url: 'http://127.0.0.1:4567/' })
  child.stdout.write(`${hello}\n${listening.slice(0, 15)}`)
  child.stdout.write(`${listening.slice(15)}\n`)
  assert.equal(await started, 'http://127.0.0.1:4567/')
  assert.equal(readinessUrl, 'http://127.0.0.1:4567/')
  assert.deepEqual(readinessOptions, { timeoutMs: 12_345 })
  assert.deepEqual(spawnCall.args.slice(1), ['--host', '127.0.0.1', '--port', '0', '--no-open'])
  assert.equal(spawnCall.options.env.DSH_RUNTIME_PROTOCOL_VERSION, '1')
  assert.equal(spawnCall.options.windowsHide, true)
})

test('supervisor reuses the persisted desktop runtime port', async () => {
  const child = fakeChild(43)
  const root = mkdtempSync(join(tmpdir(), 'dsh-runtime-port-'))
  const portFile = join(root, 'runtime-port')
  writeFileSync(portFile, '4568\n', 'utf8')
  let spawnCall
  const supervisor = new RuntimeSupervisor({
    spawnProcess(executable, args) {
      spawnCall = { executable, args }
      return child
    },
    waitUntilReady: async () => {},
  })
  try {
    const started = supervisor.start({
      executable: process.execPath,
      entry: resolve(__filename),
      cwd: process.cwd(),
      portFile,
    })
    child.stdout.write(`${encodeRuntimeEvent({ protocolVersion: 1, type: 'hello', pid: child.pid })}\n`)
    child.stdout.write(`${encodeRuntimeEvent({ protocolVersion: 1, type: 'listening', url: 'http://127.0.0.1:4568/' })}\n`)
    assert.equal(await started, 'http://127.0.0.1:4568/')
    assert.deepEqual(spawnCall.args.slice(1), ['--host', '127.0.0.1', '--port', '4568', '--no-open'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('supervisor keeps stderr diagnostics out of the stdout protocol stream', async () => {
  const child = fakeChild(84)
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => child,
    waitUntilReady: async () => {},
  })
  const started = supervisor.start({ executable: process.execPath, entry: resolve(__filename), cwd: process.cwd() })
  const hello = encodeRuntimeEvent({ protocolVersion: 1, type: 'hello', pid: child.pid })
  const listening = encodeRuntimeEvent({ protocolVersion: 1, type: 'listening', url: 'http://127.0.0.1:9876/' })
  child.stdout.write(`${hello}\n${listening.slice(0, 20)}`)
  child.stderr.write('unrelated diagnostic\n')
  child.stdout.write(`${listening.slice(20)}\n`)
  assert.equal(await started, 'http://127.0.0.1:9876/')
})

test('supervisor records structured recoverable diagnostics without blocking readiness', async () => {
  const child = fakeChild(85)
  const observed = []
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => child,
    waitUntilReady: async () => {},
  })
  const started = supervisor.start({
    executable: process.execPath,
    entry: resolve(__filename),
    cwd: process.cwd(),
    onDiagnostic: diagnostic => observed.push(diagnostic),
  })
  const hello = encodeRuntimeEvent({ protocolVersion: 1, type: 'hello', pid: child.pid })
  const diagnostic = {
    protocolVersion: 1,
    type: 'diagnostic',
    code: 'MARKETPLACE_UNAVAILABLE',
    component: 'marketplace',
    severity: 'warning',
    message: 'Marketplace unavailable: no valid seed',
    recoverable: true,
  }
  const listening = encodeRuntimeEvent({ protocolVersion: 1, type: 'listening', url: 'http://127.0.0.1:9877/' })
  child.stdout.write(`${hello}\n${encodeRuntimeEvent(diagnostic)}\n${listening}\n`)
  assert.equal(await started, 'http://127.0.0.1:9877/')
  assert.deepEqual(observed, [diagnostic])
  assert.deepEqual(supervisor.diagnostics, [diagnostic])
})

test('supervisor fails closed when protocol PID does not match the child', async () => {
  const child = fakeChild(42)
  let terminatedPid
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => child,
    terminate: async pid => { terminatedPid = pid; return true },
  })
  const started = supervisor.start({ executable: process.execPath, entry: resolve(__filename), cwd: process.cwd() })
  child.stdout.write(`${encodeRuntimeEvent({ protocolVersion: 1, type: 'hello', pid: 43 })}\n`)
  await assert.rejects(started, error => error.code === 'PROTOCOL_PID')
  assert.equal(terminatedPid, 42)
  assert.equal(supervisor.running, false)
})

test('supervisor delegates process-tree shutdown and retains failed ownership', async () => {
  const child = fakeChild(99)
  const supervisor = new RuntimeSupervisor({ spawnProcess: () => child, terminate: async () => false })
  const started = supervisor.start({ executable: process.execPath, entry: resolve(__filename), cwd: process.cwd() })
  assert.equal(await supervisor.stop(), false)
  assert.equal(supervisor.pid, 99)
  child.emit('close', 1)
  await assert.rejects(started, /exited before it was ready/)
})

test('supervisor preserves the requested timeout when termination emits close first', async t => {
  // The startup watchdog unrefs its timer so a hung runtime cannot hold the
  // process open. A real 10 ms wait therefore lets the event loop drain before
  // the rejection is observed, which cancels the test instead of failing it.
  // Drive the clock so the timeout is deterministic under any load.
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const child = fakeChild(100)
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => child,
    terminate: async () => {
      child.emit('close', 1)
      return true
    },
  })
  const started = supervisor.start({
    executable: process.execPath,
    entry: resolve(__filename),
    cwd: process.cwd(),
    startupTimeoutMs: 10,
  })
  // Attach the rejection handler before advancing the clock. `tick` runs the
  // watchdog synchronously, so a handler attached afterwards would see an
  // already-rejected promise and surface as an unhandled rejection.
  const rejection = assert.rejects(started, error => error.code === 'TIMEOUT' && /startup timed out/.test(error.message))
  t.mock.timers.tick(10)
  await new Promise(settle => setImmediate(settle))
  await rejection
})

test('supervisor reports a readiness timeout after listening has arrived', async t => {
  // Same unref'd watchdog as above: advance the clock rather than waiting.
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const child = fakeChild(101)
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => child,
    terminate: async () => {
      child.emit('close', 1)
      return true
    },
    waitUntilReady: async () => new Promise(() => {}),
  })
  const started = supervisor.start({
    executable: process.execPath,
    entry: resolve(__filename),
    cwd: process.cwd(),
    startupTimeoutMs: 10,
  })
  child.stdout.write(`${encodeRuntimeEvent({ protocolVersion: 1, type: 'hello', pid: child.pid })}\n`)
  child.stdout.write(`${encodeRuntimeEvent({ protocolVersion: 1, type: 'listening', url: 'http://127.0.0.1:9878/' })}\n`)
  const rejection = assert.rejects(started, error => error.code === 'NOT_READY' && /host readiness/.test(error.message))
  t.mock.timers.tick(10)
  await new Promise(settle => setImmediate(settle))
  await rejection
})
