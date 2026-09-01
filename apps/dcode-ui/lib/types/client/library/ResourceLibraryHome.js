import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * DCode's resource-library launcher.
 *
 * The library content and its settings-style dialog belong to the Interactive
 * Learning client package. DCode only supplies its own workspace/session
 * candidates and the small hand-off actions needed when a person has not
 * opened a resource space yet. The official DSH sidebar entry uses the same
 * dialog and the same VaultLibrary underneath it.
 * @module @dsh-portable/dcode-ui/client/library/ResourceLibraryHome
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { VaultLibraryDialog, } from '@dsh-portable/interactive-learning/client';
import { useRuntime } from "../state/runtime.js";
import { useSessionList, useWorkspaces } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import css from './ResourceLibraryHome.module.css';
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
function rosterFrom(answer) {
    const outer = record(answer);
    if (outer?.ok !== true) {
        const error = record(outer?.error);
        throw new Error(typeof error?.message === 'string' ? error.message : 'resource roster unavailable');
    }
    const value = record(outer.value);
    if (value === undefined || !Array.isArray(value.vaults)) {
        throw new Error('resource roster returned an invalid response');
    }
    const vaults = value.vaults.filter((item) => {
        const space = record(item);
        return typeof space?.cwd === 'string'
            && typeof space.title === 'string'
            && typeof space.root === 'string'
            && typeof space.sources === 'number'
            && typeof space.concepts === 'number'
            && typeof space.notes === 'number'
            && typeof space.due === 'number'
            && typeof space.blocked === 'number';
    });
    return { vaults };
}
/** Candidate folders are supplied by the client so the Host never enumerates unrelated directories. */
export function resourceCandidates(cwd, workspacePaths, sessionCwds) {
    const result = [];
    const seen = new Set();
    const add = (path) => {
        if (path === undefined || path.trim() === '' || seen.has(path))
            return;
        seen.add(path);
        result.push(path);
    };
    add(cwd);
    for (const path of workspacePaths)
        add(path);
    for (const path of sessionCwds)
        add(path);
    return result.slice(0, 24);
}
/** Keep this projection exported for consumers that used the former overview. */
export function resourceTotals(spaces) {
    return spaces.reduce((totals, space) => ({
        sources: totals.sources + space.sources,
        notes: totals.notes + space.notes,
        concepts: totals.concepts + space.concepts,
        due: totals.due + space.due,
    }), { sources: 0, notes: 0, concepts: 0, due: 0 });
}
function StatusContent({ title, body, busy = false, action, primary = false, }) {
    return (_jsxs("div", { className: css.status, role: busy ? 'status' : undefined, "aria-busy": busy || undefined, children: [title !== undefined && _jsx("p", { className: css.statusTitle, children: title }), body !== undefined && _jsx("p", { className: css.statusBody, children: body }), action !== undefined && (_jsx("div", { className: css.statusActions, children: _jsx("button", { type: "button", className: `${css.statusAction} ${primary ? css.statusActionPrimary : ''}`, disabled: action.disabled, onClick: action.onClick, children: action.label }) }))] }));
}
/** Open an existing task in a space, or create a task under that workspace. */
function useOpenSpaceSession({ navigation, runtime, list, workspaces, cwd, sessionId, selectedCwd, }) {
    return useCallback((space) => {
        const targetCwd = space?.cwd ?? selectedCwd ?? cwd ?? workspaces.items[0]?.path;
        const current = sessionId === undefined ? undefined : list.byId[sessionId];
        if (current?.cwd === targetCwd) {
            runtime.sessions.open(current.id);
            navigation.show('session');
            return true;
        }
        const existing = list.ids
            .map(id => list.byId[id])
            .find(summary => summary?.cwd === targetCwd);
        if (existing !== undefined) {
            runtime.sessions.open(existing.id);
            navigation.show('session');
            return true;
        }
        const workspace = workspaces.items.find(item => item.path === targetCwd);
        if (workspace !== undefined && runtime.navigation !== undefined) {
            navigation.show('session');
            runtime.navigation.startSession(workspace.workspaceId);
            return true;
        }
        if (sessionId !== undefined) {
            runtime.sessions.open(sessionId);
            navigation.show('session');
            return true;
        }
        return false;
    }, [cwd, list.byId, list.ids, navigation, runtime, selectedCwd, sessionId, workspaces.items]);
}
/** The shared home for the official and DCode library content. */
export function ResourceLibraryHome({ navigation, cwd, sessionId, onOpenWorkspace }) {
    const runtime = useRuntime();
    const t = useT();
    const list = useSessionList();
    const workspaces = useWorkspaces();
    const [selectedCwd, setSelectedCwd] = useState(cwd);
    const [reloads, setReloads] = useState(0);
    const [roster, setRoster] = useState({ phase: 'loading', spaces: [] });
    const candidates = useMemo(() => resourceCandidates(cwd, workspaces.items.map(item => item.path), list.ids.map(id => list.byId[id]?.cwd)), [cwd, list.byId, list.ids, workspaces.items]);
    const candidateKey = candidates.join('|');
    useEffect(() => {
        if (candidates.length === 0) {
            setRoster({ phase: 'ready', spaces: [] });
            return;
        }
        let cancelled = false;
        setRoster(previous => ({ ...previous, phase: 'loading', error: undefined }));
        void runtime.learningCall('vault/roster', { cwds: candidates })
            .then(answer => {
            if (cancelled)
                return;
            setRoster({ phase: 'ready', spaces: rosterFrom(answer).vaults });
        })
            .catch((cause) => {
            if (cancelled)
                return;
            setRoster({
                phase: 'error',
                spaces: [],
                error: cause instanceof Error ? cause.message : String(cause),
            });
        });
        return () => { cancelled = true; };
    }, [candidateKey, candidates, reloads, runtime.learningCall]);
    const spaces = roster.spaces;
    const selectedSpace = spaces.find(space => space.cwd === selectedCwd)
        ?? spaces.find(space => space.cwd === cwd)
        ?? spaces[0];
    useEffect(() => {
        setSelectedCwd(current => spaces.some(space => space.cwd === current)
            ? current
            : spaces.find(space => space.cwd === cwd)?.cwd
                ?? spaces[0]?.cwd
                ?? cwd);
    }, [cwd, spaces]);
    const openSpaceSession = useOpenSpaceSession({
        navigation, runtime, list, workspaces, cwd, sessionId, selectedCwd,
    });
    const openMaterialIntake = useCallback(() => {
        if (openSpaceSession(selectedSpace))
            return;
        onOpenWorkspace?.();
    }, [onOpenWorkspace, openSpaceSession, selectedSpace]);
    const close = useCallback(() => { navigation.show('session'); }, [navigation]);
    const canOpenWorkspace = runtime.navigation !== undefined || onOpenWorkspace !== undefined;
    const dialogContent = roster.phase === 'loading'
        ? _jsx(StatusContent, { body: t('library.loading'), busy: true })
        : roster.phase === 'error'
            ? (_jsx(StatusContent, { title: t('library.loadFailed'), body: t('library.loadFailedBody'), action: { label: t('library.retry'), onClick: () => { setReloads(value => value + 1); } } }))
            : spaces.length === 0
                ? (_jsx(StatusContent, { title: t('library.emptyTitle'), body: t('library.emptyBody'), action: { label: t('library.addMaterial'), onClick: openMaterialIntake, disabled: !canOpenWorkspace }, primary: true }))
                : undefined;
    return (_jsx(VaultLibraryDialog, { open: true, title: t('library.title'), topics: spaces, selectedCwd: selectedSpace?.cwd, call: selectedSpace === undefined ? undefined : runtime.learningCall, t: runtime.learningT, onSelectCwd: (next) => { setSelectedCwd(next); }, onClose: close, content: dialogContent }));
}
//# sourceMappingURL=ResourceLibraryHome.js.map