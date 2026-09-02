const { spawn } = require('node:child_process')
const { existsSync } = require('node:fs')
const { release: osRelease } = require('node:os')
const { join } = require('node:path')

/**
 * Return the initial shell state for the current platform. Windows reaches
 * Bash through WSL; macOS and Linux already provide the native POSIX shell.
 */
function nativeShellState(platform = process.platform) {
  if (platform !== 'win32') {
    return { platform, native: true, available: true, probed: true, distros: [], executable: '/bin/bash' }
  }
  return { platform: 'win32', native: false, available: false, probed: false, distros: [], executable: 'wsl.exe' }
}

function iconPath(assets) {
  const candidates = ['deepseek.ico', 'deepseek.png']
  return candidates
    .map(name => join(assets, name))
    .find(path => existsSync(path)) || join(assets, candidates[0])
}

function releaseAssetName(version, platform = process.platform) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version) || version === '0.0.0') return undefined
  if (platform === 'darwin') return `DeepSeek-Harness-${version}-darwin-arm64.dmg`
  if (platform === 'linux') return `DeepSeek-Harness-${version}-linux-x64.AppImage`
  return `DeepSeek-Harness-${version}-win32-x64.zip`
}

/**
 * Lowest Windows build that accepts `BrowserWindow.backgroundMaterial`.
 * Mica arrived with Windows 11 (22000); the acrylic material became a
 * supported window backdrop in 22H2 (22621).
 */
const MICA_MIN_BUILD = 22000
const ACRYLIC_MIN_BUILD = 22621

/**
 * The Windows build number out of an `os.release()` string.
 * @param {string} release - e.g. "10.0.22631".
 * @returns {number} the build, or 0 when the string is not a Windows release.
 */
function windowsBuild(release) {
  if (typeof release !== 'string') return 0
  const build = Number.parseInt(release.split('.')[2] ?? '', 10)
  return Number.isFinite(build) ? build : 0
}

/**
 * The strongest native window backdrop this OS can actually render.
 *
 * Electron silently ignores `backgroundMaterial` where it is unsupported, but
 * the option only works with a fully transparent `backgroundColor` — and a
 * transparent window whose material never arrives is a see-through hole. So
 * the caller needs to know, not guess: 'none' means keep the opaque surface.
 * @param {string} [platform] - process.platform.
 * @param {string} [release] - os.release().
 * @returns {'acrylic'|'mica'|'none'} the material to request.
 */
function windowMaterial(platform = process.platform, release = osRelease()) {
  if (platform !== 'win32') return 'none'
  const build = windowsBuild(release)
  if (build >= ACRYLIC_MIN_BUILD) return 'acrylic'
  if (build >= MICA_MIN_BUILD) return 'mica'
  return 'none'
}

function browserCommand(url, platform = process.platform) {
  if (platform === 'darwin') return { command: 'open', args: [url], options: {} }
  if (platform === 'linux') return { command: 'xdg-open', args: [url], options: {} }
  return { command: 'cmd.exe', args: ['/d', '/s', '/c', 'start', '', url], options: { windowsHide: true } }
}

function openBrowser(url, { spawnImpl = spawn, platform = process.platform } = {}) {
  const spec = browserCommand(url, platform)
  const child = spawnImpl(spec.command, spec.args, { ...spec.options, detached: true, stdio: 'ignore' })
  if (child && typeof child.unref === 'function') child.unref()
  return child
}

module.exports = {
  browserCommand,
  windowMaterial,
  windowsBuild,
  iconPath,
  nativeShellState,
  openBrowser,
  releaseAssetName,
}
