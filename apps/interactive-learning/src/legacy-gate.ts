/**
 * Compatibility-only Question/Reveal coordinator.
 *
 * V2 is retained for pending waits and replay of older Clients. Keeping its
 * lesson state, receipt fence, call deduplication, and user-question wait in
 * this module lets the ordinary Host entry load none of that machinery until
 * a caller actually invokes presentQuestion/presentReveal/presentGate.
 */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { UserQuestionError, type UserQuestionService } from '@deepseek-ai/dsh-user-questions'
import {
  RESPONSE_PROTOCOL_V2,
  LearningProtocolError,
  type LearningActivityV2,
  type LearningResponseV2,
} from './protocol-current.ts'
import { parseLearningActivityV2, parseLearningResponseV2 } from './legacy-protocol.ts'
import {
  encodeLearningWaitDetail,
  learningWaitQuestionId,
} from './host-transport.ts'
import type { LearningLifecycleEvent, PresentLearningGateRequest } from './broker.ts'

type LegacyGateAbortReason = 'session-aborted' | 'client-response-timeout' | 'plugin-disposed'

class LegacyGateWaitAbort extends Error {
  constructor(readonly reason: LegacyGateAbortReason) {
    super(reason)
    this.name = 'LegacyGateWaitAbort'
  }
}

interface LessonState {
  sessionId: string
  lessonToken: string
  roundToken: string
  seq: number
  status: 'question-pending' | 'awaiting-reveal' | 'reveal-pending' | 'ready-question'
}

interface LegacyGateHost {
  readonly ctx: Context
  readonly defaultTimeoutMs: number
  hasRichClient(): boolean
  emit(event: Omit<LearningLifecycleEvent, 'at'>): void
}

function trimOldest<K, V>(values: Map<K, V>, limit = 1_024): void {
  if (values.size <= limit) return
  const oldest = values.keys().next().value as K | undefined
  if (oldest !== undefined) values.delete(oldest)
}

/** Lazy compatibility coordinator for the retired V2 Question/Reveal path. */
export class LegacyLearningGate {
  private readonly lessons = new Map<string, LessonState>()
  private readonly receipts = new Map<string, LearningResponseV2>()
  private readonly gateCalls = new Map<string, Promise<LearningResponseV2>>()
  private readonly pendingActivities = new Map<AbortController, { reason?: LegacyGateAbortReason }>()
  private disposed = false

  constructor(private readonly host: LegacyGateHost) {}

  get pendingCount(): number {
    return this.pendingActivities.size
  }

