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
import {
  fitPanels, initialLayoutSize, LAYOUT_FIT, readContextPanelPreference,
  writeContextPanelPreference, type LayoutSize,
} from './layout.ts'

/** The top-level surfaces the left rail selects between. */
export type WorkbenchView = 'session' | 'learning' | 'plugins' | 'settings'

/** Tabs of the right-hand details column. */
export type AsideTab = 'changes' | 'terminal' | 'goal' | 'details'

/** The two frontend views that occupy the compact frame as overlays. */
export type CompactOverlay = 'rail' | 'aside' | 'summary'

/** Stable visual and keyboard order of the preview-panel tabs. */
export const ASIDE_TABS: readonly AsideTab[] = ['changes', 'terminal', 'goal', 'details']

/** Facts that decide which context deserves the shortest path. */
export interface TaskContext {
  readonly hasChanges: boolean
  readonly hasError: boolean
  readonly goalActive: boolean
  readonly failedCallId?: string
}

/** Highest-priority automatic context signal, if the task has one. */
export function primaryAsideTab(context: TaskContext): AsideTab | undefined {
  if (context.hasError) return 'details'
  if (context.hasChanges) return 'changes'
  if (context.goalActive) return 'goal'
  return undefined
}

/** Put the most actionable context first while retaining every existing tab. */
export function orderedAsideTabs(context: TaskContext): readonly AsideTab[] {
  const priority: AsideTab[] = []
  if (context.hasError) priority.push('details')
  if (context.hasChanges) priority.push('changes')
  if (context.goalActive) priority.push('goal')
  return [...new Set([...priority, ...ASIDE_TABS])]
}

/** Resolve the next preview tab, wrapping seamlessly at either edge. */
export function adjacentAsideTab(tab: AsideTab, direction: -1 | 1, tabs: readonly AsideTab[] = ASIDE_TABS): AsideTab {
  const index = tabs.indexOf(tab)
  return tabs[(index + direction + tabs.length) % tabs.length] ?? 'changes'
}

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
  /** Whether the docked preview sidebar is showing. */
  readonly asideOpen: boolean
  /** Whether the environment summary card under the top bar is showing. */
  readonly summaryOpen: boolean
  readonly railOpen: boolean
  readonly paletteOpen: boolean
  /** Width class the panels are currently fitted to. */
  readonly layout: LayoutSize
  /**
   * Panels the operator has moved away from their width class's default.
   *
   * A pin outlives every other state change and is what keeps a class change
   * from overruling a deliberate choice. Only the docked classes take one:
   * compact holds the rail as a drawer and the card as a sheet, so a toggle
   * there is a reveal rather than a preference about the layout.
   */
  readonly railPinned: boolean
  readonly asidePinned: boolean
  /** Explicit docked-panel choice, retained while compact temporarily hides it. */
  readonly asidePreferredOpen: boolean | undefined
  /** Workspace whose manual context-panel choice is currently in force. */
  readonly workspace: string | undefined
  readonly settingsSection: SettingsSection
  /** Provider editor requested from an in-task readiness action. */
  readonly settingsProvider: string | undefined
  readonly diff: DiffTarget | undefined
  /** Tool call whose full output the details tab is showing. */
  readonly inspectedCallId: string | undefined
}

const INITIAL_LAYOUT = initialLayoutSize()

const INITIAL: NavigationState = {
  view: 'session',
  aside: 'goal',
  asideOpen: LAYOUT_FIT[INITIAL_LAYOUT].asideOpen,
  // A card the operator summons, never something the frame opens for them.
  summaryOpen: false,
  railOpen: LAYOUT_FIT[INITIAL_LAYOUT].railOpen,
  paletteOpen: false,
  layout: INITIAL_LAYOUT,
  railPinned: false,
  asidePinned: false,
  asidePreferredOpen: undefined,
  workspace: undefined,
  settingsSection: 'general',
  settingsProvider: undefined,
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
  /** Open one provider editor and return to the task after it saves. */
  openProviderSettings(provider: string): void
  /** Open the preview sidebar on one tab, dismissing the summary card. */
  openAside(tab: AsideTab): void
  /** Apply the remembered context-panel choice when the workspace changes. */
  setWorkspace(workspace: string | undefined): void
  /** Open the diff viewer on one path, which also reveals the aside. */
  openDiff(path: string, staged?: boolean): void
  /** Close the diff viewer. */
  closeDiff(): void
  /** Inspect one tool call in the details tab. */
  inspect(callId: string | undefined): void
  togglePalette(open?: boolean): void
  toggleRail(): void
  toggleAside(): void
  /** Show or hide the environment summary card. */
  toggleSummary(open?: boolean): void
  /** Open exactly one compact overlay, closing either of its peers. */
  openCompactOverlay(overlay: CompactOverlay): void
  /** Dismiss whichever compact overlay is showing. */
  closeCompactOverlay(): void
  /**
   * Fit the panels to a width class.
   *
   * A no-op while the class is unchanged, so every resize inside one class
   * leaves the panels alone; crossing into another one hands them to
   * {@link fitPanels}.
   */
  fit(size: LayoutSize): void
}

