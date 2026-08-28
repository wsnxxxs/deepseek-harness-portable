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
/** The preferences the workbench's switch offers, in display order. */
export const THEME_PREFERENCES = ['light', 'dark', 'system'];
/** Global the desktop preload publishes the resolved window backdrop on. */
export const SURFACE_BRIDGE_GLOBAL = '__DSH_DESKTOP_SURFACE__';
/** Body/root attribute marking a document whose ground must stay translucent. */
export const ACRYLIC_ATTRIBUTE = 'data-dcode-acrylic';
/** Root attribute carrying the resolved scheme to the token stylesheet. */
export const SCHEME_ATTRIBUTE = 'data-dcode-scheme';
/** The `ui-layout` presenter's body attribute; present only for dark palettes. */
const DARK_BODY_ATTRIBUTE = 'data-ds-dark-theme';
/**
 * Read the backdrop the desktop shell reported for this window.
 * @returns the material, or `none` on any surface without the bridge.
 */
export function readWindowMaterial() {
    if (typeof globalThis === 'undefined')
        return 'none';
    const bridge = globalThis[SURFACE_BRIDGE_GLOBAL];
    const material = bridge?.material;
    return material === 'acrylic' || material === 'mica' ? material : 'none';
}
/**
 * Narrow an arbitrary value to a theme preference.
 * @param value - candidate, typically off a snapshot.
 * @returns the preference, or undefined when it is not one of the three.
 */
export function asThemePreference(value) {
    return value === 'light' || value === 'dark' || value === 'system' ? value : undefined;
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
export function createAppearanceStore(events, theme) {
    const listeners = new Set();
    const notify = () => { for (const listener of listeners)
        listener(); };
    let sourceDisposers;
    const media = typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia('(prefers-color-scheme: dark)')
        : undefined;
    const getScheme = () => {
        const active = theme?.getTheme().active.colorScheme;
        if (active !== undefined)
            return active;
        // Without a service, the presenter's attribute is the next authority; it
        // is only ever absent when nothing has applied a palette at all, and then
        // the OS query is what the base stylesheets themselves fall back to.
        if (typeof document !== 'undefined' && document.body.hasAttribute(DARK_BODY_ATTRIBUTE))
            return 'dark';
        return media?.matches === true ? 'dark' : 'light';
    };
    return {
        getScheme,
        getPreference: () => asThemePreference(theme?.getTheme().preference) ?? 'system',
        canSet: theme?.setTheme !== undefined,
        material: readWindowMaterial(),
        set: (preference) => { theme?.setTheme?.(preference); },
        subscribe: (listener) => {
            listeners.add(listener);
            if (sourceDisposers === undefined) {
                const disposers = [];
                try {
                    disposers.push(events?.on('theme/change', notify) ?? (() => { }));
                }
                catch {
                    // The attribute observer below sees the same applied theme change.
                }
                if (typeof MutationObserver === 'function' && typeof document !== 'undefined') {
                    const observer = new MutationObserver(notify);
                    observer.observe(document.body, { attributes: true, attributeFilter: [DARK_BODY_ATTRIBUTE] });
                    disposers.push(() => { observer.disconnect(); });
                }
                if (media !== undefined) {
                    media.addEventListener('change', notify);
                    disposers.push(() => { media.removeEventListener('change', notify); });
                }
                sourceDisposers = disposers;
            }
            return () => {
                listeners.delete(listener);
                if (listeners.size > 0)
                    return;
                for (const dispose of sourceDisposers ?? [])
                    dispose();
                sourceDisposers = undefined;
            };
        },
    };
}
//# sourceMappingURL=theme.js.map