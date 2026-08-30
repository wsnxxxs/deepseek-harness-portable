/** Session-scoped message feedback state for the DCode transcript. */

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  MessageFeedbackController,
  type MessageFeedbackRemote,
  type MessageFeedbackView,
} from '@deepseek-ai/dsh-client-ui-message-feedback/client'
import type { MessageFeedbackItem, MessageFeedbackRating } from '@deepseek-ai/dsh-message-feedback/types'
import type { MessageId } from '@deepseek-ai/dsh-client-connection/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

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
  readonly controller: MessageFeedbackController | undefined
  readonly items: Set<string>
}

/**
 * Bind one stable Remote namespace and Session to the official controller.
 * Loading remains cold until a feedback control is focused/hovered or clicked.
 */
export function useMessageFeedback(
  remote: MessageFeedbackRemote | undefined,
  sessionId: SessionId | undefined,
): MessageFeedbackState {
  const controller = useMemo(() => (
    remote === undefined || sessionId === undefined
      ? undefined
      : new MessageFeedbackController(remote, sessionId)
  ), [remote, sessionId])
  const view = useSyncExternalStore(
    controller?.subscribe ?? subscribeEmpty,
    controller?.getSnapshot ?? readEmpty,
    controller?.getSnapshot ?? readEmpty,
  )
  const ownerRef = useRef<PendingOwner>({ controller, items: new Set() })
  if (ownerRef.current.controller !== controller) {
    ownerRef.current = { controller, items: new Set() }
  }
  const [, redrawPending] = useState(0)

  const ensure = useCallback(() => {
    if (controller !== undefined) void controller.ensure()
  }, [controller])

  const toggle = useCallback(async (
    messageId: MessageId,
    rating: MessageFeedbackRating,
  ): Promise<string | undefined> => {
    if (controller === undefined) return undefined
    const owner = ownerRef.current
    if (owner.controller !== controller || owner.items.has(messageId)) return undefined
    owner.items.add(messageId)
    redrawPending(value => value + 1)
    const result = await controller.toggle(messageId, rating)
    // A Session switch replaces the owner synchronously. A late result from
    // the old controller must neither clear the new Session's pending state
    // nor surface its error there.
    if (ownerRef.current !== owner) return undefined
    owner.items.delete(messageId)
    redrawPending(value => value + 1)
    return result.ok ? undefined : result.error.message
  }, [controller])

  return {
    enabled: remote !== undefined,
    items: controller === undefined ? EMPTY_ITEMS : view.items,
    pending: ownerRef.current.items.size === 0 ? EMPTY_PENDING : ownerRef.current.items,
    error: view.error ?? undefined,
    ensure,
    toggle,
  }
}
