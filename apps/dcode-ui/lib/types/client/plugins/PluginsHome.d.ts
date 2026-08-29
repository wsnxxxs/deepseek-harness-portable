/**
 * Plugins as a first-class surface.
 *
 * The sidebar's plugin entry lands here rather than in a settings tab,
 * because installing and managing plugins is a task with its own catalogue,
 * its own long-running jobs and its own safety gate — not a preference.
 *
 * Three sections, one subject: the marketplace catalogue, the profile's own
 * inventory, and the settings of the plugins that ship with the harness. The
 * first two are the marketplace Host plugin's `/api/market` routes; the third
 * is the settings registry the classic surface writes, rendered by the same
 * component the settings surface uses. Nothing here is a second copy of
 * either.
 *
 * The marketplace Host is optional. When it is not running, the two
 * marketplace sections explain that rather than failing, and the settings
 * section — which does not depend on it — keeps working.
 * @module @dsh-portable/dcode-ui/client/plugins/PluginsHome
 */
import type { ReactNode } from 'react';
import type { NavigationStore } from '../state/navigation.ts';
/** The three views of the plugins surface. */
export type PluginsSection = 'market' | 'installed' | 'settings';
/** Props of the plugins surface. */
export interface PluginsHomeProps {
    readonly navigation: NavigationStore;
}
/** The marketplace, the profile inventory, and the built-in plugin settings. */
export declare function PluginsHome({ navigation }: PluginsHomeProps): ReactNode;
//# sourceMappingURL=PluginsHome.d.ts.map