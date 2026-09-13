const { contextBridge, ipcRenderer, webUtils } = require('electron')
const { statSync } = require('node:fs')
const { localeFromSystem, normalizePreference } = require('./desktop-locale.cjs')
const {
  UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_IPC_CHANNEL, UI_MODE_QUERY_PARAM,
} = require('@dsh-portable/ui-mode/ui-mode-contract')


const SPLASH_STATUSES = new Set(['engine', 'workspace', 'interface'])

/** Resolve one renderer-owned File to its host path, or undefined when it has none. */
function hostPathForFile(file) {
  if (typeof webUtils?.getPathForFile === 'function') {
    try {
      const path = webUtils.getPathForFile(file)
      if (typeof path === 'string' && path !== '') return path
    } catch {
      // Some browser-owned File objects do not expose an Electron path.
    }
  }
  return typeof file?.path === 'string' && file.path !== '' ? file.path : undefined
}
const isSplashDocument = window.location.protocol === 'file:'

const splashListeners = new Set()
const splashStateListeners = new Set()
const splashTransitionListeners = new Set()
const splashLocaleListeners = new Set()
const splashThemeListeners = new Set()
ipcRenderer.on('desktop:splash-status', (_event, value) => {
  const status = value && typeof value === 'object' ? value.status : value
  if (!SPLASH_STATUSES.has(status)) return
  splashListeners.forEach(listener => listener(status))
})
ipcRenderer.on('desktop:splash-state', (_event, value) => {
  splashStateListeners.forEach(listener => listener(value && typeof value === 'object' ? value : {}))
})
ipcRenderer.on('desktop:splash-transition', (_event, value) => {
  splashTransitionListeners.forEach(listener => listener(value))
})
ipcRenderer.on('desktop:splash-locale', (_event, value) => {
  const locale = normalizePreference(value?.locale) || localeFromSystem(typeof navigator === 'object' ? navigator.language : 'en')
  splashLocaleListeners.forEach(listener => listener(locale))
})
ipcRenderer.on('desktop:splash-theme', (_event, value) => {
  splashThemeListeners.forEach(listener => listener(value && typeof value === 'object' ? value : {}))
})

contextBridge.exposeInMainWorld('deepSeekSplash', {
  onStatus: callback => {
    if (typeof callback !== 'function') return () => {}
    splashListeners.add(callback)
    return () => splashListeners.delete(callback)
  },
  onState: callback => {
    if (typeof callback !== 'function') return () => {}
    splashStateListeners.add(callback)
    return () => splashStateListeners.delete(callback)
  },
  onTransition: callback => {
    if (typeof callback !== 'function') return () => {}
    splashTransitionListeners.add(callback)
    return () => splashTransitionListeners.delete(callback)
  },
  onLocale: callback => {
    if (typeof callback !== 'function') return () => {}
    splashLocaleListeners.add(callback)
    return () => splashLocaleListeners.delete(callback)
  },
  onTheme: callback => {
    if (typeof callback !== 'function') return () => {}
    splashThemeListeners.add(callback)
    return () => splashThemeListeners.delete(callback)
  },
  retry: () => ipcRenderer.send('desktop:splash-action', { type: 'retry' }),
  chooseWorkspace: () => ipcRenderer.send('desktop:splash-action', { type: 'choose-workspace' }),
})

contextBridge.exposeInMainWorld('deepSeekDesktop', {
  openReleaseNotes: context => ipcRenderer.send('desktop:release-notes:open', context || {}),
  showNotice: () => ipcRenderer.send('desktop:notice:show'),
  getPathForFile: hostPathForFile,
  // The renderer resolves a dropped folder to an `@path/` reference, which it
  // can only do with the directory answer the filesystem gives here: a dropped
  // directory and an empty file are indistinguishable from the File object.
  getPathInfoForFile: file => {
    const path = hostPathForFile(file)
    if (path === undefined) return undefined
    let isDirectory = false
    try {
      isDirectory = statSync(path).isDirectory()
    } catch {
      // Removed or unreadable between the drop and this call; a plain file
      // reference stays correct for the agent to resolve or report.
    }
    return { path, isDirectory }
  },
})

