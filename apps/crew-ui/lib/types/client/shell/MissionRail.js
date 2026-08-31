import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The Metis-style conversation rail.
 *
 * Mission summaries remain the source of truth, while the presentation adds
 * the search, new-chat and settings affordances that make the rail feel like a
 * persistent workspace rather than a board index.
 * @module @dsh-portable/crew-ui/client/shell/MissionRail
 */
import { useMemo, useState, useSyncExternalStore } from 'react';
import { IconFolderOpen16, IconNewChatOutline16, IconPanelLeftOutline16, IconPlusOutline16, IconSearchOutline16, IconSettingsOutline16, IconSparkle16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import css from './MissionRail.module.css';
/** The left conversation rail. */
export function MissionRail({ collapsed, currentSessionId, onSelect, onNewMission, onOpenWorkspace, onCollapse, onOpenSettings, }) {
    const runtime = useRuntime();
    const { t } = runtime;
    const [query, setQuery] = useState('');
    const list = useSyncExternalStore(runtime.sessions.list.subscribe, runtime.sessions.list.getSnapshot, runtime.sessions.list.getSnapshot);
    const missions = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase();
        return list.ids
            .map((id) => list.byId[id])
            .filter((summary) => summary !== undefined)
            // A teammate belongs to its mission's Inspector, not beside it. A blank
            // session is shown only while it is current, matching the official rail.
            .filter(summary => summary.origin !== 'subagent' && (!summary.blank || summary.id === currentSessionId))
            .map(summary => ({
            id: summary.id,
            title: summary.displayTitle !== '' ? summary.displayTitle : t('nav.untitled'),
        }))
            .filter(mission => needle === '' || mission.title.toLocaleLowerCase().includes(needle));
    }, [currentSessionId, list, query, t]);
    if (collapsed) {
        return (_jsx("nav", { className: `${css.root} ${css.collapsed}`, "aria-label": t('nav.missions'), children: _jsx("button", { type: "button", className: css.compactAction, title: t('nav.newMission'), "aria-label": t('nav.newMission'), onClick: onNewMission, children: _jsx(IconNewChatOutline16, {}) }) }));
    }
    return (_jsxs("nav", { className: css.root, "aria-label": t('nav.missions'), children: [_jsxs("header", { className: css.head, children: [_jsx("button", { type: "button", className: css.iconButton, title: t('nav.collapse'), "aria-label": t('nav.collapse'), onClick: onCollapse, children: _jsx(IconPanelLeftOutline16, {}) }), _jsxs("span", { className: css.brand, children: [_jsx(IconSparkle16, {}), _jsx("span", { children: t('app.title') })] }), _jsx("button", { type: "button", className: css.iconButton, title: t('nav.newMission'), "aria-label": t('nav.newMission'), onClick: onNewMission, children: _jsx(IconNewChatOutline16, {}) })] }), _jsxs("label", { className: css.search, children: [_jsx(IconSearchOutline16, {}), _jsx("input", { value: query, placeholder: t('nav.searchPlaceholder'), "aria-label": t('nav.searchPlaceholder'), onChange: (event) => { setQuery(event.target.value); } })] }), _jsxs("div", { className: css.sectionHead, children: [_jsx("span", { children: t('nav.missions') }), _jsx("button", { type: "button", className: css.sectionAction, title: t('nav.openWorkspace'), "aria-label": t('nav.openWorkspace'), onClick: onOpenWorkspace, children: _jsx(IconPlusOutline16, {}) })] }), _jsx("ul", { className: css.list, children: missions.map(mission => (_jsx("li", { children: _jsxs("button", { type: "button", className: `${css.row} ${mission.id === currentSessionId ? css.rowActive : ''}`, "aria-current": mission.id === currentSessionId ? 'true' : undefined, onClick: () => { onSelect(mission.id); }, children: [_jsx("span", { className: css.rowIcon, "aria-hidden": true, children: _jsx(IconSparkle16, {}) }), _jsx("span", { className: css.rowTitle, children: mission.title })] }) }, mission.id))) }), missions.length === 0
                ? (_jsxs("div", { className: css.empty, children: [_jsx("p", { className: css.emptyTitle, children: query.trim() === '' ? t('nav.noMissions') : t('nav.noSearchResults') }), _jsx("p", { className: css.emptyBody, children: query.trim() === '' ? t('nav.noMissionsBody') : t('nav.noSearchResultsBody') }), query.trim() === ''
                            ? (_jsxs("button", { type: "button", className: css.workspaceAction, onClick: onOpenWorkspace, children: [_jsx(IconFolderOpen16, {}), _jsx("span", { children: t('nav.openWorkspace') })] }))
                            : null] }))
                : null, _jsxs("footer", { className: css.footer, children: [_jsxs("button", { type: "button", className: css.footerAction, onClick: onOpenWorkspace, children: [_jsx(IconFolderOpen16, {}), _jsx("span", { children: t('nav.openWorkspace') })] }), _jsxs("button", { type: "button", className: css.footerAction, onClick: onOpenSettings, children: [_jsx(IconSettingsOutline16, {}), _jsx("span", { children: t('settings.title') })] })] })] }));
}
//# sourceMappingURL=MissionRail.js.map