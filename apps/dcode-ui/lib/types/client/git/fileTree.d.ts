import type { GitFileChange } from '../rpc.ts';
export type GitStatusFilter = 'all' | GitFileChange['status'];
export interface FileTreeNode {
    readonly name: string;
    readonly path: string;
    readonly file?: GitFileChange;
    readonly children: readonly FileTreeNode[];
    readonly fileCount: number;
}
export interface FileTreeRow {
    readonly kind: 'directory' | 'file';
    readonly name: string;
    readonly path: string;
    readonly depth: number;
    readonly file?: GitFileChange;
    readonly fileCount?: number;
    readonly expanded?: boolean;
}
/** Build a stable, directory-first tree from repository-relative paths. */
export declare function buildFileTree(files: readonly GitFileChange[]): readonly FileTreeNode[];
/** Apply the path query and exact porcelain status filter without changing group membership. */
export declare function filterGitFiles(files: readonly GitFileChange[], query: string, status: GitStatusFilter): readonly GitFileChange[];
/** Turn expanded tree state into fixed-height rows suitable for windowing. */
export declare function flattenFileTree(nodes: readonly FileTreeNode[], isExpanded: (node: FileTreeNode) => boolean, depth?: number): readonly FileTreeRow[];
export interface VirtualRange {
    readonly start: number;
    readonly end: number;
}
/** Calculate the small row window that should enter the DOM. */
export declare function virtualRange(count: number, scrollTop: number, viewportHeight: number, rowHeight: number, overscan?: number): VirtualRange;
//# sourceMappingURL=fileTree.d.ts.map