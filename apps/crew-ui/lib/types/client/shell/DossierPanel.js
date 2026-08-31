import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The mission dossier panel.
 *
 * This is where the loop closes. A board task says what to do; the brief says
 * how far the mission has got; the dossier says what the crew is working FROM.
 * Attaching a spec here is what makes `dossier_search` answer, and every answer
 * carries an anchor that opens the passage it came from.
 *
 * Two things are shown that a document list normally hides, and both are the
 * reason to trust the answers:
 *
 * - what the parser could NOT read, per source, in words;
 * - the passage behind a search hit, so a citation can be checked rather than
 *   taken on faith.
 *
 * Attaching is an operator action by design: no model-facing tool can put a
 * file into a space, which is what makes the space's contents knowable.
 * @module @dsh-portable/crew-ui/client/shell/DossierPanel
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRuntime } from "../state/runtime.js";
import css from './DossierPanel.module.css';
/** The attached-sources panel. */
export function DossierPanel({ cwd }) {
    const runtime = useRuntime();
    const { t } = runtime;
    const [sources, setSources] = useState(undefined);
    const [passages, setPassages] = useState([]);
    const [query, setQuery] = useState('');
    const [path, setPath] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(undefined);
    // A superseded answer must not repaint a panel that has moved on to another
    // mission, so every read carries the cwd it was made for.
    const cwdRef = useRef(cwd);
    cwdRef.current = cwd;
    const load = useCallback(async () => {
        const target = cwdRef.current;
        const result = await runtime.dossier('summary', { cwd: target });
        if (cwdRef.current !== target)
            return;
        if (!result.ok) {
            // Leave `sources` undefined and let the render treat "errored" as its own
            // state. Showing the loading notice next to a failure is what makes a
            // dead channel look like a slow one, and the operator has no way to ask
            // again from a notice.
            setError(`${result.error.message} (${result.error.code})`);
            return;
        }
        setError(undefined);
        setSources(result.value.sources);
    }, [runtime]);
    useEffect(() => {
        setSources(undefined);
        setPassages([]);
        setError(undefined);
        void load();
    }, [cwd, load]);
    const attach = async () => {
        const file = path.trim();
        if (file === '')
            return;
        setBusy(true);
        try {
            const result = await runtime.dossier('attach', { cwd: cwdRef.current, path: file });
            if (!result.ok) {
                setError(`${result.error.message} (${result.error.code})`);
                return;
            }
            setPath('');
            await load();
        }
        finally {
            setBusy(false);
        }
    };
    const search = async () => {
        const text = query.trim();
        if (text === '') {
            setPassages([]);
            return;
        }
        setBusy(true);
        try {
            const target = cwdRef.current;
            const result = await runtime.dossier('search', { cwd: target, query: text });
            if (cwdRef.current !== target)
                return;
            if (!result.ok) {
                setError(`${result.error.message} (${result.error.code})`);
                return;
            }
            setError(undefined);
            setPassages(result.value.passages);
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("section", { className: css.root, "aria-label": t('dossier.title'), children: [_jsx("header", { className: css.head, children: _jsx("h2", { className: css.title, children: t('dossier.title') }) }), error !== undefined
                ? (_jsxs("div", { className: css.error, role: "alert", children: [_jsx("span", { children: error }), _jsx("button", { type: "button", disabled: busy, onClick: () => { setError(undefined); void load(); }, children: t('dossier.retry') })] }))
                : null, _jsxs("div", { className: css.attach, children: [_jsx("input", { className: css.input, value: path, placeholder: t('dossier.attachPlaceholder'), disabled: busy || cwd === undefined, onChange: (event) => { setPath(event.target.value); }, onKeyDown: (event) => { if (event.key === 'Enter')
                            void attach(); } }), _jsx("button", { type: "button", disabled: busy || path.trim() === '' || cwd === undefined, onClick: () => { void attach(); }, children: t('dossier.attach') })] }), _jsxs("div", { className: css.attach, children: [_jsx("input", { className: css.input, value: query, placeholder: t('dossier.searchPlaceholder'), disabled: busy, onChange: (event) => { setQuery(event.target.value); }, onKeyDown: (event) => { if (event.key === 'Enter')
                            void search(); } }), _jsx("button", { type: "button", disabled: busy, onClick: () => { void search(); }, children: t('dossier.search') })] }), passages.length > 0
                ? (_jsx("ul", { className: css.hits, children: passages.map(passage => (_jsxs("li", { className: css.hit, children: [_jsx("p", { className: css.anchor, children: passage.anchor }), _jsx("p", { className: css.excerpt, children: passage.text })] }, passage.anchor + passage.text.slice(0, 24)))) }))
                : null, sources === undefined
                ? (error === undefined ? _jsx("p", { className: css.notice, children: t('dossier.loading') }) : null)
                : sources.length === 0
                    ? (_jsxs("div", { className: css.empty, children: [_jsx("p", { className: css.emptyTitle, children: t('dossier.empty') }), _jsx("p", { className: css.emptyBody, children: t('dossier.emptyBody') })] }))
                    : (_jsx("ul", { className: css.sources, children: sources.map(source => (_jsxs("li", { className: css.source, children: [_jsx("p", { className: css.sourceTitle, children: source.title }), _jsx("p", { className: css.sourceMeta, children: t('dossier.sections', { count: source.sections }) }), source.unread.map(gap => (_jsx("p", { className: css.unread, children: gap }, gap)))] }, source.sourceId))) }))] }));
}
//# sourceMappingURL=DossierPanel.js.map