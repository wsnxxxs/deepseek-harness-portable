import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useMemo } from 'react';
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "../state/i18n.js";
import { useRuntime } from "../state/runtime.js";
import { useAsync } from "../state/hooks.js";
import { DiffCount, EmptyState, IconButton, Spinner } from "../shell/ui.js";
import { parsePatch } from "./patch.js";
import css from './DiffViewer.module.css';
/** One file's diff, read on demand. */
export function DiffViewer({ cwd, path, staged, onClose }) {
    const runtime = useRuntime();
    const t = useT();
    const { value, loading, error } = useAsync(async () => await runtime.git.diff(cwd, path, staged), [runtime, cwd, path, staged]);
    const lines = useMemo(() => (value?.ok === true ? parsePatch(value.value.patch) : []), [value]);
    return (_jsxs("div", { className: css.viewer, children: [_jsxs("div", { className: css.head, children: [_jsx("span", { className: css.path, title: path, children: _jsx("bdi", { children: path }) }), value?.ok === true
                        ? _jsx(DiffCount, { insertions: value.value.insertions, deletions: value.value.deletions })
                        : null, _jsx(IconButton, { label: t('common.close'), onClick: onClose, children: _jsx(IconCloseOutline16, {}) })] }), loading ? _jsx(EmptyState, { children: _jsx(Spinner, {}) }) : null, error !== undefined ? _jsx(EmptyState, { children: error }) : null, value?.ok === false ? _jsx(EmptyState, { children: value.error.message }) : null, value?.ok === true && value.value.binary ? _jsx(EmptyState, { children: t('git.binary') }) : null, value?.ok === true && !value.value.binary && lines.length === 0
                ? _jsx(EmptyState, { children: t('git.noDiff') })
                : null, lines.length === 0
                ? null
                : (_jsx("div", { className: css.body, children: lines.map((line, index) => (line.kind === 'hunk'
                        ? (_jsxs("div", { className: `${css.line} ${css.hunk}`, children: [_jsx("span", { className: css.range, children: line.range }), line.section === undefined || line.section === ''
                                    ? null
                                    : _jsx("span", { className: css.section, children: line.section })] }, index))
                        : (_jsxs("div", { className: `${css.line} ${line.kind === 'add' ? css.added : ''} ${line.kind === 'remove' ? css.removed : ''} ${line.kind === 'meta' ? css.meta : ''}`, children: [_jsxs("span", { className: css.gutter, "aria-hidden": true, children: [_jsx("span", { className: css.lineNo, children: line.oldNo ?? '' }), _jsx("span", { className: css.lineNo, children: line.newNo ?? '' })] }), _jsx("span", { className: css.sign, "aria-hidden": true, children: line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' ' }), _jsx("span", { className: css.text, children: line.text })] }, index)))) })), value?.ok === true && value.value.truncated
                ? _jsx("p", { className: css.note, children: t('git.truncated') })
                : null] }));
}
//# sourceMappingURL=DiffViewer.js.map