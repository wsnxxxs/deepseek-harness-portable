/** Session-scoped message feedback state for the DCode transcript. */
import type { MessageFeedbackActionResult, MessageFeedbackInjected } from '@deepseek-ai/dsh-client-ui-message-feedback/client';
import type { MessageFeedbackItem, MessageFeedbackRating } from '@deepseek-ai/dsh-message-feedback/types';
import type { MessageId } from '@deepseek-ai/dsh-client-connection/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** The official feedback plugin's Session-scoped slot face. */
export interface MessageFeedbackProvider {
    for(sessionId: SessionId): DcodeFeedbackEntry | undefined;
}
export interface MessageFeedbackState {
    readonly enabled: boolean;
    readonly items: ReadonlyMap<string, MessageFeedbackItem>;
    readonly pending: ReadonlySet<string>;
    readonly error: string | undefined;
    ensure(): void;
    toggle(messageId: MessageId, rating: MessageFeedbackRating): Promise<string | undefined>;
    /** Create or replace the message's note, keeping the existing rating. */
    saveNote(messageId: MessageId, rating: MessageFeedbackRating, note: string): Promise<string | undefined>;
    /** Drop the note while keeping the rating. */
    clearNote(messageId: MessageId): Promise<string | undefined>;
}
export interface DcodeFeedbackEntry extends MessageFeedbackInjected {
    toggle(messageId: MessageId, rating: MessageFeedbackRating): Promise<MessageFeedbackActionResult>;
    rate(messageId: MessageId, rating: MessageFeedbackRating, note: string): Promise<MessageFeedbackActionResult>;
    clearNote(messageId: MessageId): Promise<MessageFeedbackActionResult>;
}
/**
 * Bind one stable official feedback slot face and Session to the transcript.
 * Loading remains cold until a feedback control is focused/hovered or clicked.
 */
export declare function useMessageFeedback(provider: MessageFeedbackProvider | undefined, sessionId: SessionId | undefined): MessageFeedbackState;
//# sourceMappingURL=message-feedback.d.ts.map