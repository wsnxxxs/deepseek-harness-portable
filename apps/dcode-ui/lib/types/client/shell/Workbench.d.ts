/**
 * The workbench frame.
 *
 * Registered into DSH's built-in `root` slot, so while the modern surface is
 * active it owns the whole page and the official three-column frame stands
 * aside. Everything below reads Host state through {@link useRuntime}; the
 * only state this component owns is which panel is showing.
 * @module @dsh-portable/dcode-ui/client/shell/Workbench
 */
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots';
import { type NavigationStore } from '../state/navigation.ts';
/** Props of the workbench root. */
export interface WorkbenchProps {
    /** The view-state store shared with the keyboard layer and the palette. */
    readonly navigation: NavigationStore;
    /** Official settings sections rendered inside the DCode settings shell. */
    readonly renderSettingsSlot?: PropsRenderSlots<'settings.section'>['renderSlot'];
}
/** The whole modern surface. */
export declare function Workbench({ navigation, renderSettingsSlot }: WorkbenchProps): import("react").JSX.Element;
//# sourceMappingURL=Workbench.d.ts.map