/**
 * Unified-patch reader.
 *
 * Split out of the viewer because it is the part with rules: hunk arithmetic,
 * the multi-file boundary, and git's trailing-newline artefact are all things
 * that can be wrong without looking wrong, so they are pinned by tests rather
 * than by reading the panel.
 * @module @dsh-portable/dcode-ui/client/git/patch
 */
/** One rendered diff line. */
export interface DiffLine {
    readonly kind: 'add' | 'remove' | 'context' | 'hunk' | 'meta';
    readonly text: string;
    readonly oldNo?: number;
    readonly newNo?: number;
    /** Hunk rows only: the `@@ … @@` range. */
    readonly range?: string;
    /** Hunk rows only: the function or section git names after the range. */
    readonly section?: string;
}
/**
 * Turn a unified patch into numbered lines.
 *
 * File headers before the first hunk are dropped: the panel already names the
 * file, and `diff --git`/`index` lines cost three rows of a narrow column.
 * @param patch - unified diff text from git.
 * @returns the lines to render, in patch order.
 */
export declare function parsePatch(patch: string): readonly DiffLine[];
//# sourceMappingURL=patch.d.ts.map