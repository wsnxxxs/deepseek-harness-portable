const { existsSync } = require('node:fs')
const { join, win32 } = require('node:path')

/**
 * Locate the outer portable directory from Electron's app/src directory.
 *
 * In a packaged app, app/src is four parents below the portable root:
 * runtime/resources/app/src. The shorter candidates keep the helper useful
 * for development layouts without assuming that source and packaged trees
 * have the same parent depth.
 *
 * @param {string} appDir - the directory containing the Electron entry file.
 * @param {(path: string) => boolean} [exists] - injectable filesystem probe.
 * @returns {string|undefined} the portable root, when it is present.
 */
function findPortableRoot(appDir, exists = existsSync) {
  // Drive-letter inputs are Windows paths and must be joined with the win32
  // separator contract; anything else falls back to the host's own join.
  const pathJoin = /^[A-Za-z]:[\\/]/.test(appDir) ? win32.join : join
  const candidates = [
    pathJoin(appDir, '..', '..', '..', '..'),
    pathJoin(appDir, '..', '..', '..'),
    pathJoin(appDir, '..', '..'),
  ]

  for (const candidate of candidates) {
    if (exists(pathJoin(candidate, 'update.ps1'))
      && exists(pathJoin(candidate, 'runtime', 'DeepSeek Harness.exe'))) {
      return candidate
    }
  }
  return undefined
}

module.exports = { findPortableRoot }
