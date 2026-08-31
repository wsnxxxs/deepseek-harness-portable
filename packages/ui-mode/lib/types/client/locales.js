/**
 * Copy for the interface switch, in its own namespace.
 *
 * The switch is registered by this package rather than by a surface, so its
 * strings live here too: a surface that is not loaded must not take its own
 * name out of the picker with it.
 *
 * `MODE_COPY` is the single table every switch surface renders. Adding a
 * surface means adding one row here and one entry to `UI_MODES` — no switch
 * component enumerates modes.
 * @module @dsh-portable/ui-mode/client/locales
 */
/** Namespace this package registers its dictionaries under. */
export const UI_MODE_NS = 'uiMode';
/** Per-mode copy keys, so a switch renders from {@link UI_MODES} alone. */
export const MODE_COPY = {
    official: { title: 'mode.official', body: 'mode.official.body' },
    dcode: { title: 'mode.dcode', body: 'mode.dcode.body' },
    crew: { title: 'mode.crew', body: 'mode.crew.body' },
};
export const en = {
    'interface': 'Interface',
    'interface.body': 'Choose which front end this window shows. All of them read the same runtime.',
    'mode.official': 'Official',
    'mode.official.body': 'The official DeepSeek Harness interface, unchanged.',
    'mode.dcode': 'Workbench',
    'mode.dcode.body': 'A compact desktop layout with git tools, goal and progress panels.',
    'mode.crew': 'Mission Control',
    'mode.crew.body': 'A task-board workspace for crew missions: shared board, roster and dossier.',
};
export const zh = {
    'interface': '界面设置',
    'interface.body': '选择当前窗口使用哪一套前端。它们读取同一个运行时。',
    'mode.official': '官方版',
    'mode.official.body': '官方 DeepSeek Harness 界面，保持原样。',
    'mode.dcode': '工作台',
    'mode.dcode.body': '紧凑的桌面布局，带 Git 工具、目标与进度面板。',
    'mode.crew': '任务指挥台',
    'mode.crew.body': '以任务看板为中心的协作工作区：共享看板、队友花名册与资料档案。',
};
//# sourceMappingURL=locales.js.map