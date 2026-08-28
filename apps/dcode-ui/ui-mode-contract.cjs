/** Dependency-free UI-mode contract shared by browser and Electron CJS entry points. */
const UI_MODES = Object.freeze(['dcode', 'official'])

function normalizeUiMode(value) {
  return UI_MODES.includes(value) ? value : undefined
}

function withUiModeParam(url, mode, base) {
  const parsed = base === undefined ? new URL(url) : new URL(url, base)
  parsed.searchParams.set('view', mode)
  return parsed.toString()
}

module.exports = Object.freeze({
  UI_MODES,
  DEFAULT_UI_MODE: 'dcode',
  UI_MODE_QUERY_PARAM: 'view',
  UI_MODE_STORAGE_KEY: 'dsh.portable.uiMode',
  UI_MODE_CONFIG_FIELD: 'uiMode',
  UI_MODE_BRIDGE_GLOBAL: '__DSH_UI_MODE_BRIDGE__',
  UI_MODE_EVENT: 'dsh:ui-mode',
  UI_MODE_IPC_CHANNEL: 'desktop:ui-mode',
  normalizeUiMode,
  withUiModeParam,
})
