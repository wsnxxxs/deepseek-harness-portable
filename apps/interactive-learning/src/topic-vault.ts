/**
 * The topic vault: a learning topic IS a real directory, and that directory is a
 * harness Workspace. Nothing new is persisted to represent one — a vault is a
 * Workspace whose directory carries `.learning/manifest.json`.
 *
 * That identity is what makes the write fence free. `ctx.sandboxPolicy` resolves
 * `workspaceRoot` from the session's immutable `cwd`, and Workspace membership
 * already requires that cwd to equal the workspace path, so a learning session
 * running in its vault cannot write outside it. This module therefore owns paths
 * and containment, not permissions.
 *
 * Writes here are host-side and deterministic over paths this module built, so
 * they use `node:fs/promises` directly. The `ctx.fs` fence exists for
 * MODEL-controlled paths; the model never reaches this module.
 * @module @dsh-portable/interactive-learning/src/topic-vault
 */

import { mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  VAULT_MANIFEST_PROTOCOL,
  type SourceManifestEntry,
  type SourceStructure,
  type VaultManifest,
} from './ingest/types.ts'

/** Vault-relative directory names. Stable: a person's file manager sees these. */
export const VAULT_DIRECTORIES = Object.freeze({
  sources: 'sources',
  extracted: 'extracted',
  concepts: 'concepts',
  notes: 'notes',
  internal: '.learning',
  structure: join('.learning', 'structure'),
})

/** Vault-relative path of the manifest whose presence marks a directory a vault. */
export const VAULT_MANIFEST_PATH = join(VAULT_DIRECTORIES.internal, 'manifest.json')

/** One learning topic, resolved to absolute paths. */
export interface TopicVault {
  /** Workspace id when the registry is composed and knows this directory. */
  readonly workspaceId?: string
  readonly title: string
  readonly root: string
  readonly sources: string
  readonly extracted: string
  readonly concepts: string
  readonly notes: string
  readonly internal: string
  readonly structure: string
  readonly manifestPath: string
}

/** A path that tried to leave the vault it was resolved against. */
export class VaultContainmentError extends Error {
  constructor(readonly candidate: string, readonly root: string) {
    super(`path '${candidate}' is outside the learning vault '${root}'`)
    this.name = 'VaultContainmentError'
  }
}

/**
 * Build the vault view of a directory. Pure path arithmetic — it does not check
 * that the directory exists or is a vault.
 * @param root - Absolute directory path.
 * @param title - Display title; defaults to the directory's own name.
 * @param workspaceId - Workspace id when known.
 */
export function vaultFromRoot(root: string, title?: string, workspaceId?: string): TopicVault {
  const absolute = resolve(root)
  return {
    ...(workspaceId === undefined ? {} : { workspaceId }),
    title: title ?? basename(absolute),
    root: absolute,
    sources: join(absolute, VAULT_DIRECTORIES.sources),
    extracted: join(absolute, VAULT_DIRECTORIES.extracted),
    concepts: join(absolute, VAULT_DIRECTORIES.concepts),
    notes: join(absolute, VAULT_DIRECTORIES.notes),
    internal: join(absolute, VAULT_DIRECTORIES.internal),
    structure: join(absolute, VAULT_DIRECTORIES.structure),
    manifestPath: join(absolute, VAULT_MANIFEST_PATH),
  }
}

/** Whether a directory already holds a learning vault. */
export async function isVaultRoot(root: string): Promise<boolean> {
  try {
    const info = await stat(join(resolve(root), VAULT_MANIFEST_PATH))
    return info.isFile()
  } catch {
    return false
  }
}

/** The workspace registry, when this deployment composes one. */
interface WorkspaceLike {
  readonly id: string
  readonly path: string
  readonly title: string
}

interface WorkspaceRegistryLike {
  resolveByPath(path: string): Promise<WorkspaceLike | undefined>
}

/**
 * Resolve the vault a session runs in.
 *
 * The registry is consulted opportunistically for the display title: a vault is
 * defined by its manifest, so learning works in a plain directory even in a
 * composition that mounts no workspace registry.
 * @param ctx - The plugin context.
 * @param cwd - The session's immutable working directory.
 * @returns the vault, or `undefined` when this session is not in one.
 */
export async function resolveTopicVault(ctx: Context, cwd: string | undefined): Promise<TopicVault | undefined> {
  if (cwd === undefined || cwd === '') return undefined
  let root: string
  try {
    root = await realpath(cwd)
  } catch {
    return undefined
  }
  if (!await isVaultRoot(root)) return undefined
  const recorded = (await readManifest(vaultFromRoot(root))).title
  const registry = ctx.get('workspaceRegistry' as never) as WorkspaceRegistryLike | undefined
  if (registry === undefined) return vaultFromRoot(root, recorded)
  try {
    const workspace = await registry.resolveByPath(root)
    return workspace === undefined
      ? vaultFromRoot(root, recorded)
      : vaultFromRoot(root, workspace.title, workspace.id)
  } catch {
    return vaultFromRoot(root, recorded)
  }
}

/**
 * Create the vault layout, idempotently. Safe to call on an existing vault: the
 * manifest is only written when absent, so a reingest never resets the record.
 * @param root - Absolute directory to make into a vault.
 * @param title - Display title for a newly created vault.
 * @returns the resolved vault.
 */
