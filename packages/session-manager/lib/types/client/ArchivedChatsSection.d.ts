/**
 * Archived-conversation management as a page of the official settings panel.
 *
 * The official session row menu archives; until now nothing in that UI could
 * bring one back or remove it, so an archived conversation was reachable only
 * from the workbench. This section closes that: it is registered into
 * `settings.section`, reads the same registry-global archive set the sidebar
 * hides rows by, and routes restore and delete to the official Workspace and
 * Session controllers.
 *
 * It renders inside the official settings shell, so it uses that shell's theme
 * aliases and the harness's own primitives rather than any surface's token
 * scope — the same choice `@dsh-portable/ui-mode` makes for the interface
 * switch. The state fold behind it is shared with the workbench through
 * {@link useArchivedChats}.
 * @module @dsh-portable/session-manager/client/ArchivedChatsSection
 */
import type { ReactNode } from 'react';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots';
import type { ArchiveActions } from './archive.ts';
/** Registration-side operations, bound to the official services by the plugin body. */
export interface ArchivedChatsInjected extends ArchiveActions {
    /** Open a restored session and leave settings for it. */
    readonly open: (id: Parameters<ArchiveActions['restore']>[0]) => void;
    /** Drop the current selection after deleting the session it pointed at. */
    readonly clear: () => void;
}
export type ArchivedChatsSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'sessionManager'> & InjectFace<ArchivedChatsInjected>;
/** The archive page, one row per archived conversation. */
export declare function ArchivedChatsSection(props: ArchivedChatsSectionProps): ReactNode;
//# sourceMappingURL=ArchivedChatsSection.d.ts.map