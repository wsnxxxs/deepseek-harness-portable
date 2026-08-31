/**
 * The create/edit form for one task.
 *
 * The same form serves both, because the fields are the same and an operator
 * who has written one task should not have to learn a second layout to change
 * it. Save stays disabled until the two fields the host requires are non-empty,
 * so an invalid write is never sent for the host to reject.
 * @module @dsh-portable/crew-ui/client/board/TaskEditor
 */
import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client';
/** The editable shape of a task, as typed rather than as stored. */
export interface TaskDraft {
    readonly subject: string;
    readonly description: string;
    /** Comma-separated task ids. */
    readonly blockers: string;
    /** Comma-separated paths. */
    readonly scopes: string;
}
/** Props of the task form. */
export interface TaskEditorProps {
    /** Existing task when editing; omitted when creating. */
    readonly task?: TeamTaskView;
    /** A write is outstanding. */
    readonly busy: boolean;
    onCancel(): void;
    onSubmit(draft: TaskDraft): Promise<void> | void;
}
/** Create or edit one board task. */
export declare function TaskEditor({ task, busy, onCancel, onSubmit }: TaskEditorProps): import("react").JSX.Element;
//# sourceMappingURL=TaskEditor.d.ts.map