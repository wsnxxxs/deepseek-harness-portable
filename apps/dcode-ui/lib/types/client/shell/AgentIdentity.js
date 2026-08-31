import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The Metis-style agent identity seat in the chat header.
 *
 * The label is resolved from the same agent-preset projection and roster used
 * by the composer. It is a navigation affordance, not a second preset store:
 * clicking it opens the existing preset editor owned by DSH.
 * @module @dsh-portable/dcode-ui/client/shell/AgentIdentity
 */
import { useMemo } from 'react';
import { IconAgentPresetOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { useAsync, useProjectionValue } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useRuntime } from "../state/runtime.js";
import css from './AgentIdentity.module.css';
/** Current agent identity, patterned after Metis's ChatHeader agent pill. */
export function AgentIdentity({ navigation, sessionId }) {
    const runtime = useRuntime();
    const t = useT();
    const selected = useProjectionValue(sessionId, 'agentPreset');
    const catalog = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
    const presets = catalog.value?.ok === true
        ? (catalog.value.value.presets ?? [])
        : [];
    const current = useMemo(() => selected ?? presets.find(preset => preset.isDefault)?.id ?? presets[0]?.id, [presets, selected]);
    const row = presets.find(preset => preset.id === current);
    const label = row?.name ?? current ?? t('top.agent');
    return (_jsxs("button", { type: "button", className: css.trigger, title: t('top.agentSettings'), "aria-label": `${t('top.agent')}: ${label}`, onClick: () => { navigation.openSettings('agentPresets'); }, children: [_jsx("span", { className: css.avatar, "aria-hidden": true, children: _jsx(IconAgentPresetOutline16, {}) }), _jsxs("span", { className: css.copy, children: [_jsx("span", { className: css.kicker, children: t('top.agent') }), _jsx("span", { className: css.name, children: label })] })] }));
}
//# sourceMappingURL=AgentIdentity.js.map