/**
 * The Metis-style composer for the mission's current thread.
 *
 * Draft and submission still belong to DSH's Conversation input service. The
 * richer shell is presentation only, which keeps a draft intact when the
 * operator moves between Crew and another surface.
 * @module @dsh-portable/crew-ui/client/shell/LeadComposer
 */

import { useSyncExternalStore } from 'react'
import type { KeyboardEvent } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  IconAgentPresetOutline16,
  IconPaperclipOutline16,
  IconPlusOutline16,
  IconSendOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useRuntime } from '../state/runtime.ts'
import css from './LeadComposer.module.css'

/** Props of the composer. */
export interface LeadComposerProps {
  readonly sessionId: SessionId
}

/** Send a message to the session in view. */
export function LeadComposer({ sessionId }: LeadComposerProps) {
  const runtime = useRuntime()
  const { t } = runtime
  const input = runtime.input(sessionId)

  const state = useSyncExternalStore(
    input?.subscribe ?? (() => () => {}),
    input?.getSnapshot ?? (() => undefined),
    input?.getSnapshot ?? (() => undefined),
  )

  // Without the Conversation service there is nothing to type into; showing a
  // dead box would be worse than showing none.
  if (input === undefined) return null

  const text = state?.text ?? ''
  const busy = state?.busy === true
  const submit = (): void => {
    if (busy || text.trim() === '') return
    void input.submit()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    // Enter sends, Shift+Enter breaks the line: the same contract the official
    // composer uses, so muscle memory carries across surfaces.
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    submit()
  }

  return (
    <div className={css.root}>
      <div className={css.card}>
        <textarea
          className={css.input}
          value={text}
          rows={3}
          placeholder={t('thread.placeholder')}
          aria-label={t('thread.placeholder')}
          onChange={(event) => { input.setText(event.target.value) }}
          onKeyDown={onKeyDown}
        />
        <div className={css.toolbar}>
          <button type="button" className={css.toolButton} disabled title={t('thread.addContext')} aria-label={t('thread.addContext')}>
            <IconPlusOutline16 />
          </button>
          <button type="button" className={css.toolButton} disabled title={t('thread.attach')} aria-label={t('thread.attach')}>
            <IconPaperclipOutline16 />
          </button>
          <span className={css.presetChip}>
            <IconAgentPresetOutline16 />
            {t('thread.lead')}
          </span>
          <span className={css.hint}>{t('thread.composerHint')}</span>
          <button
            type="button"
            className={css.send}
            disabled={busy || text.trim() === ''}
            aria-label={t('thread.send')}
            title={t('thread.send')}
            onClick={submit}
          >
            <IconSendOutline14 />
          </button>
        </div>
      </div>
    </div>
  )
}
