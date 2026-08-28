/**
 * Client entry: the composer takeover, the replayable keyed tool renderers, the
 * current-session 笔记 view, and the external 学习库 with its per-message
 * 「留到库里」 action.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export { ActivityRendererRegistry, activityRendererRegistry } from './ActivityRenderer.tsx';
export { subscribeLearningUiLifecycle, type LearningUiLifecycleEvent } from './lifecycle.ts';
export { VaultLibrary, VaultView, type VaultViewInjected } from './VaultView.tsx';
export { VaultKeepAction, messageText, titleFrom, type VaultKeepInjected } from './VaultKeep.tsx';
export { notifyVaultRosterRefresh, VaultRosterAction, candidateFolders, type VaultRosterInjected, } from './VaultRoster.tsx';
export { startVaultGate, wantsVaultTabByPreset, LEARNING_PRESET_ID, type GateSessions, type GateSessionRow, type VaultGateOptions, } from './vault-gate.ts';
export declare const LEARNING_TOOL_VIEW_KEYS: readonly ["learning_visual", "learning_checkpoint", "learning_state_update", "learning_activity", "learning_question", "learning_reveal"];
/** Learner-state writes are internal bookkeeping and never produce a card. */
export declare function LearningStateUpdateToolView(): null;
export declare const name = "interactive-learning-client";
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map