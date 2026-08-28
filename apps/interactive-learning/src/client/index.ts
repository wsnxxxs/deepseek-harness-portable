/**
 * Client entry: the composer takeover, the replayable keyed tool renderers, the
 * current-session 笔记 view, and the external 学习库 with its per-message
 * 「留到库里」 action.
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
import { VaultKeepAction, type VaultKeepInjected } from './VaultKeep.tsx'
import {
  notifyVaultRosterRefresh,
  VaultRosterAction,
  type VaultRosterInjected,
} from './VaultRoster.tsx'
import { startVaultGate, type VaultGateOptions } from './vault-gate.ts'
import { subscribeLearningUiLifecycle } from './lifecycle.ts'
import { en, zh } from './locales.ts'

export { subscribeLearningUiLifecycle, type LearningUiLifecycleEvent } from './lifecycle.ts'
export { VaultLibrary, VaultView, type VaultViewInjected } from './VaultView.tsx'
export { VaultKeepAction, messageText, titleFrom, type VaultKeepInjected } from './VaultKeep.tsx'
export {
  notifyVaultRosterRefresh,
  VaultRosterAction,
  candidateFolders,
  type VaultRosterInjected,
} from './VaultRoster.tsx'
export {
  startVaultGate, wantsVaultTabByPreset, LEARNING_PRESET_ID,
  type GateSessions, type GateSessionRow, type VaultGateOptions,
} from './vault-gate.ts'

const NS = 'interactive-learning'
const CHANNEL = '/interactive-learning'
/**
 * Persisted id formerly used by the in-session library tab. Reusing it lets
 * existing sessions migrate from `学习库` to `笔记` without a stale selection.
 */
const VAULT_VIEW_ID = 'vault'
/** After `轨迹` (order 10), so the reading order is chat → trajectory → notes. */
const VAULT_VIEW_ORDER = 20
/** Slot id of the per-message 「留到库里」 action. */
const VAULT_KEEP_ID = 'vault-keep'
/** After the shipped feedback entry (order 10), which owns the leading seat. */
const VAULT_KEEP_ORDER = 20
/** Slot id of the out-of-session sidebar entry. */
const VAULT_ROSTER_ID = 'vault-roster'
/** After the Cordis panel, which occupies the foot's leading seat. */
const VAULT_ROSTER_ORDER = 20
const ROSTER_REFRESH_ENDPOINTS = new Set(['concepts/rate', 'concepts/correct', 'concepts/defer'])
type RecallConnection = { rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<unknown> } }
type VaultGateSessions = VaultGateOptions['sessions']
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
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'learning-input-bridge',
    order: -100,
    locale: NS,
  }, LearningInputBridge))

  // The notes tab is gated rather than registered outright: `conversation.view`
  // is a global list slot, so an unconditional registration would put a
  // "笔记" tab above every ordinary code session too. See `vault-gate.ts`.
  // The sidebar entry is deliberately NOT gated. There is no session out here
  // to gate on, and it removes itself when the roster comes back with no
  // vaults — the same outcome as a gate, decided by data rather than a guess.
  ctx.inject(['connection'], (rosterCtx) => {
    const connection = rosterCtx.get('connection') as RecallConnection | undefined
    if (connection === undefined) return
    rosterCtx.slots.inject('sidebar.footer.action', () => rosterCtx.slots.register({
      name: 'sidebar.footer.action',
      id: VAULT_ROSTER_ID,
      order: VAULT_ROSTER_ORDER,
      locale: NS,
      label: () => rosterCtx.locale.bind(NS)('vaultRosterTitle'),
      inject: (): VaultRosterInjected => ({
        call: async (endpoint, payload) => connection.rpc.call(CHANNEL, endpoint, payload),
      }),
    }, VaultRosterAction))
  })

  ctx.inject(['sessions', 'connection'], (gateCtx) => {
    const sessions = (gateCtx.get('sessions') as { list?: VaultGateSessions } | undefined)?.list
    const connection = gateCtx.get('connection') as RecallConnection | undefined
    if (sessions === undefined || connection === undefined) return
    const t = gateCtx.locale.bind(NS)

    const callVault = async (
      endpoint: string,
      payload: Record<string, unknown>,
    ): Promise<unknown> => {
      const answer = await connection.rpc.call(CHANNEL, endpoint, payload)
      if (ROSTER_REFRESH_ENDPOINTS.has(endpoint)
        && typeof answer === 'object'
        && answer !== null
        && (answer as { ok?: unknown; value?: { status?: unknown } }).ok === true
        && (answer as { value?: { status?: unknown } }).value?.status === 'ok') {
        notifyVaultRosterRefresh()
      }
      return answer
    }

    const cwdOf = (sessionId: string): string | undefined =>
      sessions.getSnapshot().byId[sessionId]?.cwd

    gateCtx.effect(() => startVaultGate({
      sessions,
      probe: async (cwd) => {
        const answer = await callVault('vault/probe', { cwd })
        return (answer as { ok?: boolean; value?: { vault?: boolean } } | undefined)?.ok === true
          && (answer as { value?: { vault?: boolean } }).value?.vault === true
      },
      // The notes view and the per-message 「留到库里」 action ride one
      // learning-session gate. The external library is independent and lives
      // behind the sidebar entry, so the conversation never needs a duplicate
      // material browser.
      //
      // Through `slots.inject`, not a bare `register`: the registration must
      // wait for the slot to be declared, and must be re-applied if the
      // declaring package's epoch changes. `slots.inject` returns the disposer
      // the gate needs, so gating composes with it directly.
      presetOnly: true,
      mount: () => {
        const face = (sessionId: string): VaultKeepInjected => ({
          cwd: cwdOf(sessionId),
          call: (endpoint, payload) => callVault(endpoint, {
            ...payload,
            ...(endpoint === 'material/route-info' || endpoint === 'material/reparse-pages'
              ? { sessionId }
              : {}),
          }),
        })
        const tab = gateCtx.slots.inject('conversation.view', () => gateCtx.slots.register({
          name: 'conversation.view',
          id: VAULT_VIEW_ID,
          order: VAULT_VIEW_ORDER,
          locale: NS,
          // A thunk, so the tab label follows a locale switch without
          // re-registering — the same contract ui-trajectory's label uses.
          label: () => t('learningNotesTab'),
          inject: face,
        }, LearningNotesView))
        const keep = gateCtx.slots.inject('conversation.chat.assistant-actions', () =>
          gateCtx.slots.register({
            name: 'conversation.chat.assistant-actions',
            id: VAULT_KEEP_ID,
            order: VAULT_KEEP_ORDER,
            locale: NS,
            label: () => t('vaultKeep'),
            inject: face,
          }, VaultKeepAction))
        return () => { keep(); tab() }
      },
    }), 'interactive-learning: vault tab gate')
  })
}
