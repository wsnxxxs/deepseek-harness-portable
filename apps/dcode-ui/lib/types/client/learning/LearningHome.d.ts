/**
 * Learning mode as a first-class surface.
 *
 * Everything here drives the Interactive Learning pack this distribution
 * already ships: starting a session selects its `learning` agent preset and
 * sends the pack's own opening prompt, and the library, concept cards, notes
 * and visuals are the pack's own `VaultLibrary` reading the same
 * `/interactive-learning` channel the classic UI's views read. No learning
 * state or backend is duplicated here — this module is navigation and framing
 * around capabilities that already exist.
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
/** Learning entry points, the current learning session, and the vault. */
export declare function LearningHome({ navigation, cwd, sessionId }: LearningHomeProps): import("react").JSX.Element;
//# sourceMappingURL=LearningHome.d.ts.map