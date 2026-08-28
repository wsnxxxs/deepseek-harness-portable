/**
 * The front-end switch inside the classic General settings page.
 *
 * The requirement is symmetric: both surfaces must be able to reach the
 * other. The modern workbench has its own Interface section; this is its
 * counterpart, registered into the official General settings page so an operator who
 * switched to the classic UI is never stranded there.
 *
 * It renders inside the official shell, so it takes the slot framework's
 * standard locale prop and the Host's theme aliases rather than the
 * workbench's own token scope.
 * @module @dsh-portable/zcode-ui/client/settings/InterfaceSettingsSection
 */

import { useSyncExternalStore } from 'react'
import { IconCheckOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { UiModeStore } from '../mode.ts'
import { en, type ZcodeKey } from '../locales.ts'
import css from './InterfaceSettingsSection.module.css'

/** Injected share: the page's single mode store. */
export interface InterfaceSettingsInjected {
  readonly mode: UiModeStore
}

/**
 * Props of the classic-settings switch row.
 *
 * The slot framework supplies `t` for the registration's locale namespace;
 * the shape is spelled structurally so this component does not depend on the
 * settings package's prop assembly types.
 */
export interface InterfaceSettingsSectionProps extends InterfaceSettingsInjected {
  readonly t?: (key: ZcodeKey) => string
}

/** The two-option front-end switch. */
export function InterfaceSettingsSection({ mode, t }: InterfaceSettingsSectionProps) {
  const active = useSyncExternalStore(mode.subscribe, mode.get, mode.get)
  const copy = (key: ZcodeKey): string => t?.(key) ?? en[key]

  return (
    <div className={css.root}>
      <div className={css.title}>{copy('settings.interface')}</div>
      <p className={css.lead}>{copy('settings.interfaceBody')}</p>
      {/* Official first, then the workbench: one order across every switch
          surface, so the pair never reads differently in two places. */}
      <div className={css.choice}>
        <button
          type="button"
          className={`${css.option} ${active === 'official' ? css.optionActive : ''}`}
          onClick={() => { mode.set('official') }}
        >
          <span className={css.optionTitle}>{copy('settings.modeOfficial')}</span>
          <span className={css.optionBody}>{copy('settings.modeOfficialBody')}</span>
          {active === 'official' ? <span className={css.badge}><IconCheckOutline16 /></span> : null}
        </button>
        <button
          type="button"
          className={`${css.option} ${active === 'zcode' ? css.optionActive : ''}`}
          onClick={() => { mode.set('zcode') }}
        >
          <span className={css.optionTitle}>{copy('settings.modeWorkbench')}</span>
          <span className={css.optionBody}>{copy('settings.modeWorkbenchBody')}</span>
          {active === 'zcode' ? <span className={css.badge}><IconCheckOutline16 /></span> : null}
        </button>
      </div>
    </div>
  )
}
