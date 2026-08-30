import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..', '..')
const preflight = join(root, 'scripts', 'setup-runtime-preflight.ps1')

function runPreflight(args: string[]) {
  return spawnSync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    preflight,
    ...args,
  ], { encoding: 'utf8', windowsHide: true })
}

test('Setup uses collision-free transaction paths and no global image-name taskkill', () => {
  const source = readFileSync(join(root, 'scripts', 'setup.iss'), 'utf8')
  assert.match(source, /\.setup-stage-\{#MyAppVersion\}-' \+ RunId/)
  assert.match(source, /\.setup-runtime-backup-' \+ RunId/)
  assert.doesNotMatch(source, /\/IM\s+"DeepSeek Harness\.exe"/i)
  assert.match(source, /setup-runtime-lock-report\.json/)
  assert.match(source, /\.setup-orphan-runtime-' \+ RunId/)
  assert.match(source, /CleanupOrphanRuntimes\(AppDir\)/)
  assert.match(source, /RunRuntimePreflight\('CleanupTree'/)
  assert.match(readFileSync(preflight, 'utf8'), /ValidateSet\('Stop', 'Diagnose', 'CleanupTree'\)/)
})
test('long-path cleanup removes a runtime tree beyond MAX_PATH', {
  skip: process.platform !== 'win32',
}, () => {
  const temporary = mkdtempSync(join(tmpdir(), 'dsh-long-path-cleanup-'))
  const installRoot = join(temporary, 'DeepSeek Harness')
  const target = join(installRoot, '.setup-orphan-runtime-test')
  const nested = join(target, 'resources', 'app', 'node_modules', '@deepseek-ai', 'dsh-session-telemetry-otel', 'node_modules', '@opentelemetry', 'resources', 'build', 'esnext', 'detectors', 'platform', 'node', 'machine-id')
  const payload = join(nested, 'getMachineId-unsupported.js')
  const report = join(temporary, 'cleanup-report.json')
  mkdirSync(nested, { recursive: true })
  writeFileSync(payload, 'long-path-probe')
  assert.ok(payload.length >= 260, `fixture must exceed MAX_PATH: ${payload.length}`)
  const result = runPreflight([
    '-Mode', 'CleanupTree',
    '-InstallRoot', installRoot,
    '-ResourcePath', target,
    '-ReportPath', report,
  ])
  try {
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.equal(existsSync(target), false)
    const evidence = JSON.parse(readFileSync(report, 'utf8').replace(/^\uFEFF/, '')) as { removed: boolean }
    assert.equal(evidence.removed, true)
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
})

test('Setup completion launches the desktop app as the original user without shell execution', () => {
  const source = readFileSync(join(root, 'scripts', 'setup.iss'), 'utf8')
  const runEntry = source.match(/^Filename: "\{app\}\\\{#MyLauncherExeName\}";.*$/m)?.[0]
  assert.ok(runEntry, 'expected the post-install launcher entry')
  assert.match(runEntry, /Flags: .*\brunasoriginaluser\b/)
  assert.doesNotMatch(runEntry, /\bshellexec\b/)
})

test('lock diagnostics report but never terminate an unowned process', {
  skip: process.platform !== 'win32',
}, async () => {
  const temporary = mkdtempSync(join(tmpdir(), 'dsh-setup-lock-中文 空格-'))
  const installRoot = join(temporary, 'DeepSeek Harness')
  const runtime = join(installRoot, 'runtime')
  const lockedFile = join(runtime, 'locked.bin')
  const report = join(temporary, 'lock-report.json')
  mkdirSync(runtime, { recursive: true })
  writeFileSync(lockedFile, 'lock-probe')
  const escaped = lockedFile.replace(/'/g, "''")
  const holder = spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `$stream=[IO.File]::Open('${escaped}',[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None); try { Start-Sleep -Seconds 60 } finally { $stream.Dispose() }`,
  ], { stdio: 'ignore', windowsHide: true })
  try {
    await new Promise(resolveDelay => setTimeout(resolveDelay, 800))
    assert.ok(holder.pid)
    const diagnose = runPreflight([
      '-Mode', 'Diagnose',
      '-InstallRoot', installRoot,
      '-ResourcePath', lockedFile,
      '-DestinationPath', join(installRoot, '.backup'),
      '-ReportPath', report,
    ])
    assert.equal(diagnose.status, 0, `${diagnose.stdout}\n${diagnose.stderr}`)
    const evidence = JSON.parse(readFileSync(report, 'utf8').replace(/^\uFEFF/, '')) as {
      lockingProcesses: Array<{ pid: number; name: string; executablePath: string }>
    }
    const lock = evidence.lockingProcesses.find(item => item.pid === holder.pid)
    assert.ok(lock, JSON.stringify(evidence, null, 2))
    assert.match(lock.name, /powershell/i)
    assert.match(lock.executablePath, /powershell\.exe$/i)

    const stop = runPreflight([
      '-Mode', 'Stop',
      '-InstallRoot', installRoot,
      '-ResourcePath', lockedFile,
      '-DestinationPath', join(installRoot, '.backup'),
      '-ReportPath', report,
    ])
    assert.equal(stop.status, 0, `${stop.stdout}\n${stop.stderr}`)
    assert.equal(holder.exitCode, null, 'an unowned lock holder must remain alive')
    assert.equal(existsSync(report), true)
  } finally {
    holder.kill()
    await new Promise(resolveExit => holder.once('exit', resolveExit))
    rmSync(temporary, { recursive: true, force: true })
  }
})
