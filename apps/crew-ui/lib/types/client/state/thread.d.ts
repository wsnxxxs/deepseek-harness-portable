/**
 * Folding a conversation into the compact mission log.
 *
 * Pure and component-free on purpose: this is the decision about what the
 * thread tab shows, and it is worth testing without a DOM, a Host, or a
 * stylesheet.
 * @module @dsh-portable/crew-ui/client/state/thread
 */
import type { ConversationNode } from '@deepseek-ai/dsh-client-ui-chat/client';
/** One entry in the compact log. */
type Entry = {
    readonly kind: 'said';
    readonly id: string;
    readonly who: 'user' | 'agent';
    readonly text: string;
} | {
    readonly kind: 'work';
    readonly id: string;
    readonly count: number;
} | {
    readonly kind: 'note';
    readonly id: string;
    readonly text: string;
};
/**
 * Fold conversation nodes into the compact log.
 *
 * Consecutive tool results collapse into one "worked" row: the count is the
 * useful part here, and one row per call would bury the answer that follows it.
 * @param nodes - ordered conversation nodes.
 * @returns entries in display order.
 */
export declare function foldThread(nodes: readonly ConversationNode[]): Entry[];
export {};
//# sourceMappingURL=thread.d.ts.map