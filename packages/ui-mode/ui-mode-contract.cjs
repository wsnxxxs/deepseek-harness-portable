/**
 * Dependency-free UI-mode contract shared by browser and Electron CJS entry points.
 *
 * `UI_MODES` is PRESENTATION ORDER, not a pair. Every switch surface — the two
 * in-page settings panels, the application menu, the tray menu, and the
 * command palette — renders this list in this order, so a mode never appears
 * in a different position depending on where it is offered. Adding a surface
 * means adding one entry here and its copy; nothing else enumerates modes.
 *
 * The official interface is listed first because it is the one surface that is
 * always present: the extension surfaces shadow it, and any of them failing to
 * load leaves it rendering. `DEFAULT_UI_MODE` is a separate decision.
 */
const UI_MODES = Object.freeze(['official', 'dcode'])

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
  DEFAULT_UI_MODE: 'official',
  UI_MODE_QUERY_PARAM: 'view',
  UI_MODE_STORAGE_KEY: 'dsh.portable.uiMode',
  UI_MODE_CONFIG_FIELD: 'uiMode',
  UI_MODE_BRIDGE_GLOBAL: '__DSH_UI_MODE_BRIDGE__',
  UI_MODE_EVENT: 'dsh:ui-mode',
  UI_MODE_IPC_CHANNEL: 'desktop:ui-mode',
  normalizeUiMode,
  withUiModeParam,
})
