/**
 * Reviewed transforms over the vendored kernel's build output.
 *
 * `scripts/build/runtime-patches.ts` is the other patch layer: it rewrites the
 * packaged staging tree's `node_modules` and therefore exists only inside a
 * packaged artifact. That is the wrong place for anything a developer has to
 * see running out of this repository — a UI change made there could never be
 * verified before packaging.
 *
 * This layer runs immediately after `kernel-build.ts` builds the kernel, so
 * both `pnpm run build` and the packaging pipeline observe the same bytes. The
 * targets are generated and gitignored (`vendor/deepseek-harness/**\/lib/`), so
 * the submodule stays byte-clean: there is nothing to re-apply after a kernel
 * bump, and the manifest's guards fail the build if the code they name moved.
 * @module scripts/build/kernel-patches
 */

import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { attestPatchedFile, loadPatchManifest, type PatchAttestation } from './patch-manifest.js'

const require = createRequire(import.meta.url)
const { patchCommandMenuSections } = require('../../patches/dsh-client-ui-commands-menu-sections.js') as {
  patchCommandMenuSections(source: string): string
}

/** Repository-relative location of the reviewed kernel patch inventory. */
export const KERNEL_PATCH_MANIFEST = join('patches', 'kernel-manifest.yml')

/** Root the manifest's paths resolve against. */
export const KERNEL_ROOT = join('vendor', 'deepseek-harness')

/** Transform bodies by manifest patch id. */
const TRANSFORMS: Readonly<Record<string, (source: string) => string>> = {
  'command-menu-sections': patchCommandMenuSections,
}

/**
 * Apply every reviewed kernel transform in place.
 *
 * A transform that finds its own work already done answers the input
 * unchanged, because the kernel build is incremental and may hand back a
 * `lib/` it did not rewrite.
 * @param root - repository root.
 * @returns one attestation per patch, in manifest order.
 */
export async function applyKernelPatches(root: string): Promise<readonly PatchAttestation[]> {
  const definitions = await loadPatchManifest(join(root, KERNEL_PATCH_MANIFEST))
  const attestations: PatchAttestation[] = []
  for (const definition of definitions) {
    const transform = TRANSFORMS[definition.id]
    if (transform === undefined) throw new Error(`${KERNEL_PATCH_MANIFEST}: no transform registered for patch "${definition.id}"`)
    const files = []
    let changed = false
    for (const file of definition.files) {
      const path = join(root, KERNEL_ROOT, file.path)
      const input = await readFile(path, 'utf8')
      const result = attestPatchedFile(definition, file, input, transform)
      if (result.changed) await writeFile(path, result.output)
      changed ||= result.changed
      files.push(result.attestation)
    }
    attestations.push({ id: definition.id, status: changed ? 'applied' : 'already-upstream', files })
  }
  return attestations
}
