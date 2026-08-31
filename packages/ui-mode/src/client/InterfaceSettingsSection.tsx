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
import { UI_MODES } from '../ui-mode.ts'
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
  const active = useSyncExternalStore(mode.subscribe, mode.get, mode.get)
  const copy = (key: UiModeKey): string => t?.(key) ?? en[key]

  return (
    <div className={css.root}>
      <h2 className={css.title}>{copy('interface')}</h2>
      <p className={css.lead}>{copy('interface.body')}</p>
      {/* Rendered straight from UI_MODES so presentation order is identical in
          every place a surface can be chosen, and adding one never means
          editing a switch. */}
      <div className={css.choice} role="radiogroup" aria-label={copy('interface')}>
        {UI_MODES.map(id => (
          <button
            key={id}
            type="button"
            role="radio"
            className={`${css.option} ${active === id ? css.optionActive : ''}`}
            aria-checked={active === id}
            onClick={() => { mode.set(id) }}
          >
            <span className={css.optionTitle}>{copy(MODE_COPY[id].title)}</span>
            <span className={css.optionBody}>{copy(MODE_COPY[id].body)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
