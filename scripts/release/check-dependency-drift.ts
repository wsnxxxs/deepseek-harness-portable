/**
 * Explicit dependency-drift gate for releases.
 *
 * This used to be a sha256 assertion inside version-consistency.test.ts. As a
 * test it failed on every legitimate dependency change and its own message
 * told reviewers to refresh the snapshot, so it trained exactly the reflex it
 * was meant to prevent. Kept as a command instead, it is run deliberately when
 * a release is cut, and `--approve` records the review rather than silencing it.
 *
 * Usage:
 *   tsx scripts/release/check-dependency-drift.ts            check against the baseline
 *   tsx scripts/release/check-dependency-drift.ts --approve  record the current state
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readDependencyState, root } from './dependency-state.js'

const baselinePath = join(root, 'scripts', 'release', 'dependency-baseline.json')

interface Baseline {
  dependencyManifest: string
  lockfile: string
  approvedAt?: string
  approvedFor?: string
}

const approve = process.argv.includes('--approve')
const release = process.argv.find(arg => arg.startsWith('--release='))?.slice('--release='.length)
const state = readDependencyState()

if (approve) {
  if (!release) {
    console.error('--approve requires --release=<version> so the approval records its reason')
    process.exit(2)
  }
  const baseline: Baseline = {
    dependencyManifest: state.digest,
    lockfile: state.lockfileDigest,
    approvedAt: new Date().toISOString(),
    approvedFor: release,
  }
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')
  console.log(`approved dependency baseline for ${release}`)
  console.log(`  manifests ${state.digest}`)
  console.log(`  lockfile  ${state.lockfileDigest}`)
  process.exit(0)
}

if (!existsSync(baselinePath)) {
  console.error(`no baseline at ${baselinePath}`)
  console.error('record one with: tsx scripts/release/check-dependency-drift.ts --approve --release=<version>')
  process.exit(2)
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline
const drifted: string[] = []

if (baseline.dependencyManifest !== state.digest) {
  drifted.push(`dependency manifests${baseline.approvedFor ? ` (approved for ${baseline.approvedFor})` : ''}`)
  drifted.push(`  baseline ${baseline.dependencyManifest}`)
  drifted.push(`  current  ${state.digest}`)
}
if (baseline.lockfile !== state.lockfileDigest) {
  drifted.push('pnpm-lock.yaml')
  drifted.push(`  baseline ${baseline.lockfile}`)
  drifted.push(`  current  ${state.lockfileDigest}`)
}

if (drifted.length > 0) {
  console.error('dependency drift since the last approved release baseline:')
  for (const line of drifted) console.error(`  ${line}`)
  console.error('')
  console.error('If this change is intended, record it with:')
  console.error('  tsx scripts/release/check-dependency-drift.ts --approve --release=<version>')
  process.exit(1)
}

console.log(`dependency state matches the baseline approved for ${baseline.approvedFor ?? 'unknown release'}`)
