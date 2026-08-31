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
import type { RefObject } from 'react';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { type ModelSelectHandle } from './ModelSelect.tsx';
import type { ModelReadiness } from '../settings/readiness.ts';
/** Props of the composer. */
export interface ComposerProps {
    readonly sessionId: SessionId | undefined;
    readonly blank?: boolean;
    readonly cwd?: string;
    readonly onOpenWorkspace?: () => void;
    readonly readiness?: ModelReadiness;
    readonly onSelectModel?: () => void;
    readonly onConfigureProvider?: () => void;
    /** Opens the model picker from outside the composer (readiness card actions). */
    readonly modelSelectRef?: RefObject<ModelSelectHandle>;
    /** Active `@query` at the caret; reserved for the file/symbol reference picker. */
    readonly onReferenceQueryChange?: (query: string | undefined) => void;
}
/** Prompt entry and the session controls. */
export declare function Composer({ sessionId, blank, cwd, onOpenWorkspace, readiness, onSelectModel, onConfigureProvider, modelSelectRef, onReferenceQueryChange }: ComposerProps): import("react").JSX.Element;
//# sourceMappingURL=Composer.d.ts.map