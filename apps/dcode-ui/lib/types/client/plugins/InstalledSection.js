import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The inventory: update, enable, disable and uninstall what is installed.
 *
 * The rows are the web profile's own manifest as the Host reads it, so this
 * module owns no second list of plugins and no second notion of "enabled".
 * What it does own is the honesty of the report: every one of these verbs
 * edits the profile rather than the running process, so each row carries the
 * lifecycle strip that says whether what is loaded still matches what the
 * profile now says, and the section carries the restart note that explains
 * why a plugin just switched on is still doing nothing.
 * @module @dsh-portable/dcode-ui/client/plugins/InstalledSection
 */
import { useState } from 'react';
import { Button as PrimitiveButton, IconRefreshOutline14, Modal, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "../state/i18n.js";
import { Button, EmptyState, IconButton, Spinner } from "../shell/ui.js";
import { lifecycleSteps, pendingRestart, } from "./market.js";
import { JobOutput, JobProgress } from "./JobProgress.js";
import { useOperations } from "./useJob.js";
import css from './PluginsHome.module.css';
/** Name of each lifecycle stage. */
const STEP_NAME = {
    installed: 'plugins.lifecycle.installed',
    available: 'plugins.lifecycle.available',
    activated: 'plugins.lifecycle.activated',
    exposed: 'plugins.lifecycle.exposed',
};
/** What each stage says, per state it can be in. */
const STEP_BODY = {
    installed: { done: 'plugins.lifecycle.installedBody' },
    available: { done: 'plugins.lifecycle.availableDone', off: 'plugins.lifecycle.availableOff' },
    activated: { done: 'plugins.lifecycle.activatedDone', off: 'plugins.lifecycle.activatedOff' },
    exposed: {
        done: 'plugins.lifecycle.exposedDone',
        pending: 'plugins.lifecycle.exposedPending',
        off: 'plugins.lifecycle.exposedOff',
    },
};
/** Modifier class per lifecycle state. */
const STEP_CLASS = {
    done: css.stepDone,
    pending: css.stepPending,
    off: css.stepOff,
    unknown: css.stepOff,
};
/** The four-stage strip from package on disk to loaded capability. */
function Lifecycle({ plugin }) {
    const t = useT();
    return (_jsx("div", { className: css.lifecycle, "aria-label": t('plugins.lifecycle'), children: lifecycleSteps(plugin).map(step => (_jsxs("div", { className: `${css.step} ${STEP_CLASS[step.state]}`, children: [_jsx("span", { className: css.stepName, children: t(STEP_NAME[step.id]) }), _jsx("span", { className: css.stepBody, children: t(STEP_BODY[step.id][step.state] ?? 'plugins.lifecycle.unknown') })] }, step.id))) }));
}
/** One installed plugin, its state, and the verbs that apply to it. */
function InstalledCard(props) {
    const t = useT();
    const { plugin, operation } = props;
    const busy = operation?.status === 'running';
    return (_jsxs("article", { className: css.card, children: [_jsxs("div", { className: css.cardHead, children: [_jsxs("div", { className: css.identity, children: [plugin.homepage === undefined
                                ? _jsx("span", { className: css.name, children: plugin.name })
                                : (_jsx("a", { className: css.name, href: plugin.homepage, target: "_blank", rel: "noreferrer", children: plugin.name })), props.self ? _jsx("span", { className: `${css.tag} ${css.tagAccent}`, children: t('plugins.selfTag') }) : null, plugin.updateAvailable && plugin.latestVersion !== undefined
                                ? (_jsx("span", { className: `${css.tag} ${css.tagAccent}`, children: t('plugins.updateTag', { version: plugin.latestVersion }) }))
                                : null, plugin.enabled ? null : _jsx("span", { className: `${css.tag} ${css.tagMuted}`, children: t('plugins.disabledTag') }), pendingRestart(plugin)
                                ? _jsx("span", { className: `${css.tag} ${css.tagWarn}`, children: t('plugins.pendingTag') })
                                : null] }), _jsxs("div", { className: css.actions, children: [plugin.updateAvailable && plugin.latestVersion !== undefined
                                ? (_jsx(Button, { primary: true, disabled: busy, onClick: props.onUpdate, children: busy ? t('plugins.updating') : t('plugins.update', { version: plugin.latestVersion }) }))
                                : null, props.self
                                ? null
                                : (_jsxs(_Fragment, { children: [_jsx(Button, { disabled: busy, onClick: props.onToggle, children: busy ? t('plugins.working') : t(plugin.enabled ? 'plugins.disable' : 'plugins.enable') }), _jsx(Button, { className: css.dangerConfirm, disabled: busy, onClick: props.onUninstall, children: t('plugins.uninstall') })] }))] })] }), _jsxs("div", { className: css.facts, children: [_jsx("span", { className: css.tag, children: plugin.version === undefined
                            ? t('plugins.versionUnknown')
                            : t('plugins.version', { version: plugin.version }) }), plugin.latestVersion === undefined || plugin.latestVersion === plugin.version
                        ? null
                        : _jsx("span", { className: css.tag, children: t('plugins.latestVersion', { version: plugin.latestVersion }) })] }), plugin.description === undefined
                ? null
                : _jsx("p", { className: css.description, children: plugin.description }), _jsx(Lifecycle, { plugin: plugin }), props.self ? _jsx("div", { className: css.statusLine, children: t('plugins.selfNote') }) : null, operation === undefined
                ? null
                : (_jsxs(_Fragment, { children: [_jsx(JobProgress, { operation: operation, onCancel: props.onCancel }), operation.status === 'done'
                            ? _jsx("div", { className: `${css.statusLine} ${css.statusOk}`, children: t('plugins.actionDone') })
                            : null, operation.status === 'failed'
                            ? (_jsxs(_Fragment, { children: [_jsx("div", { className: `${css.statusLine} ${css.statusError}`, children: t('plugins.actionFailed', { error: operation.error ?? '' }) }), _jsx(JobOutput, { operation: operation })] }))
                            : null] }))] }));
}
/** Manage the plugins this profile has installed. */
export function InstalledSection(props) {
    const t = useT();
    const { operations, start, cancel } = useOperations(props.client);
    const [uninstallTarget, setUninstallTarget] = useState();
    const plugins = props.snapshot?.plugins ?? [];
    const updatable = plugins.filter(plugin => plugin.updateAvailable).length;
    const selfName = props.snapshot?.self?.name;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: css.title, children: t('plugins.installedTitle') }), _jsx("p", { className: css.subtitle, children: t('plugins.installedBody') })] }), _jsxs("div", { className: css.toolbar, children: [_jsxs("span", { className: css.meta, children: [t('plugins.installedCount', { count: plugins.length }), updatable === 0 ? '' : ` · ${t('plugins.updatableCount', { count: updatable })}`] }), _jsx(IconButton, { label: t('plugins.refresh'), disabled: props.loading, onClick: props.onReload, children: _jsx(IconRefreshOutline14, {}) })] }), props.error === undefined
                ? null
                : _jsx("div", { className: css.error, children: t('plugins.readFailed', { error: props.error }) }), props.snapshot?.error === undefined
                ? null
                : _jsx("div", { className: css.error, children: t('plugins.readFailed', { error: props.snapshot.error }) }), plugins.length === 0
                ? (_jsx(EmptyState, { children: props.loading
                        ? _jsx(Spinner, {})
                        : (_jsxs(_Fragment, { children: [t('plugins.emptyInstalled'), _jsx(Button, { primary: true, onClick: props.onBrowse, children: t('plugins.browseMarket') })] })) }))
                : (_jsxs("div", { className: css.list, children: [plugins.map(plugin => (_jsx(InstalledCard, { plugin: plugin, self: plugin.name === selfName, operation: operations[plugin.name], onUpdate: () => {
                                start(plugin.name, () => props.client.update(plugin.name), props.onReload);
                            }, onToggle: () => {
                                start(plugin.name, () => props.client.setEnabled(plugin.name, !plugin.enabled), props.onReload);
                            }, onUninstall: () => { setUninstallTarget(plugin); }, onCancel: () => { cancel(plugin.name); } }, plugin.name))), _jsx("p", { className: css.footer, children: t('plugins.restartNote') })] })), _jsx(Modal, { open: uninstallTarget !== undefined, onClose: () => { setUninstallTarget(undefined); }, title: uninstallTarget === undefined
                    ? t('plugins.uninstall')
                    : t('plugins.uninstallTitle', { name: uninstallTarget.name }), closeLabel: t('common.close'), description: t('plugins.uninstallBody'), footer: (_jsxs(_Fragment, { children: [_jsx(PrimitiveButton, { variant: "outline", autoFocus: true, onClick: () => { setUninstallTarget(undefined); }, children: t('common.cancel') }), _jsx(PrimitiveButton, { variant: "outline", className: css.dangerConfirm, onClick: () => {
                                const target = uninstallTarget;
                                setUninstallTarget(undefined);
                                if (target === undefined)
                                    return;
                                start(target.name, () => props.client.uninstall(target.name), props.onReload);
                            }, children: t('plugins.uninstall') })] })) })] }));
}
//# sourceMappingURL=InstalledSection.js.map