/** Client entry: one composer takeover and one replayable keyed tool renderer. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { LearningComposer, selectLearningActivity } from './LearningComposer.tsx'
import { LearningToolView } from './LearningToolView.tsx'
import { subscribeLearningUiLifecycle } from './lifecycle.ts'
import { en, zh } from './locales.ts'

export { ActivityRendererRegistry, activityRendererRegistry } from './ActivityRenderer.tsx'
export { subscribeLearningUiLifecycle, type LearningUiLifecycleEvent } from './lifecycle.ts'

const NS = 'interactive-learning'
type RecallConnection = { rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<unknown> } }
export const LEARNING_TOOL_VIEW_KEYS = [
  'learning_visual',
  'learning_checkpoint',
  'learning_state_update',
  // Replay support for conversations created by the retired blocking protocol.
  'learning_activity',
  'learning_question',
  'learning_reveal',
] as const

/** Learner-state writes are internal bookkeeping and never produce a card. */
export function LearningStateUpdateToolView(): null {
  return null
}

export const name = 'interactive-learning-client'
export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'interactive-learning: dictionaries')

  // Reuse the existing Client lifecycle stream as the UI-to-transport seam;
  // the payload itself goes through Connection RPC and is handled by the Host
  // broker, so a renderer never owns a second message bus.
  ctx.inject(['connection'], (connectionCtx) => {
    const connection = connectionCtx.get('connection') as RecallConnection | undefined
    if (connection === undefined) return
    connectionCtx.effect(() => subscribeLearningUiLifecycle(event => {
      if (event.name !== 'learning.recall.rated'
        || event.sessionId === undefined
        || event.callId === undefined
        || event.cardId === undefined
        || event.status === undefined) return
      void connection.rpc.call('/interactive-learning', 'recall/feedback', {
        protocol: 'dsh-learning/recall-feedback@1',
        sessionId: event.sessionId,
        callId: event.callId,
        cardId: event.cardId,
        status: event.status,
      }).then(result => {
        // The bridge is intentionally best-effort for rendering. A rejected
        // RPC or an explicit Host error never blocks the learner's click;
        // both are deliberately left to the local replay projection.
        if (typeof result === 'object' && result !== null
          && (result as { ok?: unknown }).ok === false) return
      }).catch(() => {
        // The canonical rating is still retained in sessionStorage.
      })
    }), 'interactive-learning: recall feedback bridge')
  })

  ctx.slots.inject('conversation.composer', () => ctx.slots.register({
    name: 'conversation.composer',
    select: selectLearningActivity,
    priority: -100,
    locale: NS,
  }, LearningComposer))

  for (const key of LEARNING_TOOL_VIEW_KEYS) {
    if (key === 'learning_state_update') {
      ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
        name: 'tool.call.toolview',
        key,
        locale: NS,
      }, LearningStateUpdateToolView))
      continue
    }
    ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
      name: 'tool.call.toolview',
      key,
      locale: NS,
    }, LearningToolView))
  }
}
