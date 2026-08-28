/**
 * One tool execution, closed to a single line.
 *
 * A card head answers "what did it just do" without scrolling; expanding it
 * reveals the arguments and the full output, and nested Code Dispatch calls
 * render as their own cards inside their parent. The card is the same for a
 * running and a settled call, so a call does not jump position when it
 * completes.
 * @module @dsh-portable/dcode-ui/client/chat/ToolCard
 */
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client';
/** Props of one tool card. */
export interface ToolCardProps {
    readonly block: ToolCallBlock;
    /** Open the details pane on this call. */
    readonly onInspect?: (callId: string) => void;
}
/** A compact, expandable tool-execution card. */
export declare function ToolCard({ block, onInspect }: ToolCardProps): import("react").JSX.Element;
//# sourceMappingURL=ToolCard.d.ts.map