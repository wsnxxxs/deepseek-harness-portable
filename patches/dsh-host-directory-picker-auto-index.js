'use strict'

/** Make the adaptive picker recognize WSL as a Windows-backed native host. */
function patchDirectoryPickerAuto(source) {
  if (source.includes('dshIsWsl')) return source

  const importMarker = 'import { accessSync, constants } from "node:fs";'
  if (!source.includes(importMarker)) throw new Error('directory-picker auto import marker is missing')
  let output = source.replace(
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
  return output
}

module.exports = { patchDirectoryPickerAuto }
