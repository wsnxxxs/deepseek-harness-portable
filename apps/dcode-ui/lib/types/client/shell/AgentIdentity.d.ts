/**
 * The Metis-style agent identity seat in the chat header.
 *
 * The label is resolved from the same agent-preset projection and roster used
 * by the composer. It is a navigation affordance, not a second preset store:
 * clicking it opens the existing preset editor owned by DSH.
 * @module @dsh-portable/dcode-ui/client/shell/AgentIdentity
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { NavigationStore } from '../state/navigation.ts';
/** Current agent identity, patterned after Metis's ChatHeader agent pill. */
export declare function AgentIdentity({ navigation, sessionId }: {
    navigation: NavigationStore;
    sessionId: SessionId | undefined;
}): import("react").JSX.Element;
//# sourceMappingURL=AgentIdentity.d.ts.map