/** Profile migration from auto-enabled Portable bundles to explicit opt-in. */
import { lstat, mkdir, realpath, symlink, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
const SHELL_BUNDLE = '@dsh-portable/desktop-protocol'
const MANAGEMENT_BUNDLE = '@dsh-portable/web-plugins'
const AUTO_BUNDLES = new Set(['@linxin666/dsh-web-all', 'dsh-plugin-marketplace'])

export function hasLegacyMarketplace(manifest: Record<string, any>): boolean {
  return manifest.dependencies?.['dsh-plugin-marketplace'] !== undefined
    || manifest.dsh?.profile?.bundles?.includes('dsh-plugin-marketplace') === true
}

/** The dsh-web inventory reads physical profile dependencies, outside Loader's fallback resolver. */
export async function linkPluginManagement(profileDir: string, packageDir: string): Promise<void> {
  const target = join(profileDir, 'node_modules', '@dsh-portable', 'web-plugins')
  await mkdir(dirname(target), { recursive: true })
  try {
    const entry = await lstat(target)
    if (!entry.isSymbolicLink()) return
    if (await realpath(target).catch(() => '') === await realpath(packageDir)) return
    await unlink(target)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  await symlink(packageDir, target, process.platform === 'win32' ? 'junction' : 'dir')
}

/** Keep explicit feature choices while replacing the retired standalone marketplace. */
export function prepareOfficialProfile(manifest: Record<string, any>, managementPath?: string): Record<string, any> {
  // The upstream profile manifest is JSON with extensible package-owned fields.
  const result = structuredClone(manifest)
  result.dsh ??= {}
  result.dsh.profile ??= {}
  const profile = result.dsh.profile
  let bundles: string[] = profile.bundles ?? []
  bundles = bundles.filter(name => name !== 'dsh-plugin-marketplace')
  if (result.dependencies) delete result.dependencies['dsh-plugin-marketplace']
  if (profile.portableOfficialDefaults !== 1) {
    if (profile.portableWebAllSeeded === true) bundles = bundles.filter(name => !AUTO_BUNDLES.has(name))
    profile.portableOfficialDefaults = 1
  }
  // Defaults precede user-selected bundles so their explicit overrides win.
  profile.bundles = [...new Set([SHELL_BUNDLE, MANAGEMENT_BUNDLE, ...bundles])]
  if (managementPath) {
    result.dependencies ??= {}
    result.dependencies[MANAGEMENT_BUNDLE] = `file:${managementPath.replaceAll('\\', '/')}`
  }
  return result
}
