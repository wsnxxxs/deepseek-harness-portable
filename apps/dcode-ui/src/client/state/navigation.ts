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
import { fitPanels, initialLayoutSize, LAYOUT_FIT, type LayoutSize } from './layout.ts'

/** The top-level surfaces the left rail selects between. */
export type WorkbenchView = 'session' | 'learning' | 'plugins' | 'settings'

/** Tabs of the right-hand details column. */
export type AsideTab = 'changes' | 'terminal' | 'goal' | 'details'

/** Stable visual and keyboard order of the preview-panel tabs. */
export const ASIDE_TABS: readonly AsideTab[] = ['changes', 'terminal', 'goal', 'details']

/** Resolve the next preview tab, wrapping seamlessly at either edge. */
export function adjacentAsideTab(tab: AsideTab, direction: -1 | 1): AsideTab {
  const index = ASIDE_TABS.indexOf(tab)
  return ASIDE_TABS[(index + direction + ASIDE_TABS.length) % ASIDE_TABS.length] ?? 'changes'
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
  readonly settingsSection: SettingsSection
  readonly diff: DiffTarget | undefined
  /** Tool call whose full output the details tab is showing. */
  readonly inspectedCallId: string | undefined
}

const INITIAL_LAYOUT = initialLayoutSize()

const INITIAL: NavigationState = {
  view: 'session',
  aside: 'changes',
  asideOpen: LAYOUT_FIT[INITIAL_LAYOUT].asideOpen,
  // A card the operator summons, never something the frame opens for them.
  summaryOpen: false,
  railOpen: LAYOUT_FIT[INITIAL_LAYOUT].railOpen,
  paletteOpen: false,
  layout: INITIAL_LAYOUT,
  railPinned: false,
  asidePinned: false,
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
  /** Open the preview sidebar on one tab, dismissing the summary card. */
  openAside(tab: AsideTab): void
  /** Open the diff viewer on one path, which also reveals the aside. */
  openDiff(path: string, staged?: boolean): void
  /** Close the diff viewer. */
  closeDiff(): void
  /** Inspect one tool call in the details tab. */
  inspect(callId: string | undefined): void
  togglePalette(open?: boolean): void
  toggleRail(): void
  /** Close the rail, which is how the compact drawer's scrim dismisses it. */
  closeRail(): void
  toggleAside(): void
  /** Show or hide the environment summary card. */
  toggleSummary(open?: boolean): void
  /**
   * Fit the panels to a width class.
   *
   * A no-op while the class is unchanged, so every resize inside one class
   * leaves the panels alone; crossing into another one hands them to
   * {@link fitPanels}.
   */
  fit(size: LayoutSize): void
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
    // The compact drawer floats over the conversation, so every rail entry
    // that changes what is showing behind it also dismisses it.
    show: view => { patch({ view, paletteOpen: false, ...(state.layout === 'compact' ? { railOpen: false } : {}) }) },
    openSettings: section => { patch({ view: 'settings', settingsSection: section, paletteOpen: false }) },
    // Picking a row in the summary card is a navigation, so the card gives
    // way to the panel it just sent the operator to.
    openAside: tab => { patch({ aside: tab, asideOpen: true, summaryOpen: false, ...pin('asidePinned') }) },
    openDiff: (path, staged = false) => {
      patch({ diff: { path, staged }, aside: 'changes', asideOpen: true, ...pin('asidePinned') })
    },
    closeDiff: () => { patch({ diff: undefined }) },
    inspect: callId => {
      patch({ inspectedCallId: callId, aside: 'details', asideOpen: true, ...pin('asidePinned') })
    },
    togglePalette: open => { patch({ paletteOpen: open ?? !state.paletteOpen }) },
    toggleRail: () => { patch({ railOpen: !state.railOpen, ...pin('railPinned') }) },
    closeRail: () => { patch({ railOpen: false, ...pin('railPinned') }) },
    toggleAside: () => { patch({ asideOpen: !state.asideOpen, ...pin('asidePinned') }) },
    toggleSummary: open => { patch({ summaryOpen: open ?? !state.summaryOpen }) },
    fit: size => {
      if (state.layout === size) return
      patch({ layout: size, ...fitPanels(size, state) })
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
