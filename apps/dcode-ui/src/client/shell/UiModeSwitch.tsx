/**
 * The front-end mode switch segmented control.
 *
 * Placed in the Appearance section alongside the theme switch, so an operator
 * can leave the workbench for any other surface from the same row they change
 * the theme in.
 *
 * The roster and its wording come from `@dsh-portable/ui-mode`, not from here:
 * the workbench must not carry its own translation of another surface's name,
 * and a surface added later must appear in this control without editing it.
 * Only the glyphs are local, because an icon is a presentation choice of this
 * particular control.
 * @module @dsh-portable/dcode-ui/client/shell/UiModeSwitch
 */

import { useSyncExternalStore } from 'react'
import type { ComponentType } from 'react'
import {
  IconSettingsOutline16, IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { MODE_COPY, UI_MODES, type UiMode } from '@dsh-portable/ui-mode/client'
import { useRuntime } from '../state/runtime.ts'
import css from './ThemeSwitch.module.css'

/**
 * One glyph per surface.
 *
 * Spelled as a total record so adding a surface to `UI_MODES` without choosing
 * an icon is a compile error here rather than a blank segment at runtime.
 */
const MODE_GLYPH: Readonly<Record<UiMode, ComponentType>> = {
  official: IconSettingsOutline16,
  dcode: IconSparkle16,
}

/** The segmented interface control, one segment per registered surface. */
export function UiModeSwitch() {
  const runtime = useRuntime()
  const t = runtime.uiModeT
  const mode = useSyncExternalStore(runtime.mode.subscribe, runtime.mode.get, runtime.mode.get)

  return (
    <div className={css.group} role="radiogroup" aria-label={t('interface')}>
      {UI_MODES.map((id) => {
        const Glyph = MODE_GLYPH[id]
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            className={`${css.segment} ${mode === id ? css.segmentActive : ''}`}
            onClick={() => { runtime.mode.set(id) }}
          >
            <span className={css.glyph} aria-hidden><Glyph /></span>
            <span className={css.label}>{t(MODE_COPY[id].title)}</span>
          </button>
        )
      })}
    </div>
  )
}