/** Resolve the active compact overlay; docked layouts have no overlay. */
export function compactOverlayOf(state: NavigationState): CompactOverlay | undefined {
  if (state.layout !== 'compact') return undefined
  if (state.summaryOpen) return 'summary'
  if (state.asideOpen) return 'aside'
  if (state.railOpen) return 'rail'
  return undefined
}

/**
 * Create the workbench's view-state store.
 * @returns a store shared by the tree, the keyboard layer and the palette.
 */
export function createNavigationStore(): NavigationStore {
  let state = INITIAL
  const listeners = new Set<() => void>()
  const emit = (): void => { for (const listener of [...listeners]) listener() }
  /**
   * Record that a panel was moved by hand, where that says anything.
   * @param key - the pin to set.
   * @returns the patch fragment, empty while the frame is compact.
   */
  const pin = (key: 'railPinned' | 'asidePinned'): Partial<NavigationState> =>
    (state.layout === 'compact' ? {} : { [key]: true })
  const compactOverlayPatch = (overlay: CompactOverlay): Partial<NavigationState> => {
    if (state.layout !== 'compact') return {}
    return {
      railOpen: overlay === 'rail',
      asideOpen: overlay === 'aside',
      summaryOpen: overlay === 'summary',
    }
  }
  const patch = (next: Partial<NavigationState>): void => {
    const merged = { ...state, ...next }
    if ((Object.keys(next) as Array<keyof NavigationState>).every(key => Object.is(state[key], merged[key]))) return
    state = merged
    emit()
  }
  const rememberAside = (open: boolean): Partial<NavigationState> => {
    if (state.layout === 'compact') return {}
    writeContextPanelPreference(state.workspace, open)
    return { asidePinned: true, asidePreferredOpen: open }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    patch,
    // The compact drawer floats over the conversation, so every rail entry
    // that changes what is showing behind it also dismisses it.
    show: view => { patch({ view, paletteOpen: false, ...(state.layout === 'compact' ? { railOpen: false, asideOpen: false, summaryOpen: false } : {}) }) },
    openSettings: section => { patch({ view: 'settings', settingsSection: section, paletteOpen: false, ...(state.layout === 'compact' ? { railOpen: false, asideOpen: false, summaryOpen: false } : {}) }) },
    openProviderSettings: provider => { patch({ view: 'settings', settingsSection: 'models', settingsProvider: provider, paletteOpen: false, ...(state.layout === 'compact' ? { railOpen: false, asideOpen: false, summaryOpen: false } : {}) }) },
    // Picking a row in the summary card is a navigation, so the card gives
    // way to the panel it just sent the operator to.
    openAside: tab => { patch({ aside: tab, asideOpen: true, summaryOpen: false, ...compactOverlayPatch('aside'), ...rememberAside(true) }) },
    setWorkspace: workspace => {
      if (state.workspace === workspace) return
      const preferred = readContextPanelPreference(workspace)
      patch({
        workspace,
        asideOpen: state.layout === 'compact' ? false : preferred ?? false,
        asidePinned: preferred !== undefined,
        asidePreferredOpen: preferred,
        diff: undefined,
        inspectedCallId: undefined,
      })
    },
    openDiff: (path, staged = false) => {
      patch({ diff: { path, staged }, aside: 'changes', asideOpen: true, ...compactOverlayPatch('aside'), ...rememberAside(true) })
    },
    closeDiff: () => { patch({ diff: undefined }) },
    inspect: callId => {
      patch({ inspectedCallId: callId, aside: 'details', asideOpen: true, ...compactOverlayPatch('aside'), ...rememberAside(true) })
    },
    togglePalette: open => { patch({ paletteOpen: open ?? !state.paletteOpen }) },
    toggleRail: () => {
      const open = !state.railOpen
      patch({ railOpen: open, ...(open ? compactOverlayPatch('rail') : {}), ...pin('railPinned') })
    },
    toggleAside: () => {
      const open = !state.asideOpen
      patch({ asideOpen: open, ...(open ? compactOverlayPatch('aside') : {}), ...rememberAside(open) })
    },
    toggleSummary: open => {
      const next = open ?? !state.summaryOpen
      patch({ summaryOpen: next, ...(next ? compactOverlayPatch('summary') : {}) })
    },
    openCompactOverlay: overlay => { patch(compactOverlayPatch(overlay)) },
    closeCompactOverlay: () => {
      if (state.layout === 'compact') patch({ railOpen: false, asideOpen: false, summaryOpen: false })
    },
    fit: size => {
      if (state.layout === size) return
      const fitted = fitPanels(size, state)
      patch({
        layout: size,
        ...fitted,
        asideOpen: size === 'compact' ? false : state.asidePreferredOpen ?? false,
        asidePinned: state.asidePreferredOpen !== undefined,
      })
    },
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
