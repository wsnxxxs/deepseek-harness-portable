import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Diff review for one working-tree file, in unified or side-by-side form. */
import { useMemo, useState } from 'react';
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "../state/i18n.js";
import { useRuntime } from "../state/runtime.js";
import { useAsync } from "../state/hooks.js";
import { CopyButton, EmptyState, IconButton, Spinner } from "../shell/ui.js";
import { parsePatch } from "./patch.js";
import css from './DiffViewer.module.css';
function patchHunks(patch) {
    const parsed = parsePatch(patch);
    const raw = patch.split('\n');
    const first = raw.findIndex(line => line.startsWith('@@ '));
    if (first < 0)
        return [];
    const prelude = raw.slice(0, first);
    const rawHunks = [];
    for (const line of raw.slice(first)) {
        if (line.startsWith('@@ '))
            rawHunks.push([]);
        rawHunks.at(-1)?.push(line);
    }
    const hunks = [];
    let current;
    for (const line of parsed) {
        if (line.kind === 'hunk') {
            if (current !== undefined)
                hunks.push({ ...current, patch: [...prelude, ...(rawHunks[hunks.length] ?? [])].join('\n') });
            current = { header: line, lines: [] };
        }
        else
            current?.lines.push(line);
    }
    if (current !== undefined)
        hunks.push({ ...current, patch: [...prelude, ...(rawHunks[hunks.length] ?? [])].join('\n') });
    return hunks;
}
function DiffRow({ line }) {
    return _jsxs("div", { className: `${css.line} ${line.kind === 'add' ? css.added : ''} ${line.kind === 'remove' ? css.removed : ''} ${line.kind === 'meta' ? css.meta : ''}`, children: [_jsxs("span", { className: css.gutter, "aria-hidden": true, children: [_jsx("span", { className: css.lineNo, children: line.oldNo ?? '' }), _jsx("span", { className: css.lineNo, children: line.newNo ?? '' })] }), _jsx("span", { className: css.sign, "aria-hidden": true, children: line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' ' }), _jsx("span", { className: css.text, children: line.text })] });
}
function splitRows(lines) {
    const rows = [];
    for (let index = 0; index < lines.length;) {
        if (lines[index]?.kind !== 'remove' && lines[index]?.kind !== 'add') {
            const line = lines[index++];
            if (line !== undefined)
                rows.push({ left: line, right: line });
            continue;
        }
        const removed = [];
        const added = [];
        while (lines[index]?.kind === 'remove')
            removed.push(lines[index++]);
        while (lines[index]?.kind === 'add')
            added.push(lines[index++]);
        for (let offset = 0; offset < Math.max(removed.length, added.length); offset += 1)
            rows.push({ left: removed[offset], right: added[offset] });
    }
    return rows;
}
function SplitHunk({ lines }) {
    return _jsx("div", { className: css.splitGrid, children: splitRows(lines).map((row, index) => _jsxs("div", { className: css.splitPair, children: [_jsxs("div", { className: `${css.splitLine} ${row.left?.kind === 'remove' ? css.removed : ''}`, children: [_jsx("span", { className: css.splitNo, children: row.left?.oldNo ?? '' }), _jsx("span", { className: css.splitText, children: row.left?.text ?? '' })] }), _jsxs("div", { className: `${css.splitLine} ${row.right?.kind === 'add' ? css.added : ''}`, children: [_jsx("span", { className: css.splitNo, children: row.right?.newNo ?? '' }), _jsx("span", { className: css.splitText, children: row.right?.text ?? '' })] })] }, index)) });
}
export function DiffViewer({ cwd, path, staged, onClose }) {
    const runtime = useRuntime();
    const t = useT();
    const [mode, setMode] = useState('unified');
    const [reverting, setReverting] = useState();
    const [note, setNote] = useState();
    const diff = useAsync(async () => await runtime.git.diff(cwd, path, staged), [runtime, cwd, path, staged]);
    const hunks = useMemo(() => diff.value?.ok === true ? patchHunks(diff.value.value.patch) : [], [diff.value]);
    const pathParts = useMemo(() => path.split(/[\\/]/).filter(Boolean), [path]);
    const revert = (hunk) => {
        if (reverting !== undefined)
            return;
        setReverting(hunk.header.range);
        setNote(undefined);
        void runtime.git.undoHunk(cwd, path, hunk.patch, staged).then((result) => { if (!result.ok)
            setNote(result.error.message);
        else
            diff.reload(); })
            .catch((cause) => { setNote(cause instanceof Error ? cause.message : String(cause)); }).finally(() => { setReverting(undefined); });
    };
    return _jsxs("div", { className: css.viewer, children: [_jsxs("div", { className: css.head, children: [_jsx("nav", { className: css.breadcrumbs, title: path, "aria-label": t('git.filePath'), children: pathParts.map((part, index) => _jsxs("span", { className: css.crumb, children: [index === 0 ? null : _jsx("span", { className: css.separator, "aria-hidden": true, children: "/" }), _jsx("bdi", { className: index === pathParts.length - 1 ? css.fileName : undefined, children: part })] }, `${String(index)}:${part}`)) }), _jsx(CopyButton, { text: path, label: t('git.copyPath'), copiedLabel: t('git.pathCopied') }), _jsx(IconButton, { label: t('common.close'), onClick: onClose, children: _jsx(IconCloseOutline16, {}) })] }), _jsxs("div", { className: css.reviewBar, children: [diff.value?.ok === true ? _jsxs("span", { className: css.diffSummary, children: [_jsxs("span", { className: css.summaryAdded, children: ["+", diff.value.value.insertions] }), _jsxs("span", { className: css.summaryRemoved, children: ["-", diff.value.value.deletions] })] }) : null, _jsxs("span", { className: css.modeSwitch, role: "group", "aria-label": t('git.diffMode'), children: [_jsx("button", { type: "button", className: mode === 'unified' ? css.modeActive : '', onClick: () => { setMode('unified'); }, children: t('git.unified') }), _jsx("button", { type: "button", className: mode === 'split' ? css.modeActive : '', onClick: () => { setMode('split'); }, children: t('git.split') })] })] }), diff.loading ? _jsx(EmptyState, { children: _jsx(Spinner, {}) }) : null, diff.error !== undefined ? _jsx(EmptyState, { children: diff.error }) : null, diff.value?.ok === false ? _jsx(EmptyState, { children: diff.value.error.message }) : null, diff.value?.ok === true && diff.value.value.binary ? _jsx(EmptyState, { children: t('git.binary') }) : null, diff.value?.ok === true && !diff.value.value.binary && hunks.length === 0 ? _jsx(EmptyState, { children: t('git.noDiff') }) : null, hunks.length > 0 ? _jsx("div", { className: `${css.body} ${css.modeBody} ${mode === 'split' ? css.splitBody : ''}`, children: hunks.map((hunk, index) => _jsxs("section", { className: css.hunkBlock, children: [_jsxs("div", { className: `${css.line} ${css.hunk}`, children: [_jsx("span", { className: css.range, children: hunk.header.range }), _jsx("span", { className: css.section, children: hunk.header.section }), _jsxs("span", { className: css.hunkActions, children: [_jsx(CopyButton, { text: hunk.patch, label: t('git.copyHunk'), copiedLabel: t('common.copied') }), _jsx("button", { type: "button", disabled: reverting !== undefined, onClick: () => { revert(hunk); }, children: reverting === hunk.header.range ? t('git.revertingHunk') : t('git.revertHunk') })] })] }), mode === 'unified' ? hunk.lines.map((line, lineIndex) => _jsx(DiffRow, { line: line }, lineIndex)) : _jsx(SplitHunk, { lines: hunk.lines })] }, `${hunk.header.range ?? ''}:${String(index)}`)) }, mode) : null, note === undefined ? null : _jsx("p", { className: css.errorNote, role: "alert", children: note }), diff.value?.ok === true && diff.value.value.truncated ? _jsx("p", { className: css.note, children: t('git.truncated') }) : null] });
}
//# sourceMappingURL=DiffViewer.js.map