export async function ensureVaultLayout(root: string, title?: string): Promise<TopicVault> {
  const vault = vaultFromRoot(root, title)
  for (const directory of [vault.sources, vault.extracted, vault.concepts, vault.notes, vault.structure]) {
    await mkdir(directory, { recursive: true })
  }
  if (!await isVaultRoot(vault.root)) {
    const now = new Date().toISOString()
    await writeManifest(vault, {
      protocol: VAULT_MANIFEST_PROTOCOL,
      ...(title === undefined ? {} : { title }),
      createdAt: now,
      updatedAt: now,
      sources: [],
    })
  }
  return vault
}

/**
 * Read the vault manifest.
 *
 * A damaged manifest resolves to an empty one rather than throwing: the vault is
 * a folder a person can edit, and a stray keystroke in a cache file must never
 * cost them their session. The manifest describes only rebuildable state.
 * @param vault - The vault to read.
 */
export async function readManifest(vault: TopicVault): Promise<VaultManifest> {
  const now = new Date().toISOString()
  const empty: VaultManifest = {
    protocol: VAULT_MANIFEST_PROTOCOL,
    createdAt: now,
    updatedAt: now,
    sources: [],
  }
  try {
    const parsed = JSON.parse(await readFile(vault.manifestPath, 'utf8')) as VaultManifest
    if (parsed?.protocol !== VAULT_MANIFEST_PROTOCOL || !Array.isArray(parsed.sources)) return empty
    return parsed
  } catch {
    return empty
  }
}

/** Write the vault manifest, stamping `updatedAt`. */
export async function writeManifest(vault: TopicVault, manifest: VaultManifest): Promise<void> {
  await mkdir(vault.internal, { recursive: true })
  const stamped: VaultManifest = { ...manifest, updatedAt: new Date().toISOString() }
  await writeFile(vault.manifestPath, `${JSON.stringify(stamped, undefined, 2)}\n`, 'utf8')
}

/** Replace one source's manifest entry, appending when it is new. */
export async function upsertManifestEntry(
  vault: TopicVault,
  entry: SourceManifestEntry,
): Promise<VaultManifest> {
  const manifest = await readManifest(vault)
  const sources = manifest.sources.filter(candidate => candidate.sourceId !== entry.sourceId)
  const next: VaultManifest = { ...manifest, sources: [...sources, entry] }
  await writeManifest(vault, next)
  return next
}

/** Absolute path of one source's structure record. */
export function structurePathOf(vault: TopicVault, sourceId: string): string {
  return join(vault.structure, `${sourceId}.json`)
}

/**
 * Read one source's derived structure.
 * @returns the structure, or `undefined` when it is missing or unreadable.
 */
export async function readStructure(
  vault: TopicVault,
  sourceId: string,
): Promise<SourceStructure | undefined> {
  try {
    const path = await containedPath(vault, structurePathOf(vault, sourceId))
    const parsed = JSON.parse(await readFile(path, 'utf8')) as SourceStructure
    return Array.isArray(parsed?.sections) ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Read every source structure the vault holds, in manifest order.
 *
 * Sources present on disk but absent from the manifest are included too: the
 * manifest is a cache, and a hand-copied structure file is still a real source.
 */
export async function readAllStructures(vault: TopicVault): Promise<readonly SourceStructure[]> {
  const manifest = await readManifest(vault)
  const ordered = manifest.sources.map(entry => entry.sourceId)
  let onDisk: string[] = []
  try {
    onDisk = (await readdir(vault.structure))
      .filter(name => name.endsWith('.json'))
      .map(name => name.slice(0, -'.json'.length))
  } catch {
    onDisk = []
  }
  const ids = [...new Set([...ordered, ...onDisk])]
  const structures: SourceStructure[] = []
  for (const id of ids) {
    const structure = await readStructure(vault, id)
    if (structure !== undefined) structures.push(structure)
  }
  return structures
}

/**
 * Resolve a vault-relative path and prove it stays inside the vault.
 *
 * Canonicalize-then-contain, matching the harness fs fence: the deepest existing
 * ancestor is realpath'd so a symlink planted inside the vault cannot redirect a
 * read outside it.
 * @param vault - The vault to contain against.
 * @param candidate - A vault-relative path; an absolute path is accepted only
 * when it is already inside the vault.
 * @returns the absolute, contained path.
 * @throws VaultContainmentError when the path escapes.
 */
export async function containedPath(vault: TopicVault, candidate: string): Promise<string> {
  if (candidate.includes('\0')) throw new VaultContainmentError(candidate, vault.root)
  const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(vault.root, candidate)
  const canonicalRoot = await realpath(vault.root)
  let probe = absolute
  const missing: string[] = []
  for (;;) {
    try {
      probe = await realpath(probe)
      break
    } catch {
      const parent = resolve(probe, '..')
      if (parent === probe) return contain(absolute, canonicalRoot, candidate)
      missing.unshift(basename(probe))
      probe = parent
    }
  }
  return contain(join(probe, ...missing), canonicalRoot, candidate)
}

function contain(absolute: string, root: string, candidate: string): string {
  const rel = relative(root, absolute)
  if (rel === '') return absolute
  if (rel.startsWith('..') || isAbsolute(rel) || rel.split(sep).includes('..')) {
    throw new VaultContainmentError(candidate, root)
  }
  return absolute
}

/** Vault-relative form of an absolute path, for display and for anchors. */
export function vaultRelative(vault: TopicVault, absolute: string): string {
  return relative(vault.root, absolute).split(sep).join('/')
}
