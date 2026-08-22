const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage, nativeTheme, screen, session, shell, Tray } = require('electron')
const { spawn } = require('node:child_process')
const {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  watch,
  writeFileSync,
} = require('node:fs')
const { homedir } = require('node:os')
const { basename, delimiter, dirname, join, resolve } = require('node:path')
const { messageForLocale, localeFromSystem, normalizePreference } = require('./desktop-locale.cjs')
const { readLocalePreference } = require('./desktop-locale-store.cjs')
const { countSectionBadges, mergeReleaseHistory, normalizeReleaseNotes, normalizeReleaseNotesHistory } = require('./release-notes.cjs')
const { findPortableRoot } = require('./update-path.cjs')
const { evaluateUpdateLaunch } = require('./update-transaction.cjs')
const { ensureUnifiedDshHome } = require('./workspace-service.cjs')
const { readConfigStore, updateConfigStore } = require('./config-store.cjs')
const { RuntimeSupervisor, runtimeStartupError } = require('./runtime-supervisor.cjs')
const { settingsDescribeUrl } = require('./ready-url.cjs')
const { shouldDisplayDesktopWindows } = require('./window-display-policy.cjs')
const {
  iconPath: platformIconPath,
  nativeShellState,
  releaseAssetName: platformReleaseAssetName,
} = require('./desktop-platform.cjs')
const {
  GITHUB_MIRROR_PREFIXES,
  compareVersions,
  fetchJson,
  isValidSemver,
  mirrorUrls,
} = require('./update-client.cjs')
const {
  PORTABLE_RELEASE_REPO,
  evaluateReleaseUpdate,
} = require('./update-sources.cjs')
const {
  DEFAULT_WINDOW_BOUNDS,
  restoreWindowBounds,
} = require('./window-state.cjs')

const APP_NAME = 'DeepSeek Harness'
const RELEASE_MANIFEST_NAME = 'release-manifest.json'
const RELEASE_NOTES_FILE_NAME = 'release-notes.json'
const RELEASE_HISTORY_FILE_NAME = 'release-history.json'
const DESKTOP_PRELOAD_NAME = 'desktop-preload.cjs'
const SPLASH_PAGE_NAME = 'splash.html'
const RELEASE_HISTORY_LIMIT = 20
const RECENT_WORKSPACES_LIMIT = 5
// The Windows shell hides the native title bar and reserves its 36px overlay
// in the renderer. macOS keeps the native title bar, so the web surface must
// not add a second synthetic title-bar gap.
const DESKTOP_TITLEBAR_HEIGHT = process.platform === 'win32' ? 36 : 0
const LIGHT_WINDOW_SURFACE = '#f4f7fb'
const DARK_WINDOW_SURFACE = '#0c1220'
const SLOW_STARTUP_MS = 10_000
const STARTUP_TIMEOUT_MS = 60_000
const RENDERER_FIRST_PAINT_TIMEOUT_MS = 5_000
const SPLASH_FADE_MS = 420
const STOP_TIMEOUT_MS = 5_000
const DEFAULT_ZOOM_FACTOR = 1
const MIN_ZOOM_FACTOR = 0.8
const MAX_ZOOM_FACTOR = 1.5
const ZOOM_STEP = 0.1
const HARNESS_HEALTH_INTERVAL_MS = 10_000
const HARNESS_HEALTH_MAX_INTERVAL_MS = 60_000
const HARNESS_HEALTH_TIMEOUT_MS = 3_000
const HARNESS_HEALTH_FAILURE_THRESHOLD = 3
// Automatic release checks are throttled to once per day; manual checks from
// the menu are never throttled. The desktop shell only reports availability;
// it never downloads or replaces the installed application.
const AUTO_UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const DISPLAY_DESKTOP_WINDOWS = shouldDisplayDesktopWindows()

if (!DISPLAY_DESKTOP_WINDOWS) {
  globalThis.__DSH_ELECTRON_TEST__ = { app, BrowserWindow, Menu, installed: true }
}

let window
let splashWindow
let tray
const runtimeSupervisor = new RuntimeSupervisor({ logger: console })
let harnessUrl
let restartPromise
let activeStartupController
let queuedRestart = false
let quitting = false
let restarting = false
let releaseNotesContext = { mode: 'history' }
let rendererReady = false
let rendererFirstPaint = false
let rendererFirstPaintWaiters = []
let lastStartupLog = ''
let inAppNotice
let queuedReleaseNotesContext
let boundsSaveTimer
let healthTimer
let healthProbePromise
let healthGeneration = 0
let unifiedDshHome
let desktopLocale = 'en'
let desktopLocaleSettingsPath
let desktopLocaleWatcher
let desktopLocaleReloadTimer
let harnessHealth = {
  state: 'starting',
  consecutiveFailures: 0,
  message: messageForLocale(desktopLocale, 'health.starting'),
}

function desktopText(key, values = {}) {
  return messageForLocale(desktopLocale, key, { appName: APP_NAME, ...values })
}

function systemDesktopLocale() {
  const candidates = []
  try {
    if (typeof app.getSystemLocale === 'function') candidates.push(app.getSystemLocale())
  } catch {}
  try {
    if (typeof app.getPreferredSystemLanguages === 'function') candidates.push(app.getPreferredSystemLanguages()[0])
  } catch {}
  try {
    if (typeof app.getLocale === 'function') candidates.push(app.getLocale())
  } catch {}
  return localeFromSystem(candidates.find(value => typeof value === 'string' && value.trim() !== '') || 'en')
}

function resolveDesktopLocale() {
  const result = readLocalePreference(desktopLocaleSettingsPath)
  if (result.error) {
    console.warn('Failed to read DeepSeek Harness locale settings:', result.error)
    return systemDesktopLocale()
  }
  if (result.invalidPreference) {
    console.warn('Ignoring unsupported DeepSeek Harness locale preference:', result.preference)
  }
  return normalizePreference(result.preference) || systemDesktopLocale()
}

function sendDesktopLocaleState() {
  sendRenderer('desktop:locale-changed', { locale: desktopLocale })
  if (splashWindow !== undefined && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('desktop:splash-locale', { locale: desktopLocale })
  }
}

function applyDesktopLocale(nextLocale, { force = false } = {}) {
  const normalized = normalizePreference(nextLocale) || systemDesktopLocale()
  if (!force && normalized === desktopLocale) return false
  const previousLocale = desktopLocale
  desktopLocale = normalized
  if (harnessHealth.state === 'starting'
    && harnessHealth.message === messageForLocale(previousLocale, 'health.starting')) {
    harnessHealth = { ...harnessHealth, message: desktopText('health.starting') }
  }
  if (tray !== undefined) rebuildMenus()
  sendDesktopLocaleState()
  sendHarnessHealthState()
  return true
}

function reloadDesktopLocale() {
  if (desktopLocaleSettingsPath === undefined) return
  const result = readLocalePreference(desktopLocaleSettingsPath)
  if (result.error) {
    console.warn('Failed to reload DeepSeek Harness locale settings:', result.error)
    return
  }
  if (result.invalidPreference) {
    console.warn('Ignoring unsupported DeepSeek Harness locale preference:', result.preference)
  }
  applyDesktopLocale(normalizePreference(result.preference) || systemDesktopLocale())
}

function scheduleDesktopLocaleReload() {
  if (desktopLocaleReloadTimer !== undefined) clearTimeout(desktopLocaleReloadTimer)
  desktopLocaleReloadTimer = setTimeout(() => {
    desktopLocaleReloadTimer = undefined
    reloadDesktopLocale()
  }, 240)
  desktopLocaleReloadTimer.unref()
}

function startDesktopLocaleWatcher() {
  if (desktopLocaleSettingsPath === undefined || desktopLocaleWatcher !== undefined) return
  const settingsDirectory = dirname(desktopLocaleSettingsPath)
  const settingsName = basename(desktopLocaleSettingsPath).toLowerCase()
  try {
    desktopLocaleWatcher = watch(settingsDirectory, { persistent: false }, (_eventType, filename) => {
      if (filename !== null && filename !== undefined
        && basename(String(filename)).toLowerCase() !== settingsName) return
      scheduleDesktopLocaleReload()
    })
    desktopLocaleWatcher.on('error', error => {
      console.warn('DeepSeek Harness locale settings watcher stopped:', error)
      try { desktopLocaleWatcher.close() } catch {}
      desktopLocaleWatcher = undefined
    })
  } catch (error) {
    console.warn('Failed to watch DeepSeek Harness locale settings:', error)
  }
}

