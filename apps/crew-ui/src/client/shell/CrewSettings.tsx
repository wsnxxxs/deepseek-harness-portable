/**
 * Mission Control's settings panel.
 *
 * It carries the interface switch, and it carries it because a surface an
 * operator cannot leave from the inside is a trap: the application menu is not
 * available in a browser tab, and every other surface offers the switch in its
 * own settings.
 *
 * The switch is not reimplemented here. `@dsh-portable/ui-mode` owns the roster
 * of surfaces and their names, and renders the same control in the official
 * General page, so all three surfaces present one list in one order with one
 * set of words.
 *
 * Deeper configuration — models, credentials, plugins, skills — is deliberately
 * NOT duplicated. `settings.section` has exactly one declarer, so a surface
 * cannot render the official pages and must reimplement each one; a second
 * partial copy of that catalogue would be a maintenance liability and a place
 * for the two to disagree about what is configured. The switch above is one
 * click from a surface that implements them in full.
 * @module @dsh-portable/crew-ui/client/shell/CrewSettings
 */

import { InterfaceSettingsSection } from '@dsh-portable/ui-mode/client'
import { useRuntime } from '../state/runtime.ts'
import css from './CrewSettings.module.css'

/** Props of the settings panel. */
export interface CrewSettingsProps {
  onClose(): void
}

/** The settings overlay. */
export function CrewSettings({ onClose }: CrewSettingsProps) {
  const runtime = useRuntime()
  const { t, uiModeT } = runtime

  return (
    <div className={css.root} role="dialog" aria-modal="true" aria-label={t('settings.title')}>
      <header className={css.head}>
        <h2 className={css.title}>{t('settings.title')}</h2>
        <button type="button" className={css.close} onClick={onClose}>{t('settings.back')}</button>
      </header>
      <div className={css.body}>
        <InterfaceSettingsSection mode={runtime.mode} t={uiModeT as never} />
      </div>
    </div>
  )
}
