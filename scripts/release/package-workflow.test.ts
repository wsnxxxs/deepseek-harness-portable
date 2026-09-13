import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { load } from 'js-yaml'

const root = resolve(import.meta.dirname, '..', '..')

interface WorkflowStep {
  run?: string
  uses?: string
  with?: Record<string, unknown>
}

interface Workflow {
  jobs: Record<string, { steps: WorkflowStep[] }>
}

const targets = [
  { id: 'win32-x64', job: 'windows-x64-wsl', script: 'desktop:package:win' },
  { id: 'darwin-arm64', job: 'macos-arm64', script: 'desktop:package:mac' },
  { id: 'linux-x64', job: 'linux-x64', script: 'desktop:package:linux' },
] as const

test('native package jobs upload the exact verified output produced by their package command', () => {
  const buildSource = readFileSync(resolve(root, 'scripts', 'build-desktop-web-exe.ts'), 'utf8')
  const outputMatch = /const ELECTRON_OUT_DIR = '([^']+)'/.exec(buildSource)
  assert.ok(outputMatch, 'the Electron output root must remain an explicit build contract')
  const electronOutputRoot = outputMatch[1]
  assert.match(buildSource, /outputRoot: resolve\(this\.electronOutDir, 'verified'\)/)

  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
  }
  const workflow = load(readFileSync(resolve(root, '.github', 'workflows', 'package.yml'), 'utf8')) as Workflow

  for (const target of targets) {
    const packageCommand = manifest.scripts[target.script]
    assert.equal(
      packageCommand,
      `pnpm run package --target ${target.id} --output-root ${electronOutputRoot}`,
      `${target.script} must pin the build output root consumed by CI`,
    )

    const steps = workflow.jobs[target.job]?.steps ?? []
    const bridgeIndex = steps.findIndex(step => step.run === 'pnpm exec tsx scripts/build/client-manifest-bridge.ts')
    const buildStep = steps.find(step => step.run?.includes(`pnpm run ${target.script}`))
    assert.ok(buildStep, `${target.job} must run ${target.script}`)
    assert.equal(buildStep.run, `pnpm run ${target.script}`)
    const buildIndex = steps.indexOf(buildStep)
    assert.ok(bridgeIndex >= 0, `${target.job} must create the portable client manifest bridge`)
    assert.ok(buildIndex > bridgeIndex, `${target.job} must create the bridge before packaging`)

    const uploadStep = steps.find(step => step.uses === 'actions/upload-artifact@v4')
    assert.ok(uploadStep, `${target.job} must upload its verified artifact bundle`)
    assert.equal(uploadStep.with?.path, `${electronOutputRoot}/verified/${target.id}`)
    assert.equal(uploadStep.with?.['if-no-files-found'], 'error')
  }
})

test('CI materializes portable client manifests before building the pinned kernel', () => {
  const workflow = load(readFileSync(resolve(root, '.github', 'workflows', 'verify.yml'), 'utf8')) as Workflow
  const steps = workflow.jobs['contracts-and-static-gates']?.steps ?? []
  assert.ok(steps.some(step => step.run === 'pnpm run build'), 'verify must use the complete workspace build')
  const { scripts } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const bridgeIndex = scripts.build.indexOf('scripts/build/client-manifest-bridge.ts')
  const kernelBuildIndex = scripts.build.indexOf('scripts/build/kernel-build.ts')
  assert.ok(bridgeIndex >= 0, 'the workspace build must create the portable client manifest bridge')
  assert.ok(kernelBuildIndex > bridgeIndex, 'the bridge must precede the pinned kernel build')
})

test('Windows packaging asserts a native win32-x64 runner with a working WSL distribution', () => {
  const workflow = load(readFileSync(resolve(root, '.github', 'workflows', 'package.yml'), 'utf8')) as Workflow
  const steps = workflow.jobs['windows-x64-wsl']?.steps ?? []
  const gateStep = steps.find(step => step.run?.includes("process.platform + '-' + process.arch"))
  const packageStep = steps.find(step => step.run === 'pnpm run desktop:package:win')
  assert.ok(gateStep, 'Windows packaging must assert the native win32-x64 runner before packaging')
  assert.match(gateStep.run ?? '', /wsl\.exe --status/)
  assert.ok(packageStep, 'Windows packaging must run the Windows package command')
  assert.ok(steps.indexOf(packageStep) > steps.indexOf(gateStep), 'the runner gate must precede packaging')
})

test('POSIX packaging asserts a native runner before packaging', () => {
  const workflow = load(readFileSync(resolve(root, '.github', 'workflows', 'package.yml'), 'utf8')) as Workflow
  for (const target of [
    { job: 'macos-arm64', script: 'desktop:package:mac', host: 'darwin-arm64' },
    { job: 'linux-x64', script: 'desktop:package:linux', host: 'linux-x64' },
  ]) {
    const steps = workflow.jobs[target.job]?.steps ?? []
    const gateStep = steps.find(step => step.run?.includes("process.platform + '-' + process.arch"))
    const packageStep = steps.find(step => step.run === `pnpm run ${target.script}`)
    assert.ok(gateStep, `${target.job} must assert its native runner before packaging`)
    assert.match(gateStep.run ?? '', new RegExp(target.host))
    assert.ok(packageStep, `${target.job} must run its package command`)
    assert.ok(steps.indexOf(packageStep) > steps.indexOf(gateStep), `${target.job} must gate before packaging`)
  }
})
