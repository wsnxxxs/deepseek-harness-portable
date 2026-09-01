/**
 * The global command palette.
 *
 * Three sources in one list: the workbench's own actions, the Session
 * Controller's task list, and the Host's file-reference index for the current
 * session. The file rows come from `fileReferences/list`, the same index the
 * official composer's `@` mention trigger uses, so the palette needs no
 * workspace crawl of its own.
 * @module @dsh-portable/dcode-ui/client/shell/CommandPalette
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  IconBrowseOutline16, IconCordisPluginOutline14, IconFolderOpenOutline16, IconNewChatOutline16,
  IconListPenOutline16, IconPanelLeftOutline16, IconSearchOutline16, IconSettingsOutline16, IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useRuntime } from '../state/runtime.ts'
import { useCurrentSessionId, useSessionList } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { THEME_PREFERENCES, type ThemePreference } from '../theme.ts'
import type { DcodeKey } from '../locales.ts'
import { commandShortcut } from '../platform.ts'
import { useModalFocus } from './use-modal-focus.ts'
import css from './CommandPalette.module.css'

/** Locale key per theme preference, for the palette's three theme rows. */
const THEME_LABEL: Readonly<Record<ThemePreference, DcodeKey>> = {
  light: 'theme.light',
  dark: 'theme.dark',
  system: 'theme.system',
}

/** Props of the palette. */
export interface CommandPaletteProps {
  readonly navigation: NavigationStore
  readonly onNewTask: () => void
  readonly onOpenWorkspace: () => void
}

/** Which source a row came from. */
type PaletteKind = 'action' | 'task' | 'file'

/** One selectable row. */
interface PaletteRow {
  readonly id: string
  readonly kind: PaletteKind
  /** Presentation group heading. */
  readonly group: string
  readonly label: string
  readonly detail?: string
  readonly icon?: ReactNode
  readonly shortcut?: string
  readonly run: () => void
}

/** Case-insensitive subsequence match, the conventional palette filter. */
export function fuzzyMatch(query: string, candidate: string): boolean {
  if (query === '') return true
  const haystack = candidate.toLowerCase()
  const needle = query.toLowerCase()
  let index = 0
  for (const character of needle) {
    if (character === ' ') continue
    index = haystack.indexOf(character, index)
    if (index === -1) return false
    index += 1
  }
  return true
}

