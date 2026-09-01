/**
 * Canonical Space metadata.
 *
 * The legacy `.learning/manifest.json` remains the compatibility marker for a
 * vault. This module adds `.library/space.json` beside it and never removes or
 * rewrites user material while migrating.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TopicVault } from '../topic-vault.ts'
import {
  SPACE_MANIFEST_PROTOCOL,
  VAULT_MANIFEST_PROTOCOL,
  slugify,
  type SpaceManifest,
  type VaultManifest,
} from '../ingest/types.ts'

export const SPACE_MANIFEST_RELATIVE_PATH = join('.library', 'space.json')

function pathOf(vault: TopicVault): string {
  return join(vault.root, SPACE_MANIFEST_RELATIVE_PATH)
}

function spaceIdOf(vault: TopicVault): string {
  return slugify(vault.root, 'space')
}

function validLegacy(value: unknown): value is VaultManifest {
  const candidate = value as Partial<VaultManifest> | undefined
  return candidate?.protocol === VAULT_MANIFEST_PROTOCOL && Array.isArray(candidate.sources)
    && typeof candidate.createdAt === 'string' && typeof candidate.updatedAt === 'string'
}

function validSpace(value: unknown): value is SpaceManifest {
  const candidate = value as Partial<SpaceManifest> | undefined
  return candidate?.protocol === SPACE_MANIFEST_PROTOCOL
    && (candidate.schema === 'learning' || candidate.schema === 'library')
    && typeof candidate.id === 'string' && candidate.id !== ''
    && Array.isArray(candidate.sources)
    && typeof candidate.createdAt === 'string' && typeof candidate.updatedAt === 'string'
}

function fromLegacy(vault: TopicVault, legacy: VaultManifest): SpaceManifest {
  return {
    protocol: SPACE_MANIFEST_PROTOCOL,
    schema: 'learning',
    id: spaceIdOf(vault),
    ...(legacy.title === undefined ? {} : { title: legacy.title }),
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    sources: legacy.sources,
    ...(legacy.activeSourceIds === undefined ? {} : { activeSourceIds: legacy.activeSourceIds }),
  }
}

/** Read the canonical manifest, falling back to the legacy manifest. */
export async function readSpaceManifest(vault: TopicVault): Promise<SpaceManifest | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(pathOf(vault), 'utf8'))
    if (validSpace(parsed)) return parsed
  } catch {
    // A missing or hand-edited cache is recovered from the legacy source below.
  }
  try {
    const parsed: unknown = JSON.parse(await readFile(vault.manifestPath, 'utf8'))
    return validLegacy(parsed) ? fromLegacy(vault, parsed) : undefined
  } catch {
    return undefined
  }
}

/** Write `.library/space.json`; callers decide whether the legacy file is also written. */
export async function writeSpaceManifest(vault: TopicVault, manifest: SpaceManifest): Promise<void> {
  await mkdir(vault.library, { recursive: true })
  await writeFile(pathOf(vault), `${JSON.stringify(manifest, undefined, 2)}\n`, 'utf8')
}

/**
 * Create or migrate the canonical manifest without touching the legacy file.
 * The operation is idempotent and only adds metadata.
 */
export async function ensureSpaceManifest(vault: TopicVault): Promise<SpaceManifest> {
  const existing = await readSpaceManifest(vault)
  if (existing !== undefined) {
    // A valid canonical manifest is already complete. A legacy fallback is the
    // migration case and is written once here.
    try {
      const parsed: unknown = JSON.parse(await readFile(pathOf(vault), 'utf8'))
      if (validSpace(parsed)) return parsed
    } catch {
      // Continue with the idempotent migration write.
    }
    await writeSpaceManifest(vault, existing)
    return existing
  }

  const now = new Date().toISOString()
  const created: SpaceManifest = {
    protocol: SPACE_MANIFEST_PROTOCOL,
    schema: 'learning',
    id: spaceIdOf(vault),
    title: vault.title,
    createdAt: now,
    updatedAt: now,
    sources: [],
  }
  await writeSpaceManifest(vault, created)
  return created
}

/** Effective source scope; omitted/null means all known sources. */
export function effectiveSourceIds(
  manifest: Pick<SpaceManifest, 'activeSourceIds'> | Pick<VaultManifest, 'activeSourceIds'>,
  sourceIds: readonly string[],
): readonly string[] {
  if (manifest.activeSourceIds === undefined || manifest.activeSourceIds === null) return [...sourceIds]
  const allowed = new Set(sourceIds)
  return [...new Set(manifest.activeSourceIds)].filter(sourceId => allowed.has(sourceId))
}
