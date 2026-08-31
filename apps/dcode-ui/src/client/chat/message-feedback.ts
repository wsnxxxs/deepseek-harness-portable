/** Session-scoped message feedback state for the DCode transcript. */

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type {
  MessageFeedbackInjected,
  MessageFeedbackView,
} from '@deepseek-ai/dsh-client-ui-message-feedback/client'
import type { MessageFeedbackItem, MessageFeedbackRating } from '@deepseek-ai/dsh-message-feedback/types'
import type { MessageId } from '@deepseek-ai/dsh-client-connection/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** The official feedback plugin's Session-scoped slot face. */
export interface MessageFeedbackProvider {
  for(sessionId: SessionId): MessageFeedbackInjected | undefined
}

const EMPTY_ITEMS: ReadonlyMap<string, MessageFeedbackItem> = new Map()
const EMPTY_PENDING: ReadonlySet<string> = new Set()
const EMPTY_VIEW: MessageFeedbackView = Object.freeze({ status: 'cold', items: new Map(), error: null })
const subscribeEmpty = (): (() => void) => () => {}
const readEmpty = (): MessageFeedbackView => EMPTY_VIEW

export interface MessageFeedbackState {
  readonly enabled: boolean
  readonly items: ReadonlyMap<string, MessageFeedbackItem>
  readonly pending: ReadonlySet<string>
  readonly error: string | undefined
  ensure(): void
  toggle(messageId: MessageId, rating: MessageFeedbackRating): Promise<string | undefined>
}

interface PendingOwner {
  readonly entry: MessageFeedbackInjected | undefined
  readonly items: Set<string>
}

/**
 * Bind one stable official feedback slot face and Session to the transcript.
 * Loading remains cold until a feedback control is focused/hovered or clicked.
 */
export function useMessageFeedback(
  provider: MessageFeedbackProvider | undefined,
  sessionId: SessionId | undefined,
): MessageFeedbackState {
  const sessionEntry = useMemo(() => (
    provider === undefined || sessionId === undefined
      ? undefined
      : provider.for(sessionId)
  ), [provider, sessionId])
  const source = sessionEntry?.hooks.feedback
  const view = useSyncExternalStore(
    source?.subscribe ?? subscribeEmpty,
    source?.getSnapshot ?? readEmpty,
    source?.getSnapshot ?? readEmpty,
  )
  const ownerRef = useRef<PendingOwner>({ entry: sessionEntry, items: new Set() })
  if (ownerRef.current.entry !== sessionEntry) {
    ownerRef.current = { entry: sessionEntry, items: new Set() }
  }
  const [, redrawPending] = useState(0)

  const ensure = useCallback(() => {
    if (sessionEntry !== undefined) void sessionEntry.ensure()
  }, [sessionEntry])

  const toggle = useCallback(async (
    messageId: MessageId,
    rating: MessageFeedbackRating,
  ): Promise<string | undefined> => {
    if (sessionEntry === undefined) return undefined
    const owner = ownerRef.current
    if (owner.entry !== sessionEntry || owner.items.has(messageId)) return undefined
    owner.items.add(messageId)
    redrawPending(value => value + 1)
    const result = await sessionEntry.toggle(messageId, rating)
    // A Session switch replaces the owner synchronously. A late result from
    // the old controller must neither clear the new Session's pending state
    // nor surface its error there.
    if (ownerRef.current !== owner) return undefined
    owner.items.delete(messageId)
    redrawPending(value => value + 1)
    return result.ok ? undefined : result.error.message
  }, [sessionEntry])

  return {
    enabled: sessionEntry !== undefined,
    items: sessionEntry === undefined ? EMPTY_ITEMS : view.items,
    pending: ownerRef.current.items.size === 0 ? EMPTY_PENDING : ownerRef.current.items,
    error: view.error ?? undefined,
    ensure,
    toggle,
  }
}
