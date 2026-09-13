/**
 * The `/portable-plugins` endpoint bodies.
 *
 * Everything that touches the filesystem or the Loader lives here; the pure
 * folds it composes are in `./registry.ts`, which is what the tests exercise.
 * @module @dsh-portable/plugin-manager/host/rpc
 */

import { createRequire } from 'node:module'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readProfileManifest, writeProfileManifest, resolveProfileDir } from '@deepseek-ai/dsh-app-boot'
import type { ProfileManifest } from '@deepseek-ai/dsh-app-boot'
import {
  type PortablePluginErrorCode,
  type PortablePluginList,
  type PortablePluginResult,
  type PortablePluginRow,
  type PortablePluginToggle,
} from './contract.ts'
import {
  composeRows, nextPreferences, portablePreferences, toggleOutcome,
  type LoaderEntryView, type PackageFacts,
} from './registry.ts'

/** Bin name used in the profile reader's diagnostics. */
const BIN_NAME = 'plugin-manager'

/** The profile the browser surface runs in; the only one with portable rows. */
const PROFILE_NAME = 'web'

const FEATURE_BUNDLES = new Set([
  '@dsh-portable/dcode-ui', '@dsh-portable/cluster-ui', '@dsh-portable/interactive-learning',
])
const REQUIREMENTS: Record<string, string[]> = {
  '@dsh-portable/dcode-ui': ['@dsh-portable/ui-mode', '@dsh-portable/session-manager'],
}

/** The Loader face this module reads. */
export interface PluginLoaderView {
  entries(): Iterable<{
    readonly id: string
    readonly disabled: boolean
    readonly options: { readonly id?: string | undefined; readonly name?: string | undefined }
  }>
}

/** The dependencies the endpoints need, injected so tests can supply fakes. */
export interface PortablePluginDeps {
  /** Live Loader rows. */
  readonly loader: PluginLoaderView
  /** Absolute web profile directory. */
  readonly profileDir: string
  /** Package manifest lookup for version and description. */
  readonly facts: (name: string) => PackageFacts | undefined
}

function failure(
  code: PortablePluginErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): PortablePluginResult<never> {
  return { ok: false, error: { code, message, details } }
}

/** Read the Loader's rows through the narrow view {@link composeRows} wants. */
function loaderRows(loader: PluginLoaderView): readonly LoaderEntryView[] {
  const rows: LoaderEntryView[] = []
  for (const entry of loader.entries()) {
    const name = entry.options.name
    if (typeof name !== 'string') continue
    rows.push({ id: entry.options.id ?? entry.id, name, disabled: entry.disabled })
  }
  return rows
}

/**
 * Resolve one package's displayed facts through Node's own resolution.
 *
 * The portable packages are dependencies of the runtime and each exports its
 * own `package.json`, so this needs no knowledge of where the installation put
 * them. A package that cannot be resolved simply shows without a version.
 * @param anchor - a module URL inside the installation to resolve from.
 * @returns the lookup.
 */
export function packageFactsFrom(anchor: string): (name: string) => PackageFacts | undefined {
  const require = createRequire(anchor)
  return (name) => {
    try {
      return require(`${name}/package.json`) as PackageFacts
    } catch {
      return undefined
    }
  }
}

/** Build the default host dependencies. */
export function defaultDeps(loader: PluginLoaderView, anchor: string): PortablePluginDeps {
  return {
    loader,
    profileDir: resolveProfileDir(PROFILE_NAME),
    facts: packageFactsFrom(anchor),
  }
}

/** `list`: every built-in feature with its live and recorded state. */
export function listPortablePlugins(deps: PortablePluginDeps): PortablePluginResult<PortablePluginList> {
  try {
    const manifest = readProfileManifest(BIN_NAME, deps.profileDir)
    return { ok: true, value: { plugins: composeRows(loaderRows(deps.loader), portablePreferences(manifest), deps.facts) } }
  } catch (cause) {
    return failure('unavailable', cause instanceof Error ? cause.message : String(cause))
  }
}

