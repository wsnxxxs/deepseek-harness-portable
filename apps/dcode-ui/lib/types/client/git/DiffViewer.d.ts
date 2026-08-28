/**
 * Unified-diff viewer for one working-tree file.
 *
 * The patch comes from git itself, so what the panel shows is exactly what a
 * commit would record. Rendering is line-based rather than word-based: at the
 * width of a side panel a word-level diff is noise, and the old/new line
 * numbers are the thing an operator actually cross-references against an
 * editor. The patch reader itself lives in {@link module:.../git/patch}.
 * @module @dsh-portable/dcode-ui/client/git/DiffViewer
 */
/** Props of the diff viewer. */
export interface DiffViewerProps {
    readonly cwd: string;
    readonly path: string;
    readonly staged: boolean;
    readonly onClose: () => void;
}
/** One file's diff, read on demand. */
export declare function DiffViewer({ cwd, path, staged, onClose }: DiffViewerProps): import("react").JSX.Element;
//# sourceMappingURL=DiffViewer.d.ts.map