import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The Git tools panel: branch, working-tree changes, and a commit entry.
 *
 * This is the capability the Harness itself does not ship, completed over the
 * `/dcode` host channel. It stays deliberately small — status, diff, commit —
 * because anything wider (push, rebase, history rewriting) belongs in a real
 * git client, not in a panel beside a conversation.
 * @module @dsh-portable/dcode-ui/client/git/GitPanel
 */
import { useCallback, useEffect, useState } from 'react';
import { IconBranchOutline16, IconRefreshOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "../state/i18n.js";
import { useRuntime } from "../state/runtime.js";
import { Button, DiffCount, EmptyState, IconButton, Popover, Spinner, ui } from "../shell/ui.js";
import { useGitStatus } from "./useGit.js";
import css from './GitPanel.module.css';
/** Colour class for a porcelain status letter. */
function codeClass(file) {
    if (file.status === 'untracked')
        return css.codeUntracked;
    if (file.status === 'added')
        return css.codeAdded;
    if (file.status === 'deleted')
        return css.codeRemoved;
    return '';
}
/** Single-letter status mark for a changed file. */
function codeMark(file) {
    switch (file.status) {
        case 'untracked': return 'U';
        case 'added': return 'A';
        case 'deleted': return 'D';
        case 'renamed': return 'R';
        case 'conflicted': return '!';
        default: return 'M';
    }
}
/** Branch, changed files and the commit entry. */
export function GitPanel({ cwd, sessionId, selected, onOpenDiff }) {
    const runtime = useRuntime();
    const t = useT();
    const git = useGitStatus(cwd, sessionId);
    const [message, setMessage] = useState('');
    const [committing, setCommitting] = useState(false);
    const [note, setNote] = useState(undefined);
    const [branches, setBranches] = useState([]);
    // The branch list is read once per workspace and refreshed with the status,
    // so opening the menu costs nothing.
    useEffect(() => {
        if (cwd === undefined) {
            setBranches([]);
            return undefined;
        }
        let live = true;
        void runtime.git.branches(cwd).then((result) => {
            if (live && result.ok)
                setBranches(result.value.branches);
        });
        return () => { live = false; };
    }, [runtime, cwd, git.status]);
    const commit = useCallback(() => {
        if (cwd === undefined)
            return;
        setCommitting(true);
        setNote(undefined);
        void runtime.git.commit(cwd, message).then((result) => {
            setCommitting(false);
            if (!result.ok) {
                setNote({ text: result.error.message, error: true });
                return;
            }
            if (!result.value.committed) {
                setNote({
                    text: result.value.reason === 'nothing-staged' ? t('git.nothingStaged') : result.value.reason ?? t('common.error'),
                    error: true,
                });
                return;
            }
            setMessage('');
            setNote({ text: t('git.committed', { commit: result.value.commit ?? '' }), error: false });
            git.refresh();
        });
    }, [runtime, cwd, message, git, t]);
    if (git.unavailable)
        return _jsx(EmptyState, { children: t('git.unavailable') });
    if (cwd === undefined)
        return _jsx(EmptyState, { children: t('chat.empty.noWorkspace') });
    if (git.pending)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (git.error !== undefined)
        return _jsx(EmptyState, { children: git.error });
    if (git.status === undefined)
        return _jsx(EmptyState, { children: t('common.error') });
    if (!git.status.repository)
        return _jsx(EmptyState, { children: t('git.notRepository') });
    const status = git.status;
    return (_jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.head, children: [_jsx("span", { className: ui.grow, children: t('git.title') }), _jsx(IconButton, { label: t('git.refresh'), onClick: git.refresh, children: git.loading ? _jsx(Spinner, {}) : _jsx(IconRefreshOutline14, {}) })] }), _jsxs("div", { className: css.summary, children: [_jsx("span", { className: css.summaryLabel, children: t('git.changes') }), _jsx(DiffCount, { insertions: status.insertions, deletions: status.deletions })] }), _jsxs("div", { className: css.branchRow, children: [_jsx(Popover, { label: t('git.branches'), placement: "down", trigger: _jsxs(_Fragment, { children: [_jsx(IconBranchOutline16, {}), _jsx("span", { children: status.branch ?? 'HEAD' })] }), children: _jsx("div", { className: ui.menuLabel, children: t('git.branchReadOnly') }), rows: branches.map(branch => ({
                            id: branch.name,
                            label: branch.name,
                            detail: branch.current ? t('git.currentBranch') : undefined,
                            disabled: true,
                        })), triggerClassName: css.branchRow }), status.ahead > 0 ? _jsx("span", { children: t('git.ahead', { count: status.ahead }) }) : null, status.behind > 0 ? _jsx("span", { children: t('git.behind', { count: status.behind }) }) : null] }), status.files.length === 0
                ? _jsx(EmptyState, { children: t('git.clean') })
                : (_jsx("div", { className: css.files, children: status.files.map(file => (_jsxs("button", { type: "button", className: `${css.file} ${selected === file.path ? css.fileActive : ''}`, onClick: () => { onOpenDiff(file.path, file.staged); }, title: file.path, children: [_jsx("span", { className: `${css.code} ${codeClass(file)}`, "aria-hidden": true, children: codeMark(file) }), _jsx("span", { className: css.path, children: _jsx("bdi", { children: file.path }) }), _jsx(DiffCount, { insertions: file.insertions, deletions: file.deletions })] }, `${file.code}:${file.path}`))) })), _jsxs("div", { className: css.commit, children: [_jsx("textarea", { className: css.input, rows: 2, value: message, placeholder: t('git.commitPlaceholder'), onChange: event => { setMessage(event.target.value); } }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { primary: true, disabled: committing || message.trim() === '' || status.files.length === 0, onClick: commit, children: committing ? t('git.committing') : t('git.commit') }), note === undefined
                                ? null
                                : _jsx("span", { className: `${css.note} ${note.error ? css.noteError : ''}`, children: note.text })] })] })] }));
}
//# sourceMappingURL=GitPanel.js.map