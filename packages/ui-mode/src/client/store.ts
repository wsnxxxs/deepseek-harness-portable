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
  DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_EVENT, UI_MODE_STORAGE_KEY,
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
  /**
   * Report which surfaces this page can actually render.
   *
   * Only the page knows: availability is a property of which client plugins
   * loaded, which the Electron main process never sees. Without this report the
   * application and tray menus would keep offering a surface the in-page switch
   * has already greyed out, and the more prominent of the two pickers would be
   * the one telling the operator the wrong thing.
   */
  setAvailable?: (modes: readonly UiMode[]) => void
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
   * Whether a surface capable of rendering this mode is present in this build.
   *
   * `official` is always available: it is upstream's own shell, and it is what
   * renders whenever no extension surface has claimed `root`. Every other mode
   * is available only once its surface has announced itself, so a build that
   * ships without a surface — or one whose runtime row the Host disabled
   * because a capability it needs is missing — reports the mode as
   * unavailable rather than offering a choice that lands on the official UI
   * with no explanation.
   * @param mode - the mode to test.
   * @returns true when selecting it would actually show that surface.
   */
  available(mode: UiMode): boolean
  /**
   * Declare that this page can render one mode.
   *
   * Called by a surface's plugin body, which runs only when every service that
   * surface injects resolved. Announcing is therefore evidence rather than a
   * claim: a surface that could not load never announces, and the switch says
   * so instead of silently doing nothing.
   * @param mode - the mode this caller renders.
   * @returns a disposer withdrawing the announcement.
   */
  announce(mode: UiMode): () => void
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
   *
   * Fires for an availability change as well as a mode change, so a switch
   * rendered before its surfaces finished loading repaints when they arrive.
   * @param listener - called after the mode or the available set changed.
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
  // Counted rather than a flag set: a surface may be re-registered across a
  // renderer epoch, and a withdrawal from the old registration must not take
  // the mode away from the new one.
  const announced = new Map<UiMode, number>()

  const notify = (): void => {
    for (const listener of [...listeners]) listener(current)
  }

  const isAvailable = (mode: UiMode): boolean => mode === 'official' || (announced.get(mode) ?? 0) > 0

  /** Push the available set to the desktop shell, in presentation order. */
  const reportAvailability = (): void => {
    bridge?.setAvailable?.(UI_MODES.filter(isAvailable))
  }

  // The URL is normalized once at boot so the first paint and a reload agree,
  // even when the mode came from storage or the desktop config.
  writeLocation(current)

  const apply = (next: UiMode, origin: 'page' | 'desktop'): void => {
    if (next === current) return
    current = next
    writeStored(next)
    writeLocation(next)
    if (origin === 'page') bridge?.setMode?.(next)
    notify()
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
    // The official shell is upstream's own and is what renders when no
    // extension surface holds `root`, so it needs no announcement to be true.
    available: isAvailable,
    announce: (mode) => {
      const before = announced.get(mode) ?? 0
      announced.set(mode, before + 1)
      if (before === 0) {
        notify()
        reportAvailability()
      }
      let withdrawn = false
      return () => {
        if (withdrawn) return
        withdrawn = true
        const count = (announced.get(mode) ?? 1) - 1
        if (count > 0) announced.set(mode, count)
        else {
          announced.delete(mode)
          notify()
          reportAvailability()
        }
      }
    },
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
