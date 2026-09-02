/**
 * Learning mode as a focused workbench surface.
 *
 * This page owns the learning entry points and the list of existing learning
 * sessions. Materials are attached from the conversation when the learner
 * chooses the material flow; there is no separate library surface.
 * @module @dsh-portable/dcode-ui/client/learning/LearningHome
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { NavigationStore } from '../state/navigation.ts';
/** Props of the learning surface. */
export interface LearningHomeProps {
    readonly navigation: NavigationStore;
    readonly cwd: string | undefined;
    readonly sessionId: SessionId | undefined;
}
/** Learning entry points and the current learning-session list. */
export declare function LearningHome({ navigation, cwd, sessionId }: LearningHomeProps): import("react").JSX.Element;
//# sourceMappingURL=LearningHome.d.ts.map