import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The top bar: what is being worked on, where, and on which branch — plus the
 * command entry and the two panel toggles.
 *
 * Every value is read live: the title comes from the Session Controller's
 * display title, the workspace from the durable registry, and the branch from
 * the same git read the Changes panel uses.
 * @module @dsh-portable/dcode-ui/client/shell/TopBar
 */
import { useMemo } from 'react';
import { IconBranchOutline16, IconDarkOutline16, IconEllipsisOutline16, IconFolderOpenOutline16, IconLightOutline16, IconPanelLeftOutline16, IconSearchOutline16, IconSettingsOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useSessionList, useWorkspaceGroups } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { useGitStatus } from "../git/useGit.js";
import { IconButton, Popover, ui } from "./ui.js";
import { themeMenuRows, useAppearance } from "./ThemeSwitch.js";
import css from './TopBar.module.css';
/** Task, workspace, branch and the surface controls. */
export function TopBar({ navigation, sessionId, cwd }) {
    const runtime = useRuntime();
    const t = useT();
    const state = useNavigation(navigation);
    const list = useSessionList();
    const { groups } = useWorkspaceGroups();
    const git = useGitStatus(cwd, sessionId);
    const appearance = useAppearance();
    const title = sessionId === undefined ? undefined : list.byId[sessionId]?.displayTitle;
    const workspace = useMemo(() => groups.find(group => group.path === cwd) ?? groups.find(group => group.sessions.some(row => row.id === sessionId)), [groups, cwd, sessionId]);
    const dirty = (git.status?.files.length ?? 0) > 0;
    // While the first read is outstanding the chip shows nothing rather than
    // asserting "not a repository" about a directory it has not looked at yet.
    const branchLabel = git.pending
        ? undefined
        : git.status?.repository === true
            ? (git.status.branch ?? (git.status.detached ? 'HEAD' : t('top.branch')))
            : t('top.noRepository');
    return (_jsxs("header", { className: css.bar, children: [_jsx(IconButton, { label: state.railOpen ? t('nav.collapse') : t('nav.expand'), active: state.railOpen, onClick: () => { navigation.toggleRail(); }, children: _jsx(IconPanelLeftOutline16, {}) }), _jsx("span", { className: `${css.title} ${title === undefined ? css.titleMuted : ''}`, title: title, children: title ?? t('top.noSession') }), workspace === undefined
                ? null
                : (_jsxs("button", { type: "button", className: css.chip, title: workspace.path, onClick: () => { runtime.navigation?.startSession(workspace.workspaceId); }, children: [_jsx(IconFolderOpenOutline16, {}), _jsx("span", { className: css.chipLabel, children: workspace.title })] })), cwd === undefined || branchLabel === undefined
                ? null
                : (_jsxs("button", { type: "button", className: `${css.chip} ${dirty ? css.dirty : ''}`, title: branchLabel, onClick: () => { navigation.openAside('changes'); }, children: [_jsx(IconBranchOutline16, {}), _jsx("span", { className: css.chipLabel, children: branchLabel })] })), _jsx("span", { className: css.divider, "aria-hidden": true }), _jsx(IconButton, { label: t('nav.commandPalette'), onClick: () => { navigation.togglePalette(true); }, children: _jsx(IconSearchOutline16, {}) }), _jsx(Popover, { label: t('theme.toggle'), placement: "down", align: "end", disabled: !appearance.canSet, trigger: (_jsx("span", { className: css.themeGlyph, "aria-hidden": true, children: appearance.scheme === 'dark' ? _jsx(IconDarkOutline16, {}) : _jsx(IconLightOutline16, {}) })), rows: themeMenuRows(t, appearance.preference, appearance.set) }), _jsx(IconButton, { label: t('nav.settings'), onClick: () => { navigation.openSettings('general'); }, children: _jsx(IconSettingsOutline16, {}) }), _jsx(IconButton, { label: t('top.toggleAside'), active: state.asideOpen, onClick: () => { navigation.toggleAside(); }, children: _jsx(IconPanelLeftOutline16, { className: ui.mirrored }) }), _jsx(Popover, { label: t('top.moreActions'), placement: "down", align: "end", trigger: _jsx(IconEllipsisOutline16, {}), rows: [
                    { id: 'settings', label: t('nav.settings'), onSelect: () => { navigation.openSettings('general'); } },
                    {
                        id: 'official',
                        label: t('top.officialUi'),
                        detail: t('settings.modeOfficialBody'),
                        onSelect: () => { runtime.mode.set('official'); },
                    },
                ] })] }));
}
//# sourceMappingURL=TopBar.js.map