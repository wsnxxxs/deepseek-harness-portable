import type { RefObject } from 'react';
import type { ConversationNode } from '@deepseek-ai/dsh-client-ui-chat/client';
export interface MessageNavRailProps {
    readonly nodes: readonly ConversationNode[];
    readonly scrollerRef: RefObject<HTMLDivElement | null>;
    readonly onNavigate: (turnIndex: number) => void;
}
declare function MessageNavRailView({ nodes, scrollerRef, onNavigate }: MessageNavRailProps): import("react").JSX.Element | null;
export declare const MessageNavRail: import("react").MemoExoticComponent<typeof MessageNavRailView>;
export {};
//# sourceMappingURL=MessageNavRail.d.ts.map