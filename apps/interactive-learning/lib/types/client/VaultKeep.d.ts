/**
 * 「留到库里」 — the in-conversation half of the vault.
 *
 * The panel solves three of the four pain points on its own, but the fourth —
 * "notes are lost when the session closes" — needs a capture point where the
 * loss happens, which is the message. This entry sits in
 * `conversation.chat.assistant-actions`, the per-message action strip, so
 * keeping an explanation is one click from where a person read it.
 *
 * The sheet offers exactly two destinations. 「存为笔记」 keeps prose as prose;
 * 「存为待确认概念卡」 keeps it as a draft aimed at a concept. A concept card
 * is created only after the learner has demonstrated that concept in a
 * teaching session, so the sheet explains that boundary without offering a
 * non-actionable control.
 *
 * Only assistant messages reach this slot, so the text kept here is always the
 * model's explanation — never the learner's own words, which have their own
 * road into the vault through the evidence gate.
 * @module @dsh-portable/interactive-learning/src/client/VaultKeep
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Business face supplied by the slot registration; the same one the panel takes. */
export interface VaultKeepInjected {
    cwd: string | undefined;
    call: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>;
}
type VaultKeepProps = PropsRuntime<'conversation.chat.assistant-actions'> & InjectFace<VaultKeepInjected> & PropsLocale<'interactive-learning'>;
/**
 * The message's prose, reasoning excluded.
 *
 * Reasoning blocks are deliberately dropped. They are the model's working, not
 * its answer, and a note that opens with a chain of thought the learner never
 * read is worse than no note.
 */
export declare function messageText(nodes: readonly unknown[], messageId: string): string;
/** A title from the first line of prose, so the sheet opens with something usable. */
export declare function titleFrom(text: string): string;
/**
 * The action and its sheet.
 *
 * Registered only in learning sessions — the same gate that decides the 学习库
 * tab decides this button, because an action that writes into a topic vault is
 * meaningless in a session that has no vault to write into.
 */
export declare function VaultKeepAction({ messageId, useSession, sessionId, cwd, call, t }: VaultKeepProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=VaultKeep.d.ts.map