function stopDesktopLocaleWatcher() {
  if (desktopLocaleReloadTimer !== undefined) clearTimeout(desktopLocaleReloadTimer)
  desktopLocaleReloadTimer = undefined
  if (desktopLocaleWatcher !== undefined) {
    try { desktopLocaleWatcher.close() } catch {}
    desktopLocaleWatcher = undefined
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function configPath() {
  return join(app.getPath('userData'), 'config.json')
}

function readConfig() {
  return readConfigStore(configPath(), { logger: console })
}

function updateConfig(patch) {
  return updateConfigStore(configPath(), patch, { logger: console })
}

function themePayload() {
  const isDark = nativeTheme.shouldUseDarkColors
  const surface = isDark ? DARK_WINDOW_SURFACE : LIGHT_WINDOW_SURFACE
  return {
    theme: isDark ? 'dark' : 'light',
    isDark,
    surface,
    titleBar: {
      color: surface,
      symbolColor: isDark ? '#f4f7fb' : '#1f2937',
      height: DESKTOP_TITLEBAR_HEIGHT,
    },
  }
}

function syncNativeTheme() {
  const theme = themePayload()
  if (window !== undefined && !window.isDestroyed()) {
    if (process.platform === 'win32' && typeof window.setTitleBarOverlay === 'function') {
      try { window.setTitleBarOverlay(theme.titleBar) } catch {}
    }
    if (process.platform === 'win32' && typeof window.setBackgroundColor === 'function') {
      try { window.setBackgroundColor(theme.surface) } catch {}
    }
    if (rendererReady) window.webContents.send('desktop:theme-changed', theme)
  }
  if (splashWindow !== undefined && !splashWindow.isDestroyed()) {
    if (typeof splashWindow.setBackgroundColor === 'function') {
      try { splashWindow.setBackgroundColor(theme.surface) } catch {}
    }
    splashWindow.webContents.send('desktop:splash-theme', theme)
  }
}

function sendRenderer(channel, payload) {
  if (window === undefined || window.isDestroyed() || !rendererReady) return false
  window.webContents.send(channel, payload)
  return true
}

function recentWorkspacePayload() {
  return {
    current: workspace(),
    workspaces: recentWorkspaces(),
  }
}

function sendRecentWorkspaceState() {
  sendRenderer('desktop:workspace:recents', recentWorkspacePayload())
}

function sendHarnessHealthState() {
  sendRenderer('desktop:harness-status', harnessHealth)
}

function setHarnessHealth(patch) {
  harnessHealth = { ...harnessHealth, ...patch }
  sendHarnessHealthState()
}

function queueOrSendReleaseNotes(context) {
  queuedReleaseNotesContext = { ...context }
  if (sendRenderer('desktop:release-notes:open', queuedReleaseNotesContext)) queuedReleaseNotesContext = undefined
}

function noticeVersion(notice) {
  const candidates = [notice?.release?.version, notice?.currentVersion]
  const value = candidates.find(candidate => typeof candidate === 'string' && candidate.trim() !== '')
  return value === undefined ? '' : value.trim()
}

function isNoticeDismissed(notice) {
  const version = noticeVersion(notice)
  return version !== '' && readConfig().lastDismissedVersion === version
}

function showInAppNotice(notice) {
  const nextNotice = notice && typeof notice === 'object' ? notice : undefined
  // The ready notice is an actionable prompt (its "never" button is hidden),
  // so a previous dismissal of the same version must not suppress it.
  if (nextNotice !== undefined && nextNotice.kind !== 'ready' && isNoticeDismissed(nextNotice)) {
    inAppNotice = undefined
    return false
  }
  inAppNotice = nextNotice
  sendRenderer('desktop:notice', inAppNotice)
  return true
}

function sendSplashStatus(status) {
  if (splashWindow === undefined || splashWindow.isDestroyed()) return
  splashWindow.webContents.send('desktop:splash-status', { status })
}

function sendSplashState(state) {
  if (splashWindow === undefined || splashWindow.isDestroyed()) return
  splashWindow.webContents.send('desktop:splash-state', state && typeof state === 'object' ? state : {})
}

function syncSplashBounds() {
  if (window === undefined || window.isDestroyed() || splashWindow === undefined || splashWindow.isDestroyed()) return
  try {
    const bounds = window.getBounds()
    if (bounds.width > 0 && bounds.height > 0) splashWindow.setBounds(bounds)
  } catch {}
}

function showSplashWindow() {
  if (splashWindow === undefined || splashWindow.isDestroyed()) return
  if (!DISPLAY_DESKTOP_WINDOWS) {
    splashWindow.hide()
    return
  }
  syncSplashBounds()
  const theme = themePayload()
  if (typeof splashWindow.setBackgroundColor === 'function') {
    try { splashWindow.setBackgroundColor(theme.surface) } catch {}
  }
  splashWindow.webContents.send('desktop:splash-theme', theme)
  if (!splashWindow.isVisible()) splashWindow.show()
  splashWindow.focus()
}

function hideSplashWindow() {
  const current = splashWindow
  if (current === undefined || current.isDestroyed()) return Promise.resolve()

  return new Promise(resolve => {
    let settled = false
    let timer
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve()
    }
    current.once('closed', finish)
    timer = setTimeout(() => {
      if (!current.isDestroyed()) current.close()
      setTimeout(finish, 60).unref()
    }, SPLASH_FADE_MS + 80)
    timer.unref()
    try {
      current.webContents.send('desktop:splash-transition', 'hide')
    } catch {
      finish()
    }
  })
}

function destroySplashWindow() {
  if (splashWindow === undefined || splashWindow.isDestroyed()) return
  try { splashWindow.destroy() } catch {}
}

async function createSplashWindow() {
  if (window === undefined || window.isDestroyed()) throw new Error('Main window is unavailable')
  const theme = themePayload()
  splashWindow = new BrowserWindow({
    ...window.getBounds(),
    parent: window,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    backgroundColor: theme.surface,
    icon: iconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, DESKTOP_PRELOAD_NAME),
    },
  })
  splashWindow.on('closed', () => {
    splashWindow = undefined
  })
  await splashWindow.loadFile(join(__dirname, SPLASH_PAGE_NAME))
  splashWindow.webContents.send('desktop:splash-locale', { locale: desktopLocale })
  splashWindow.webContents.send('desktop:splash-theme', theme)
}

function waitForRendererFirstPaint() {
  if (rendererFirstPaint) return Promise.resolve()
  return new Promise(resolve => {
    const waiter = { resolve, timer: undefined }
    waiter.timer = setTimeout(() => {
      rendererFirstPaintWaiters = rendererFirstPaintWaiters.filter(item => item !== waiter)
      resolve()
    }, RENDERER_FIRST_PAINT_TIMEOUT_MS)
    waiter.timer.unref()
    rendererFirstPaintWaiters.push(waiter)
  })
}

function notifyRendererFirstPaint() {
  rendererFirstPaint = true
  const waiters = rendererFirstPaintWaiters
  rendererFirstPaintWaiters = []
  waiters.forEach(waiter => {
    clearTimeout(waiter.timer)
    waiter.resolve()
  })
}

function makeStartupError(message, output = '', code = undefined) {
  const error = new Error(message)
  error.code = code
  error.startupLog = output
  return error
}

function startupLog(error) {
  if (error && typeof error.startupLog === 'string' && error.startupLog.trim() !== '') return error.startupLog
  return lastStartupLog
}

let shellState = nativeShellState()

/**
 * Decode the raw stdout of `wsl.exe -l -q`. WSL writes UTF-16LE (optionally
 * BOM-prefixed) when stdout is redirected, but honors `WSL_UTF8=1` and emits
 * UTF-8 instead. A UTF-16LE stream has NUL bytes at odd offsets, which UTF-8
 * terminal output never contains, so the byte pattern picks the encoding.
 * @param raw - the captured stdout bytes.
 * @returns trimmed non-empty distro name lines.
 */
