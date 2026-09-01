import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Plugins as a first-class modal surface.
 *
 * The sidebar's plugin entry lands here rather than in a settings tab,
 * because installing and managing plugins is a task with its own catalogue,
 * its own long-running jobs and its own safety gate — not a preference.
 *
 * Three sections, one subject: the marketplace catalogue, the profile's own
 * inventory, and the settings of the plugins that ship with the harness. The
 * first two are the marketplace Host plugin's `/api/market` routes; the third
 * is the settings registry the classic surface writes, rendered by the same
 * component the settings surface uses. Nothing here is a second copy of
 * either.
 *
 * The marketplace Host is optional. When it is not running, the two
 * marketplace sections explain that rather than failing, and the settings
 * section — which does not depend on it — keeps working.
 * @module @dsh-portable/dcode-ui/client/plugins/PluginsHome
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { IconCloseOutline16, IconCordisPluginOutline14, IconDownloadOutline16, IconSettingsOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { Button, EmptyState, ui } from "../shell/ui.js";
import { useModalFocus } from "../shell/use-modal-focus.js";
import { PluginSettingsSection } from "../settings/PluginSettingsSection.js";
import { createMarketClient } from "./market.js";
import { MarketSection } from "./MarketSection.js";
import { InstalledSection } from "./InstalledSection.js";
import { useOperations } from "./useJob.js";
import css from './PluginsHome.module.css';
const INITIAL_INVENTORY = {
    snapshot: undefined,
    loading: true,
    error: undefined,
    unavailable: false,
};
/**
 * Read the profile inventory, shared by every section that needs it.
 *
 * One read serves the inventory list, the marketplace's self-update banner
 * and the rail's counts, and every mutating verb reloads through the same
 * entry — so the surface never shows two disagreeing answers about what is
 * installed.
 * @param client - the marketplace client.
 * @returns the inventory, and the verb that re-reads it.
 */
function useInventory(client) {
    const [state, setState] = useState(INITIAL_INVENTORY);
    const [nonce, setNonce] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setState(previous => ({ ...previous, loading: true }));
        void client.installed(controller.signal)
            .then((answer) => {
            if (controller.signal.aborted)
                return;
            setState(answer.ok
                ? { snapshot: answer.value, loading: false, error: undefined, unavailable: false }
                : {
                    snapshot: undefined,
                    loading: false,
                    error: answer.error,
                    unavailable: answer.unavailable,
                });
        })
            .catch((cause) => {
            if (controller.signal.aborted)
                return;
            setState(previous => ({
                ...previous,
                loading: false,
                error: cause instanceof Error ? cause.message : String(cause),
            }));
        });
        return () => { controller.abort(); };
    }, [client, nonce]);
    const reload = useCallback(() => { setNonce(value => value + 1); }, []);
    return { ...state, reload };
}
/**
 * The marketplace's own update notice.
 *
 * It updates itself through the same job endpoint every other plugin uses, so
 * the banner is the ordinary operation UI narrowed to one row.
 * @param props - the inventory and its reload verb.
 * @returns the banner, or null while the marketplace is current.
 */
