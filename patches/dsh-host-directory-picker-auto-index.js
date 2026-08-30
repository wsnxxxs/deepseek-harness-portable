'use strict'

/**
 * Make the adaptive picker recognize WSL as a Windows-backed native host, and
 * let an operator pin the backend outright.
 *
 * Each hunk is guarded by its own marker rather than by one blanket
 * "already patched" check: a source tree that already carries the WSL hunk
 * (an in-place patched checkout) must still receive newer hunks, otherwise
 * later additions are silently skipped forever.
 */
function patchDirectoryPickerAuto(source) {
  let output = source

  // --- WSL maps to the Windows native backend ---
  if (!output.includes('dshIsWsl')) {
    const importMarker = 'import { accessSync, constants } from "node:fs";'
    if (!output.includes(importMarker)) throw new Error('directory-picker auto import marker is missing')
    output = output.replace(
      importMarker,
      `${importMarker}\nimport { release as dshOsRelease } from "node:os";`,
    )

    const probeMarker = '//#region lib/types/probe.js'
    if (!output.includes(probeMarker)) throw new Error('directory-picker auto probe marker is missing')
    output = output.replace(
      probeMarker,
      `function dshPresent(value) {\n\treturn value !== void 0 && value !== "";\n}\nfunction dshIsWsl() {\n\tconst env = process.env;\n\tif (dshPresent(env.WSL_DISTRO_NAME) || dshPresent(env.WSL_INTEROP)) return true;\n\treturn dshOsRelease().toLowerCase().includes("microsoft");\n}\n${probeMarker}`,
    )

    const platformMarker = '\t\tplatform: process.platform,'
    if (!output.includes(platformMarker)) throw new Error('directory-picker auto platform marker is missing')
    output = output.replace(
      platformMarker,
      '\t\tplatform: process.platform === "linux" && dshIsWsl() ? "win32" : process.platform,',
    )
  }

  // --- Operator backend override ---
  // The native Win32 chooser drives COM through koffi from a spawned child
  // process. On hosts where that child cannot start, every pick fails and the
  // official workspace surface has no recovery of its own — "Choose again"
  // reopens the same failing native flow. Pinning `browse` keeps "open
  // workspace" usable (an in-app directory browser) while the native tier is
  // unavailable or being diagnosed.
  if (!output.includes('DSH_DIRECTORY_PICKER_BACKEND')) {
    const resolveMarker = 'function resolveDirectoryPickerBackend(facts) {\n\tif (facts.bindHost !== "127.0.0.1") return "browse";'
    if (!output.includes(resolveMarker)) throw new Error('directory-picker auto resolve marker is missing')
    output = output.replace(
      resolveMarker,
      'function resolveDirectoryPickerBackend(facts) {\n\tconst dshOverride = process.env.DSH_DIRECTORY_PICKER_BACKEND;\n\tif (dshOverride === "browse" || dshOverride === "native") return dshOverride;\n\tif (facts.bindHost !== "127.0.0.1") return "browse";',
    )
  }

  return output
}

module.exports = { patchDirectoryPickerAuto }