function decodeWslDistroList(raw) {
  let text
  if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
    text = raw.subarray(2).toString('utf16le')
  } else {
    let oddZeros = 0
    let evenZeros = 0
    for (let index = 0; index < raw.length; index += 1) {
      if (raw[index] === 0) {
        if (index % 2 === 1) oddZeros += 1
        else evenZeros += 1
      }
    }
    text = oddZeros > evenZeros ? raw.toString('utf16le') : raw.toString('utf8')
  }
  return text
    .replace(/^\uFEFF/, '')
    .split(/[\r\n]+/)
    .map(s => s.replace(/\0/g, '').trim())
    .filter(Boolean)
}

function probeShellAvailability() {
  if (process.platform !== 'win32') {
    shellState = nativeShellState()
    sendShellState()
    return Promise.resolve(shellState)
  }
  return new Promise((resolve) => {
    const child = spawn('wsl.exe', ['-l', '-q'], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const chunks = []
    child.stdout.on('data', chunk => { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)) })
    child.on('error', () => {
      shellState = { ...nativeShellState('win32'), probed: true, available: false, distros: [] }
      sendShellState()
      resolve(shellState)
    })
    child.on('close', code => {
      const distros = decodeWslDistroList(Buffer.concat(chunks))
      const isAvailable = code === 0 && distros.length > 0
      shellState = { ...nativeShellState('win32'), probed: true, available: isAvailable, distros }
      sendShellState()
      resolve(shellState)
    })
  })
}

function sendShellState(sender) {
  if (sender !== undefined) {
    try { sender.send('desktop:shell-state', shellState) } catch {}
  } else {
    sendRenderer('desktop:shell-state', shellState)
  }
}

async function showShellGuideDialog(sender) {
  await probeShellAvailability().catch(() => {})
  const isInstalled = shellState.available
  const isNative = shellState.native === true
  const nativeMissing = isNative && !isInstalled
  const title = desktopText(isNative ? 'shell.nativeDialogTitle' : 'shell.dialogTitle')
  const message = isInstalled
    ? desktopText(isNative ? 'shell.nativeMessage' : 'shell.readyMessage')
    : desktopText(nativeMissing ? 'shell.nativeMissingMessage' : 'shell.missingMessage')
  const detail = isInstalled
    ? desktopText(isNative ? 'shell.nativeDetail' : 'shell.readyDetail', { distros: shellState.distros.join(', ') || 'Default' })
    : desktopText(nativeMissing ? 'shell.nativeMissingDetail' : 'shell.missingDetail')

  const buttons = isInstalled || isNative
    ? [desktopText('shell.ok')]
    : [desktopText('shell.copyInstallCmd'), desktopText('shell.ok')]

  const result = await dialog.showMessageBox(visibleDialogParent(), {
    type: isInstalled ? 'info' : 'warning',
    title,
    message,
    detail,
    buttons,
    defaultId: 0,
    cancelId: isInstalled || isNative ? 0 : 1,
  })

  if (!isInstalled && !nativeMissing && result.response === 0) {
    clipboard.writeText('wsl --install')
    sendDiagnosticsResult(sender, { kind: 'success', message: desktopText('shell.cmdCopied') })
  }
}

function diagnosticsText() {
  const release = getLocalReleaseInfo()
  return [
    `${APP_NAME} diagnostics`,
    `Generated: ${new Date().toISOString()}`,
    `Desktop version: ${release.desktopVersion}`,
    `Distribution version: ${release.distributionVersion}`,
    `Kernel version: ${release.kernelVersion}`,
    `Kernel commit: ${release.kernelCommit}`,
    `Electron: ${process.versions.electron || 'unknown'}`,
    `Chrome: ${process.versions.chrome || 'unknown'}`,
    `Node: ${process.versions.node || 'unknown'}`,
    `Platform: ${process.platform} ${process.arch}`,
    `Shell: ${shellState.native ? 'POSIX shell' : 'WSL available'}: ${shellState.available ? `yes (${shellState.distros.join(', ') || 'default'})` : 'no'}`,
    `Workspace: ${workspace()}`,
    `Harness URL: ${harnessUrl || 'unavailable'}`,
    '',
    'Last 200 startup log lines:',
    recentLogLines(lastStartupLog),
  ].join('\n')
}

function sendDiagnosticsResult(sender, payload) {
  try { sender.send('desktop:diagnostics:result', payload) } catch {}
}

function exportDiagnostics(sender) {
  clipboard.writeText(diagnosticsText())
  sendDiagnosticsResult(sender, { kind: 'success', message: desktopText('diagnostics.copied') })
}

async function clearDesktopStorage(sender) {
  const result = await dialog.showMessageBox(visibleDialogParent(), {
    type: 'warning',
    buttons: [desktopText('storage.confirm'), desktopText('storage.cancel')],
    defaultId: 1,
    cancelId: 1,
    title: desktopText('storage.title'),
    message: desktopText('storage.message'),
    detail: desktopText('storage.detail'),
  })
  if (result.response !== 0) return
  try {
    await session.defaultSession.clearStorageData({
      storages: ['appcache', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
    })
    await session.defaultSession.clearCache()
    sendDiagnosticsResult(sender, { kind: 'success', message: desktopText('storage.success') })
    await requestHarnessRestart()
  } catch (error) {
    sendDiagnosticsResult(sender, { kind: 'error', message: desktopText('storage.failure', { error: errorMessage(error) }) })
  }
}

function isPortInUseError(error) {
  const value = `${errorMessage(error)}\n${startupLog(error)}`
  return /EADDRINUSE|address already in use|only one usage of each socket address|端口[^\n]*(占用|使用)|bind[^\n]*(failed|error)/i.test(value)
}

function startupStateForError(error) {
  const portInUse = isPortInUseError(error)
  const log = startupLog(error) || errorMessage(error)
  return {
    kind: 'error',
    title: desktopText(portInUse ? 'startup.portInUseTitle' : 'startup.startupFailedTitle'),
    message: portInUse
      ? desktopText('startup.portInUseMessage')
      : desktopText('startup.startupFailedMessage'),
    detail: portInUse
      ? desktopText('startup.portInUseDetail')
      : errorMessage(error),
    log,
  }
}

function currentWindowBounds() {
  if (window === undefined || window.isDestroyed()) return undefined
  const maximized = window.isMaximized()
  const bounds = maximized && typeof window.getNormalBounds === 'function'
    ? window.getNormalBounds()
    : window.getBounds()
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized: maximized,
  }
}

function persistWindowBounds() {
  const bounds = currentWindowBounds()
  if (bounds === undefined) return
  updateConfig({ windowBounds: bounds })
}

function scheduleWindowBoundsPersistence() {
  if (boundsSaveTimer !== undefined) clearTimeout(boundsSaveTimer)
  boundsSaveTimer = setTimeout(() => {
    boundsSaveTimer = undefined
    persistWindowBounds()
  }, 180)
  boundsSaveTimer.unref()
}

function workspace() {
  try {
    const saved = readConfig().workspace
    const normalized = normalizeWorkspacePath(saved)
    if (normalized !== undefined && isWorkspaceDirectory(normalized)) return normalized
  } catch {
    // A missing or invalid preference uses the documented home-directory default.
  }
  return homedir()
}

function normalizeWorkspacePath(path) {
  if (typeof path !== 'string' || path.trim() === '') return undefined
  try {
    return resolve(path)
  } catch {
    return undefined
  }
}

function isWorkspaceDirectory(path) {
  try {
    return typeof path === 'string' && existsSync(path) && statSync(path).isDirectory()
  } catch {
    return false
  }
}

