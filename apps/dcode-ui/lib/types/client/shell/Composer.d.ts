/**
 * The composer: prompt entry plus the four session controls the operator
 * changes most — agent mode, model, reasoning depth, and permission mode.
 *
 * Every control writes through the Host's own path, never a local mirror:
 * the model and reasoning effort go through `session/selectModel`, the
 * permission mode executes the `/permission` command the official chip
 * executes. The result is that both surfaces read the same projections
 * afterwards.
 * @module @dsh-portable/dcode-ui/client/shell/Composer
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Props of the composer. */
export interface ComposerProps {
    readonly sessionId: SessionId | undefined;
    readonly blank?: boolean;
    readonly cwd?: string;
    readonly onOpenWorkspace?: () => void;
}
/** Prompt entry and the session controls. */
export declare function Composer({ sessionId, blank, cwd, onOpenWorkspace }: ComposerProps): import("react").JSX.Element;
//# sourceMappingURL=Composer.d.ts.map