/**
 * Unified-patch reader.
 *
 * Split out of the viewer because it is the part with rules: hunk arithmetic,
 * the multi-file boundary, and git's trailing-newline artefact are all things
 * that can be wrong without looking wrong, so they are pinned by tests rather
 * than by reading the panel.
 * @module @dsh-portable/dcode-ui/client/git/patch
 */
/**
 * Turn a unified patch into numbered lines.
 *
 * File headers before the first hunk are dropped: the panel already names the
 * file, and `diff --git`/`index` lines cost three rows of a narrow column.
 * @param patch - unified diff text from git.
 * @returns the lines to render, in patch order.
 */
export function parsePatch(patch) {
    const lines = [];
    let oldNo = 0;
    let newNo = 0;
    let started = false;
    for (const raw of patch.split('\n')) {
        const hunk = /^(@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@)(.*)$/.exec(raw);
        if (hunk !== null) {
            started = true;
            oldNo = Number(hunk[2]);
            newNo = Number(hunk[3]);
            // Range and section are rendered differently — the range is navigation,
            // the section is the enclosing function git found — so the header is
            // split here rather than re-parsed in the component.
            lines.push({
                kind: 'hunk',
                text: raw,
                range: hunk[1] ?? raw,
                section: (hunk[4] ?? '').trim(),
            });
            continue;
        }
        // A second file's header ends the previous file's hunks. One path is
        // requested at a time, but a rename shows both sides in one patch.
        if (raw.startsWith('diff --git ')) {
            started = false;
            continue;
        }
        if (!started)
            continue;
        if (raw.startsWith('+')) {
            lines.push({ kind: 'add', text: raw.slice(1), newNo });
            newNo += 1;
            continue;
        }
        if (raw.startsWith('-')) {
            lines.push({ kind: 'remove', text: raw.slice(1), oldNo });
            oldNo += 1;
            continue;
        }
        if (raw.startsWith('\\')) {
            lines.push({ kind: 'meta', text: raw });
            continue;
        }
        lines.push({ kind: 'context', text: raw.startsWith(' ') ? raw.slice(1) : raw, oldNo, newNo });
        oldNo += 1;
        newNo += 1;
    }
    // git's trailing newline produces one empty context row; drop it.
    while (lines.length > 0 && lines[lines.length - 1]?.text === '' && lines[lines.length - 1]?.kind === 'context') {
        lines.pop();
    }
    return lines;
}
//# sourceMappingURL=patch.js.map