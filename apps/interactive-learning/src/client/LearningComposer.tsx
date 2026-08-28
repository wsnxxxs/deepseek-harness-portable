import { useCallback, useMemo, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ComposerChainProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PendingQuestion, QuestionAnswer } from '@deepseek-ai/dsh-client-ui-user-questions/client'
import {
  CHECKPOINT_RESULT_PROTOCOL,
  RESPONSE_PROTOCOL,
  RESPONSE_PROTOCOL_V2,
  type LearningActivityEnvelopeV1,
  type LearningCheckpointResponseV1,
  type LearningCheckpointResultV1,
  type LearningCheckpointWaitEnvelopeV1,
  type LearningWaitEnvelopeV2,
  type LearningResponseV2,
  type LearningResponseV1,
} from '../protocol-current.ts'
import {
  decodeLearningCheckpointDetail,
  decodeLearningCheckpointQuestionId,
  decodeLearningDetail,
  decodeLearningQuestionId,
  decodeLearningWaitDetail,
  decodeLearningWaitQuestionId,
} from '../transport.ts'
import { ActivityFrame } from './ActivityFrame.tsx'
import { ActivityRenderer } from './ActivityRenderer.tsx'
import type { ActivitySubmission } from './types.ts'
import { RoundActivity } from './RoundActivity.tsx'
import { LearningCheckpoint } from './LearningCheckpoint.tsx'

export type LearningQuestionWait = PendingQuestion

/** Runtime-safe public-client narrowing; alpha.1 exports the carrier as a type. */
export function isPendingQuestion(value: ComposerChainProps['pendingInteraction']): value is PendingQuestion {
  if (value === undefined || !('questions' in value)) return false
  const candidate = value as Partial<PendingQuestion>
  return Array.isArray(candidate.questions)
    && typeof candidate.answer === 'function'
    && typeof candidate.cancel === 'function'
}

export function envelopeOf(wait: LearningQuestionWait): LearningActivityEnvelopeV1 | LearningWaitEnvelopeV2 | LearningCheckpointWaitEnvelopeV1 | undefined {
  if (wait.questions.length !== 1) return undefined
  const question = wait.questions[0]
  if (question === undefined) return undefined
  const checkpoint = decodeLearningCheckpointDetail(question.detail)
  if (checkpoint !== undefined && decodeLearningCheckpointQuestionId(question.id) === checkpoint.waitId) {
    return checkpoint
  }
  const v2 = decodeLearningWaitDetail(question.detail)
  if (v2 !== undefined && decodeLearningWaitQuestionId(question.id) === v2.waitId) return v2
  return decodeLearningQuestionId(question.id) ?? decodeLearningDetail(question.detail)
}

/** Pure composer-chain selector: only package-owned question envelopes are claimed. */
export function selectLearningActivity({ pendingInteraction, session }: ComposerChainProps): LearningQuestionWait | null {
  const currentSessionId = session?.sessionId
  if (!isPendingQuestion(pendingInteraction)
    || currentSessionId === undefined
    || String(pendingInteraction.sessionId) !== String(currentSessionId)) return null
  const envelope = envelopeOf(pendingInteraction)
  if (envelope === undefined) return null
  if ('checkpoint' in envelope && envelope.sessionId !== String(currentSessionId)) return null
  return pendingInteraction
}

type LearningComposerProps =
  { matched: LearningQuestionWait }
  & PropsLocale<'interactive-learning'>

export function LearningComposer({ matched, t }: LearningComposerProps) {
  // Claim the package-owned question so the generic question composer does
  // not duplicate it. The actual interaction lives in the tool call's place
  // in the assistant turn; a pending activity intentionally has no bottom UI.
  void matched
  void t
  return null
}

