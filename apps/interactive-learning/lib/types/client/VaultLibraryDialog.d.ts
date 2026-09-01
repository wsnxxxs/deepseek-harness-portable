/**
 * Shared external library dialog.
 *
 * The official sidebar entry and DCode's library command both open the same
 * dialog. Keeping the shell and topic switcher here means a layout change is
 * made once for both front ends; VaultLibrary remains the single owner of the
 * material, notes, concept and review panes inside it.
 * @module @dsh-portable/interactive-learning/src/client/VaultLibraryDialog
 */
import { type ReactNode } from 'react';
import { type VaultLibraryProps } from './VaultView.tsx';
/** The small amount of topic data needed by the shared dialog rail. */
export interface VaultLibraryTopic {
    readonly cwd: string;
    readonly title: string;
    readonly due: number;
}
/** Props shared by the official sidebar and DCode's library launcher. */
export interface VaultLibraryDialogProps {
    readonly open: boolean;
    readonly topics: readonly VaultLibraryTopic[];
    readonly selectedCwd?: string;
    readonly call?: VaultLibraryProps['call'];
    readonly t: VaultLibraryProps['t'];
    /** Header fallback used while the roster is loading or empty. */
    readonly title?: string;
    readonly onSelectCwd?: (cwd: string) => void;
    readonly onClose: () => void;
    /** Optional content for loading, empty and error states. */
    readonly content?: ReactNode;
}
/** Render the common settings-style library card through a document portal. */
export declare function VaultLibraryDialog({ open, topics, selectedCwd, call, t, title, onSelectCwd, onClose, content, }: VaultLibraryDialogProps): ReactNode;
//# sourceMappingURL=VaultLibraryDialog.d.ts.map