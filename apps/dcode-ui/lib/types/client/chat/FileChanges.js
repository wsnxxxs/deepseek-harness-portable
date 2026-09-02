import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The file-change summary card that closes a turn.
 *
 * It previews the paths that turn's settled write/edit calls touched,
 * annotates each with the line counts from the working-tree status, opens the
 * diff viewer on click, and offers the one destructive action the workbench
 * has: undoing that turn's edits. Longer lists stay compact until expanded.
 *
 * Undo is deliberately narrow. It restores tracked files from HEAD and moves
 * untracked ones into `.dsh/dcode-undo/<timestamp>/` rather than deleting
 * them, so a mistaken undo is recoverable from the operator's own directory.
 * @module @dsh-portable/dcode-ui/client/chat/FileChanges
 */
import { useCallback, useId, useMemo, useState } from 'react';
import { IconChevronDownOutline14, IconEditOutline16, IconPlusOutline16, IconRefreshOutline14, RiskConfirmation, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { DiffCount, Spinner, ui } from "../shell/ui.js";
import css from './FileChanges.module.css';
/** Keep the completed-turn summary short while leaving every file one click away. */
const DEFAULT_VISIBLE_PATHS = 3;
/** Split a path into its directory prefix and file name for two-tone display. */
function splitPath(path) {
    const normalized = path.split('\\').join('/');
    const index = normalized.lastIndexOf('/');
    return index === -1
        ? { dir: '', name: normalized }
        : { dir: normalized.slice(0, index + 1), name: normalized.slice(index + 1) };
}
/**
 * Normalize a turn path to the repository-relative form git status reports.
 *
 * Git status rows and every `/dcode` path are root-relative, while a tool's
 * recorded path is absolute or relative to the session cwd; when the workspace
 * is a repository subdirectory the naive string-crop of the cwd prefix
 * produces the wrong file and zero line counts.
 */
function repoRelative(path, cwd, root) {
    const normalized = path.split('\\').join('/').replace(/^\.\//, '');
    const r = root === undefined ? undefined : root.split('\\').join('/').replace(/\/$/, '');
    if (r !== undefined && normalized.startsWith(r + '/'))
        return normalized.slice(r.length + 1);
    if (cwd === undefined)
        return normalized;
    const c = cwd.split('\\').join('/').replace(/\/$/, '');
    const absolute = normalized.startsWith(c + '/') ? normalized : `${c}/${normalized}`;
    return r !== undefined && absolute.startsWith(r + '/')
        ? absolute.slice(r.length + 1)
        : absolute.startsWith(c + '/') ? absolute.slice(c.length + 1) : normalized;
}
/** Exact-match a normalized path against a repository-relative status row. */
function countsFor(status, path) {
    const row = status?.files.find(file => file.path.split('\\').join('/') === path);
    return { insertions: row?.insertions ?? 0, deletions: row?.deletions ?? 0 };
}
/** The turn's changed-file summary with its undo action. */
export function FileChanges({ paths, cwd, status, onOpenDiff, onChanged }) {
    const runtime = useRuntime();
    const t = useT();
    const moreFilesId = useId();
    const [undoing, setUndoing] = useState(false);
    const [note, setNote] = useState(undefined);
    const [confirmingUndo, setConfirmingUndo] = useState(false);
    const [acknowledgedUndo, setAcknowledgedUndo] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const gitPath = useCallback((path) => repoRelative(path, cwd, status?.root), [cwd, status?.root]);
    const totals = useMemo(() => paths.reduce((sum, path) => {
        const counts = countsFor(status, gitPath(path));
        return { insertions: sum.insertions + counts.insertions, deletions: sum.deletions + counts.deletions };
    }, { insertions: 0, deletions: 0 }), [paths, status, gitPath]);
    const hiddenCount = Math.max(paths.length - DEFAULT_VISIBLE_PATHS, 0);
    const visiblePaths = showAll ? paths : paths.slice(0, DEFAULT_VISIBLE_PATHS);
    const undo = useCallback(() => {
        if (cwd === undefined)
            return;
        setUndoing(true);
        setNote(undefined);
        const targets = paths.map(path => gitPath(path));
        void runtime.git.undo(cwd, targets).then((result) => {
            if (!result.ok) {
                setNote({ text: result.error.message, kind: 'error' });
                return;
            }
            const reverted = result.value.outcomes.filter(outcome => outcome.result !== 'skipped');
            const quarantined = result.value.outcomes.filter(outcome => outcome.result === 'quarantined');
            setNote({
                text: quarantined.length === 0
                    ? t('changes.undone', { count: reverted.length })
                    : `${t('changes.undone', { count: reverted.length })} · ${quarantined.map(o => o.movedTo ?? o.path).join(', ')}`,
                kind: 'success',
            });
            onChanged();
        }).catch((cause) => {
            setNote({ text: cause instanceof Error ? cause.message : String(cause), kind: 'error' });
        }).finally(() => { setUndoing(false); });
    }, [runtime, cwd, gitPath, onChanged, t]);
    if (paths.length === 0)
        return null;
    return (_jsxs("section", { className: css.card, children: [_jsxs("header", { className: `${css.head} ${ui.cardHeader}`, children: [_jsx("span", { className: css.titleIcon, "aria-hidden": true, children: _jsx(IconEditOutline16, {}) }), _jsxs("div", { className: css.titleCopy, children: [_jsx("span", { className: css.title, children: t('changes.count', { count: paths.length }) }), totals.insertions === 0 && totals.deletions === 0
                                ? null
                                : _jsx("span", { className: css.stats, children: _jsx(DiffCount, { insertions: totals.insertions, deletions: totals.deletions }) })] }), _jsxs("button", { type: "button", className: css.undo, disabled: undoing || cwd === undefined || !runtime.git.available, onClick: () => {
                            setAcknowledgedUndo(false);
                            setConfirmingUndo(true);
                        }, title: t('changes.undo'), children: [undoing ? _jsx(Spinner, {}) : _jsx(IconRefreshOutline14, {}), undoing ? t('changes.undoing') : t('changes.undo')] })] }), _jsx("div", { id: moreFilesId, className: css.rows, children: visiblePaths.map((path) => {
                    const { dir, name } = splitPath(path);
                    const target = gitPath(path);
                    const counts = countsFor(status, target);
                    return (_jsxs("button", { type: "button", className: css.row, onClick: () => { onOpenDiff(target); }, title: path, children: [_jsx(IconEditOutline16, {}), _jsx("span", { className: css.path, children: _jsxs("bdi", { children: [dir === '' ? '' : _jsx("span", { className: css.dir, children: dir }), name] }) }), _jsx(DiffCount, { insertions: counts.insertions, deletions: counts.deletions })] }, path));
                }) }), hiddenCount > 0 ? (_jsxs("button", { type: "button", className: css.more, "aria-expanded": showAll, "aria-controls": moreFilesId, onClick: () => { setShowAll(value => !value); }, children: [_jsx("span", { className: css.moreIcon, "aria-hidden": true, children: _jsx(IconPlusOutline16, {}) }), _jsx("span", { className: css.moreLabel, children: showAll ? t('changes.showLessFiles') : t('changes.showMoreFiles', { count: hiddenCount }) }), _jsx("span", { className: `${css.moreChevron} ${showAll ? css.moreChevronOpen : ''}`, "aria-hidden": true, children: _jsx(IconChevronDownOutline14, {}) })] })) : null, note === undefined
                ? null
                : _jsx("p", { className: `${css.note} ${note.kind === 'error' ? css.noteError : ''}`, role: note.kind === 'error' ? 'alert' : 'status', children: note.text }), _jsx(RiskConfirmation, { open: confirmingUndo, title: t('changes.undoConfirmTitle'), description: t('changes.undoConfirmBody'), acknowledgeLabel: t('changes.undoConfirmAcknowledge'), cancelLabel: t('common.cancel'), closeLabel: t('common.close'), confirmLabel: t('changes.undo'), acknowledged: acknowledgedUndo, disabled: undoing, onAcknowledgedChange: setAcknowledgedUndo, onCancel: () => {
                    setAcknowledgedUndo(false);
                    setConfirmingUndo(false);
                }, onConfirm: () => {
                    if (!acknowledgedUndo)
                        return;
                    setAcknowledgedUndo(false);
                    setConfirmingUndo(false);
                    undo();
                } })] }));
}
//# sourceMappingURL=FileChanges.js.map