function recentWorkspaces() {
  const configured = readConfig().recentWorkspaces
  if (!Array.isArray(configured)) return []
  const seen = new Set()
  const result = []
  for (const value of configured) {
    const normalized = normalizeWorkspacePath(value)
    if (normalized === undefined || seen.has(normalized) || !isWorkspaceDirectory(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
    if (result.length >= RECENT_WORKSPACES_LIMIT) break
  }
  return result
}

function saveWorkspace(path) {
  const normalized = normalizeWorkspacePath(path)
  if (normalized === undefined || !isWorkspaceDirectory(normalized)) return false
  const configured = readConfig().recentWorkspaces
  const previous = Array.isArray(configured) ? configured : []
  const recents = [normalized, ...previous]
    .map(normalizeWorkspacePath)
    .filter((value, index, values) => value !== undefined && values.indexOf(value) === index && isWorkspaceDirectory(value))
    .slice(0, RECENT_WORKSPACES_LIMIT)
  updateConfig({ workspace: normalized, recentWorkspaces: recents })
  sendRecentWorkspaceState()
  return true
}

function clearRecentWorkspaces() {
  updateConfig({ recentWorkspaces: [] })
  sendRecentWorkspaceState()
}

function recentWorkspaceMenuItems() {
  const current = workspace()
  const entries = recentWorkspaces()
  const items = entries.length === 0
    ? [{ label: desktopText('menu.noRecentWorkspaces'), enabled: false }]
    : entries.map(path => ({
      label: `${path === current ? '✓ ' : ''}${basename(path)} — ${path}`,
      click: () => { void switchWorkspace(path) },
    }))
  items.push({ type: 'separator' })
  items.push({
    label: desktopText('menu.clearRecentWorkspaces'),
    enabled: entries.length > 0,
    click: () => {
      clearRecentWorkspaces()
      rebuildMenus()
    },
  })
  return items
}

function iconPath() {
  return platformIconPath(join(__dirname, '..', 'assets'))
}

function showWindow() {
  if (window === undefined || window.isDestroyed()) return
  if (!DISPLAY_DESKTOP_WINDOWS) {
    window.hide()
    return
  }
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

function writeAtomicTextFile(filePath, content) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  const fd = openSync(temporaryPath, 'w')
  try {
    writeFileSync(fd, content, 'utf8')
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
  try {
    renameSync(temporaryPath, filePath)
  } finally {
    try { unlinkSync(temporaryPath) } catch {}
  }
}

async function stopHarness() {
  stopHarnessHealthMonitor()
  harnessUrl = undefined
  const pid = runtimeSupervisor.pid
  if (pid === undefined) return
  const stopped = await runtimeSupervisor.stop({ timeoutMs: STOP_TIMEOUT_MS })
  if (!stopped) {
    const error = new Error(`Harness process tree did not exit within ${STOP_TIMEOUT_MS}ms (pid ${pid}).`)
    console.error(error.message)
    throw error
  }
}

function resolveUnifiedDshHome() {
  if (unifiedDshHome === undefined) {
    unifiedDshHome = ensureUnifiedDshHome({
      env: process.env,
      userHome: process.env.USERPROFILE || homedir(),
      userDataPath: app.getPath('userData'),
      logger: console,
    })
  }
  return unifiedDshHome
}

function initializeDesktopLocale() {
  desktopLocaleSettingsPath = join(resolveUnifiedDshHome(), 'settings.yaml')
  applyDesktopLocale(resolveDesktopLocale(), { force: true })
  startDesktopLocaleWatcher()
}

function startHarness(cwd, signal) {
  lastStartupLog = ''
  const packagedBin = app.isPackaged
    ? join(__dirname, '..', 'lib', 'packaged-bin.js')
    : join(__dirname, '..', '..', 'runtime', 'lib', 'packaged-bin.js')
  const portableRoot = dirname(dirname(process.execPath))
  const inheritedPath = process.env.PATH || process.env.Path || ''
  const commandPath = existsSync(join(portableRoot, 'dsh.cmd'))
    ? [portableRoot, inheritedPath].filter(Boolean).join(delimiter)
    : inheritedPath
  return runtimeSupervisor.start({
    executable: process.execPath,
    entry: packagedBin,
    cwd,
    env: {
      ...process.env,
      DSH_HOME: resolveUnifiedDshHome(),
      DSH_TELEMETRY_DISABLED: '1',
      ELECTRON_RUN_AS_NODE: '1',
      PATH: commandPath,
      Path: commandPath,
    },
    signal,
    startupTimeoutMs: STARTUP_TIMEOUT_MS,
    slowStartupMs: SLOW_STARTUP_MS,
    stopTimeoutMs: STOP_TIMEOUT_MS,
    cancelledMessage: desktopText('startup.cancelled'),
    onListening: () => sendSplashStatus('workspace'),
    onDiagnostic: diagnostic => {
      console.warn(`${APP_NAME} runtime diagnostic: ${JSON.stringify(diagnostic)}`)
    },
    onPortIssue: output => {
      sendSplashState(startupStateForError(runtimeStartupError('Port is already in use.', output, 'EADDRINUSE')))
    },
    onSlow: output => {
      sendSplashState({
        kind: 'slow',
        title: desktopText('startup.slowTitle'),
        message: desktopText('startup.slowMessage'),
        log: output,
      })
    },
    onUnexpectedExit: ({ code, output }) => {
      stopHarnessHealthMonitor('disconnected', desktopText('health.exited', { code: code ?? 'unknown' }))
      harnessUrl = undefined
      if (!quitting && !restarting) {
        void dialog.showMessageBox({
          type: 'error',
          title: desktopText('startup.exitedTitle'),
          message: desktopText('startup.exitedMessage', { code, output }),
        })
      }
    },
  }).catch(error => {
    lastStartupLog = runtimeSupervisor.startupLog
    throw error
  })
}

async function restartHarness() {
  if (restartPromise !== undefined) return restartPromise
  const controller = new AbortController()
  let restartAgain = false
  const currentRestart = (async () => {
    restarting = true
    activeStartupController = controller
    showSplashWindow()
    sendSplashState({ kind: 'loading' })
    try {
      sendSplashStatus('engine')
      await stopHarness()
      const url = await startHarness(workspace(), controller.signal)
      if (controller.signal.aborted) throw makeStartupError('Harness startup was cancelled.', lastStartupLog, 'ABORTED')
      harnessUrl = url
      await probeHarnessHealth(url)
      if (controller.signal.aborted) throw makeStartupError('Harness startup was cancelled.', lastStartupLog, 'ABORTED')
      setHarnessHealth({ state: 'connected', consecutiveFailures: 0, message: '' })
      writeUpdateProbeIfRequested()
      sendSplashStatus('interface')
      if (window !== undefined && !window.isDestroyed()) {
        await window.loadURL(url)
        if (controller.signal.aborted) throw makeStartupError('Harness startup was cancelled.', lastStartupLog, 'ABORTED')
        if (DISPLAY_DESKTOP_WINDOWS && !window.isVisible()) window.show()
        await waitForRendererFirstPaint()
        if (controller.signal.aborted) throw makeStartupError('Harness startup was cancelled.', lastStartupLog, 'ABORTED')
        sendSplashState({ kind: 'ready' })
        showWindow()
        await hideSplashWindow()
      }
      startHarnessHealthMonitor({ initialState: 'connected', initialMessage: '' })
      return true
    } catch (error) {
      harnessUrl = undefined
      if (!controller.signal.aborted) {
        stopHarnessHealthMonitor('disconnected', errorMessage(error))
        if (runtimeSupervisor.running) await stopHarness()
      }
      if (!controller.signal.aborted && !quitting) sendSplashState(startupStateForError(error))
      return false
    } finally {
      if (activeStartupController === controller) activeStartupController = undefined
      restarting = false
      restartAgain = queuedRestart && !quitting
      if (restartAgain) {
        queuedRestart = false
        await stopHarness()
      }
    }
  })()
  restartPromise = currentRestart
  try {
    await currentRestart
  } finally {
    if (restartPromise === currentRestart) restartPromise = undefined
    if (restartAgain && !quitting) void restartHarness()
  }
}

function requestHarnessRestart() {
  if (restartPromise !== undefined) {
    queuedRestart = true
    activeStartupController?.abort()
    return restartPromise
  }
  return restartHarness()
}

function normalizeZoomFactor(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_ZOOM_FACTOR
  return Math.min(MAX_ZOOM_FACTOR, Math.max(MIN_ZOOM_FACTOR, Math.round(numeric * 100) / 100))
}

function restoreRendererZoom() {
  if (window === undefined || window.isDestroyed()) return
  const factor = normalizeZoomFactor(readConfig().zoomFactor)
  try { window.webContents.setZoomFactor(factor) } catch {}
}

function setRendererZoom(factor) {
  if (window === undefined || window.isDestroyed()) return
  const normalized = normalizeZoomFactor(factor)
  try {
    window.webContents.setZoomFactor(normalized)
    updateConfig({ zoomFactor: normalized })
  } catch {}
}

function adjustRendererZoom(action) {
  if (window === undefined || window.isDestroyed()) return
  let current = DEFAULT_ZOOM_FACTOR
  try { current = window.webContents.getZoomFactor() } catch {}
  if (action === 'reset') setRendererZoom(DEFAULT_ZOOM_FACTOR)
  if (action === 'in') setRendererZoom(current + ZOOM_STEP)
  if (action === 'out') setRendererZoom(current - ZOOM_STEP)
}

function reloadRenderer() {
  if (window === undefined || window.isDestroyed()) return
  rendererReady = false
  rendererFirstPaint = false
  window.webContents.reload()
}

async function probeHarnessHealth(url) {
  const response = await fetch(settingsDescribeUrl(url), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId: `desktop-health-${Date.now()}`,
      method: 'settings.describe',
      payload: {},
    }),
    signal: AbortSignal.timeout(HARNESS_HEALTH_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.json()
  if (!body?.result?.ok) throw new Error(body?.result?.error?.message || desktopText('health.settingsDescribeFailed'))
}

function runHarnessHealthProbe() {
  if (harnessUrl === undefined || healthProbePromise !== undefined) return
  const generation = healthGeneration
  const url = harnessUrl
  healthProbePromise = (async () => {
    try {
      await probeHarnessHealth(url)
      if (generation !== healthGeneration) return
      setHarnessHealth({ state: 'connected', consecutiveFailures: 0, message: '' })
    } catch (error) {
      if (generation !== healthGeneration) return
      const failures = harnessHealth.consecutiveFailures + 1
      setHarnessHealth({
        state: failures >= HARNESS_HEALTH_FAILURE_THRESHOLD ? 'disconnected' : 'checking',
        consecutiveFailures: failures,
        message: errorMessage(error),
      })
    } finally {
      if (generation === healthGeneration) healthProbePromise = undefined
      scheduleNextHealthProbe()
    }
  })()
}

// Back off the probe interval while failures accumulate, capping at
// HARNESS_HEALTH_MAX_INTERVAL_MS, and restore the base interval as soon as a
// probe succeeds. Does nothing when the monitor is stopped.
function scheduleNextHealthProbe() {
  if (healthTimer === undefined) return
  const failures = Math.max(0, harnessHealth.consecutiveFailures)
  const delay = failures === 0
    ? HARNESS_HEALTH_INTERVAL_MS
    : Math.min(HARNESS_HEALTH_MAX_INTERVAL_MS, HARNESS_HEALTH_INTERVAL_MS * 2 ** Math.min(failures, 4))
  clearInterval(healthTimer)
  healthTimer = setInterval(runHarnessHealthProbe, delay)
  healthTimer.unref()
}

function stopHarnessHealthMonitor(state = 'starting', message = desktopText('health.starting')) {
  healthGeneration += 1
  if (healthTimer !== undefined) clearInterval(healthTimer)
  healthTimer = undefined
  healthProbePromise = undefined
  harnessHealth = { state, consecutiveFailures: 0, message }
  sendHarnessHealthState()
}

function startHarnessHealthMonitor({ initialState = 'checking', initialMessage = desktopText('health.checking') } = {}) {
  if (harnessUrl === undefined) return
  stopHarnessHealthMonitor(initialState, initialMessage)
  healthTimer = setInterval(runHarnessHealthProbe, HARNESS_HEALTH_INTERVAL_MS)
  healthTimer.unref()
  runHarnessHealthProbe()
}

async function openWebUiInBrowser() {
  if (harnessUrl === undefined) await restartHarness()
  if (harnessUrl === undefined) {
    await dialog.showMessageBox({
      type: 'error',
      title: desktopText('web.unavailableTitle'),
      message: desktopText('web.unavailableMessage'),
      detail: desktopText('web.unavailableDetail'),
    })
    return
  }
  void shell.openExternal(harnessUrl)
}

function visibleDialogParent() {
  if (window !== undefined && !window.isDestroyed() && window.isVisible()) return window
  if (splashWindow !== undefined && !splashWindow.isDestroyed() && splashWindow.isVisible()) return splashWindow
  return undefined
}

async function confirmWorkspaceSwitch(targetPath, parentWindow = visibleDialogParent()) {
  if (targetPath === workspace()) return true
  const result = await dialog.showMessageBox(parentWindow, {
    type: 'warning',
    buttons: [desktopText('workspace.confirm'), desktopText('workspace.cancel')],
    defaultId: 1,
    cancelId: 1,
    title: desktopText('workspace.switchTitle'),
    message: desktopText('workspace.switchMessage'),
    detail: desktopText('workspace.switchDetail'),
  })
  return result.response === 0
}

async function switchWorkspace(path, parentWindow = visibleDialogParent()) {
  const targetPath = normalizeWorkspacePath(path)
  if (targetPath === undefined || !isWorkspaceDirectory(targetPath)) {
    await dialog.showMessageBox(parentWindow, {
      type: 'error',
      title: desktopText('workspace.unavailableTitle'),
      message: desktopText('workspace.unavailableMessage'),
      buttons: [desktopText('workspace.ok')],
    })
    return false
  }
  if (!await confirmWorkspaceSwitch(targetPath, parentWindow)) return false
  saveWorkspace(targetPath)
  await requestHarnessRestart()
  rebuildMenus()
  return true
}

async function chooseWorkspace() {
  const parentWindow = visibleDialogParent()
  const result = await dialog.showOpenDialog(parentWindow, {
    title: desktopText('workspace.choose'),
    defaultPath: workspace(),
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths[0] === undefined) return
  await switchWorkspace(result.filePaths[0], parentWindow)
}

function readJsonIfPresent(path) {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'))
  } catch {}
  return undefined
}

function firstVersion(...values) {
  return values.find(value => typeof value === 'string' && value.length > 0) || '0.0.0'
}

function firstText(...values) {
  return values.find(value => typeof value === 'string' && value.trim().length > 0)?.trim() || 'unknown'
}

function getLocalReleaseInfo() {
  const packageManifest = readJsonIfPresent(join(__dirname, '..', 'package.json')) || {}
  const bundledReleaseNotes = readJsonIfPresent(join(__dirname, RELEASE_NOTES_FILE_NAME)) || {}
  const portableRoot = findPortableRoot(__dirname)
  const releaseManifest = (portableRoot === undefined
    ? undefined
    : readJsonIfPresent(join(portableRoot, RELEASE_MANIFEST_NAME)))
    || readJsonIfPresent(join(__dirname, '..', RELEASE_MANIFEST_NAME))
  const releaseNotesSource = releaseManifest?.releaseNotes || bundledReleaseNotes
  let appVersion
  try {
    appVersion = app.getVersion()
  } catch {}
  const releaseNotesHistory = normalizeReleaseNotesHistory(releaseNotesSource)
  return {
    distributionVersion: firstVersion(
      releaseManifest?.distributionVersion,
      packageManifest.distributionVersion,
      packageManifest.version,
      appVersion,
    ),
    desktopVersion: firstVersion(
      releaseManifest?.desktopVersion,
      packageManifest.version,
      appVersion,
    ),
    kernelVersion: firstVersion(releaseManifest?.kernelVersion, 'unknown'),
    kernelCommit: firstText(releaseManifest?.kernelCommit),
    releaseNotes: normalizeReleaseNotes(
      releaseNotesSource,
      firstVersion(
        releaseManifest?.distributionVersion,
        packageManifest.distributionVersion,
        packageManifest.version,
        appVersion,
      ),
    ),
    // Older release manifests do not embed the bilingual history; fall back
    // to the bundled file so the localized timeline stays complete.
    releaseNotesHistory: releaseNotesHistory.length > 0
      ? releaseNotesHistory
      : normalizeReleaseNotesHistory(bundledReleaseNotes),
  }
}

function getLocalVersion() {
  return getLocalReleaseInfo().distributionVersion
}

function safeHttpsUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return ''
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

function releaseAssetName(version) {
  return platformReleaseAssetName(version, process.platform, process.arch)
}

function normalizePortableRelease(value) {
  const source = value && typeof value === 'object' ? value : {}
  const normalized = normalizeReleaseNotes(source)
  const explicitAssetName = typeof source.assetName === 'string' && source.assetName.trim() !== ''
    ? source.assetName.trim()
    : undefined
  const targetAssetName = releaseAssetName(normalized.version)
  return {
    ...normalized,
    // The shared release-notes parser has a historical Windows ZIP fallback.
    // Never let that fallback leak into a Linux or macOS update lookup.
    assetName: targetAssetName
      || explicitAssetName
      || (process.platform === 'win32' ? normalized.assetName : undefined),
    assetUrl: safeHttpsUrl(source.assetUrl || source.browser_download_url),
    assetDigest: typeof source.assetDigest === 'string' ? source.assetDigest.trim() : '',
    assetSize: Number(source.assetSize) || 0,
    tagName: typeof source.tagName === 'string' && source.tagName.trim() !== ''
      ? source.tagName.trim()
      : `v${normalized.version}`,
  }
}

async function queryLatestVersion(options = {}) {
  const apiUrl = `https://api.github.com/repos/${PORTABLE_RELEASE_REPO}/releases/latest`
  const rawReleaseNotesUrl = `https://raw.githubusercontent.com/${PORTABLE_RELEASE_REPO}/main/apps/desktop/src/release-notes.json`
  const apiUrls = [
    apiUrl,
    `https://gh-proxy.com/${apiUrl}`,
  ]
  const rawUrls = mirrorUrls(rawReleaseNotesUrl, GITHUB_MIRROR_PREFIXES)
  const timeoutMs = options?.timeoutMs || 6000
  const graceMs = options?.graceMs || 800

  return new Promise((resolve, reject) => {
    const candidates = []
    let graceTimer = null

    const finish = () => {
      if (graceTimer) clearTimeout(graceTimer)
      if (candidates.length === 0) {
        reject(new Error('No valid release information could be fetched from any source.'))
        return
      }
      candidates.sort((left, right) => compareVersions(right.version, left.version))
      resolve(candidates[0])
    }

    const onCandidate = release => {
      candidates.push(release)
      if (!graceTimer) {
        graceTimer = setTimeout(finish, graceMs)
      }
    }

    const tasks = [
      ...apiUrls.map(async url => {
        try {
          const data = await fetchJson(url, timeoutMs, { headers: { 'Cache-Control': 'no-cache' } })
          const version = (data.tag_name || '').replace(/^v/i, '')
          if (!isValidSemver(version)) return
          const platformAssetName = releaseAssetName(version)
          const platformAsset = Array.isArray(data.assets)
            ? data.assets.find(asset => asset?.name === platformAssetName)
            : undefined
          if (platformAsset === undefined) return
          const relUrl = data.html_url || `https://github.com/${PORTABLE_RELEASE_REPO}/releases`
          onCandidate({
            ...normalizeReleaseNotes({
              ...data,
              version,
              releaseUrl: relUrl,
              channel: url,
              assetName: platformAsset.name,
            }, version),
            channel: url,
            assetName: platformAsset.name,
            assetUrl: platformAsset.browser_download_url || '',
            assetDigest: platformAsset.digest || '',
            assetSize: Number(platformAsset.size) || 0,
            tagName: data.tag_name || `v${version}`,
          })
        } catch {}
      }),
      ...rawUrls.map(async url => {
        try {
          const targetUrl = url.includes('?') ? url : `${url}?t=${Date.now()}`
          const data = await fetchJson(targetUrl, timeoutMs, { headers: { 'Cache-Control': 'no-cache' } })
          const version = typeof data?.version === 'string' ? data.version.replace(/^v/i, '').trim() : ''
          if (!isValidSemver(version)) return
          const tagName = `v${version}`
          const assetName = releaseAssetName(version)
          const relUrl = `https://github.com/${PORTABLE_RELEASE_REPO}/releases/tag/${tagName}`
          onCandidate({
            ...normalizeReleaseNotes({
              ...data,
              version,
              releaseUrl: relUrl,
              channel: url,
              assetName,
            }, version),
            channel: url,
            assetName,
            assetUrl: `https://github.com/${PORTABLE_RELEASE_REPO}/releases/download/${tagName}/${assetName}`,
            assetDigest: '',
            assetSize: 0,
            tagName,
          })
        } catch {}
      }),
    ]

    Promise.allSettled(tasks).then(finish)
  })
}

async function queryReleaseHistory() {
  const apiUrl = `https://api.github.com/repos/${PORTABLE_RELEASE_REPO}/releases?per_page=${RELEASE_HISTORY_LIMIT}`
  const rawReleaseNotesUrl = `https://raw.githubusercontent.com/${PORTABLE_RELEASE_REPO}/main/apps/desktop/src/release-notes.json`
  const channels = [
    { name: `${process.platform} GitHub`, url: apiUrl },
    { name: `${process.platform} GitHub mirror`, url: `https://gh-proxy.com/${apiUrl}` },
  ]

  const apiHistoryPromise = Promise.any(channels.map(async channel => {
    const data = await fetchJson(channel.url, 6000, { headers: { 'Cache-Control': 'no-cache' } })
    if (!Array.isArray(data)) throw new Error('Release history response was not an array')
    const releases = data
      .filter(release => release && !release.draft)
      .map(release => {
        const version = String(release.tag_name || '').replace(/^v/, '')
        const platformAsset = Array.isArray(release.assets)
          ? release.assets.find(asset => asset?.name === releaseAssetName(version))
          : undefined
        // Do not advertise a release without this platform's asset.
        if (process.platform !== 'win32' && platformAsset === undefined) return undefined
        return normalizeReleaseNotes({
          ...release,
          releaseUrl: release.html_url || `https://github.com/${PORTABLE_RELEASE_REPO}/releases`,
          channel: channel.name,
          assetName: platformAsset?.name,
        })
      })
      .filter(release => release !== undefined && release.version !== '0.0.0' && isValidSemver(release.version))
    if (releases.length === 0) throw new Error('Release history response was empty')
    return releases
  }))

  const rawHistoryPromise = Promise.any(mirrorUrls(rawReleaseNotesUrl, GITHUB_MIRROR_PREFIXES).map(async url => {
    const targetUrl = url.includes('?') ? url : `${url}?t=${Date.now()}`
    const data = await fetchJson(targetUrl, 6000, { headers: { 'Cache-Control': 'no-cache' } })
    if (!data || typeof data !== 'object') throw new Error('Raw release notes response was not an object')
    const history = normalizeReleaseNotesHistory(data)
    if (history.length === 0) throw new Error('Raw release history response was empty')
    return history
  }))

  return Promise.any([apiHistoryPromise, rawHistoryPromise])
}

function sortReleaseHistory(history) {
  return mergeReleaseHistory(history)
    .filter(release => isValidSemver(release.version) && release.version !== '0.0.0')
    .sort((left, right) => compareVersions(right.version, left.version))
    .slice(0, RELEASE_HISTORY_LIMIT)
    .map(release => ({ ...release, badgeSummary: countSectionBadges(release) }))
}

function releaseHistoryPath() {
  return join(app.getPath('userData'), RELEASE_HISTORY_FILE_NAME)
}

// Release history is a disposable cache: it lives in its own file so that
// config.json (rewritten atomically on every update) stays small and a
// corrupt cache can never take the user's settings down with it.
function cachedReleaseHistory() {
  const fileCached = readJsonIfPresent(releaseHistoryPath())
  const source = Array.isArray(fileCached) ? fileCached : readConfig().releaseHistory
  return Array.isArray(source) ? source.map(item => normalizeReleaseNotes(item)).filter(item => item.version !== '0.0.0' && isValidSemver(item.version)) : []
}

function saveReleaseHistory(history) {
  const sorted = sortReleaseHistory(history)
  try {
    mkdirSync(app.getPath('userData'), { recursive: true })
    writeAtomicTextFile(releaseHistoryPath(), `${JSON.stringify(sorted, null, 2)}\n`)
    // The dedicated cache file is now authoritative; drop the legacy config
    // entry so config.json stops carrying the full history payload.
    updateConfig({ releaseHistory: [], releaseHistoryFetchedAt: new Date().toISOString() })
  } catch (error) {
    // Keep the in-memory history for this session; a cache write failure is
    // not worth failing the release-notes request over.
    console.warn('Failed to persist release history cache:', error)
  }
}

async function buildReleaseNotesData(context = {}, options = {}) {
  const localInfo = getLocalReleaseInfo()
  const localRelease = normalizeReleaseNotes({
    ...localInfo.releaseNotes,
    releaseUrl: localInfo.releaseNotes.releaseUrl || `https://github.com/${PORTABLE_RELEASE_REPO}/releases`,
  }, localInfo.distributionVersion)
  const cached = cachedReleaseHistory()
  let remote = []
  const sourceErrors = { ...(context.sourceErrors || {}) }
  let offline = options.fetchRemote !== true
  if (options.fetchRemote === true) {
    try {
      remote = await queryReleaseHistory()
      delete sourceErrors.portable
      if (remote.length > 0) saveReleaseHistory(remote)
      offline = false
    } catch (error) {
      sourceErrors.portable = errorMessage(error)
      offline = true
    }
  }

  const update = context.update === undefined ? undefined : normalizePortableRelease(context.update)
  const checkError = typeof context.checkError === 'string' && context.checkError.trim() !== ''
    ? context.checkError.trim()
    : (typeof context.error === 'string' && context.error.trim() !== '' ? context.error.trim() : undefined)
  // Bundled bilingual notes are the authoritative localized source for the
  // versions they cover; remote and cached GitHub data (English-only bodies)
  // only fill in versions that have no bundled entry. This keeps the release
  // log localized (Chinese UI shows Chinese notes) instead of letting remote
  // English bodies shadow the bundled bilingual entries.
  const historySource = remote.length > 0
    ? [update, localRelease, ...localInfo.releaseNotesHistory, ...remote]
    : [update, localRelease, ...localInfo.releaseNotesHistory, ...cached]
  const history = sortReleaseHistory(historySource)
  const latestRelease = history[0] || localRelease
  const currentRelease = history.find(item => item.version === localInfo.distributionVersion) || localRelease
  const updateAvailable = Boolean(
    latestRelease
      && compareVersions(latestRelease.version, localInfo.distributionVersion) > 0,
  )

  return {
    mode: context.mode || 'history',
    offline,
    currentVersion: localInfo.distributionVersion,
    localInfo,
    currentRelease,
    latestRelease: updateAvailable || context.mode === 'update' ? latestRelease : undefined,
    updateAvailable,
    sourceErrors,
    error: checkError || (offline ? sourceErrors.portable : undefined),
    selectedVersion: context.selectedVersion
      || (context.mode === 'update' ? latestRelease.version : currentRelease.version),
    history,
  }
}

function openExternalSafe(value) {
  if (typeof value !== 'string' || value.trim() === '') return
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') void shell.openExternal(url.toString())
  } catch {
    // Release bodies are remote input; reject malformed or non-HTTPS links.
  }
}

function isMainRenderer(sender) {
  return window !== undefined && !window.isDestroyed() && window.webContents.id === sender.id
}

function isSplashRenderer(sender) {
  return splashWindow !== undefined && !splashWindow.isDestroyed() && splashWindow.webContents.id === sender.id
}

function registerReleaseNotesIpc() {
  ipcMain.on('desktop:renderer-ready', event => {
    if (!isMainRenderer(event.sender)) return
    rendererReady = true
    event.sender.send('desktop:theme-changed', themePayload())
    event.sender.send('desktop:locale-changed', { locale: desktopLocale })
    event.sender.send('desktop:workspace:recents', recentWorkspacePayload())
    event.sender.send('desktop:shell-state', shellState)
    restoreRendererZoom()
    event.sender.send('desktop:harness-status', harnessHealth)
    if (inAppNotice !== undefined) event.sender.send('desktop:notice', inAppNotice)
    if (queuedReleaseNotesContext !== undefined) {
      event.sender.send('desktop:release-notes:open', queuedReleaseNotesContext)
      queuedReleaseNotesContext = undefined
    }
  })

  ipcMain.on('desktop:renderer-first-paint', event => {
    if (!isMainRenderer(event.sender)) return
    notifyRendererFirstPaint()
  })

  ipcMain.on('desktop:splash-action', (event, action = {}) => {
    if (!isSplashRenderer(event.sender) || !action || typeof action.type !== 'string') return
    if (action.type === 'retry') {
      void requestHarnessRestart()
      return
    }
    if (action.type === 'choose-workspace') {
      void chooseWorkspace()
    }
  })

  ipcMain.handle('desktop:release-notes:get-data', async (event, context = {}) => {
    if (!isMainRenderer(event.sender)) throw new Error('Unknown release notes client')
    return buildReleaseNotesData(context, { fetchRemote: true })
  })

  ipcMain.handle('desktop:release-notes:get-cached-data', async (event, context = {}) => {
    if (!isMainRenderer(event.sender)) throw new Error('Unknown release notes client')
    return buildReleaseNotesData(context)
  })

  ipcMain.on('desktop:release-notes:open', (event, context = {}) => {
    if (!isMainRenderer(event.sender)) return
    openInAppReleaseNotes(context)
  })

  ipcMain.on('desktop:menu:action', (event, action) => {
    if (!isMainRenderer(event.sender) || !action || typeof action.type !== 'string') return

    if (action.type === 'check-for-updates') {
      void checkForUpdates(true)
      return
    }
    if (action.type === 'release-notes') {
      openInAppReleaseNotes({ mode: 'history' })
      return
    }
    if (action.type === 'about') {
      openInAppReleaseNotes({ mode: 'about' })
      return
    }
    if (action.type === 'choose-workspace') {
      void chooseWorkspace()
      return
    }
    if (action.type === 'recent-workspace') {
      void switchWorkspace(action.path)
      return
    }
    if (action.type === 'clear-recent-workspaces') {
      clearRecentWorkspaces()
      rebuildMenus()
      return
    }
    if (action.type === 'reload-ui') {
      reloadRenderer()
      return
    }
    if (action.type === 'export-diagnostics') {
      exportDiagnostics(event.sender)
      return
    }
    if (action.type === 'shell-guide') {
      void showShellGuideDialog(event.sender)
      return
    }
    if (action.type === 'clear-storage') {
      void clearDesktopStorage(event.sender)
      return
    }
    if (action.type === 'restart') {
      void requestHarnessRestart()
      return
    }
    if (action.type === 'open-browser') {
      void openWebUiInBrowser()
    }
  })

  ipcMain.on('desktop:shell:probe', event => {
    if (!isMainRenderer(event.sender)) return
    void probeShellAvailability().then(() => sendShellState(event.sender)).catch(() => {})
  })

  ipcMain.on('desktop:zoom', (event, action = {}) => {
    if (!isMainRenderer(event.sender) || !action || typeof action.type !== 'string') return
    if (action.type === 'reset' || action.type === 'in' || action.type === 'out') adjustRendererZoom(action.type)
  })

  ipcMain.on('desktop:health:action', (event, action = {}) => {
    if (!isMainRenderer(event.sender) || !action || typeof action.type !== 'string') return
    if (action.type === 'reconnect') {
      runHarnessHealthProbe()
      return
    }
    if (action.type === 'restart-engine') void requestHarnessRestart()
  })

  ipcMain.on('desktop:notice:show', event => {
    if (!isMainRenderer(event.sender) || inAppNotice === undefined) return
    event.sender.send('desktop:notice', inAppNotice)
  })

  ipcMain.on('desktop:notice:dismiss', (event, version) => {
    if (!isMainRenderer(event.sender) || typeof version !== 'string') return
    const normalized = version.trim()
    if (normalized === '') return
    updateConfig({ lastDismissedVersion: normalized })
    if (noticeVersion(inAppNotice) === normalized) inAppNotice = undefined
  })

  ipcMain.on('desktop:release-notes:action', (event, action) => {
    if (!isMainRenderer(event.sender) || !action || typeof action.type !== 'string') return

    if (action.type === 'open-url') {
      openExternalSafe(action.url)
      return
    }

    if (action.type === 'retry-check') {
      void checkForUpdates(true)
      return
    }

    if (action.type === 'show-about') {
      openInAppReleaseNotes({ ...releaseNotesContext, mode: 'about' })
      return
    }

    if (action.type === 'show-notes') {
      openInAppReleaseNotes({ ...releaseNotesContext, mode: releaseNotesContext.update ? 'update' : 'history' })
    }
  })
}

function openInAppReleaseNotes(context = {}) {
  showWindow()
  releaseNotesContext = { ...context }
  queueOrSendReleaseNotes(releaseNotesContext)
}

function showAvailableUpdateNotice(latestInfo, currentVersion, force = false) {
  const config = readConfig()
  if (!force && config.lastNotifiedAvailableVersion === latestInfo.version) return
  updateConfig({ lastNotifiedAvailableVersion: latestInfo.version })
  showInAppNotice({
    kind: 'available',
    currentVersion,
    release: latestInfo,
  })
}

async function checkForUpdates(manual = true) {
  const localInfo = getLocalReleaseInfo()
  let portableRelease
  let release = { updateAvailable: false }
  const sourceErrors = {}
  try {
    portableRelease = await queryLatestVersion()
    if (isValidSemver(localInfo.distributionVersion)) {
      release = evaluateReleaseUpdate({
        localDistributionVersion: localInfo.distributionVersion,
        release: portableRelease,
      })
    }
  } catch (error) {
    sourceErrors.portable = errorMessage(error)
  }

  if (release.updateAvailable) {
    showAvailableUpdateNotice(portableRelease, localInfo.distributionVersion, manual)
  }

  if (manual) {
    openInAppReleaseNotes({
      mode: release.updateAvailable || Object.keys(sourceErrors).length > 0 ? 'update' : 'history',
      currentVersion: localInfo.distributionVersion,
      selectedVersion: localInfo.distributionVersion,
      update: release.updateAvailable ? portableRelease : undefined,
      sourceErrors,
    })
  }
}

function writeUpdateProbeIfRequested() {
  try {
    const probeIndex = process.argv.indexOf('--update-probe-file')
    const transactionIndex = process.argv.indexOf('--update-transaction')
    if (probeIndex !== -1 && process.argv[probeIndex + 1]
      && harnessUrl
      && harnessHealth.state === 'connected') {
      const probePath = process.argv[probeIndex + 1]
      const transactionId = transactionIndex !== -1 ? process.argv[transactionIndex + 1] : ''
      const probePayload = {
        state: 'ready',
        transactionId,
        version: getLocalVersion(),
        pid: process.pid,
        harnessUrl: harnessUrl || '',
        timestamp: new Date().toISOString(),
      }
      writeAtomicTextFile(probePath, `${JSON.stringify(probePayload, null, 2)}\n`)
      return true
    }
  } catch (error) {
    console.warn('Failed to write update probe file:', error)
  }
  return false
}

function menuItems() {
  return [
    { label: desktopText('menu.showApp'), click: showWindow },
    { type: 'separator' },
    { label: desktopText('menu.chooseWorkspace'), click: () => { void chooseWorkspace() } },
    { label: desktopText('menu.recentWorkspaces'), submenu: recentWorkspaceMenuItems() },
    { type: 'separator' },
    { label: desktopText('menu.refreshInterface'), accelerator: 'CmdOrCtrl+R', click: reloadRenderer },
    { label: desktopText('menu.restartHarness'), accelerator: 'CmdOrCtrl+Shift+R', click: () => { void requestHarnessRestart() } },
    { label: desktopText('menu.openBrowser'), click: () => { void openWebUiInBrowser() } },
    { type: 'separator' },
    { label: desktopText('menu.checkUpdates'), click: () => { void checkForUpdates(true) } },
    { label: desktopText('menu.aboutAndUpdates'), click: () => { openInAppReleaseNotes({ mode: 'history' }) } },
    { type: 'separator' },
    { label: desktopText('menu.quit'), accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Alt+F4', click: () => app.quit() },
  ]
}

function rebuildMenus() {
  const template = menuItems()
  if (tray !== undefined) tray.setContextMenu(Menu.buildFromTemplate(template))
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: APP_NAME, submenu: template.slice(1) },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]))
}

