import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'

const PROFILE_FALLBACK_CACHE_SCHEMA_VERSION = 1

type ProfileFallbackCache = {
  schemaVersion: 1
  key: string
  entries: string[]
}

export interface CachedProfileFallbackHealerOptions {
  readonly profileDir: string
  readonly installAnchor: string
  readonly runtimeDepsPath?: string
  readonly bundles: () => readonly string[]
  readonly heal: (options: { installAnchor: string }) => void | Promise<void>
}

async function digestFile(path: string | undefined): Promise<string> {
  if (path === undefined) return 'missing'
  try {
    return createHash('sha256').update(await readFile(path)).digest('hex')
  } catch {
    return 'missing'
  }
}

async function cacheKey(options: CachedProfileFallbackHealerOptions): Promise<string> {
  const [anchor, runtimeDeps] = await Promise.all([
    digestFile(options.installAnchor),
    digestFile(options.runtimeDepsPath),
  ])
  return createHash('sha256').update(JSON.stringify({
    schemaVersion: PROFILE_FALLBACK_CACHE_SCHEMA_VERSION,
    profileDir: resolve(options.profileDir),
    installAnchor: resolve(options.installAnchor),
    anchor,
    runtimeDeps,
    bundles: [...options.bundles()],
  })).digest('hex')
}

async function readCache(path: string): Promise<ProfileFallbackCache | undefined> {
  try {
    const value = JSON.parse(await readFile(path, 'utf8')) as Partial<ProfileFallbackCache>
    if (value.schemaVersion !== PROFILE_FALLBACK_CACHE_SCHEMA_VERSION
      || typeof value.key !== 'string'
      || !Array.isArray(value.entries)
      || value.entries.some(entry => typeof entry !== 'string')) return undefined
    return {
      schemaVersion: PROFILE_FALLBACK_CACHE_SCHEMA_VERSION,
      key: value.key,
      entries: value.entries,
    }
  } catch {
    return undefined
  }
}

async function fallbackEntriesCurrent(modulesDir: string, state: ProfileFallbackCache, key: string): Promise<boolean> {
  if (state.key !== key) return false
  try {
    const current = new Set(await readdir(modulesDir))
    return state.entries.every(entry => current.has(entry))
  } catch {
    return false
  }
}

/**
 * Skip the installation fallback BFS when the runtime dependency generation
 * and composed profile bundle list are unchanged. The marker lock and the
 * second read inside it keep concurrent launches from racing a repair.
 */
export function createCachedProfileFallbackHealer(
  options: CachedProfileFallbackHealerOptions,
): () => Promise<void> {
  const profileRoot = dirname(options.profileDir)
  const modulesDir = join(profileRoot, 'node_modules')
  const markerPath = join(profileRoot, '.dsh-profile-fallback-cache-v1.json')

  return async (): Promise<void> => {
    const key = await cacheKey(options)
    await mkdir(profileRoot, { recursive: true })
    const reconcile = async (): Promise<void> => {
      const cached = await readCache(markerPath)
      if (cached !== undefined && await fallbackEntriesCurrent(modulesDir, cached, key)) return
      await options.heal({ installAnchor: options.installAnchor })
      try {
        const entries = await readdir(modulesDir)
        await writeFileAtomic(markerPath, `${JSON.stringify({
          schemaVersion: PROFILE_FALLBACK_CACHE_SCHEMA_VERSION,
          key,
          entries,
        } satisfies ProfileFallbackCache, undefined, 2)}\n`, { mode: 0o600, dirMode: 0o700 })
      } catch {
        // Healing already completed; a cache write failure must not block boot.
      }
    }

    try {
      await withFileLock(markerPath, reconcile, { waitMs: 5_000 })
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('timed out waiting for the writer lock')) throw error
      await options.heal({ installAnchor: options.installAnchor })
    }
  }
}
