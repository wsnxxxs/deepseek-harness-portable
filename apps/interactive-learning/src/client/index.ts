/**
 * Client entry: the composer takeover, the replayable keyed tool renderers, the
 * current-session learning progress view.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-user-questions/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-agent-presets/types'
import { LearningComposer, selectLearningActivity } from './LearningComposer.tsx'
import { LearningToolView } from './LearningToolView.tsx'
import { LearningInputBridge, LearningNotesView } from './LearningNotes.tsx'
import { LearningSurface } from './LearningSurface.tsx'
import { startLearningGate, type LearningGateOptions } from './learning-gate.ts'
import { subscribeLearningUiLifecycle } from './lifecycle.ts'
import { en, zh } from './locales.ts'

export { subscribeLearningUiLifecycle, type LearningUiLifecycleEvent } from './lifecycle.ts'

const NS = 'interactive-learning'
const CHANNEL = '/interactive-learning'
type RecallConnection = { rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<unknown> } }
export const LEARNING_TOOL_VIEW_KEYS = [
  'learning_visual',
  'learning_checkpoint',
  'learning_state_update',
] as const

/** Learner-state writes are internal bookkeeping and never produce a card. */
export function LearningStateUpdateToolView(): null {
  return null
}

export const name = 'interactive-learning-client'
export const inject = ['slots', 'locale', 'connection']

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
      void connection.rpc.call('/api', 'interactive-learning/recall/feedback', {
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

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'learning-surface',
    order: -100,
    locale: NS,
  }, LearningSurface))

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

  // The view owns the visible note surface. This invisible bridge keeps its
  // action buttons on the host composer path without duplicating the composer.
  ctx.inject(['sessions'], (gateCtx) => {
    const sessions = (gateCtx.get('sessions') as { list?: LearningGateOptions['sessions'] } | undefined)?.list
    if (sessions === undefined) return
    const t = gateCtx.locale.bind(NS)
    gateCtx.effect(() => startLearningGate({
      sessions,
      mount: () => {
        const bridge = gateCtx.slots.inject('conversation.composer.dock', () => gateCtx.slots.register({
          name: 'conversation.composer.dock',
          id: 'learning-input-bridge',
          order: -100,
          locale: NS,
        }, LearningInputBridge))
        const tab = gateCtx.slots.inject('conversation.view', () => gateCtx.slots.register({
          name: 'conversation.view',
          id: 'learning-progress',
          order: 20,
          locale: NS,
          label: () => t('learningNotesTab'),
        }, LearningNotesView))
        return () => { bridge(); tab() }
      },
    }), 'interactive-learning: learning progress gate')
  })
}
