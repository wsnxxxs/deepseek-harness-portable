/**
 * Workbench-local view state.
 *
 * Strictly presentation: which top-level surface is showing, which aside tab
 * is selected, whether the palette is open, which file the diff viewer is
 * looking at. Nothing here duplicates a Host fact — the current session, the
 * workspace registry and the transcript all stay with their owning services.
 *
 * It is an external store rather than component state so the keyboard layer
 * and the command palette can drive navigation without threading callbacks
 * through the tree, and so a surface switch does not lose the operator's
 * place in the panels.
 * @module @dsh-portable/dcode-ui/client/state/navigation
 */

import { useSyncExternalStore } from 'react'

/** The top-level surfaces the left rail selects between. */
export type WorkbenchView = 'session' | 'learning' | 'settings'

/** Tabs of the right-hand details column. */
export type AsideTab = 'changes' | 'goal' | 'details'

/** Settings sections, mirroring the official settings surface's own groups. */
export type SettingsSection =
  | 'general'
  | 'appearance'
  | 'models'
  | 'browser'
  | 'computer'
  | 'memory'
  | 'subagents'
  | 'plugins'
  | 'agentPresets'
  | 'mcp'
  | 'skills'
  | 'commands'
  | 'usage'

/** A file the diff viewer is showing. */
export interface DiffTarget {
  readonly path: string
  readonly staged: boolean
}

/** The complete workbench view state. */
export interface NavigationState {
  readonly view: WorkbenchView
  readonly aside: AsideTab
  readonly asideOpen: boolean
  readonly railOpen: boolean
  readonly paletteOpen: boolean
  readonly settingsSection: SettingsSection
  readonly diff: DiffTarget | undefined
  /** Tool call whose full output the details tab is showing. */
  readonly inspectedCallId: string | undefined
}

const INITIAL: NavigationState = {
  view: 'session',
  aside: 'changes',
  asideOpen: true,
  railOpen: true,
  paletteOpen: false,
  settingsSection: 'general',
  diff: undefined,
  inspectedCallId: undefined,
}

/** Mutations the workbench performs on its view state. */
export interface NavigationStore {
  getSnapshot(): NavigationState
  subscribe(listener: () => void): () => void
  /** Replace part of the state; a no-op patch does not notify. */
  patch(next: Partial<NavigationState>): void
  /** Select a top-level surface. */
  show(view: WorkbenchView): void
  /** Open the settings surface at one section. */
  openSettings(section: SettingsSection): void
  /** Open the aside on one tab. */
  openAside(tab: AsideTab): void
  /** Open the diff viewer on one path, which also reveals the aside. */
  openDiff(path: string, staged?: boolean): void
  /** Close the diff viewer. */
  closeDiff(): void
  /** Inspect one tool call in the details tab. */
  inspect(callId: string | undefined): void
  togglePalette(open?: boolean): void
  toggleRail(): void
  toggleAside(): void
}

/**
 * Create the workbench's view-state store.
 * @returns a store shared by the tree, the keyboard layer and the palette.
 */
export function createNavigationStore(): NavigationStore {
  let state = INITIAL
  const listeners = new Set<() => void>()
  const emit = (): void => { for (const listener of [...listeners]) listener() }
  const patch = (next: Partial<NavigationState>): void => {
    const merged = { ...state, ...next }
    if ((Object.keys(next) as Array<keyof NavigationState>).every(key => Object.is(state[key], merged[key]))) return
    state = merged
    emit()
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    patch,
    show: view => { patch({ view, paletteOpen: false }) },
    openSettings: section => { patch({ view: 'settings', settingsSection: section, paletteOpen: false }) },
    openAside: tab => { patch({ aside: tab, asideOpen: true }) },
    openDiff: (path, staged = false) => { patch({ diff: { path, staged }, aside: 'changes', asideOpen: true }) },
    closeDiff: () => { patch({ diff: undefined }) },
    inspect: callId => { patch({ inspectedCallId: callId, aside: 'details', asideOpen: true }) },
    togglePalette: open => { patch({ paletteOpen: open ?? !state.paletteOpen }) },
    toggleRail: () => { patch({ railOpen: !state.railOpen }) },
    toggleAside: () => { patch({ asideOpen: !state.asideOpen }) },
  }
}

/**
 * Read the view state.
 * @param store - the workbench store.
 * @returns the current state.
 */
export function useNavigation(store: NavigationStore): NavigationState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
