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

import type { UiMode } from '../ui-mode.ts'

/** Namespace this package registers its dictionaries under. */
export const UI_MODE_NS = 'uiMode'

/** Per-mode copy keys, so a switch renders from {@link UI_MODES} alone. */
export const MODE_COPY: Readonly<Record<UiMode, { readonly title: UiModeKey, readonly body: UiModeKey }>> = {
  official: { title: 'mode.official', body: 'mode.official.body' },
  dcode: { title: 'mode.dcode', body: 'mode.dcode.body' },
}

export const en = {
  'interface': 'Interface',
  'interface.body': 'Choose which front end this window shows. All of them read the same runtime.',
  'mode.official': 'Official',
  'mode.official.body': 'The official DeepSeek Harness interface, unchanged.',
  'mode.dcode': 'Workbench',
  'mode.dcode.body': 'A compact desktop layout with git tools, goal and progress panels.',
  'unavailable': 'Not available in this build.',
  'unavailable.selected': 'This window is showing the official interface, because the selected one is not part of this build.',
} as const

export const zh: Record<UiModeKey, string> = {
  'interface': '界面设置',
  'interface.body': '选择当前窗口使用哪一套前端。它们读取同一个运行时。',
  'mode.official': '官方版',
  'mode.official.body': '官方 DeepSeek Harness 界面，保持原样。',
  'mode.dcode': '工作台',
  'mode.dcode.body': '紧凑的桌面布局，带 Git 工具、目标与进度面板。',
  'unavailable': '当前构建不包含此界面。',
  'unavailable.selected': '所选界面不属于当前构建，本窗口正在显示官方版界面。',
}

/** Key union of this package's dictionary. */
export type UiModeKey = keyof typeof en