/**
 * `set-enabled`: record the preference the next launch will adopt.
 * @param deps - host dependencies.
 * @param payload - the requested `{ name, enabled }`.
 * @returns the toggle outcome, or a refusal.
 */
export function setPortablePluginEnabled(
  deps: PortablePluginDeps,
  payload: unknown,
): PortablePluginResult<PortablePluginToggle> {
  const request = payload as { name?: unknown; enabled?: unknown } | null | undefined
  const name = typeof request?.name === 'string' ? request.name : ''
  const enabled = request?.enabled
  if (name === '' || typeof enabled !== 'boolean') {
    return failure('bad-request', 'set-enabled needs a package name and a boolean', { name })
  }
  let manifest: ProfileManifest
  let rows: readonly PortablePluginRow[]
  try {
    manifest = readProfileManifest(BIN_NAME, deps.profileDir)
    rows = composeRows(loaderRows(deps.loader), portablePreferences(manifest), deps.facts)
  } catch (cause) {
    return failure('unavailable', cause instanceof Error ? cause.message : String(cause))
  }
  const row = rows.find(candidate => candidate.name === name)
  // Only rows this distribution actually mounts are switchable here; a
  // third-party package belongs to whatever installed it.
  if (row === undefined) return failure('not-builtin', `${name} is not a built-in feature of this build`, { name })
  try {
    let preferences = nextPreferences(portablePreferences(manifest), name, enabled)
    if (enabled) {
      for (const dependency of REQUIREMENTS[name] ?? []) preferences = nextPreferences(preferences, dependency, true)
    } else {
      for (const [dependent, dependencies] of Object.entries(REQUIREMENTS)) {
        if (dependencies.includes(name)) preferences = nextPreferences(preferences, dependent, false)
      }
    }
    const bundles = new Set(manifest.dsh?.profile?.bundles ?? [])
    for (const bundle of FEATURE_BUNDLES) {
      if (preferences[bundle] === true) bundles.add(bundle)
      if (preferences[bundle] === false) bundles.delete(bundle)
    }
    const patchPath = join(deps.profileDir, 'cordis.patch.yml')
    const start = '# BEGIN portable-plugin-manager'
    const end = '# END portable-plugin-manager'
    let source = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
    const marker = source.indexOf(start)
    if (marker >= 0) {
      const finish = source.indexOf(end, marker)
      if (finish < 0) throw new Error('portable plugin configuration has an unfinished managed block')
      source = source.slice(0, marker) + source.slice(finish + end.length)
    }
    // Official profile templates include comments before the empty sequence.
    if (source.replace(/^\s*#.*$/gm, '').trim() === '[]') {
      source = source.replace(/^\s*\[\]\s*$/m, '')
    }
    const patches = rows.filter(item => preferences[item.name] !== undefined)
      .map(item => `- id: ${JSON.stringify(item.id)}\n  disabled: ${!preferences[item.name]}`)
    writeFileSync(patchPath, `${source.trimEnd()}\n${start}\n${patches.join('\n')}\n${end}\n`)
    writeProfileManifest(deps.profileDir, {
      ...manifest,
      dsh: {
        ...manifest.dsh,
        profile: {
          ...manifest.dsh?.profile,
          bundles: [...bundles],
          portablePlugins: preferences,
        },
      },
    } as ProfileManifest)
  } catch (cause) {
    return failure('write-failed', cause instanceof Error ? cause.message : String(cause), { name })
  }
  return { ok: true, value: toggleOutcome(row, enabled) }
}

/**
 * Route one endpoint of the channel.
 * @param endpoint - the endpoint name, already narrowed by the caller.
 * @param payload - the caller's payload.
 * @param deps - host dependencies.
 * @returns the answer envelope.
 */
export function handlePortablePluginEndpoint(
  endpoint: 'list' | 'set-enabled',
  payload: unknown,
  deps: PortablePluginDeps,
): PortablePluginResult<PortablePluginList | PortablePluginToggle> {
  return endpoint === 'list' ? listPortablePlugins(deps) : setPortablePluginEnabled(deps, payload)
}
