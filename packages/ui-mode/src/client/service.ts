/** Cordis owner of the page-wide UI mode. */

import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import type { UiMode } from '../ui-mode.ts'
import { createUiModeStore, type UiModeController, type UiModeStore } from './store.ts'

/** Page-wide UI-mode service consumed by independently bundled surfaces. */
export class UiModeService extends Service implements UiModeController {
  private readonly store: UiModeStore = createUiModeStore()

  /** Read the active surface. */
  readonly get = (): UiMode => this.store.get()

  /** Whether a surface for one mode is present in this build. */
  readonly available = (mode: UiMode): boolean => this.store.available(mode)

  /**
   * Declare that this page can render one mode.
   * @param mode - the mode the caller renders.
   * @returns a disposer withdrawing the announcement.
   */
  readonly announce = (mode: UiMode): (() => void) => this.store.announce(mode)

  /** Switch to one surface. */
  readonly set = (mode: UiMode, origin: 'page' | 'desktop' = 'page'): void => {
    this.store.set(mode, origin)
  }

  /** Advance through the surface roster. */
  readonly cycle = (direction: 1 | -1 = 1): void => {
    this.store.cycle(direction)
  }

  /** Subscribe to active-surface changes. */
  readonly subscribe = (listener: (mode: UiMode) => void): (() => void) => this.store.subscribe(listener)

  /**
   * @param ctx - owning client plugin context.
   */
  constructor(ctx: Context) {
    super(ctx, 'uiMode')
    ctx.effect(() => () => { this.store.dispose() }, 'ui-mode: store')
  }
}