async function createApp() {
  registerReleaseNotesIpc()
  nativeTheme.themeSource = 'system'
  const initialTheme = themePayload()

  const restoredBounds = restoreWindowBounds(
    readConfig().windowBounds,
    screen.getAllDisplays(),
    DEFAULT_WINDOW_BOUNDS,
  )
  const { isMaximized: shouldMaximize, ...initialBounds } = restoredBounds
  const nativeWindowOptions = process.platform === 'win32'
    ? {
        backgroundMaterial: 'mica',
        titleBarStyle: 'hidden',
        titleBarOverlay: initialTheme.titleBar,
      }
    : {}

  window = new BrowserWindow({
    ...initialBounds,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: APP_NAME,
    icon: iconPath(),
    backgroundColor: initialTheme.surface,
    // macOS users expect the application menu in the system menu bar. The
    // custom in-page menu remains available from the Web UI logo/tray.
    autoHideMenuBar: process.platform !== 'darwin',
    ...nativeWindowOptions,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, DESKTOP_PRELOAD_NAME),
    },
  })
  // Apply the same palette after the native window exists. This keeps the
  // first paint from briefly showing the system's default dark overlay when
  // the app is launched with a light surface.
  syncNativeTheme()

  window.webContents.on('did-start-loading', () => {
    rendererReady = false
    rendererFirstPaint = false
  })
  window.on('close', event => {
    persistWindowBounds()
    if (!quitting) {
      event.preventDefault()
      window.hide()
      if (splashWindow !== undefined && !splashWindow.isDestroyed()) splashWindow.hide()
    }
  })
  for (const eventName of ['resize', 'move', 'maximize', 'unmaximize']) {
    window.on(eventName, () => {
      syncSplashBounds()
      scheduleWindowBoundsPersistence()
    })
  }
  window.on('closed', () => {
    rendererReady = false
    destroySplashWindow()
    window = undefined
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    // Only hand http(s) targets to the system browser. The window hosts the
    // Harness web UI, which runs third-party plugin code; a link to a file://
    // or custom-protocol URL must not reach shell.openExternal.
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') void shell.openExternal(url)
    } catch {
      // Malformed URLs are denied.
    }
    return { action: 'deny' }
  })

  try {
    tray = new Tray(nativeImage.createFromPath(iconPath()))
    tray.setToolTip(APP_NAME)
    tray.on('click', () => window !== undefined && window.isVisible() ? window.hide() : showWindow())
    tray.on('double-click', () => showWindow())
  } catch (error) {
    // Some Linux sessions expose no usable system tray (for example a bare
    // Wayland compositor). The app menu and in-page menu remain available.
    tray = undefined
    console.warn(`System tray unavailable: ${errorMessage(error)}`)
  }
  saveWorkspace(workspace())
  rebuildMenus()

  try {
    if (shouldMaximize) window.maximize()
    await createSplashWindow()
    showSplashWindow()
    sendSplashStatus('engine')
    await restartHarness()
  } catch (error) {
    if (splashWindow !== undefined && !splashWindow.isDestroyed()) sendSplashState(startupStateForError(error))
    else await dialog.showMessageBox(window, {
      type: 'error',
      title: `${APP_NAME} failed to start`,
      message: errorMessage(error),
    })
  }

  setTimeout(() => {
    void (async () => {
      const config = readConfig()
      const lastCheckAt = Date.parse(config.lastAutoUpdateCheckAt)
      if (Number.isFinite(lastCheckAt) && Date.now() - lastCheckAt < AUTO_UPDATE_CHECK_INTERVAL_MS) return
      // Record the attempt regardless of the outcome so an offline launch
      // does not retry the API on every subsequent startup.
      updateConfig({ lastAutoUpdateCheckAt: new Date().toISOString() })
      await checkForUpdates(false)
    })()
  }, 4000).unref()
}

