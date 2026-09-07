import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Shared view of the manifests a product release must not rewrite.
 *
 * Publishing bumps `distributionVersion` in the desktop manifest. That bump
 * must not leak into package versions or into dependency resolution, so both a
 * semantic gate and an explicit drift check read the same manifest set from
 * here instead of each keeping its own copy.
 */
export const root = resolve(import.meta.dirname, '..', '..')

export const packageVersions = {
  'package.json': '0.1.0',
  'apps/desktop/package.json': '0.1.0-shell.2',
  'apps/runtime/package.json': '0.1.0',
  'apps/interactive-learning/package.json': '0.1.0',
  'apps/dcode-ui/package.json': '0.1.0',
  'apps/cluster-ui/package.json': '0.1.0',
  'packages/platform-contract/package.json': '0.1.0',
  'packages/release-manifest/package.json': '0.1.0',
  'packages/desktop-protocol/package.json': '1.0.0',
} as const

export const dependencySections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

export function readText(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

export function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readText(path)) as Record<string, unknown>
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function sortedRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
}

export interface DependencyState {
  manifests: Record<string, Record<string, unknown>>
  digest: string
  lockfileDigest: string
}

export function readDependencyState(): DependencyState {
  const manifests: Record<string, Record<string, unknown>> = {}
  for (const path of Object.keys(packageVersions).sort((left, right) => left.localeCompare(right))) {
    const manifest = readJson(path)
    const sections: Record<string, unknown> = {}
    for (const section of dependencySections) {
      if (manifest[section] !== undefined) sections[section] = sortedRecord(manifest[section])
    }
    manifests[path] = sections
  }
  return {
    manifests,
    digest: sha256(JSON.stringify(manifests)),
    lockfileDigest: sha256(readText('pnpm-lock.yaml').replace(/\r\n/g, '\n')),
  }
}
