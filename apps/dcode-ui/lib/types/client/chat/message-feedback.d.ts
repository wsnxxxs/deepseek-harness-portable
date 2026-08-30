/** Session-scoped message feedback state for the DCode transcript. */
import { type MessageFeedbackRemote } from '@deepseek-ai/dsh-client-ui-message-feedback/client';
import type { MessageFeedbackItem, MessageFeedbackRating } from '@deepseek-ai/dsh-message-feedback/types';
import type { MessageId } from '@deepseek-ai/dsh-client-connection/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
export interface MessageFeedbackState {
    readonly enabled: boolean;
    readonly items: ReadonlyMap<string, MessageFeedbackItem>;
    readonly pending: ReadonlySet<string>;
    readonly error: string | undefined;
    ensure(): void;
    toggle(messageId: MessageId, rating: MessageFeedbackRating): Promise<string | undefined>;
}
/**
 * Bind one stable Remote namespace and Session to the official controller.
 * Loading remains cold until a feedback control is focused/hovered or clicked.
 */
export declare function useMessageFeedback(remote: MessageFeedbackRemote | undefined, sessionId: SessionId | undefined): MessageFeedbackState;
//# sourceMappingURL=message-feedback.d.ts.map