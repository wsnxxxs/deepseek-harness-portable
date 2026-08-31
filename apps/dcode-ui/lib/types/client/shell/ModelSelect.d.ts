/**
 * ModelSelect: two-level model and reasoning level selection for the composer.
 *
 * Implements the Figma 496:26454 MenuDropdown architecture:
 * - Root pane: 'Model' and 'Effort' drill-down rows
 * - Model pane: Provider-grouped model list with sticky headers and checkmark
 * - Effort pane: Reasoning effort levels for the current model
 * - Trigger: Model name + reasoning effort in caption tone with flip chevron
 *
 * @module @dsh-portable/dcode-ui/client/shell/ModelSelect
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** The `modelSelection` projection, read structurally. */
export interface ModelSelectionView {
    readonly next: {
        readonly provider: string;
        readonly model: string;
        readonly reasoningEffort?: string;
    } | null;
    readonly lastUsed: {
        readonly provider: string;
        readonly model: string;
        readonly reasoningEffort?: string;
    } | null;
}
export interface ModelSelectProps {
    readonly sessionId: SessionId | undefined;
    readonly disabled?: boolean;
}
/** Imperative face for opening the picker from outside the composer. */
export interface ModelSelectHandle {
    open(): void;
}
export declare const ModelSelect: import("react").ForwardRefExoticComponent<ModelSelectProps & import("react").RefAttributes<ModelSelectHandle>>;
//# sourceMappingURL=ModelSelect.d.ts.map