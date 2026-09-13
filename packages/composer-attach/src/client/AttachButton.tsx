/**
 * The composer's click path to a file or folder reference.
 *
 * The official composer already knows how to reference workspace files: typing
 * `@` opens the harness's own reference menu, with directory drill-down, quoted
 * paths, chips, and model serialization. What it has no *click* path to is that
 * menu. The `+` at the head of the same row is upstream's **command** launcher
 * — it seeds the `/` source alone — so an operator who has not learned the `@`
 * syntax has no way in, and the composer's own placeholder is the only thing
 * that ever mentions it.
 *
 * This button is that way in. It reimplements no file discovery: it opens the
 * very same `@` menu, at the end of the draft, through the trigger pipeline's
 * own `toggleSource`. Candidates, drill-down, insertion, and serialization all
 * stay upstream's.
 * @module @dsh-portable/composer-attach/client/AttachButton
 */

import { useEffect } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { ReferenceIcon, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { TriggerPosition } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { documentEndSpan } from './caret.ts'
import type { AttachSpan } from './caret.ts'
import css from './AttachButton.module.css'

/** Registration-side operations, bound to this session's trigger controller by the plugin body. */
export interface ComposerAttachInjected {
  /**
   * Open the reference menu at one insertion point in this session's composer.
   * @param span - where a pick should insert.
   * @param position - whether that point starts the draft.
   */
  readonly openReferences: (span: AttachSpan, position: TriggerPosition) => void
  /**
   * Publish this session's live insertion point.
   *
   * The `+` menu's `files` entry settles in a popup that has no access to the
   * input snapshot, so the composer — the only mounted reader of it — keeps
   * the plugin's registry current. Returns the withdrawal for unmount.
   * @param span - the current insertion point.
   * @returns the disposer that forgets it.
   */
  readonly reportSpan: (span: AttachSpan) => () => void
}

export type ComposerAttachButtonProps =
  PropsRuntime<'conversation.input.left'>
  & PropsLocale<'composerAttach'>
  & InjectFace<ComposerAttachInjected>

/** Keep the composer focused so the menu opens over a live editor. */
function keepFocus(event: MouseEvent): void {
  event.preventDefault()
}

/** The attach control, rendered in the composer tool row. */
export function ComposerAttachButton(props: ComposerAttachButtonProps): ReactNode {
  const input = props.useInput(state => state)
  const { t, reportSpan } = props
  const span = documentEndSpan(input.draft, input.occurrences, input.draftRev)
  // Republished on every input revision, so a popup opened from the `+` menu
  // settles against the same document the operator was looking at.
  useEffect(() => reportSpan(span), [reportSpan, span.start, span.end, span.draftRev])
  // The editor refuses a reference insert outside these two phases, so a
  // button that could only open a menu with nowhere to put its answer stays
  // inert rather than opening one.
  const ready = input.phase === 'plain' || input.phase === 'claimed'

  return (
    <Tooltip label={t('attach.label')} side="top" delayMs={500}>
      <button
        type="button"
        className={css.attach}
        aria-label={t('attach.label')}
        aria-haspopup="menu"
        disabled={!ready}
        onMouseDown={keepFocus}
        onClick={() => {
          props.openReferences(span, input.draft.trim() === '' ? 'leading' : 'inline')
        }}
      >
        <ReferenceIcon kind="file" size={16} />
      </button>
    </Tooltip>
  )
}
