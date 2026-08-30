/**
 * The front-end mode switch segmented control.
 *
 * Placed in the Appearance section alongside the theme switch, allowing
 * operators to switch between the official and workbench front-ends.
 * @module @dsh-portable/dcode-ui/client/shell/UiModeSwitch
 */

import { useSyncExternalStore } from 'react'
import { IconSettingsOutline16, IconSparkle16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { useRuntime } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import css from './ThemeSwitch.module.css'

/** The segmented official / workbench mode control. */
export function UiModeSwitch() {
  const runtime = useRuntime()
  const t = useT()
  const mode = useSyncExternalStore(runtime.mode.subscribe, runtime.mode.get, runtime.mode.get)

  return (
    <div className={css.group} role="radiogroup" aria-label={t('settings.interface')}>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'official'}
        className={`${css.segment} ${mode === 'official' ? css.segmentActive : ''}`}
        onClick={() => { runtime.mode.set('official') }}
      >
        <span className={css.glyph} aria-hidden><IconSettingsOutline16 /></span>
        <span className={css.label}>{t('settings.modeOfficial')}</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'dcode'}
        className={`${css.segment} ${mode === 'dcode' ? css.segmentActive : ''}`}
        onClick={() => { runtime.mode.set('dcode') }}
      >
        <span className={css.glyph} aria-hidden><IconSparkle16 /></span>
        <span className={css.label}>{t('settings.modeWorkbench')}</span>
      </button>
    </div>
  )
}
