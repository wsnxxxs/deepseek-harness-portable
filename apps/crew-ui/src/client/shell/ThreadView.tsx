/**
 * The chat-first conversation body.
 *
 * The Host still owns the conversation projection. This component only maps
 * that projection to Metis' visual rhythm: a centred message lane, right-sided
 * user bubbles, assistant turns, and compact work rows between answers.
 * @module @dsh-portable/crew-ui/client/shell/ThreadView
 */

import { useMemo, useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import {
  IconChecklistOutline14,
  IconSparkle16,
  IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { foldThread } from '../state/thread.ts'
import { useRuntime } from '../state/runtime.ts'
import css from './ThreadView.module.css'

/** Props of the thread view. */
export interface ThreadViewProps {
  readonly sessionId: SessionId | undefined
}

/** The conversation log for one session. */
export function ThreadView({ sessionId }: ThreadViewProps) {
  const runtime = useRuntime()
  const { t } = runtime

  const source = useMemo(() => {
    if (sessionId === undefined) return undefined
    return runtime.chatFeed(sessionId)
  }, [runtime, sessionId])

  const snapshot = useSyncExternalStore(
    source?.subscribe ?? (() => () => {}),
    source?.getSnapshot ?? (() => undefined),
    source?.getSnapshot ?? (() => undefined),
  ) as ChatSnapshot | undefined

  const entries = useMemo(
    () => (snapshot === undefined ? [] : foldThread(snapshot.legacy.nodes)),
    [snapshot],
  )

  if (entries.length === 0) {
    return (
      <div className={css.empty}>
        <span className={css.emptyMark} aria-hidden><IconSparkle16 /></span>
        <h2>{t('thread.empty')}</h2>
        <p>{t('thread.emptyBody')}</p>
      </div>
    )
  }

  return (
    <div className={css.root}>
      <ol className={css.lane}>
        {entries.map(entry => (
          <li key={entry.id} className={css.entry}>
            {entry.kind === 'said'
              ? entry.who === 'user'
                ? (
                  <article className={css.userTurn}>
                    <p className={css.userBubble}>{entry.text}</p>
                  </article>
                )
                : (
                  <article className={css.agentTurn}>
                    <header className={css.agentHeader}>
                      <span className={css.agentAvatar} aria-hidden><IconSparkle16 /></span>
                      <span>{t('thread.lead')}</span>
                    </header>
                    <p className={css.agentText}>{entry.text}</p>
                  </article>
                )
              : entry.kind === 'work'
                ? (
                  <div className={css.work}>
                    <span className={css.workIcon} aria-hidden><IconChecklistOutline14 /></span>
                    <span>{t('thread.work', { count: entry.count })}</span>
                  </div>
                )
                : (
                  <div className={css.note} role="status">
                    <IconWarningOutline16 />
                    <span>{entry.text}</span>
                  </div>
                )}
          </li>
        ))}
      </ol>
    </div>
  )
}