/**
 * Front-end switch bridge.
 *
 * Two UIs ride one page over one Runtime; the browser half owns the switch and
 * this is its desktop seam. The main process publishes the front end it
 * recorded for this launch, accepts the renderer's own switches so its menus
 * stay ticked, and pushes switches made from the application menu or tray.
 *
 * The global name and the message shape are the contract
 * `@dsh-portable/ui-mode` declares; keep them in step with it.
 */
const UI_MODE_MODES = new Set(UI_MODES)

function initialUiMode() {
  try {
    const requested = new URLSearchParams(globalThis.location?.search ?? '').get(UI_MODE_QUERY_PARAM)
    if (UI_MODE_MODES.has(requested)) return requested
  } catch {
    // A document without a parseable address falls through to the default.
  }
  return undefined
}

/**
 * What backdrop the native window is actually wearing.
 *
 * The same predicate the main process used to decide the window options, so
 * the page never assumes a material that is not there: a surface that paints
 * itself translucent on an OS without acrylic would show a see-through hole
 * rather than a frosted one.
 */
contextBridge.exposeInMainWorld('__DSH_DESKTOP_SURFACE__', {
  material: 'none',
})

contextBridge.exposeInMainWorld(UI_MODE_BRIDGE_GLOBAL, {
  // The main process stamps `?view=` onto the URL it loads, so the address is
  // the authoritative report of what this launch was configured for.
  configured: initialUiMode(),
  setMode: mode => {
    if (!UI_MODE_MODES.has(mode)) return
    ipcRenderer.send(UI_MODE_IPC_CHANNEL, { mode })
  },
  // The page reports which surfaces its client plugins actually mounted, so
  // the application and tray menus can grey out one this build does not carry
  // instead of offering a choice that silently lands on the official UI.
  setAvailable: modes => {
    if (!Array.isArray(modes)) return
    ipcRenderer.send(UI_MODE_IPC_CHANNEL, { available: modes.filter(mode => UI_MODE_MODES.has(mode)) })
  },
  onMode: listener => {
    if (typeof listener !== 'function') return () => {}
    const handler = (_event, payload) => {
      const mode = payload?.mode
      if (UI_MODE_MODES.has(mode)) listener(mode)
    }
    ipcRenderer.on(UI_MODE_IPC_CHANNEL, handler)
    return () => { ipcRenderer.off(UI_MODE_IPC_CHANNEL, handler) }
  },
})

// The default preload reports shell readiness without changing the official DOM.
let enhancementsEnabled = false
let unloading = false
window.addEventListener('beforeunload', () => { unloading = true }, { once: true })
contextBridge.exposeInMainWorld('deepSeekDesktopEnhancements', {
  setEnabled(enabled) {
    if (isSplashDocument || unloading || enhancementsEnabled === enabled) return
    enhancementsEnabled = enabled
    ipcRenderer.send('desktop:enhancements', { enabled })
    if (enabled) require('./desktop-enhancements.cjs')()
    // A page reload releases the optional UI's DOM, observers, IPC and keyboard handlers.
    else window.location.reload()
  },
})
if (!isSplashDocument) {
  const ready = () => {
    ipcRenderer.send('desktop:renderer-ready')
    requestAnimationFrame(() => requestAnimationFrame(() => ipcRenderer.send('desktop:renderer-first-paint')))
    const reportTheme = () => ipcRenderer.send('desktop:renderer-theme', { scheme: document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light' })
    reportTheme()
    const observer = new MutationObserver(reportTheme)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
    window.addEventListener('unload', () => observer.disconnect(), { once: true })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true })
  else ready()
}
