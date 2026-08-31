/**
 * The front-end switch inside the official General settings page.
 *
 * The requirement is symmetric: every surface must be able to reach every
 * other one. Each extension surface carries its own copy of this control, and
 * this is the counterpart registered into the official General settings page,
 * so an operator who switched to the official UI is never stranded there.
 *
 * It renders inside the official shell, so it takes the slot framework's
 * standard locale prop and the Host's theme aliases rather than any surface's
 * own token scope.
 *
 * There is exactly ONE registration of this row, and it belongs to this
 * package rather than to a surface: two surfaces each registering their own
 * would put two switches in one page, and a surface that failed to load would
 * take the ability to leave it along with it.
 * @module @dsh-portable/ui-mode/client/InterfaceSettingsSection
 */

import { useSyncExternalStore } from 'react'
import { UI_MODES, type UiMode } from '../ui-mode.ts'
import type { UiModeController } from './store.ts'
import { MODE_COPY, en, type UiModeKey } from './locales.ts'
import css from './InterfaceSettingsSection.module.css'

/** Injected share: the page's single mode store. */
export interface InterfaceSettingsInjected {
  readonly mode: UiModeController
}

/**
 * Props of the official-settings switch row.
 *
 * The slot framework supplies `t` for the registration's locale namespace; the
 * shape is spelled structurally so this component does not depend on the
 * settings package's prop assembly types.
 */
export interface InterfaceSettingsSectionProps extends InterfaceSettingsInjected {
  readonly t?: (key: UiModeKey) => string
}

/** The interface switch, one option per registered surface. */
export function InterfaceSettingsSection({ mode, t }: InterfaceSettingsSectionProps) {
  // Availability changes notify through the same subscription, so a switch
  // rendered while surfaces are still loading repaints when they announce.
  const active = useSyncExternalStore(mode.subscribe, mode.get, mode.get)
  const copy = (key: UiModeKey): string => t?.(key) ?? en[key]
  const canRender = (id: UiMode): boolean => mode.available?.(id) ?? true

  return (
    <div className={css.root}>
      <h2 className={css.title}>{copy('interface')}</h2>
      <p className={css.lead}>{copy('interface.body')}</p>
      {/* Rendered straight from UI_MODES so presentation order is identical in
          every place a surface can be chosen, and adding one never means
          editing a switch. An absent surface is shown DISABLED rather than
          removed: a build that omits one should say so, because a name that
          silently disappears reads as a bug in the switch. */}
      <div className={css.choice} role="radiogroup" aria-label={copy('interface')}>
        {UI_MODES.map((id) => {
          const usable = canRender(id)
          return (
            <button
              key={id}
              type="button"
              role="radio"
              className={`${css.option} ${active === id ? css.optionActive : ''} ${usable ? '' : css.optionDisabled}`}
              aria-checked={active === id}
              disabled={!usable}
              onClick={() => { mode.set(id) }}
            >
              <span className={css.optionTitle}>{copy(MODE_COPY[id].title)}</span>
              <span className={css.optionBody}>
                {usable ? copy(MODE_COPY[id].body) : copy('unavailable')}
              </span>
            </button>
          )
        })}
      </div>
      {/* A stored preference for a surface this build lacks would otherwise
          show as checked while the official UI is on screen. Saying which one
          is actually rendering is the difference between a degraded state and
          an inexplicable one. */}
      {canRender(active)
        ? null
        : <p className={css.notice} role="status">{copy('unavailable.selected')}</p>}
    </div>
  )
}
