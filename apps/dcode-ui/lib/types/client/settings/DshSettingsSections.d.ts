/**
 * DCode adapters for the DSH-owned settings domains.
 *
 * The business controllers stay the DSH source of truth. DCode supplies the
 * page shell, token scope, and the small amount of React wiring needed to
 * mount those controllers in its own workbench settings surface.
 */
import type { ReactNode } from 'react';
import type { NavigationStore } from '../state/navigation.ts';
/** The complete DSH provider editor mounted inside DCode's model page. */
export declare function ModelsSection(): ReactNode;
/** The complete DSH Agent preset management page inside DCode settings. */
export declare function AgentPresetsSection({ navigation }: {
    navigation: NavigationStore;
}): ReactNode;
//# sourceMappingURL=DshSettingsSections.d.ts.map