export function LearningInteraction({ matched, t }: LearningComposerProps) {
  const envelope = useMemo(() => envelopeOf(matched), [matched])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const responseInFlight = useRef<Promise<void> | null>(null)
  const checkpointDraftRecovered = useRef(false)
  const noteCheckpointDraftRecovery = useCallback((value: boolean) => {
    checkpointDraftRecovered.current = value
  }, [])
  if (envelope === undefined) return null

  const send = (
    response: LearningResponseV1 | LearningResponseV2 | LearningCheckpointResultV1,
    checkpointMeta?: { draftRecovered: boolean },
  ): Promise<void> => {
    // React state does not become visible until after the current event batch.
    // Share the exact promise so a double click, repeated keyboard event, or
    // StrictMode replay cannot submit two terminal receipts for one wait.
    if (responseInFlight.current !== null) return responseInFlight.current
    const question = matched.questions[0]
    if (question === undefined) return Promise.resolve()
    const pending = Promise.resolve().then(async (): Promise<void> => {
      setBusy(true)
      setError(null)
      const answer: QuestionAnswer = {
        answers: [{
          id: question.id,
          selected: [],
          custom: JSON.stringify(checkpointMeta === undefined
            ? response
            : { checkpointResult: response, clientMeta: checkpointMeta }),
        }],
      }
      await matched.answer(answer)
    }).catch((cause: unknown) => {
        responseInFlight.current = null
        setBusy(false)
        setError(t('error', { message: cause instanceof Error ? cause.message : String(cause) }))
        throw cause
      })
    responseInFlight.current = pending
    return pending
  }

  if ('checkpoint' in envelope) {
    if (envelope.sessionId !== String(matched.sessionId)) return null
    const common = {
      protocol: CHECKPOINT_RESULT_PROTOCOL,
      checkpointId: envelope.checkpointId,
      receiptId: `receipt_${envelope.waitId}`,
    } as const
    const submit = async (response: LearningCheckpointResponseV1): Promise<void> => {
      await send({ ...common, status: 'submitted', response }, { draftRecovered: checkpointDraftRecovered.current })
    }
    const skip = async (): Promise<void> => {
      await send({ ...common, status: 'skipped', reason: 'learner-skipped' }, { draftRecovered: checkpointDraftRecovered.current })
    }
    const cancel = async (): Promise<void> => {
      await send({ ...common, status: 'cancelled', reason: 'learner-cancelled' }, { draftRecovered: checkpointDraftRecovered.current })
    }
    return (
      <LearningCheckpoint
        checkpoint={envelope.checkpoint}
        storageKey={envelope.waitId}
        busy={busy}
        error={error}
        onSubmit={submit}
        onSkip={skip}
        onCancel={cancel}
        onDraftRecovery={noteCheckpointDraftRecovery}
        t={t}
      />
    )
  }

  if ('waitId' in envelope) {
    // One durable wait owns one durable receipt. A refresh or transport retry
    // therefore replays the same idempotency key instead of minting a new ACK.
    const stableReceiptId = `receipt_${envelope.waitId}`
    const common = {
      protocol: RESPONSE_PROTOCOL_V2,
      activityId: envelope.activityId,
      lessonToken: envelope.lessonToken,
      roundToken: envelope.roundToken,
      seq: envelope.seq,
    } as const
    const storageKey = `${envelope.waitId}:${envelope.activityId}:${envelope.phase}:${envelope.seq}`
    const submitAnswer = async (answer: import('../protocol-current.ts').LearningJson, interactionState: import('../protocol-current.ts').LearningJson) => {
      await send({ ...common, phase: 'question', action: 'submit', answer, interactionState, receiptId: stableReceiptId })
    }
    const continueReveal = async (animation: { completed: true; reducedMotion?: boolean }) => {
      await send({ ...common, phase: 'reveal', action: 'continue', animation, receiptId: stableReceiptId })
    }
    const cancelRound = async () => {
      await send(envelope.phase === 'question'
        ? { ...common, phase: 'question', action: 'cancel', receiptId: stableReceiptId }
        : { ...common, phase: 'reveal', action: 'cancel', animation: { completed: false }, receiptId: stableReceiptId })
    }
    return (
      <RoundActivity
        activity={envelope.activity}
        storageKey={storageKey}
        onSubmitAnswer={envelope.phase === 'question' ? submitAnswer : undefined}
        onContinue={envelope.phase === 'reveal' ? continueReveal : undefined}
        onCancel={cancelRound}
        t={t}
      />
    )
  }

  const respond = (response: LearningResponseV1): void => {
    const question = matched.questions[0]
    if (question === undefined) return
    setBusy(true)
    setError(null)
    void send(response).catch(() => {})
  }

  const submit = ({ answer, interactionState }: ActivitySubmission): void => respond({
    protocol: RESPONSE_PROTOCOL,
    activityId: envelope.activityId,
    action: 'submit',
    answer,
    interactionState,
  })

  const skip = (): void => respond({
    protocol: RESPONSE_PROTOCOL,
    activityId: envelope.activityId,
    action: 'skip',
  })

  const cancel = (): void => {
    setBusy(true)
    setError(null)
    void matched.cancel().catch((cause: unknown) => {
      setBusy(false)
      setError(t('error', { message: cause instanceof Error ? cause.message : String(cause) }))
    })
  }

  return (
    <ActivityFrame
      key={matched.key}
      activityId={envelope.activityId}
      activity={envelope.activity}
      busy={busy}
      error={error}
      onSkip={skip}
      onCancel={cancel}
      t={t}
    >
      <ActivityRenderer activity={envelope.activity} busy={busy} onSubmit={submit} t={t} />
    </ActivityFrame>
  )
}
