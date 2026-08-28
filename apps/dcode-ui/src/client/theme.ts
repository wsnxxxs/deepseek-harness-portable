/**
 * Appearance state: the resolved colour scheme, the preference behind it, and
 * the native backdrop the window is wearing.
 *
 * The workbench does not own a theme. `ui-theme` resolves `system` against the
 * OS, folds registered override layers, and publishes one `ThemeSnapshot`;
 * `ui-layout`'s presenter projects that snapshot onto the document as the
 * `--dsw-alias-*` variables every workbench token reads. This store is a
 * read-through onto the same snapshot plus the write entry, so a theme change
 * made here reaches the official interface and vice versa — there is one
 * preference, stored once, in the user settings document.
 * @module @dsh-portable/dcode-ui/client/theme
 */

/** The two palettes the token scale is written for. */
export type ColorScheme = 'light' | 'dark'

/** The three choices the switch offers; `system` resolves through the OS. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** Native window backdrop, as the desktop shell resolved it for this machine. */
export type WindowMaterial = 'acrylic' | 'mica' | 'none'

/** The preferences the workbench's switch offers, in display order. */
export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']

/** Global the desktop preload publishes the resolved window backdrop on. */
export const SURFACE_BRIDGE_GLOBAL = '__DSH_DESKTOP_SURFACE__'

/** Body/root attribute marking a document whose ground must stay translucent. */
export const ACRYLIC_ATTRIBUTE = 'data-dcode-acrylic'

/** Root attribute carrying the resolved scheme to the token stylesheet. */
export const SCHEME_ATTRIBUTE = 'data-dcode-scheme'

/** The `ui-layout` presenter's body attribute; present only for dark palettes. */
const DARK_BODY_ATTRIBUTE = 'data-ds-dark-theme'

/**
 * The slice of `ctx.theme` the workbench reads.
 *
 * Spelled structurally rather than imported: a deployment without `ui-theme`
 * still boots the workbench, with the switch disabled instead of the whole
 * plugin failing.
 */
export interface ThemeFace {
  getTheme(): {
    /** The theme in force, with `system` already resolved against the OS. */
    readonly active: { readonly id: string; readonly colorScheme: ColorScheme }
    /** What the user chose; `system` until they choose otherwise. */
    readonly preference?: string
    readonly fontSize: number
    /** Every registered theme, built-ins first. */
    readonly themes?: readonly { readonly id: string; readonly colorScheme?: ColorScheme }[]
  }
  /** The service's single preference-write entry; `system` is a valid id. */
  setTheme?(id: string): void
  setFontSize?(px: number): void
}

/** The event bus slice this module subscribes to. */
interface EventSource {
  on(name: 'theme/change', listener: () => void): () => void
}

/** Appearance reads and writes, as one observable store. */
export interface AppearanceStore {
  /** The palette in force right now, with `system` already resolved. */
  getScheme(): ColorScheme
  /** What the user chose, which may be `system`. */
  getPreference(): ThemePreference
  /** Whether this assembly can write the preference at all. */
  readonly canSet: boolean
  /** The native backdrop; `none` on the web and on Windows 10 and older. */
  readonly material: WindowMaterial
  /** Switch the preference. A no-op where {@link canSet} is false. */
  set(preference: ThemePreference): void
  subscribe(listener: () => void): () => void
}

/**
 * Read the backdrop the desktop shell reported for this window.
 * @returns the material, or `none` on any surface without the bridge.
 */
export function readWindowMaterial(): WindowMaterial {
  if (typeof globalThis === 'undefined') return 'none'
  const bridge = (globalThis as Record<string, unknown>)[SURFACE_BRIDGE_GLOBAL]
  const material = (bridge as { material?: unknown } | undefined)?.material
  return material === 'acrylic' || material === 'mica' ? material : 'none'
}

/**
 * Narrow an arbitrary value to a theme preference.
 * @param value - candidate, typically off a snapshot.
 * @returns the preference, or undefined when it is not one of the three.
 */
export function asThemePreference(value: unknown): ThemePreference | undefined {
  return value === 'light' || value === 'dark' || value === 'system' ? value : undefined
}

/**
 * Build the appearance store for a live client context.
 *
 * Three change sources are watched, because the authoritative one depends on
 * what the assembly contains: the theme service's own event where there is a
 * service, the presenter's body attribute (which also covers a theme applied
 * by anything else), and the OS query for a `system` preference.
 * @param events - the client context, used only as an event bus.
 * @param theme - the theme service, when the assembly has one.
 * @returns the store handed to the React tree.
 */
export function createAppearanceStore(
  events: EventSource | undefined,
  theme: ThemeFace | undefined,
): AppearanceStore {
  const listeners = new Set<() => void>()
  const notify = (): void => { for (const listener of listeners) listener() }
  let sourceDisposers: readonly (() => void)[] | undefined

  const media = typeof globalThis.matchMedia === 'function'
    ? globalThis.matchMedia('(prefers-color-scheme: dark)')
    : undefined

  const getScheme = (): ColorScheme => {
    const active = theme?.getTheme().active.colorScheme
    if (active !== undefined) return active
    // Without a service, the presenter's attribute is the next authority; it
    // is only ever absent when nothing has applied a palette at all, and then
    // the OS query is what the base stylesheets themselves fall back to.
    if (typeof document !== 'undefined' && document.body.hasAttribute(DARK_BODY_ATTRIBUTE)) return 'dark'
    return media?.matches === true ? 'dark' : 'light'
  }

  return {
    getScheme,
    getPreference: () => asThemePreference(theme?.getTheme().preference) ?? 'system',
    canSet: theme?.setTheme !== undefined,
    material: readWindowMaterial(),
    set: (preference) => { theme?.setTheme?.(preference) },
    subscribe: (listener) => {
      listeners.add(listener)
      if (sourceDisposers === undefined) {
        const disposers: (() => void)[] = []
        try {
          disposers.push(events?.on('theme/change', notify) ?? (() => {}))
        } catch {
          // The attribute observer below sees the same applied theme change.
        }
        if (typeof MutationObserver === 'function' && typeof document !== 'undefined') {
          const observer = new MutationObserver(notify)
          observer.observe(document.body, { attributes: true, attributeFilter: [DARK_BODY_ATTRIBUTE] })
          disposers.push(() => { observer.disconnect() })
        }
        if (media !== undefined) {
          media.addEventListener('change', notify)
          disposers.push(() => { media.removeEventListener('change', notify) })
        }
        sourceDisposers = disposers
      }

      return () => {
        listeners.delete(listener)
        if (listeners.size > 0) return
        for (const dispose of sourceDisposers ?? []) dispose()
        sourceDisposers = undefined
      }
    },
  }
}