function SelfUpdateBanner(props) {
    const t = useT();
    const { operations, start } = useOperations(props.client);
    const self = props.inventory.snapshot?.self;
    if (self === undefined || !self.updateAvailable)
        return null;
    const operation = operations[self.name];
    const running = operation?.status === 'running';
    return (_jsxs("div", { className: css.banner, role: "status", children: [_jsx("span", { className: css.bannerText, children: t('plugins.selfUpdate', {
                    current: self.version ?? '?',
                    latest: self.latestVersion ?? '?',
                }) }), operation?.status === 'done'
                ? _jsx("span", { className: css.statusOk, children: t('plugins.selfUpdateDone') })
                : (_jsx(Button, { primary: true, disabled: running, onClick: () => { start(self.name, () => props.client.update(self.name), props.onReload); }, children: t(running ? 'plugins.updating' : 'plugins.selfUpdateAction') })), operation?.status === 'failed'
                ? (_jsx("span", { className: css.statusError, children: t('plugins.actionFailed', { error: operation.error ?? '' }) }))
                : null] }));
}
const RAIL = [
    { id: 'market', label: 'plugins.section.market', icon: _jsx(IconDownloadOutline16, {}) },
    { id: 'installed', label: 'plugins.section.installed', icon: _jsx(IconCordisPluginOutline14, { size: 16 }), group: 'plugins.group.manage' },
    { id: 'settings', label: 'plugins.section.settings', icon: _jsx(IconSettingsOutline16, {}) },
];
/** The marketplace, the profile inventory, and the built-in plugin settings. */
export function PluginsHome({ navigation }) {
    const runtime = useRuntime();
    const t = useT();
    const [section, setSection] = useState('market');
    const panelRef = useRef(null);
    const closeRef = useRef(null);
    const client = useMemo(() => createMarketClient(), []);
    const inventory = useInventory(client);
    const close = useCallback(() => { navigation.show('session'); }, [navigation]);
    useModalFocus(true, panelRef, { initialFocusRef: closeRef, onClose: close });
    const locale = useSyncExternalStore(runtime.locale.subscribe, runtime.locale.getSnapshot, runtime.locale.getSnapshot);
    // Portable's review notes are written per locale rather than translated, so
    // the surface only has to pick which of the two shipped languages to read.
    const auditLocale = locale.active.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const installedCount = inventory.snapshot?.plugins.length;
    const marketplaceMissing = inventory.unavailable;
    return (_jsxs("div", { className: css.overlay, role: "presentation", children: [_jsx("div", { className: css.mask, "aria-hidden": "true", onClick: close }), _jsx("div", { ref: panelRef, className: css.panel, role: "dialog", "aria-modal": "true", "aria-labelledby": "dcode-plugins-dialog-title", tabIndex: -1, children: _jsxs("div", { className: css.surface, children: [_jsxs("nav", { className: css.rail, "aria-label": t('plugins.title'), children: [_jsx("h1", { className: css.railTitle, id: "dcode-plugins-dialog-title", children: t('plugins.title') }), _jsx("div", { className: css.navList, children: RAIL.map(entry => (_jsxs("div", { children: [entry.group === undefined ? null : _jsx("div", { className: css.railGroup, children: t(entry.group) }), _jsxs("button", { type: "button", className: `${css.railItem} ${section === entry.id ? css.railItemActive : ''}`, "aria-current": section === entry.id ? 'page' : undefined, onClick: () => { setSection(entry.id); }, children: [entry.icon, _jsx("span", { className: ui.grow, children: t(entry.label) }), entry.id === 'installed' && installedCount !== undefined && installedCount > 0
                                                        ? _jsx("span", { className: css.railCount, children: installedCount })
                                                        : null] })] }, entry.id))) })] }), _jsxs("main", { className: css.content, children: [_jsxs("header", { className: css.header, children: [_jsx("h2", { className: css.headerTitle, children: t('plugins.title') }), _jsx("button", { ref: closeRef, type: "button", className: css.close, onClick: close, "aria-label": t('common.close'), children: _jsx(IconCloseOutline16, { size: 14 }) })] }), _jsx("div", { className: css.body, children: _jsx("div", { className: css.inner, children: section === 'settings'
                                            ? _jsx(PluginSettingsSection, {})
                                            : marketplaceMissing
                                                ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: css.title, children: t('plugins.title') }), _jsx("p", { className: css.subtitle, children: t('plugins.subtitle') })] }), _jsxs(EmptyState, { children: [t('plugins.unavailable'), _jsx("span", { className: css.note, children: t('plugins.unavailableBody') }), _jsx(Button, { onClick: () => { setSection('settings'); }, children: t('plugins.section.settings') })] })] }))
                                                : (_jsxs(_Fragment, { children: [_jsx(SelfUpdateBanner, { client: client, inventory: inventory, onReload: inventory.reload }), section === 'market'
                                                            ? (_jsx(MarketSection, { client: client, locale: auditLocale, onInstalled: inventory.reload }))
                                                            : (_jsx(InstalledSection, { client: client, snapshot: inventory.snapshot, loading: inventory.loading, error: inventory.error, onReload: inventory.reload, onBrowse: () => { setSection('market'); } }))] })) }) })] })] }) })] }));
}
//# sourceMappingURL=PluginsHome.js.map