import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { Button } from "../shell/ui.js";
import { PluginSettingsSection } from "../settings/PluginSettingsSection.js";
export function PluginsHome({ navigation }) {
    const runtime = useRuntime();
    const t = useT();
    return _jsxs("section", { style: { padding: 24, overflow: 'auto' }, children: [_jsx(Button, { onClick: () => { navigation.show('session'); }, children: t('common.close') }), _jsx("h1", { children: t('plugins.title') }), _jsx("p", { children: t('plugins.webAllBody') }), _jsx(Button, { onClick: () => { navigation.show('session'); runtime.mode.set('official'); }, children: t('plugins.webAllOpen') }), _jsx(PluginSettingsSection, {})] });
}
//# sourceMappingURL=PluginsHome.js.map