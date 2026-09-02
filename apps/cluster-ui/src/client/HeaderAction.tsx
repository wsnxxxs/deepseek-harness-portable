/**
 * Cluster mode's seat in the official DSH conversation header.
 *
 * This is what makes the plugin stand on its own. The published service lets a
 * workbench place the panel wherever its own layout wants it; this entry needs
 * no such cooperation, so an assembly with nothing but the official UI still
 * gets the roster and the shared task board.
 *
 * The seat owns only the disclosure — whether there is a Team worth offering,
 * the trigger, the anchored sheet, and dismissal. Everything inside it is the
 * same {@link ClusterPanel} the service publishes, so the two placements can
 * never drift apart.
 * @module @dsh-portable/cluster-ui/client/HeaderAction
 */

import { useCallback, useEffect, useRef, useState, type FunctionComponent } from 'react'
import { IconUserOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ClusterPanelProps } from '../contract.ts'
import { useAsync } from './deps.ts'
import { CLUSTER_NS } from './locales.ts'
import { clusterScope } from './tokens.ts'
import css from './HeaderAction.module.css'

/** Business face injected by the plugin body. */
export interface ClusterHeaderInjected {
  /** The same panel the Cluster service publishes. */
  readonly Panel: FunctionComponent<ClusterPanelProps>
  /**
   * Whether this session's Team has anything an operator would want to see.
   *
   * Every session has a Team view — a solo session answers with a roster of
   * one and an empty board — so a header control offered unconditionally would
   * appear on every conversation in the product, including deployments that
   * never orchestrate anything. This is the question that keeps the seat
   * honest, and it is asked in terms of the Team rather than in terms of any
   * one distribution's preset names.
   */
  hasTeam(sessionId: SessionId): Promise<boolean>
}

/** Full props of the Cluster conversation-header action. */
export type ClusterHeaderActionProps =
  PropsRuntime<'conversation.session.header.actions'> & ClusterHeaderInjected & PropsLocale<typeof CLUSTER_NS>

/** Disclose the Cluster roster and task board from the conversation header. */
export function ClusterHeaderAction({ sessionId, Panel, hasTeam, t }: ClusterHeaderActionProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const team = useAsync(async (signal) => {
    signal.throwIfAborted()
    return await hasTeam(sessionId)
  }, [hasTeam, sessionId])

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  // A session switch is a different Team; collapsing avoids showing one
  // Team's board under another conversation's header for a frame.
  useEffect(() => { setOpen(false) }, [sessionId])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && anchorRef.current?.contains(event.target) === true) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close(true)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [close, open])

  // A failed probe reads the same as no Team: the seat is an affordance, and
  // an unreachable Host has louder places to say so than this header.
  if (team.value !== true) return null

  return (
    <div className={css.anchor} ref={anchorRef} {...clusterScope}>
      <button
        ref={triggerRef}
        type="button"
        className={`${css.trigger} ${open ? css.triggerOpen : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('title')}
        title={t('title')}
        onClick={() => { setOpen(value => !value) }}
      >
        <IconUserOutline16 />
      </button>
      {open
        ? (
          <div className={css.sheet} role="dialog" aria-label={t('title')}>
            <Panel sessionId={sessionId} />
          </div>
        )
        : null}
    </div>
  )
}
