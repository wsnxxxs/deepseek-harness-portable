/**
 * The settings surface.
 *
 * Sections read the Host's own controllers — the settings registry, the model
 * catalogue, the skill and command lists, the plugin inventory — so nothing
 * here is a second copy of configuration. Where this distribution has no
 * bespoke editor for a namespace, the section shows the registry's live
 * values and points at the classic settings surface, which is never removed.
 *
 * The Interface section is the workbench's own: it is one of the four switch
 * entry points between the modern and classic front ends.
 * @module @dsh-portable/dcode-ui/client/settings/SettingsSurface
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots';
import { type NavigationStore } from '../state/navigation.ts';
/** Props of the settings surface. */
export interface SettingsSurfaceProps {
    readonly navigation: NavigationStore;
    readonly sessionId: SessionId | undefined;
    /** Official DSH settings section renderer supplied by the root slot. */
    readonly renderSection?: PropsRenderSlots<'settings.section'>['renderSlot'];
}
/** The settings rail and the selected section. */
export declare function SettingsSurface({ navigation, sessionId, renderSection }: SettingsSurfaceProps): import("react").JSX.Element;
//# sourceMappingURL=SettingsSurface.d.ts.map