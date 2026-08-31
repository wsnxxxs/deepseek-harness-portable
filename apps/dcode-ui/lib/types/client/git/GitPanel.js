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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconBranchOutline16, IconChevronDownOutline14, IconChevronRightOutline14, IconCodeOutline16, IconFolderClose16, IconFolderOpen16, IconFolderOpenOutline16, IconRefreshOutline14, IconSearchOutline16, IconSparkle16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "../state/i18n.js";
import { useRuntime } from "../state/runtime.js";
import { useWorkspaceGroups } from "../state/hooks.js";
import { Button, DiffCount, EmptyState, IconButton, Popover, Spinner, ui } from "../shell/ui.js";
import { useGitStatus } from "./useGit.js";
import { buildFileTree, filterGitFiles, flattenFileTree, virtualRange, } from "./fileTree.js";
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
/** Localized accessible name for a porcelain status. */
function statusLabel(file, t) {
    switch (file.status) {
        case 'untracked': return t('git.status.untracked');
        case 'added': return t('git.status.added');
        case 'deleted': return t('git.status.deleted');
        case 'renamed': return t('git.status.renamed');
        case 'conflicted': return t('git.status.conflicted');
        default: return t('git.status.modified');
    }
}
const TREE_ROW_HEIGHT = 34;
const TREE_MAX_HEIGHT = 280;
const LARGE_DIRECTORY_SIZE = 24;
const EMPTY_FILES = [];
const STATUS_FILTER_KEYS = {
    all: 'git.filterAll',
    modified: 'git.status.modified',
    added: 'git.status.added',
    deleted: 'git.status.deleted',
    renamed: 'git.status.renamed',
    conflicted: 'git.status.conflicted',
    untracked: 'git.status.untracked',
};
function WindowedFileTree({ files, staged, selected, onOpenDiff, onToggle, onToggleDirectory, expandedDirectories, query, statsLabel, fileStatusLabel, actionLabel, mutation, }) {
    const [scrollTop, setScrollTop] = useState(0);
    const viewportRef = useRef(null);
    const lastScrolledSelection = useRef(undefined);
    const tree = useMemo(() => buildFileTree(files), [files]);
    const selectedPath = selected?.staged === staged ? selected.path : undefined;
    const rows = useMemo(() => flattenFileTree(tree, (node) => {
        if (query.trim() !== '')
            return true;
        const override = expandedDirectories.get(`${String(staged)}:${node.path}`);
        if (override !== undefined)
            return override;
        if (selectedPath !== undefined && (selectedPath === node.path || selectedPath.startsWith(`${node.path}/`)))
            return true;
        return node.fileCount < LARGE_DIRECTORY_SIZE;
    }), [tree, query, selectedPath, expandedDirectories, staged]);
    const height = Math.min(TREE_MAX_HEIGHT, rows.length * TREE_ROW_HEIGHT);
    const range = virtualRange(rows.length, scrollTop, height, TREE_ROW_HEIGHT);
    useEffect(() => {
        if (selectedPath === undefined) {
            lastScrolledSelection.current = undefined;
            return;
        }
        const selectionKey = `${String(staged)}:${selectedPath}`;
        if (lastScrolledSelection.current === selectionKey)
            return;
        const index = rows.findIndex(row => row.kind === 'file' && row.path === selectedPath);
        if (index < 0)
            return;
        const next = Math.max(0, index * TREE_ROW_HEIGHT - Math.floor(height / 2));
        if (viewportRef.current !== null)
            viewportRef.current.scrollTop = next;
        setScrollTop(next);
        lastScrolledSelection.current = selectionKey;
    }, [selectedPath, rows, height, staged]);
    const fileRow = (file, name, depth) => {
        const conflicted = file.status === 'conflicted';
        const pending = mutation?.kind === (staged ? 'unstage' : 'stage') && mutation.paths.includes(file.path);
        const hasStats = file.insertions !== 0 || file.deletions !== 0;
        return (_jsxs("div", { className: `${css.file} ${selected?.path === file.path && selected.staged === staged ? css.fileActive : ''}`, style: { paddingLeft: `${String(depth * 12 + 8)}px` }, role: "treeitem", "aria-selected": selected?.path === file.path && selected.staged === staged, children: [_jsxs("button", { type: "button", className: css.fileOpen, onClick: () => { onOpenDiff(file.path, staged); }, title: file.path, children: [_jsx("span", { className: css.fileIcon, "aria-hidden": true, children: _jsx(IconCodeOutline16, {}) }), _jsx("span", { className: `${css.code} ${codeClass(file)}`, "aria-label": fileStatusLabel(file), children: codeMark(file) }), _jsxs("span", { className: css.pathText, children: [_jsx("span", { className: css.path, children: _jsx("bdi", { children: name }) }), _jsx("span", { className: css.pathDetail, children: _jsx("bdi", { children: file.path }) })] }), hasStats
                            ? _jsxs("span", { className: css.lineBadge, "aria-label": statsLabel(file), children: [file.insertions === 0 ? null : _jsxs("span", { className: css.badgeAdded, children: ["+", file.insertions] }), file.deletions === 0 ? null : _jsxs("span", { className: css.badgeRemoved, children: ["-", file.deletions] })] })
                            : null] }), _jsx("button", { type: "button", className: css.fileAction, "aria-label": actionLabel(file, staged), title: actionLabel(file, staged), disabled: conflicted || mutation !== undefined, onClick: () => { onToggle(file, staged); }, children: pending ? _jsx(Spinner, {}) : staged ? '−' : '+' })] }));
    };
    return (_jsx("div", { ref: viewportRef, className: css.treeViewport, style: { height }, role: "tree", onScroll: (event) => { setScrollTop(event.currentTarget.scrollTop); }, children: _jsx("div", { className: css.treeCanvas, style: { height: rows.length * TREE_ROW_HEIGHT }, children: rows.slice(range.start, range.end).map((row, offset) => (_jsx("div", { className: css.virtualRow, style: { height: TREE_ROW_HEIGHT, transform: `translateY(${String((range.start + offset) * TREE_ROW_HEIGHT)}px)` }, children: row.file !== undefined
                    ? fileRow(row.file, row.name, row.depth)
                    : (_jsxs("button", { type: "button", className: css.directory, style: { paddingLeft: `${String(row.depth * 12 + 8)}px` }, title: row.path, role: "treeitem", "aria-expanded": row.expanded, onClick: () => {
                            if (query.trim() === '')
                                onToggleDirectory(`${String(staged)}:${row.path}`, !(row.expanded ?? false));
                        }, children: [_jsx("span", { className: css.directoryChevron, "aria-hidden": true, children: row.expanded ? _jsx(IconChevronDownOutline14, {}) : _jsx(IconChevronRightOutline14, {}) }), _jsx("span", { className: css.directoryIcon, "aria-hidden": true, children: row.expanded ? _jsx(IconFolderOpen16, {}) : _jsx(IconFolderClose16, {}) }), _jsxs("span", { className: css.pathText, children: [_jsx("span", { className: css.path, children: row.name }), _jsx("span", { className: css.pathDetail, children: row.path })] }), _jsx("span", { className: css.directoryCount, children: row.fileCount })] })) }, `${row.kind}:${row.path}`))) }) }));
}
/** Branch, changed files and the commit entry. */
export function GitPanel({ cwd, sessionId, selected, onOpenDiff }) {
    const runtime = useRuntime();
    const t = useT();
    const { groups } = useWorkspaceGroups();
    const git = useGitStatus(cwd, sessionId);
    const [message, setMessage] = useState('');
    const [committing, setCommitting] = useState(false);
    const [note, setNote] = useState(undefined);
    const [branches, setBranches] = useState([]);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [expandedDirectories, setExpandedDirectories] = useState(() => new Map());
    const statusFiles = git.status?.files ?? EMPTY_FILES;
    const stagedFiles = useMemo(() => statusFiles.filter(file => file.staged), [statusFiles]);
    const unstagedFiles = useMemo(() => statusFiles.filter(file => !file.staged), [statusFiles]);
    const visibleFiles = useMemo(() => filterGitFiles(statusFiles, query, filter), [statusFiles, query, filter]);
    const visibleStagedFiles = useMemo(() => visibleFiles.filter(file => file.staged), [visibleFiles]);
    const visibleUnstagedFiles = useMemo(() => visibleFiles.filter(file => !file.staged), [visibleFiles]);
    useEffect(() => {
        setExpandedDirectories(new Map());
        setQuery('');
        setFilter('all');
    }, [cwd]);
    const toggleStage = useCallback((files, staged) => {
        const paths = files.filter(file => file.status !== 'conflicted').map(file => file.path);
        if (paths.length === 0)
            return;
        setNote(undefined);
        void (staged ? git.unstage(paths) : git.stage(paths)).then((error) => {
            if (error !== undefined)
                setNote({ text: error, error: true });
        });
    }, [git]);
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
            if (live && !result.ok)
                setNote({ text: result.error.message, error: true });
        }).catch((cause) => {
            if (live)
                setNote({ text: cause instanceof Error ? cause.message : String(cause), error: true });
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
        }).catch((cause) => {
            setNote({ text: cause instanceof Error ? cause.message : String(cause), error: true });
        }).finally(() => {
            setCommitting(false);
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
    const workspace = groups.find(group => group.path === cwd);
    const suggestedMessage = (() => {
        const files = status.files;
        if (files.length === 0)
            return '';
        const scope = files.length === 1 ? files[0]?.path.split('/').pop() ?? 'workspace' : `${String(files.length)} files`;
        const onlyDocs = files.every(file => /(?:^|\/)(?:docs?|README)|\.md$/i.test(file.path));
        const onlyTests = files.every(file => /(?:test|spec)\.[^.]+$/i.test(file.path));
        const verb = onlyDocs ? 'docs' : onlyTests ? 'test' : files.some(file => file.status === 'added') ? 'feat' : 'chore';
        return `${verb}: update ${scope}`;
    })();
    const commitSummary = stagedFiles.slice(0, 2).map(file => file.path.split('/').pop() ?? file.path).join(', ')
        + (stagedFiles.length > 2 ? ` +${String(stagedFiles.length - 2)}` : '');
    const fileGroup = (label, files, staged) => files.length === 0
        ? null
        : (_jsxs("section", { className: css.fileGroup, "aria-label": label, children: [_jsxs("div", { className: css.groupHead, children: [_jsxs("span", { children: [label, " ", _jsx("span", { className: css.groupCount, children: files.length })] }), _jsx("button", { type: "button", className: css.groupAction, disabled: committing || git.mutation !== undefined || files.every(file => file.status === 'conflicted'), onClick: () => { toggleStage(files, staged); }, children: git.mutation?.kind === (staged ? 'unstage' : 'stage') && git.mutation.paths.length > 1
                                ? t(staged ? 'git.unstaging' : 'git.staging')
                                : t(staged ? 'git.unstageAll' : 'git.stageAll') })] }), _jsx("div", { className: css.files, children: _jsx(WindowedFileTree, { files: files, staged: staged, selected: selected, onOpenDiff: onOpenDiff, onToggle: (file, isStaged) => { toggleStage([file], isStaged); }, statsLabel: file => t('git.fileStats', { insertions: file.insertions, deletions: file.deletions }), fileStatusLabel: file => statusLabel(file, t), actionLabel: (file, isStaged) => file.status === 'conflicted'
                            ? t('git.conflictCannotStage')
                            : t(isStaged ? 'git.unstageFile' : 'git.stageFile', { path: file.path }), query: query, expandedDirectories: expandedDirectories, onToggleDirectory: (key, expanded) => {
                            setExpandedDirectories(current => new Map(current).set(key, expanded));
                        }, mutation: git.mutation }) })] }));
    return (_jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.head, children: [_jsx("span", { className: ui.grow, children: t('git.title') }), _jsx(IconButton, { label: t('git.refresh'), onClick: git.refresh, children: git.loading ? _jsx(Spinner, {}) : _jsx(IconRefreshOutline14, {}) })] }), _jsxs("div", { className: css.summary, children: [_jsx("span", { className: css.summaryLabel, children: t('git.changes') }), _jsx(DiffCount, { insertions: status.insertions, deletions: status.deletions })] }), git.mutation === undefined
                ? null
                : _jsx("div", { className: css.pending, role: "status", children: t(git.mutation.kind === 'stage' ? 'git.stagingCount' : 'git.unstagingCount', { count: git.mutation.paths.length }) }), _jsxs("div", { className: css.fileToolbar, children: [_jsxs("label", { className: css.searchBox, children: [_jsx("span", { className: css.searchIcon, "aria-hidden": true, children: _jsx(IconSearchOutline16, {}) }), _jsx("input", { type: "search", value: query, "aria-label": t('git.searchFiles'), placeholder: t('git.searchFiles'), onChange: event => { setQuery(event.target.value); } })] }), _jsxs("label", { className: css.statusFilter, children: [_jsx("span", { children: t('git.filterStatus') }), _jsx("select", { value: filter, onChange: event => { setFilter(event.target.value); }, children: ['all', 'modified', 'added', 'deleted', 'renamed', 'conflicted', 'untracked'].map(value => (_jsxs("option", { value: value, children: [t(STATUS_FILTER_KEYS[value]), " (", value === 'all' ? status.files.length : status.files.filter(file => file.status === value).length, ")"] }, value))) })] })] }), _jsx(Popover, { label: t('workspace.select'), placement: "down", trigger: _jsxs(_Fragment, { children: [_jsx(IconFolderOpenOutline16, {}), _jsx("span", { children: workspace?.title ?? cwd.split(/[\\/\\]/).filter(Boolean).pop() ?? cwd }), _jsx(IconChevronDownOutline14, {})] }), rows: groups.map(group => ({
                    id: String(group.workspaceId),
                    label: group.title,
                    detail: group.path,
                    icon: _jsx(IconFolderOpenOutline16, {}),
                    active: group.workspaceId === workspace?.workspaceId,
                    onSelect: () => { runtime.navigation?.startSession(group.workspaceId); },
                })), triggerClassName: css.workspaceRow }), _jsxs("div", { className: css.branchRow, children: [_jsx(Popover, { label: t('git.branches'), placement: "down", trigger: _jsxs(_Fragment, { children: [_jsx(IconBranchOutline16, {}), _jsx("span", { children: status.branch ?? 'HEAD' })] }), children: _jsx("div", { className: ui.menuLabel, children: t('git.branchReadOnly') }), rows: branches.map(branch => ({
                            id: branch.name,
                            label: branch.name,
                            detail: branch.current ? t('git.currentBranch') : undefined,
                            disabled: true,
                            active: branch.current,
                        })), triggerClassName: css.branchRow }), status.ahead > 0 ? _jsx("span", { children: t('git.ahead', { count: status.ahead }) }) : null, status.behind > 0 ? _jsx("span", { children: t('git.behind', { count: status.behind }) }) : null] }), status.files.length === 0
                ? _jsx(EmptyState, { children: t('git.clean') })
                : (_jsxs("div", { className: css.fileGroups, children: [fileGroup(t('git.staged'), visibleStagedFiles, true), fileGroup(t('git.unstaged'), visibleUnstagedFiles, false), visibleFiles.length === 0 ? _jsx(EmptyState, { children: t('git.noMatchingFiles') }) : null] })), _jsxs("div", { className: css.commit, children: [_jsx("div", { className: stagedFiles.length === 0 ? css.commitBlocked : css.commitSummary, role: "status", children: stagedFiles.length === 0
                            ? t('git.commitBlocked')
                            : t('git.commitSummary', { count: stagedFiles.length, summary: commitSummary }) }), _jsxs("div", { className: css.commitInputRow, children: [_jsx("textarea", { className: css.input, rows: 2, value: message, "aria-label": t('git.commitPlaceholder'), placeholder: t('git.commitPlaceholder'), onChange: event => { setMessage(event.target.value); } }), _jsx("button", { type: "button", className: css.suggest, disabled: suggestedMessage === '' || message.trim() !== '', onClick: () => { setMessage(current => current.trim() === '' ? suggestedMessage : current); }, title: t('git.suggestCommit'), "aria-label": t('git.suggestCommit'), children: _jsx(IconSparkle16, {}) })] }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { primary: true, disabled: committing || git.mutation !== undefined || message.trim() === '' || stagedFiles.length === 0, onClick: commit, children: committing ? t('git.committing') : t('git.commit') }), note === undefined
                                ? null
                                : _jsx("span", { className: `${css.note} ${note.error ? css.noteError : ''}`, role: note.error ? 'alert' : 'status', children: note.text })] })] })] }));
}
//# sourceMappingURL=GitPanel.js.map