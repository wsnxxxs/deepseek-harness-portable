export function connectBundledPlugins(manager, api) {
    const originalList = manager.controlsList;
    const originalToggle = manager.controlsSetEnabled;
    const list = async () => {
        const [existing, result] = await Promise.all([originalList.call(manager), api.list()]);
        if (!result.ok)
            throw new Error(result.error.message);
        const bundled = result.value.plugins.map(plugin => ({
            id: plugin.name,
            name: plugin.name,
            repository: 'https://github.com/wsnxxxs/deepseek-harness-portable',
            state: (plugin.pending ?? plugin.enabled) ? 'enabled' : 'disabled',
        }));
        return [...existing.filter(row => !bundled.some(plugin => plugin.id === row.id)), ...bundled];
    };
    manager.controlsList = list;
    manager.controlsSetEnabled = async (id, enabled) => {
        const roster = await api.list();
        if (!roster.ok)
            throw new Error(roster.error.message);
        if (roster.value.plugins.some(plugin => plugin.name === id)) {
            const result = await api.setEnabled(id, enabled);
            if (!result.ok)
                throw new Error(result.error.message);
        }
        else
            await originalToggle.call(manager, id, enabled);
        // Dependency changes (e.g. DCode -> ui-mode/session-manager) refresh together.
        return list();
    };
    return () => {
        manager.controlsList = originalList;
        manager.controlsSetEnabled = originalToggle;
    };
}
//# sourceMappingURL=bridge.js.map