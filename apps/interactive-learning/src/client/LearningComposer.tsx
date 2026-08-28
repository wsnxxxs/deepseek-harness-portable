import { useCallback, useMemo, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ComposerChainProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PendingQuestion, QuestionAnswer } from '@deepseek-ai/dsh-client-ui-user-questions/client'
import {
  CHECKPOINT_RESULT_PROTOCOL,
  type LearningCheckpointResponseV1,
  type LearningCheckpointResultV1,
  type LearningCheckpointWaitEnvelopeV1,
} from '../protocol-current.ts'
import {
  decodeLearningCheckpointDetail,
  decodeLearningCheckpointQuestionId,
} from '../transport.ts'
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

export function envelopeOf(wait: LearningQuestionWait): LearningCheckpointWaitEnvelopeV1 | undefined {
  if (wait.questions.length !== 1) return undefined
  const question = wait.questions[0]
  if (question === undefined) return undefined
  const checkpoint = decodeLearningCheckpointDetail(question.detail)
  return checkpoint !== undefined && decodeLearningCheckpointQuestionId(question.id) === checkpoint.waitId
    ? checkpoint
    : undefined
}

/** Pure composer-chain selector: only package-owned question envelopes are claimed. */
export function selectLearningActivity({ pendingInteraction, session }: ComposerChainProps): LearningQuestionWait | null {
  const currentSessionId = session?.sessionId
  if (!isPendingQuestion(pendingInteraction)
    || currentSessionId === undefined
    || String(pendingInteraction.sessionId) !== String(currentSessionId)) return null
  const envelope = envelopeOf(pendingInteraction)
  if (envelope === undefined || envelope.sessionId !== String(currentSessionId)) return null
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
    response: LearningCheckpointResultV1,
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

  if (envelope.sessionId !== String(matched.sessionId)) return null
  {
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

}
