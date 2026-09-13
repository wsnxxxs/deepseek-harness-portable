import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The built-in features page of the official Plugins settings section.
 *
 * It answers the question upstream's read-only inventory cannot: which of this
 * distribution's own feature packages are live, and how do I switch one off.
 * The rows come straight off the running Loader, so a build that ships a new
 * feature lists it here without this component learning its name.
 * @module @dsh-portable/plugin-manager/client/PortablePluginsTab
 */
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './PortablePluginsTab.module.css';
/** The built-in features page. */
export function PortablePluginsTab(props) {
    const { api, t } = props;
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyName, setBusyName] = useState(undefined);
    const [error, setError] = useState(undefined);
    const load = useCallback(async () => {
        setLoading(true);
        const answer = await api.list();
        setLoading(false);
        if (answer.ok) {
            setRows(answer.value.plugins);
            setError(undefined);
            return;
        }
        setError(answer.error.message);
    }, [api]);
    useEffect(() => { void load(); }, [load]);
    const toggle = async (row) => {
        // The switch acts on what the NEXT launch would do, so pressing it twice
        // returns to where it started rather than chasing the live state.
        const target = !(row.pending ?? row.enabled);
        setBusyName(row.name);
        const answer = await api.setEnabled(row.name, target);
        setBusyName(undefined);
        if (!answer.ok) {
            setError(answer.error.message);
            return;
        }
        setError(undefined);
        await load();
    };
    if (!api.available)
        return _jsx("div", { className: css.notice, children: t('unavailable') });
    const pendingCount = rows.filter(row => row.pending !== undefined).length;
    return (_jsxs("section", { className: css.root, children: [_jsxs("div", { className: css.head, children: [_jsx("p", { className: css.lead, children: t('lead') }), _jsx(Button, { size: "sm", disabled: loading, onClick: () => { void load(); }, children: loading ? t('loading') : t('refresh') })] }), loading && rows.length === 0
                ? null
                : rows.length === 0
                    ? _jsx("div", { className: css.empty, children: t('empty') })
                    : (_jsx("ul", { className: css.list, children: rows.map((row) => {
                            const desired = row.pending ?? row.enabled;
                            const busy = busyName === row.name;
                            return (_jsxs("li", { className: css.row, children: [_jsxs("div", { className: css.text, children: [_jsxs("span", { className: css.name, children: [row.name, row.enabled ? null : _jsx("span", { className: css.tag, children: t('off') }), row.pending === undefined
                                                        ? null
                                                        : (_jsx("span", { className: `${css.tag} ${css.pending}`, children: row.pending ? t('pendingOn') : t('pendingOff') }))] }), _jsx("span", { className: css.meta, children: row.version === null ? t('unknownVersion') : t('version', { version: row.version }) }), row.description === null ? null : _jsx("span", { className: css.description, children: row.description })] }), _jsx("div", { className: css.actions, children: _jsx(Button, { size: "sm", disabled: busy, onClick: () => { void toggle(row); }, children: busy ? t('working') : desired ? t('disable') : t('enable') }) })] }, row.name));
                        }) })), error === undefined ? null : _jsx("div", { className: css.error, role: "alert", children: error }), pendingCount === 0 ? null : _jsx("div", { className: css.restart, children: t('restart') })] }));
}
//# sourceMappingURL=PortablePluginsTab.js.map