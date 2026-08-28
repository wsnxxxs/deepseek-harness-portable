import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The global command palette.
 *
 * Three sources in one list: the workbench's own actions, the Session
 * Controller's task list, and the Host's file-reference index for the current
 * session. The file rows come from `fileReferences/list`, the same index the
 * official composer's `@` mention trigger uses, so the palette needs no
 * workspace crawl of its own.
 * @module @dsh-portable/dcode-ui/client/shell/CommandPalette
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconCordisPluginOutline14, IconFolderOpenOutline16, IconNewChatOutline16, IconPanelLeftOutline16, IconSearchOutline16, IconSettingsOutline16, IconSparkle16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useCurrentSessionId, useSessionList } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { THEME_PREFERENCES } from "../theme.js";
import { commandShortcut } from "../platform.js";
import css from './CommandPalette.module.css';
/** Locale key per theme preference, for the palette's three theme rows. */
const THEME_LABEL = {
    light: 'theme.light',
    dark: 'theme.dark',
    system: 'theme.system',
};
/** Case-insensitive subsequence match, the conventional palette filter. */
export function fuzzyMatch(query, candidate) {
    if (query === '')
        return true;
    const haystack = candidate.toLowerCase();
    const needle = query.toLowerCase();
    let index = 0;
    for (const character of needle) {
        if (character === ' ')
            continue;
        index = haystack.indexOf(character, index);
        if (index === -1)
            return false;
        index += 1;
    }
    return true;
}
/** Actions, tasks and files behind one search field. */
export function CommandPalette({ navigation, onNewTask, onOpenWorkspace }) {
    const runtime = useRuntime();
    const t = useT();
    const list = useSessionList();
    const sessionId = useCurrentSessionId();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [active, setActive] = useState(0);
    const [files, setFiles] = useState([]);
    const inputRef = useRef(null);
    useEffect(() => { inputRef.current?.focus(); }, []);
    // File candidates come from the Host index, re-queried as the operator types.
    useEffect(() => {
        if (sessionId === undefined || query.trim() === '') {
            setFiles([]);
            return undefined;
        }
        const controller = new AbortController();
        let live = true;
        void runtime.remote.fileReferences.list(sessionId, query.trim(), controller.signal).then((result) => {
            if (!live || !result.ok)
                return;
            setFiles(result.value.map(candidate => ({
                path: candidate.path
                    ?? candidate.value ?? '',
                label: candidate.label,
            })).filter(row => row.path !== ''));
        }).catch(() => {
            // A superseded or unsupported reference query leaves the file group empty.
        });
        return () => {
            live = false;
            controller.abort();
        };
    }, [runtime, sessionId, query]);
    const actions = useMemo(() => [
        {
            id: 'new-task',
            kind: 'action',
            group: t('palette.suggested'),
            label: t('nav.newTask'),
            icon: _jsx(IconNewChatOutline16, {}),
            shortcut: commandShortcut('N'),
            run: onNewTask,
        },
        {
            id: 'open-workspace',
            kind: 'action',
            group: t('palette.suggested'),
            label: t('nav.openWorkspace'),
            icon: _jsx(IconFolderOpenOutline16, {}),
            shortcut: commandShortcut('O'),
            run: onOpenWorkspace,
        },
        {
            id: 'settings',
            kind: 'action',
            group: t('palette.suggested'),
            label: t('nav.settings'),
            icon: _jsx(IconSettingsOutline16, {}),
            run: () => { navigation.openSettings('general'); },
        },
        {
            id: 'toggle-rail',
            kind: 'action',
            group: t('palette.panels'),
            label: t('nav.collapse'),
            icon: _jsx(IconPanelLeftOutline16, {}),
            shortcut: commandShortcut('B'),
            run: () => { navigation.toggleRail(); },
        },
        {
            id: 'toggle-aside',
            kind: 'action',
            group: t('palette.panels'),
            label: t('top.toggleAside'),
            icon: _jsx(IconPanelLeftOutline16, {}),
            run: () => { navigation.toggleAside(); },
        },
        {
            id: 'changes',
            kind: 'action',
            group: t('palette.panels'),
            label: t('git.changes'),
            run: () => { navigation.openAside('changes'); },
        },
        {
            id: 'goal',
            kind: 'action',
            group: t('palette.panels'),
            label: t('goal.title'),
            run: () => { navigation.openAside('goal'); },
        },
        {
            id: 'learning',
            kind: 'action',
            group: t('palette.configuration'),
            label: t('nav.learning'),
            icon: _jsx(IconSparkle16, {}),
            run: () => { navigation.show('learning'); },
        },
        {
            id: 'plugins',
            kind: 'action',
            group: t('palette.configuration'),
            label: t('settings.plugins'),
            icon: _jsx(IconCordisPluginOutline14, { size: 16 }),
            run: () => { navigation.openSettings('plugins'); },
        },
        {
            id: 'models',
            kind: 'action',
            group: t('palette.configuration'),
            label: t('settings.models'),
            run: () => { navigation.openSettings('models'); },
        },
        {
            id: 'usage',
            kind: 'action',
            group: t('palette.configuration'),
            label: t('settings.usage'),
            run: () => { navigation.openSettings('usage'); },
        },
        {
            id: 'official-ui',
            kind: 'action',
            group: t('palette.configuration'),
            label: t('top.officialUi'),
            run: () => { runtime.mode.set('official'); },
        },
        // One row per theme rather than a toggle: the palette is a place to say
        // what you want, not to cycle until you land on it.
        ...THEME_PREFERENCES.map(preference => ({
            id: `theme-${preference}`,
            kind: 'action',
            group: t('palette.configuration'),
            label: `${t('theme.toggle')}: ${t(THEME_LABEL[preference])}`,
            run: () => { runtime.appearance.set(preference); },
        })),
    ], [t, navigation, runtime, onNewTask, onOpenWorkspace]);
    const rows = useMemo(() => {
        const tasks = list.ids
            .map(id => list.byId[id])
            .filter((summary) => summary !== undefined && !summary.blank)
            .slice(0, 60)
            .map(summary => ({
            id: `task:${summary.id}`,
            kind: 'task',
            group: t('palette.tasks'),
            label: summary.displayTitle,
            detail: summary.cwd,
            run: () => {
                navigation.show('session');
                runtime.sessions.open(summary.id);
            },
        }));
        const fileRows = files.slice(0, 40).map(file => ({
            id: `file:${file.path}`,
            kind: 'file',
            group: t('palette.files'),
            label: file.label ?? file.path,
            detail: file.path,
            run: () => { navigation.openDiff(file.path); },
        }));
        const all = [...actions, ...tasks, ...fileRows];
        const matching = all.filter(row => (filter === 'all' || row.kind === filter)
            && (fuzzyMatch(query, row.label) || (row.detail !== undefined && fuzzyMatch(query, row.detail))));
        return matching;
    }, [actions, list, files, filter, query, t, navigation, runtime]);
    useEffect(() => { setActive(0); }, [query, filter]);
    const choose = useCallback((row) => {
        if (row === undefined)
            return;
        navigation.togglePalette(false);
        row.run();
    }, [navigation]);
    const onKeyDown = useCallback((event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive(index => Math.min(index + 1, rows.length - 1));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive(index => Math.max(index - 1, 0));
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            choose(rows[active]);
        }
    }, [rows, active, choose]);
    const filters = [
        { id: 'all', label: t('palette.all') },
        { id: 'action', label: t('palette.actions') },
        { id: 'task', label: t('palette.tasks') },
        { id: 'file', label: t('palette.files') },
    ];
    let lastGroup;
    return (_jsx("div", { className: css.backdrop, role: "presentation", onPointerDown: (event) => {
            if (event.target === event.currentTarget)
                navigation.togglePalette(false);
        }, children: _jsxs("div", { className: css.panel, role: "dialog", "aria-modal": "true", "aria-label": t('nav.commandPalette'), children: [_jsxs("div", { className: css.search, children: [_jsx(IconSearchOutline16, {}), _jsx("input", { ref: inputRef, className: css.input, value: query, placeholder: t('palette.placeholder'), onChange: event => { setQuery(event.target.value); }, onKeyDown: onKeyDown })] }), _jsx("div", { className: css.filters, children: filters.map(entry => (_jsx("button", { type: "button", className: `${css.filter} ${filter === entry.id ? css.filterActive : ''}`, onClick: () => { setFilter(entry.id); }, children: entry.label }, entry.id))) }), _jsxs("div", { className: css.list, children: [rows.length === 0 ? _jsx("div", { className: css.empty, children: t('palette.empty') }) : null, rows.map((row, index) => {
                            const heading = row.group === lastGroup ? null : _jsx("div", { className: css.group, children: row.group }, `g:${row.group}`);
                            lastGroup = row.group;
                            return (_jsxs("div", { children: [heading, _jsxs("button", { type: "button", className: `${css.row} ${index === active ? css.rowActive : ''}`, onPointerEnter: () => { setActive(index); }, onClick: () => { choose(row); }, children: [row.icon, _jsx("span", { className: css.rowLabel, children: row.label }), row.detail === undefined ? null : _jsx("span", { className: css.rowDetail, children: row.detail }), row.shortcut === undefined ? null : _jsx("span", { className: css.shortcut, children: row.shortcut })] })] }, row.id));
                        })] })] }) }));
}
//# sourceMappingURL=CommandPalette.js.map