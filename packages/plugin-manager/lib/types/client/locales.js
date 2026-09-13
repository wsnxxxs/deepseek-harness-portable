/**
 * Copy for the built-in features settings tab.
 * @module @dsh-portable/plugin-manager/client/locales
 */
/** Dictionary namespace owned by this plugin. */
export const PLUGIN_MANAGER_NS = 'portablePlugins';
export const zh = {
    tab: '内置功能',
    lead: '随本应用一同发布的功能插件。它们不是安装上来的包，所以只能开启或关闭，不能卸载；关闭后重启即可生效，随时可以再打开。',
    empty: '这个组合里没有内置功能插件。',
    loading: '正在读取…',
    refresh: '刷新',
    enable: '启用',
    disable: '停用',
    working: '处理中…',
    off: '已关闭',
    version: 'v{version}',
    unknownVersion: '版本未知',
    pendingOn: '重启后启用',
    pendingOff: '重启后停用',
    restart: '重启 harness 后生效。',
    unavailable: '当前连接无法管理内置功能。',
};
export const en = {
    tab: 'Built-ins',
    lead: 'Feature plugins shipped with this application. They are not installed packages, so they switch off rather than uninstall — a restart applies the change, and you can switch one back on at any time.',
    empty: 'This assembly mounts no built-in feature plugins.',
    loading: 'Loading…',
    refresh: 'Refresh',
    enable: 'Enable',
    disable: 'Disable',
    working: 'Working…',
    off: 'Off',
    version: 'v{version}',
    unknownVersion: 'Version unknown',
    pendingOn: 'On after restart',
    pendingOff: 'Off after restart',
    restart: 'Takes effect after restarting the harness.',
    unavailable: 'Built-in features cannot be managed over this connection.',
};
//# sourceMappingURL=locales.js.map