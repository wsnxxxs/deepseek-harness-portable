/**
 * The browser-side owner of the active UI mode.
 *
 * One store arbitrates every switch entry point — the URL parameter, the
 * in-page settings panels of every surface, the Electron application menu, the
 * tray menu, and the keyboard shortcut. A switch is a slot re-registration
 * inside the live page: the DSH Runtime, the Host connection, the Session list
 * and every open Conversation stay exactly as they were.
 *
 * Resolution order at boot, highest first:
 * 1. `?view=` on the page URL — the reproducible entry a desktop shell or a
 *    copied link can force.
 * 2. `localStorage` — the last switch made in this browser profile.
 * 3. The desktop bridge's reported config value — what the Electron shell
 *    persisted for the next cold launch.
 * 4. {@link DEFAULT_UI_MODE}.
 *
 * The Cordis client plugin owns one store and publishes it as `ctx.uiMode`.
 * Alternate surfaces consume that service instead of relying on this module's
 * identity: independently bundled plugins can otherwise instantiate separate
 * stores and disagree inside one page.
 * @module @dsh-portable/ui-mode/client/store
 */

import {
  DEFAULT_UI_MODE, UI_MODE_BRIDGE_GLOBAL, UI_MODE_EVENT, UI_MODE_STORAGE_KEY,
  asUiMode, cycleUiMode, resolveUiMode, uiModeFromSearch, withUiModeParam, type UiMode,
} from '../ui-mode.ts'

export type { UiMode } from '../ui-mode.ts'

/**
 * The renderer face the Electron preload installs. Every member is optional:
 * the same bundle serves the browser surface, where no bridge exists at all.
 */
export interface UiModeBridge {
  /** Mode the desktop config recorded for this launch. */
  readonly configured?: UiMode | string
  /** Report a switch so the desktop shell can persist it and retick its menus. */
  setMode?: (mode: UiMode) => void
  /** Subscribe to desktop-initiated switches; returns an unsubscribe. */
  onMode?: (listener: (mode: UiMode) => void) => () => void
}

/** Read the preload-installed bridge, if this page runs inside the desktop shell. */
export function readBridge(): UiModeBridge | undefined {
  const bridge = (globalThis as Record<string, unknown>)[UI_MODE_BRIDGE_GLOBAL]
  return typeof bridge === 'object' && bridge !== null ? bridge as UiModeBridge : undefined
}

/** Read the stored preference, tolerating a storage-denied browser profile. */
function readStored(): UiMode | undefined {
  try {
    return asUiMode(globalThis.localStorage?.getItem(UI_MODE_STORAGE_KEY))
  } catch {
    // Private-mode or policy-blocked storage: the URL and the bridge still decide.
    return undefined
  }
}

/** Persist the preference, tolerating a storage-denied browser profile. */
function writeStored(mode: UiMode): void {
  try {
    globalThis.localStorage?.setItem(UI_MODE_STORAGE_KEY, mode)
  } catch {
    // A page that cannot persist still switches; only the next reload forgets.
  }
}

/**
 * Reflect the active mode in the address bar without navigating.
 *
 * This is what makes a reload reproduce the surface the operator was looking
 * at, and what makes `?view=official` a real entry point rather than a
 * boot-only flag.
 */
function writeLocation(mode: UiMode): void {
  const history = globalThis.history as History | undefined
  const location = globalThis.location as Location | undefined
  if (history === undefined || location === undefined || typeof history.replaceState !== 'function') return
  try {
    const next = withUiModeParam(location.href, mode)
    if (next !== location.href) history.replaceState(history.state, '', next)
  } catch {
    // A non-URL document base (about:blank in a test harness) simply keeps its address.
  }
}

/** Observable current mode shared by every switch entry point. */
export interface UiModeController {
  /** Current mode. */
  get(): UiMode
  /**
   * Switch surfaces. Idempotent: selecting the active mode is a no-op, so a
   * menu retick or an echoed desktop message cannot cause a remount.
   * @param mode - mode to activate.
   * @param origin - who asked; a `desktop` switch is not echoed back to the shell.
   */
  set(mode: UiMode, origin?: 'page' | 'desktop'): void
  /**
   * Advance to the next surface in presentation order, wrapping.
   * @param direction - `1` for the next surface, `-1` for the previous.
   */
  cycle(direction?: 1 | -1): void
  /**
   * Observe changes.
   * @param listener - called after the mode changed.
   * @returns unsubscribe.
   */
  subscribe(listener: (mode: UiMode) => void): () => void
}

/** Store owned by the UI-mode service or a standalone test caller. */
export interface UiModeStore extends UiModeController {
  /** Release the window and bridge listeners this store installed. */
  dispose(): void
}

/**
 * Create a standalone mode store and wire every external entry point.
 *
 * Plugin code consumes `ctx.uiMode`; this factory exists for the owning service
 * and tests that need an isolated instance.
 * @returns the store; the caller owns {@link UiModeStore.dispose}.
 */
export function createUiModeStore(): UiModeStore {
  const bridge = readBridge()
  let current = resolveUiMode(
    uiModeFromSearch(globalThis.location?.search ?? ''),
    readStored(),
    bridge?.configured,
  )
  const listeners = new Set<(mode: UiMode) => void>()
  const disposers: Array<() => void> = []

  // The URL is normalized once at boot so the first paint and a reload agree,
  // even when the mode came from storage or the desktop config.
  writeLocation(current)

  const apply = (next: UiMode, origin: 'page' | 'desktop'): void => {
    if (next === current) return
    current = next
    writeStored(next)
    writeLocation(next)
    if (origin === 'page') bridge?.setMode?.(next)
    for (const listener of [...listeners]) listener(next)
  }

  if (typeof bridge?.onMode === 'function') {
    disposers.push(bridge.onMode(mode => { apply(resolveUiMode(mode), 'desktop') }))
  }

  // Window-event entry: the fallback path for a desktop build whose preload
  // predates the bridge, and the seam a settings panel in any surface uses
  // without importing this module.
  const onWindowEvent = (event: Event): void => {
    const detail = (event as CustomEvent<unknown>).detail
    const requested = asUiMode(typeof detail === 'string' ? detail : (detail as { mode?: unknown } | null)?.mode)
    if (requested !== undefined) apply(requested, 'page')
  }
  globalThis.addEventListener?.(UI_MODE_EVENT, onWindowEvent)
  disposers.push(() => { globalThis.removeEventListener?.(UI_MODE_EVENT, onWindowEvent) })

  // Cross-tab agreement: a second window of the same origin follows a switch.
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== UI_MODE_STORAGE_KEY) return
    const requested = asUiMode(event.newValue)
    if (requested !== undefined) apply(requested, 'desktop')
  }
  globalThis.addEventListener?.('storage', onStorage as EventListener)
  disposers.push(() => { globalThis.removeEventListener?.('storage', onStorage as EventListener) })

  return {
    get: () => current,
    set: (mode, origin = 'page') => { apply(mode, origin) },
    cycle: (direction = 1) => { apply(cycleUiMode(current, direction), 'page') },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    dispose: () => {
      for (const dispose of disposers.splice(0)) dispose()
      listeners.clear()
    },
  }
}

export { DEFAULT_UI_MODE, UI_MODE_EVENT }
