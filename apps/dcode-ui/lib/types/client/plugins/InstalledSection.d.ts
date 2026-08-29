/**
 * The inventory: update, enable, disable and uninstall what is installed.
 *
 * The rows are the web profile's own manifest as the Host reads it, so this
 * module owns no second list of plugins and no second notion of "enabled".
 * What it does own is the honesty of the report: every one of these verbs
 * edits the profile rather than the running process, so each row carries the
 * lifecycle strip that says whether what is loaded still matches what the
 * profile now says, and the section carries the restart note that explains
 * why a plugin just switched on is still doing nothing.
 * @module @dsh-portable/dcode-ui/client/plugins/InstalledSection
 */
import type { ReactNode } from 'react';
import { type InstalledSnapshot, type MarketClient } from './market.ts';
/** Props of the inventory section. */
export interface InstalledSectionProps {
    readonly client: MarketClient;
    readonly snapshot: InstalledSnapshot | undefined;
    readonly loading: boolean;
    readonly error: string | undefined;
    readonly onReload: () => void;
    /** Send the operator to the catalogue when nothing is installed yet. */
    readonly onBrowse: () => void;
}
/** Manage the plugins this profile has installed. */
export declare function InstalledSection(props: InstalledSectionProps): ReactNode;
//# sourceMappingURL=InstalledSection.d.ts.map