  /** Abort waits and release all V2-only state when the owning Broker dies. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const [controller, state] of this.pendingActivities) {
      state.reason = 'plugin-disposed'
      controller.abort(new LegacyGateWaitAbort(state.reason))
    }
    this.pendingActivities.clear()
    this.lessons.clear()
    this.receipts.clear()
    this.gateCalls.clear()
  }

  async present(request: PresentLearningGateRequest): Promise<LearningResponseV2> {
    const callKey = request.callId === undefined || request.agent === undefined
      ? undefined : `${String(request.agent.session.id)}:${request.callId}`
    const prior = callKey === undefined ? undefined : this.gateCalls.get(callKey)
    if (prior !== undefined) return prior
    const pending = this.presentOnce(request)
    if (callKey !== undefined) {
      this.gateCalls.set(callKey, pending)
      trimOldest(this.gateCalls)
    }
    try {
      return await pending
    } catch (cause) {
      if (callKey !== undefined) this.gateCalls.delete(callKey)
      throw cause
    }
  }

  private async presentOnce(request: PresentLearningGateRequest): Promise<LearningResponseV2> {
    const activity = parseLearningActivityV2(request.activity)
    const activityId = randomUUID()
    const waitId = randomUUID()
    const sessionId = request.agent === undefined ? '' : String(request.agent.session.id)
    let lessonToken: string
    let roundToken: string
    let lesson: LessonState | undefined

    if (activity.phase === 'question') {
      if (activity.lessonToken === undefined) {
        if (activity.seq !== 0) throw new LearningProtocolError(['a new lesson must start with activity.seq 0'])
        for (const [tokenValue, active] of this.lessons) {
          if (active.sessionId === sessionId) this.lessons.delete(tokenValue)
        }
        lessonToken = randomUUID()
        roundToken = randomUUID()
        if (sessionId !== '') {
          lesson = { sessionId, lessonToken, roundToken, seq: activity.seq, status: 'question-pending' }
          this.lessons.set(lessonToken, lesson)
        }
      } else {
        lessonToken = activity.lessonToken
        lesson = this.lessons.get(lessonToken)
        if (lesson === undefined) throw new LearningProtocolError(['activity.lessonToken is not active'])
        if (lesson.sessionId !== sessionId) throw new LearningProtocolError(['activity.lessonToken belongs to another session'])
        if (lesson.status !== 'ready-question') throw new LearningProtocolError(['the previous reveal must resolve before the next question'])
        if (activity.seq !== lesson.seq + 1) throw new LearningProtocolError(['activity.seq must advance by exactly one'])
        roundToken = randomUUID()
        lesson.seq = activity.seq
        lesson.roundToken = roundToken
        lesson.status = 'question-pending'
      }
    } else {
      lessonToken = activity.lessonToken
      roundToken = activity.roundToken
      lesson = this.lessons.get(lessonToken)
      if (lesson === undefined) throw new LearningProtocolError(['activity.lessonToken is not active'])
      if (lesson.sessionId !== sessionId) throw new LearningProtocolError(['activity.lessonToken belongs to another session'])
      if (lesson.status !== 'awaiting-reveal') throw new LearningProtocolError(['reveal is not valid in the current lesson state'])
      if (lesson.seq !== activity.seq) throw new LearningProtocolError(['activity.seq does not match the answered question'])
      if (lesson.roundToken !== roundToken) throw new LearningProtocolError(['activity.roundToken does not match the answered question'])
      lesson.status = 'reveal-pending'
    }

    const eventBase = {
      phase: activity.phase,
      activityId,
      lessonToken,
      roundToken,
      seq: activity.seq,
      ...(request.callId === undefined ? {} : { callId: request.callId }),
    } as const
    if (activity.phase === 'reveal' || activity.lessonToken !== undefined) {
      this.host.emit({ name: 'learning.model.next_step_started', ...eventBase })
    }
    this.host.emit({ name: 'learning.call.args_completed', ...eventBase })
    this.host.emit({ name: 'learning.protocol.validated', ...eventBase })

    const fallback = (reason: string, action: 'skip' | 'cancel' = 'skip'): LearningResponseV2 => activity.phase === 'question'
      ? {
          protocol: RESPONSE_PROTOCOL_V2, phase: 'question', activityId, lessonToken, roundToken,
          seq: activity.seq, action, receiptId: randomUUID(),
          interactionState: { reason, fallbackMarkdown: activity.fallbackMarkdown },
        }
      : {
          protocol: RESPONSE_PROTOCOL_V2, phase: 'reveal', activityId, lessonToken, roundToken,
          seq: activity.seq, action, animation: { completed: false }, receiptId: randomUUID(),
          interactionState: { reason, fallbackMarkdown: activity.fallbackMarkdown },
        }

    let result: LearningResponseV2
    if (!this.host.hasRichClient()) result = fallback('client-capability-unavailable')
    else if (request.agent === undefined) result = fallback('agent-context-unavailable')
    else {
      const timeoutMs = request.timeoutMs ?? this.host.defaultTimeoutMs
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) result = fallback('client-response-timeout')
      else {
        try {
          result = await this.waitForResponse({ request, activity, activityId, waitId, lessonToken, roundToken, eventBase, timeoutMs })
        } catch (cause) {
          this.lessons.delete(lessonToken)
          throw cause
        }
      }
    }

    if (lesson !== undefined) {
      if (result.action === 'cancel' || result.action === 'skip') this.lessons.delete(lessonToken)
      else if (activity.phase === 'question') lesson.status = 'awaiting-reveal'
      else lesson.status = 'ready-question'
    }
    this.host.emit({ name: 'learning.wait.resolved', ...eventBase })
    return result
  }

  private async waitForResponse(input: {
    request: PresentLearningGateRequest
    activity: LearningActivityV2
    activityId: string
    waitId: string
    lessonToken: string
    roundToken: string
    eventBase: Omit<LearningLifecycleEvent, 'name' | 'at'>
    timeoutMs: number
  }): Promise<LearningResponseV2> {
    const { request, activity, activityId, waitId, lessonToken, roundToken, eventBase, timeoutMs } = input
    const controller = new AbortController()
    const state: { reason?: LegacyGateAbortReason } = {}
    this.pendingActivities.set(controller, state)
    const abortFromSession = (): void => {
      state.reason = 'session-aborted'
      controller.abort(new LegacyGateWaitAbort(state.reason))
    }
    if (request.signal?.aborted === true) abortFromSession()
    else request.signal?.addEventListener('abort', abortFromSession, { once: true })
    const timer = setTimeout(() => {
      state.reason = 'client-response-timeout'
      controller.abort(new LegacyGateWaitAbort(state.reason))
    }, timeoutMs)
    timer.unref?.()

    const fallback = (reason: string, action: 'skip' | 'cancel' = 'skip'): LearningResponseV2 => activity.phase === 'question'
      ? { protocol: RESPONSE_PROTOCOL_V2, phase: 'question', activityId, lessonToken, roundToken, seq: activity.seq, action, receiptId: randomUUID(), interactionState: { reason, fallbackMarkdown: activity.fallbackMarkdown } }
      : { protocol: RESPONSE_PROTOCOL_V2, phase: 'reveal', activityId, lessonToken, roundToken, seq: activity.seq, action, animation: { completed: false }, receiptId: randomUUID(), interactionState: { reason, fallbackMarkdown: activity.fallbackMarkdown } }

    try {
      const questions = (this.host.ctx as Context & { userQuestions: UserQuestionService }).userQuestions
      const ask = questions.ask({
        questions: [{
          id: learningWaitQuestionId(waitId),
          question: activity.phase === 'question' ? activity.prompt : 'Review this reveal, then continue.',
          detail: encodeLearningWaitDetail({
            waitId, activityId, lessonToken, roundToken, seq: activity.seq, phase: activity.phase, activity,
            ...(request.callId === undefined ? {} : { callId: request.callId }),
          }),
        }],
        agent: request.agent as Agent,
        signal: controller.signal,
      })
      this.host.emit({ name: 'learning.wait.registered', ...eventBase })
      if (activity.phase === 'reveal') this.host.emit({ name: 'learning.reveal.received', ...eventBase })
      const aborted = new Promise<never>((_resolve, reject) => {
        if (controller.signal.aborted) reject(controller.signal.reason)
        else controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true })
      })
      const answer = await Promise.race([ask, aborted])
      const item = answer.answers[0]
      const custom = item?.custom?.trim()
      let response: LearningResponseV2
      if (custom === undefined || custom === '') response = fallback('user-skipped')
      else {
        let decoded: unknown
        try { decoded = JSON.parse(custom) as unknown } catch { decoded = undefined }
        if (typeof decoded === 'object' && decoded !== null
          && (decoded as { protocol?: unknown }).protocol === RESPONSE_PROTOCOL_V2) {
          response = parseLearningResponseV2(decoded, { activityId, phase: activity.phase, lessonToken, roundToken, seq: activity.seq })
        } else if (activity.phase === 'question') {
          response = {
            protocol: RESPONSE_PROTOCOL_V2, phase: 'question', activityId, lessonToken, roundToken,
            seq: activity.seq, action: 'submit', answer: { text: custom }, receiptId: randomUUID(),
            interactionState: { renderer: 'markdown-fallback' },
          }
        } else response = fallback('rich-client-required')
      }
      const prior = this.receipts.get(response.receiptId)
      if (prior !== undefined) {
        if (JSON.stringify(prior) !== JSON.stringify(response)) throw new LearningProtocolError(['response.receiptId was reused for different content'])
        response = prior
      } else {
        this.receipts.set(response.receiptId, response)
        trimOldest(this.receipts)
      }
      if (activity.phase === 'question' && response.action === 'submit') {
        this.host.emit({ name: 'learning.answer.accepted', ...eventBase })
      } else if (activity.phase === 'reveal' && response.action === 'continue') {
        this.host.emit({ name: 'learning.continue.accepted', ...eventBase })
      }
      return response
    } catch (cause) {
      if (cause instanceof LearningProtocolError) throw cause
      if (cause instanceof LegacyGateWaitAbort) return fallback(cause.reason, cause.reason === 'client-response-timeout' ? 'skip' : 'cancel')
      const code = cause instanceof UserQuestionError ? (cause as UserQuestionError & { code: string }).code : undefined
      if (code === 'ASK_CANCELLED') return fallback('user-cancelled', 'cancel')
      if (code === 'ASK_ABORTED') {
        const reason = state.reason ?? 'session-aborted'
        return fallback(reason, reason === 'client-response-timeout' ? 'skip' : 'cancel')
      }
      if (code === 'NO_PROVIDER' || code === 'DELEGATED_CALLER' || code === 'CALLER_NOT_LIVE') return fallback(code.toLowerCase())
      throw cause
    } finally {
      clearTimeout(timer)
      request.signal?.removeEventListener('abort', abortFromSession)
      this.pendingActivities.delete(controller)
    }
  }
}