/** Actions, tasks and files behind one search field. */
export function CommandPalette({ navigation, onNewTask, onOpenWorkspace }: CommandPaletteProps) {
  const runtime = useRuntime()
  const t = useT()
  const list = useSessionList()
  const sessionId = useCurrentSessionId()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PaletteKind | 'all'>('all')
  const [active, setActive] = useState(0)
  const [files, setFiles] = useState<readonly { path: string; label?: string }[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()

  useModalFocus(true, panelRef, {
    initialFocusRef: inputRef,
    onClose: () => { navigation.togglePalette(false) },
  })

  // File candidates come from the Host index, re-queried as the operator types.
  useEffect(() => {
    if (sessionId === undefined || query.trim() === '') {
      setFiles([])
      return undefined
    }
    const controller = new AbortController()
    let live = true
    void runtime.remote.fileReferences.list(sessionId, query.trim(), controller.signal).then((result) => {
      if (!live || !result.ok) return
      setFiles(result.value.map(candidate => ({
        path: (candidate as { path?: string; value?: string }).path
          ?? (candidate as { value?: string }).value ?? '',
        label: (candidate as { label?: string }).label,
      })).filter(row => row.path !== ''))
    }).catch(() => {
      // A superseded or unsupported reference query leaves the file group empty.
    })
    return () => {
      live = false
      controller.abort()
    }
  }, [runtime, sessionId, query])

  const actions = useMemo<PaletteRow[]>(() => [
    {
      id: 'new-task',
      kind: 'action',
      group: t('palette.suggested'),
      label: t('nav.newTask'),
      icon: <IconNewChatOutline16 />,
      shortcut: commandShortcut('N'),
      run: onNewTask,
    },
    {
      id: 'open-workspace',
      kind: 'action',
      group: t('palette.suggested'),
      label: t('nav.openWorkspace'),
      icon: <IconFolderOpenOutline16 />,
      shortcut: commandShortcut('O'),
      run: onOpenWorkspace,
    },
    {
      id: 'settings',
      kind: 'action',
      group: t('palette.suggested'),
      label: t('nav.settings'),
      icon: <IconSettingsOutline16 />,
      run: () => { navigation.openSettings('general') },
    },
    {
      id: 'toggle-rail',
      kind: 'action',
      group: t('palette.panels'),
      label: t('nav.collapse'),
      icon: <IconPanelLeftOutline16 />,
      shortcut: commandShortcut('B'),
      run: () => { navigation.toggleRail() },
    },
    {
      id: 'toggle-aside',
      kind: 'action',
      group: t('palette.panels'),
      label: t('top.togglePreview'),
      icon: <IconPanelLeftOutline16 />,
      shortcut: commandShortcut('Alt+B'),
      run: () => { navigation.toggleAside() },
    },
    {
      id: 'toggle-summary',
      kind: 'action',
      group: t('palette.panels'),
      label: t('top.toggleSummary'),
      icon: <IconListPenOutline16 />,
      run: () => { navigation.toggleSummary() },
    },
    {
      id: 'changes',
      kind: 'action',
      group: t('palette.panels'),
      label: t('git.changes'),
      run: () => { navigation.openAside('changes') },
    },
    {
      id: 'goal',
      kind: 'action',
      group: t('palette.panels'),
      label: t('goal.title'),
      run: () => { navigation.openAside('goal') },
    },
    {
      id: 'library',
      kind: 'action',
      group: t('palette.configuration'),
      label: t('nav.library'),
      icon: <IconBrowseOutline16 />,
      run: () => { navigation.show('library') },
    },
    {
      id: 'plugins',
      kind: 'action',
      group: t('palette.configuration'),
      label: t('nav.plugins'),
      icon: <IconCordisPluginOutline14 size={16} />,
      run: () => { navigation.show('plugins') },
    },
    {
      id: 'models',
      kind: 'action',
      group: t('palette.configuration'),
      label: t('settings.models'),
      run: () => { navigation.openSettings('models') },
    },
    {
      id: 'usage',
      kind: 'action',
      group: t('palette.configuration'),
      label: t('settings.usage'),
      run: () => { navigation.openSettings('models') },
    },
    {
      id: 'agent-presets',
      kind: 'action',
      group: t('palette.configuration'),
      label: t('settings.agentPresets'),
      icon: <IconSparkle16 />,
      run: () => { navigation.openSettings('agentPresets') },
    },
    {
      id: 'official-ui',
      kind: 'action',
      group: t('palette.configuration'),
      label: t('top.officialUi'),
      run: () => { runtime.mode.set('official') },
    },
    // One row per theme rather than a toggle: the palette is a place to say
    // what you want, not to cycle until you land on it.
    ...THEME_PREFERENCES.map(preference => ({
      id: `theme-${preference}`,
      kind: 'action' as const,
      group: t('palette.configuration'),
      label: `${t('theme.toggle')}: ${t(THEME_LABEL[preference])}`,
      run: () => { runtime.appearance.set(preference) },
    })),
  ], [t, navigation, runtime, onNewTask, onOpenWorkspace])

  const rows = useMemo<PaletteRow[]>(() => {
    const tasks: PaletteRow[] = list.ids
      .map(id => list.byId[id])
      .filter((summary): summary is NonNullable<typeof summary> => summary !== undefined && !summary.blank)
      .slice(0, 60)
      .map(summary => ({
        id: `task:${summary.id}`,
        kind: 'task' as const,
        group: t('palette.tasks'),
        label: summary.displayTitle,
        detail: summary.cwd,
        run: () => {
          navigation.show('session')
          runtime.sessions.open(summary.id)
        },
      }))

    const fileRows: PaletteRow[] = files.slice(0, 40).map(file => ({
      id: `file:${file.path}`,
      kind: 'file' as const,
      group: t('palette.files'),
      label: file.label ?? file.path,
      detail: file.path,
      run: () => { navigation.openDiff(file.path) },
    }))

    const all = [...actions, ...tasks, ...fileRows]
    const matching = all.filter(row =>
      (filter === 'all' || row.kind === filter)
      && (fuzzyMatch(query, row.label) || (row.detail !== undefined && fuzzyMatch(query, row.detail))))
    return matching
  }, [actions, list, files, filter, query, t, navigation, runtime])

  useEffect(() => { setActive(0) }, [query, filter, rows.length])

  const choose = useCallback((row: PaletteRow | undefined) => {
    if (row === undefined) return
    navigation.togglePalette(false)
    row.run()
  }, [navigation])

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(index => Math.max(0, Math.min(index + 1, rows.length - 1)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(index => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      choose(rows[active])
    }
  }, [rows, active, choose])

  const filters: readonly { id: PaletteKind | 'all'; label: string }[] = [
    { id: 'all', label: t('palette.all') },
    { id: 'action', label: t('palette.actions') },
    { id: 'task', label: t('palette.tasks') },
    { id: 'file', label: t('palette.files') },
  ]

  let lastGroup: string | undefined

  return (
    <div
      className={css.backdrop}
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) navigation.togglePalette(false)
      }}
    >
      <div ref={panelRef} className={css.panel} role="dialog" aria-modal="true" aria-label={t('nav.commandPalette')} tabIndex={-1}>
        <div className={css.search}>
          <IconSearchOutline16 />
          <input
            ref={inputRef}
            className={css.input}
            role="combobox"
            aria-autocomplete="list"
            aria-label={t('palette.placeholder')}
            aria-expanded={true}
            aria-controls={listId}
            aria-activedescendant={rows[active] === undefined ? undefined : `palette-row-${String(active)}`}
            value={query}
            placeholder={t('palette.placeholder')}
            onChange={event => { setQuery(event.target.value) }}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className={css.filters} role="group" aria-label={t('palette.filter')}>
          {filters.map(entry => (
            <button
              key={entry.id}
              type="button"
              className={`${css.filter} ${filter === entry.id ? css.filterActive : ''}`}
              aria-pressed={filter === entry.id}
              onClick={() => { setFilter(entry.id) }}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className={css.list} id={listId} role="listbox" aria-label={t('palette.results')}>
          {rows.length === 0 ? <div className={css.empty}>{t('palette.empty')}</div> : null}
          {rows.map((row, index) => {
            const heading = row.group === lastGroup ? null : <div className={css.group} key={`g:${row.group}`}>{row.group}</div>
            lastGroup = row.group
            return (
              <div key={row.id}>
                {heading}
                <button
                  id={`palette-row-${String(index)}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={`${css.row} ${index === active ? css.rowActive : ''}`}
                  onPointerEnter={() => { setActive(index) }}
                  onClick={() => { choose(row) }}
                >
                  {row.icon}
                  <span className={css.rowLabel}>{row.label}</span>
                  {row.detail === undefined ? null : <span className={css.rowDetail}>{row.detail}</span>}
                  {row.shortcut === undefined ? null : <span className={css.shortcut}>{row.shortcut}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
