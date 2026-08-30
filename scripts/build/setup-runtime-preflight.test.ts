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
  assert.match(readFileSync(preflight, 'utf8'), /ValidateSet\('Stop', 'Diagnose', 'CleanupObsolete', 'CleanupTree'\)/)
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

test('Setup completion defers desktop launch until the installer process exits', () => {
  const source = readFileSync(join(root, 'scripts', 'setup.iss'), 'utf8')
  assert.match(source, /^Source: "setup-launch-after-exit\.ps1"; DestDir: "\{app\}"; Flags: ignoreversion$/m)
  const runEntry = source.match(/^Filename: "\{sys\}\\WindowsPowerShell\\v1\.0\\powershell\.exe";.*$/m)?.[0]
  assert.ok(runEntry, 'expected the deferred post-install launcher entry')
  assert.match(runEntry, /Flags: .*\bnowait\b/)
  assert.match(runEntry, /Flags: .*\brunasoriginaluser\b/)
  assert.match(runEntry, /setup-launch-after-exit\.ps1/)
  assert.match(runEntry, /-SetupProcessId \{code:GetSetupProcessId\}/)
  assert.match(runEntry, /-SetupLoaderProcessId \{code:GetSetupLoaderProcessId\}/)
  assert.match(runEntry, /-SetupLoaderExecutable ""\{srcexe\}""/)
  assert.match(source, /CommandTail := GetCmdTail\(\)/)
  assert.match(source, /GetWindowThreadProcessId\(LoaderWindow, LoaderProcessId\)/)
  const handoff = readFileSync(join(root, 'scripts', 'setup-launch-after-exit.ps1'), 'utf8')
  assert.match(handoff, /\$setup\.WaitForExit\(\)/)
  assert.match(handoff, /\$setupLoader\.WaitForExit\(\)/)
  assert.match(handoff, /SetEnvironmentVariable\('__COMPAT_LAYER', \$null, 'Process'\)/)
  assert.match(handoff, /New-Object -ComObject WScript\.Shell/)
  assert.match(handoff, /\$shortcut\.TargetPath = \[IO\.Path\]::GetFullPath\(\$Executable\)/)
  assert.match(handoff, /Start-Process -FilePath \$explorer -ArgumentList \$quotedShortcutPath -Wait/)
  assert.doesNotMatch(handoff, /Start-Process -FilePath \$Executable/)

  const packager = readFileSync(join(root, 'scripts', 'build-desktop-web-exe.ts'), 'utf8')
  const containerInputs = packager.match(/const CONTAINER_INPUT_PATHS = \[[\s\S]*?\n\]/)?.[0]
  assert.ok(containerInputs, 'expected the immutable container input list')
  assert.match(containerInputs, /'scripts\/setup-launch-after-exit\.ps1'/)
})

test('post-install handoff waits for the extracted Setup and its original loader', {
  skip: process.platform !== 'win32',
}, async () => {
  const temporary = mkdtempSync(join(tmpdir(), 'dsh-setup-handoff-中文 空格-'))
  const marker = join(temporary, 'launched.txt')
  const target = join(temporary, 'launch-target.cmd')
  const probe = join(temporary, 'launch-probe.ps1')
  writeFileSync(probe, [
    '$self = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"',
    '$command = Get-CimInstance Win32_Process -Filter "ProcessId=$($self.ParentProcessId)"',
    '$shell = Get-CimInstance Win32_Process -Filter "ProcessId=$($command.ParentProcessId)"',
    "$compat = if ([string]::IsNullOrEmpty($env:__COMPAT_LAYER)) { 'clean' } else { 'contaminated' }",
    "[IO.File]::WriteAllLines((Join-Path $PSScriptRoot 'launched.txt'), @($compat, $shell.ExecutablePath))",
    '',
  ].join('\r\n'))
  writeFileSync(target, [
    '@echo off',
    'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0launch-probe.ps1"',
    '',
  ].join('\r\n'))

  const setup = spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    'Start-Sleep -Milliseconds 900',
  ], { stdio: 'ignore', windowsHide: true })
  const setupLoader = spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    'Start-Sleep -Milliseconds 2200',
  ], { stdio: 'ignore', windowsHide: true })

  try {
    assert.ok(setup.pid)
    assert.ok(setupLoader.pid)
    const setupLoaderExecutable = join(
      process.env.SystemRoot ?? 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe',
    )
    const handoff = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      join(root, 'scripts', 'setup-launch-after-exit.ps1'),
      '-SetupProcessId',
      String(setup.pid),
      '-SetupLoaderProcessId',
      String(setupLoader.pid),
      '-SetupLoaderExecutable',
      setupLoaderExecutable,
      '-Executable',
      target,
      '-WorkingDirectory',
      temporary,
    ], {
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, __COMPAT_LAYER: 'Installer' },
    })

    await new Promise(resolveDelay => setTimeout(resolveDelay, 400))
    assert.equal(existsSync(marker), false, 'the desktop target must remain stopped while Setup is alive')
    await new Promise<void>((resolveExit, rejectExit) => {
      setup.once('error', rejectExit)
      setup.once('exit', () => resolveExit())
    })
    assert.equal(existsSync(marker), false, 'the desktop target must remain stopped during Setup Loader cleanup')
    await new Promise<void>((resolveExit, rejectExit) => {
      handoff.once('error', rejectExit)
      handoff.once('exit', code => code === 0
        ? resolveExit()
        : rejectExit(new Error(`handoff exited with code ${String(code)}`)))
    })
    for (let attempt = 0; attempt < 20 && !existsSync(marker); attempt += 1) {
      await new Promise(resolveDelay => setTimeout(resolveDelay, 50))
    }
    assert.equal(existsSync(marker), true, 'the desktop target must launch after Setup exits')
    const [compat, shell] = readFileSync(marker, 'utf8').trim().split(/\r?\n/)
    assert.equal(compat, 'clean', 'the handoff must not pass Setup AppCompat state to the target')
    assert.match(shell, /[\\/]explorer\.exe$/i, 'the installed launcher must be activated by Explorer')
  } finally {
    if (setup.exitCode === null) setup.kill()
    if (setupLoader.exitCode === null) setupLoader.kill()
    rmSync(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  }
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