const portableLaunchGate = process.platform === 'win32'
  ? evaluateUpdateLaunch(findPortableRoot(__dirname), process.argv)
  : { allowed: true }
if (!portableLaunchGate.allowed) {
  dialog.showErrorBox(
    `${APP_NAME} update recovery required`,
    [
      'DeepSeek Harness cannot start while a portable update transaction is incomplete.',
      '请从安装目录运行 Windows 启动器，让启动器等待更新完成或执行安全回滚。',
      '',
      portableLaunchGate.reason,
    ].join('\n'),
  )
  app.quit()
} else if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showWindow)
  nativeTheme.on('updated', syncNativeTheme)
  app.on('before-quit', () => {
    quitting = true
    stopDesktopLocaleWatcher()
    persistWindowBounds()
  })
  app.on('will-quit', event => {
    if (tray !== undefined && !tray.isDestroyed()) {
      tray.destroy()
    }
    destroySplashWindow()
    if (runtimeSupervisor.running) {
      event.preventDefault()
      void stopHarness().then(() => app.quit()).catch(error => {
        console.error('Failed to stop the Harness process tree during quit:', error)
        // Do not leave a hidden, tray-resident shell running after the user
        // asked to quit. The engine may survive briefly as an orphan, but the
        // shell itself must exit.
        app.exit(1)
      })
    }
  })
  app.whenReady()
    .then(() => {
      void probeShellAvailability().catch(() => {})
      initializeDesktopLocale()
      return createApp()
    })
    .catch(error => dialog.showErrorBox(APP_NAME, errorMessage(error)))
}
