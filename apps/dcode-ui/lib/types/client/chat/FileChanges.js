import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The file-change summary card that closes a turn.
 *
 * It lists exactly the paths that turn's settled write/edit calls touched,
 * annotates each with the line counts from the working-tree status, opens the
 * diff viewer on click, and offers the one destructive action the workbench
 * has: undoing that turn's edits.
 *
 * Undo is deliberately narrow. It restores tracked files from HEAD and moves
 * untracked ones into `.dsh/dcode-undo/<timestamp>/` rather than deleting
 * them, so a mistaken undo is recoverable from the operator's own directory.
 * @module @dsh-portable/dcode-ui/client/chat/FileChanges
 */
import { useCallback, useMemo, useState } from 'react';
import { IconEditOutline16, IconRefreshOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { DiffCount, Spinner } from "../shell/ui.js";
import css from './FileChanges.module.css';
/** Split a path into its directory prefix and file name for two-tone display. */
function splitPath(path) {
    const normalized = path.split('\\').join('/');
    const index = normalized.lastIndexOf('/');
    return index === -1
        ? { dir: '', name: normalized }
        : { dir: normalized.slice(0, index + 1), name: normalized.slice(index + 1) };
}
/** Normalize a turn path to the repository-relative form used by git status. */
function relativePath(path, cwd) {
    const normalized = path.split('\\').join('/').replace(/^\.\//, '');
    if (cwd === undefined)
        return normalized;
    const root = cwd.split('\\').join('/').replace(/\/$/, '');
    return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized;
}
/** Exact-match a turn path against a repository-relative status row. */
function countsFor(status, path, cwd) {
    const normalized = relativePath(path, cwd);
    const row = status?.files.find(file => file.path.split('\\').join('/') === normalized);
    return { insertions: row?.insertions ?? 0, deletions: row?.deletions ?? 0 };
}
/** The turn's changed-file summary with its undo action. */
export function FileChanges({ paths, cwd, status, onOpenDiff, onChanged }) {
    const runtime = useRuntime();
    const t = useT();
    const [undoing, setUndoing] = useState(false);
    const [note, setNote] = useState(undefined);
    const totals = useMemo(() => paths.reduce((sum, path) => {
        const counts = countsFor(status, path, cwd);
        return { insertions: sum.insertions + counts.insertions, deletions: sum.deletions + counts.deletions };
    }, { insertions: 0, deletions: 0 }), [paths, status, cwd]);
    const undo = useCallback(() => {
        if (cwd === undefined)
            return;
        setUndoing(true);
        setNote(undefined);
        void runtime.git.undo(cwd, paths).then((result) => {
            setUndoing(false);
            if (!result.ok) {
                setNote(result.error.message);
                return;
            }
            const reverted = result.value.outcomes.filter(outcome => outcome.result !== 'skipped');
            const quarantined = result.value.outcomes.filter(outcome => outcome.result === 'quarantined');
            setNote(quarantined.length === 0
                ? t('changes.undone', { count: reverted.length })
                : `${t('changes.undone', { count: reverted.length })} · ${quarantined.map(o => o.movedTo ?? o.path).join(', ')}`);
            onChanged();
        });
    }, [runtime, cwd, paths, onChanged, t]);
    if (paths.length === 0)
        return null;
    return (_jsxs("section", { className: css.card, children: [_jsxs("header", { className: css.head, children: [_jsx("span", { className: css.title, children: t('changes.count', { count: paths.length }) }), _jsx(DiffCount, { insertions: totals.insertions, deletions: totals.deletions }), _jsxs("button", { type: "button", className: css.undo, disabled: undoing || cwd === undefined || !runtime.git.available, onClick: undo, title: t('changes.undo'), children: [undoing ? _jsx(Spinner, {}) : _jsx(IconRefreshOutline14, {}), undoing ? t('changes.undoing') : t('changes.undo')] })] }), paths.map((path) => {
                const { dir, name } = splitPath(path);
                const counts = countsFor(status, path, cwd);
                return (_jsxs("button", { type: "button", className: css.row, onClick: () => { onOpenDiff(path); }, title: path, children: [_jsx(IconEditOutline16, {}), _jsx("span", { className: css.path, children: _jsxs("bdi", { children: [dir === '' ? '' : _jsx("span", { className: css.dir, children: dir }), name] }) }), _jsx(DiffCount, { insertions: counts.insertions, deletions: counts.deletions })] }, path));
            }), note === undefined ? null : _jsx("p", { className: css.note, children: note })] }));
}
//# sourceMappingURL=FileChanges.js.map