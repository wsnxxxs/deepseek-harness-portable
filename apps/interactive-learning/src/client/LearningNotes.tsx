import { useEffect, useState, useSyncExternalStore } from 'react'
import type { LegacyConversationSlice } from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { isExplicitLearningBoundary } from '../learning-boundary.ts'
import { learningScope } from './tokens.ts'
import css from './LearningNotes.module.css'
import type { LearningLocaleKey } from './locales.ts'

type LearningNotesProps = PropsRuntime<'conversation.composer.dock'> & PropsLocale<'interactive-learning'>

/** The small Chat projection consumed by the learning notes renderer. */
export type LearningNotesSource = Pick<LegacyConversationSlice, 'nodes' | 'runningCalls'>

/** Business face for the learner's current-session notes view. */
export interface LearningNotesViewInjected {
  cwd: string | undefined
  call: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>
}

type LearningNotesViewProps = ConvViewProps
  & InjectFace<LearningNotesViewInjected>
  & PropsLocale<'interactive-learning'>

type LearningInputBridgeSnapshot = Pick<LearningNotesProps, 'input' | 'inputActions'> & {
  sessionId: string
}

let inputBridgeSnapshot: LearningInputBridgeSnapshot | undefined
const inputBridgeListeners = new Set<() => void>()

function notifyInputBridge(): void {
  for (const listener of inputBridgeListeners) listener()
}

function subscribeInputBridge(listener: () => void): () => void {
  inputBridgeListeners.add(listener)
  return () => { inputBridgeListeners.delete(listener) }
}

function readInputBridge(): LearningInputBridgeSnapshot | undefined {
  return inputBridgeSnapshot
}

/**
 * Keeps the normal composer actions available to the notes tab without making
 * the tab own a second input machine. The bridge paints nothing; it only shares
 * the same session-scoped action face with the view ring.
 */
export function LearningInputBridge({ session, input, inputActions }: LearningNotesProps): null {
  useEffect(() => {
    const next: LearningInputBridgeSnapshot = {
      sessionId: String(session.sessionId),
      input,
      inputActions,
    }
    inputBridgeSnapshot = next
    notifyInputBridge()
    return () => {
      if (inputBridgeSnapshot !== next) return
      inputBridgeSnapshot = undefined
      notifyInputBridge()
    }
  }, [input, inputActions, session.sessionId])
  return null
}

function useLearningInputBridge(sessionId: string): LearningInputBridgeSnapshot | undefined {
  const bridge = useSyncExternalStore(subscribeInputBridge, readInputBridge, readInputBridge)
  return bridge?.sessionId === String(sessionId) ? bridge : undefined
}

const LEARNING_CALLS = new Set([
  'learning_visual',
  'learning_checkpoint',
  'learning_activity',
  'learning_question',
  'learning_reveal',
])

const PHASE_LABELS = {
  orient: ['learningNotesPhaseOrient', 'learningNotesPhaseOrient'] as const,
  teach: ['learningNotesPhaseTeach', 'learningNotesPhaseTeach'] as const,
  practice: ['learningNotesPhasePractice', 'learningNotesPhasePractice'] as const,
  repair: ['learningNotesPhaseRepair', 'learningNotesPhaseRepair'] as const,
  transfer: ['learningNotesPhaseTransfer', 'learningNotesPhaseTransfer'] as const,
  complete: ['learningNotesPhaseComplete', 'learningNotesPhaseComplete'] as const,
} as const satisfies Record<string, readonly [LearningLocaleKey, LearningLocaleKey]>

type LearningPhase = keyof typeof PHASE_LABELS

interface PlanProjection {
  objective: string
  steps: readonly { id: string; label: string }[]
  activeStepId?: string
  completedStepIds: ReadonlySet<string>
}

export interface LearningNotesProjection {
  /** There is at least one learning event in this session. */
  visible: boolean
  /** A reset/complete update has closed the current segment. */
  active: boolean
  goal: string | null
  evidence: readonly string[]
  phase: LearningPhase | null
  plan: PlanProjection | null
  /** Used as a light fallback when no explicit plan has been recorded. */
  learningMoves: number
  /** True only when the session contains evaluated, independent fresh transfer. */
  verifiedTransfer: boolean
}

interface UnknownRecord {
  [key: string]: unknown
}

function recordOf(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : undefined
}

function textOf(value: unknown, max = 320): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (text === '') return undefined
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function parseJson(value: unknown): UnknownRecord | undefined {
  if (typeof value !== 'string' || value === '') return undefined
  try { return recordOf(JSON.parse(value)) } catch { return undefined }
}

function nodeCall(node: unknown): { name: string; argsRaw: string; content: unknown } | undefined {
  const record = recordOf(node)
  if (record === undefined) return undefined
  if (record.kind === 'tool-result') {
    const call = recordOf(record.call)
    const name = textOf(call?.name, 80)
    const argsRaw = typeof call?.argsRaw === 'string' ? call.argsRaw : undefined
    if (name === undefined || argsRaw === undefined) return undefined
    return { name, argsRaw, content: record.content }
  }
  if (record.kind === 'tool-call') {
    const name = textOf(record.name, 80)
    const argsRaw = typeof record.argsRaw === 'string' ? record.argsRaw : undefined
    if (name === undefined || argsRaw === undefined) return undefined
    return { name, argsRaw, content: undefined }
  }
  return undefined
}

function nodeContentText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content
    .map(item => recordOf(item)?.type === 'text' ? recordOf(item)?.text : undefined)
    .filter((item): item is string => typeof item === 'string')
    .join('')
}

function userNodeText(node: unknown): string | undefined {
  const record = recordOf(node)
  if (record?.kind !== 'user' && record?.kind !== 'steering') return undefined
  const text = nodeContentText(record.content).trim()
  return text === '' ? undefined : text
}

function precedingUserGoal(nodes: readonly unknown[], order: number): string | undefined {
  for (let index = Math.min(order, nodes.length) - 1; index >= 0; index -= 1) {
    const text = textOf(userNodeText(nodes[index]))
    if (text !== undefined) return text
  }
  return undefined
}

function answerText(value: unknown): string | undefined {
  const record = recordOf(value)
  if (record === undefined) return textOf(value)
  for (const key of ['text', 'explanation', 'answer', 'selected']) {
    const text = textOf(record[key], 320)
    if (text !== undefined) return text
  }
  return undefined
}

function addEvidence(evidence: string[], value: unknown): void {
  const text = textOf(value)
  if (text === undefined || evidence.includes(text)) return
  // The note is a compact projection, not a transcript. Keep the latest few
  // learner-facing points visible and avoid rendering arbitrary tool payloads.
  evidence.push(text)
  if (evidence.length > 5) evidence.splice(0, evidence.length - 5)
}

function isVerifiedTransfer(value: unknown): boolean {
  const item = recordOf(value)
  return item?.kind === 'transfer'
    && item.transferContext === 'fresh'
    && item.correctness === 'correct'
    && item.independence === 'independent'
    && (item.confidence === 'medium' || item.confidence === 'high')
}

function contentNodes(session: LearningNotesSource): readonly unknown[] {
  return session.nodes
}

function allLearningCalls(session: LearningNotesSource): Array<{ call: { name: string; argsRaw: string; content: unknown }; order: number }> {
  const calls = contentNodes(session).flatMap((node, index) => {
    const call = nodeCall(node)
    return call === undefined || (!LEARNING_CALLS.has(call.name) && call.name !== 'learning_state_update')
      ? []
      : [{ call, order: index }]
  })
  // Running calls are not in `nodes` until their result lands. Include them so
  // the note can appear as soon as the first learning move starts streaming.
  for (const [index, running] of session.runningCalls.entries()) {
    const call = nodeCall({ kind: 'tool-call', name: running.name, argsRaw: running.argsRaw })
    if (call === undefined || (!LEARNING_CALLS.has(call.name) && call.name !== 'learning_state_update')) continue
    if (!calls.some(item => item.call.name === call.name && item.call.argsRaw === call.argsRaw)) {
      calls.push({ call, order: contentNodes(session).length + index })
    }
  }
  return calls.sort((left, right) => left.order - right.order)
}

function phaseOf(value: unknown): LearningPhase | null {
  const phase = textOf(value, 30)
  return phase !== undefined && phase in PHASE_LABELS ? phase as LearningPhase : null
}

function stepsOf(value: unknown): readonly { id: string; label: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(step => {
    const item = recordOf(step)
    const id = textOf(item?.id, 80)
    const label = textOf(item?.label, 160)
    return id === undefined || label === undefined ? [] : [{ id, label }]
  })
}

function resultAnswer(content: unknown): string | undefined {
  const text = nodeContentText(content)
  const result = parseJson(text)
  if (result === undefined || result.status !== 'submitted') return undefined
  return answerText(result.response ?? result.answer)
}

/**
 * Project durable learning calls into the small note shown to the learner.
 * This deliberately consumes only visible session nodes; it never exposes
 * learner-state internals such as mastery, confidence, or assessment labels.
 */
export function projectLearningNotes(session: LearningNotesSource): LearningNotesProjection {
  const nodes = contentNodes(session)
  const calls = allLearningCalls(session)
  const evidence: string[] = []
  /** The model's recorded goal, and the fallbacks used when it never records one. */
  let goal: string | null = null
  let requestGoal: string | null = null
  let correctedGoal: string | null = null
  let phase: LearningPhase | null = null
  let plan: PlanProjection | null = null
  let latestTitle: string | null = null
  let closed = false
  let learningMoves = 0
  let verifiedTransfer = false

  for (const { call, order } of calls) {
    const args = parseJson(call.argsRaw)
    if (args === undefined) continue

    // Kept as a FALLBACK, not as the goal. Assigning it here used to make the
    // `goal === null` test below always false, so a `goal_observed` event could
    // only win by being byte-identical to the user's own words — which is to say
    // it never won, and the headline was always the raw request.
    if (requestGoal === null) requestGoal = precedingUserGoal(nodes, order) ?? null

    if (call.name === 'learning_state_update') {
      const action = textOf(args.action, 30)
      if (action === 'reset') {
        closed = true
        goal = null
        requestGoal = null
        correctedGoal = null
        phase = null
        plan = null
        evidence.length = 0
        latestTitle = null
        learningMoves = 0
        verifiedTransfer = false
      }
      const event = recordOf(args.event)
      const correction = recordOf(args.correction)
      const eventType = textOf(event?.type, 60)
      const eventGoal = textOf(event?.goal)
      const correctionGoal = typeof correction?.goal === 'string' ? textOf(correction.goal) : undefined
      // Only the FIRST goal_observed is kept, and only as a fallback below. A
      // model has been observed writing a checkpoint prompt into this field, so
      // the learner's own opening words outrank it; a later event cannot replace
      // an active goal here either, matching the durable state contract's
      // requirement to reset before another topic.
      if (eventGoal !== undefined && goal === null) goal = eventGoal
      if (correctionGoal !== undefined) correctedGoal = correctionGoal
      if (correction?.goal === null) { correctedGoal = null; goal = null; requestGoal = null }
      if (eventType === 'learner_evidence_observed') {
        addEvidence(evidence, recordOf(event?.evidence)?.summary)
        if (isVerifiedTransfer(event?.evidence)) verifiedTransfer = true
      } else if (eventType === 'failed_move_observed') {
        const failedMove = recordOf(event?.failedMove)
        addEvidence(evidence, failedMove?.summary ?? failedMove?.failureReason)
      }
      if (Array.isArray(correction?.evidence)) {
        for (const item of correction.evidence) {
          addEvidence(evidence, recordOf(item)?.summary)
          if (isVerifiedTransfer(item)) verifiedTransfer = true
        }
      }
      const objective = textOf(event?.objective)
      const steps = stepsOf(event?.steps)
      if (eventType === 'plan_observed' && objective !== undefined && steps.length > 0) {
        plan = { objective, steps, activeStepId: textOf(event?.activeStepId, 80), completedStepIds: new Set() }
      }
      if (eventType === 'plan_step_evidenced' && plan !== null) {
        const stepId = textOf(event?.stepId, 80)
        if (stepId !== undefined) plan = {
          ...plan,
          completedStepIds: new Set([...plan.completedStepIds, stepId]),
        }
      }
      const eventPhase = phaseOf(event?.phase)
      if (eventPhase !== null) phase = eventPhase
      const nextMove = textOf(event?.nextMove, 30)
      if (action === 'update' && (eventPhase === 'complete' || nextMove === 'complete')) {
        closed = true
        if (nextMove === 'complete') phase = 'complete'
      }
      if (action === 'correct') {
        const correctedPhase = phaseOf(correction?.phase)
        const correctedNextMove = textOf(correction?.nextMove, 30)
        if (correctedPhase !== null) phase = correctedPhase
        closed = correctedPhase === 'complete' || correctedNextMove === 'complete'
      }
      continue
    }

    learningMoves += 1
    const title = textOf(args.title) ?? textOf(recordOf(args.focus)?.title) ?? textOf(args.prompt)
    if (title !== undefined) latestTitle = title
    const result = resultAnswer(call.content)
    if (result !== undefined) addEvidence(evidence, result)
    // A completed legacy activity can carry a short explanation in `answer`.
    const resultRecord = parseJson(nodeContentText(call.content))
    if (resultRecord?.action === 'submit') addEvidence(evidence, answerText(resultRecord.answer))
    const activityPhase = phaseOf(args.phase)
    if (activityPhase !== null) phase = activityPhase
    if (closed) closed = false
  }

  // The control itself submits an ordinary user message. Projecting explicit
  // boundaries from visible user nodes makes that intent survive refresh even
  // if the model has not also written a completion/reset state update.
  const latestLearningOrder = calls.at(-1)?.order ?? -1
  if (nodes.some((node, index) => {
    const text = index > latestLearningOrder ? userNodeText(node) : undefined
    return text !== undefined && isExplicitLearningBoundary(text)
  })) closed = true

  // Precedence, strongest first. An explicit user correction always wins. After
  // that the learner's own opening request outranks the model's `goal_observed`,
  // which is reached when the request is not in view — a resumed or compacted
  // transcript, or a session opened from an action rather than typed. A plan
  // objective and a figure title are the last resort: the durable state contract
  // is explicit that neither is a goal.
  const headline = correctedGoal ?? requestGoal ?? goal ?? plan?.objective ?? latestTitle
  return {
    visible: calls.length > 0,
    active: calls.length > 0 && !closed,
    goal: headline ?? null,
    evidence,
    phase,
    plan,
    learningMoves,
    verifiedTransfer,
  }
}

function phaseLabel(t: LearningNotesProps['t'], phase: LearningPhase): string {
  return t(PHASE_LABELS[phase][0])
}

function routeProgress(
  notes: LearningNotesProjection,
  t: LearningNotesProps['t'],
): string {
  if (notes.plan !== null) {
    const total = notes.plan.steps.length
    const completed = [...notes.plan.completedStepIds].filter(id => notes.plan?.steps.some(step => step.id === id)).length
    const current = Math.min(total, Math.max(1, completed + (notes.plan.activeStepId === undefined ? 0 : 1)))
    return t('learningNotesStep', { current, total })
  }
  if (notes.phase !== null) return t('learningNotesPhase', { phase: phaseLabel(t, notes.phase) })
  return t('learningNotesStarted', { count: notes.learningMoves })
}

function sendIntent(
  inputActions: LearningNotesProps['inputActions'],
  input: LearningNotesProps['input'],
  prompt: string,
): void {
  // Keep the action on the normal composer path. A busy input owns its draft;
  // controls are disabled by the view until a fresh message can be admitted.
  if (input.phase !== 'plain') return
  inputActions.setDraft(prompt)
  inputActions.submit()
}

function savedSessionNoteBody(notes: LearningNotesProjection, t: LearningNotesViewProps['t']): string {
  const evidence = notes.evidence.length === 0
    ? `- ${t('learningNotesNoEvidence')}`
    : notes.evidence.map(item => `- ${item}`).join('\n')
  const route = routeProgress(notes, t)
  return [
    `# ${notes.goal ?? t('learningNotesUnknown')}`,
    '',
    `## ${t('learningNotesEvidence')}`,
    evidence,
    '',
    `## ${t('learningNotesRoute')}`,
    route,
    notes.plan?.objective ?? '',
    '',
    `> ${notes.verifiedTransfer ? t('learningResultTransfer') : t('learningResultTransferPending')}`,
  ].filter((line, index, lines) => line !== '' || lines[index - 1] !== '').join('\n').trim()
}

function planRatio(notes: LearningNotesProjection): number {
  if (notes.plan === null || notes.plan.steps.length === 0) return 0
  const completed = notes.plan.steps.filter(step => notes.plan?.completedStepIds.has(step.id)).length
  return Math.max(0, Math.min(1, completed / notes.plan.steps.length))
}

/**
 * The full current-session note. It lives in the conversation view ring so
 * the header reads `对话 / 轨迹 / 笔记`; the composer only remains responsible
 * for entering the next learner message.
 */
export function LearningNotesView({
  useSession, useChat, sessionId, cwd, call, t,
}: LearningNotesViewProps) {
  const session = useSession(state => state)
  const chat = useChat(state => state.legacy)
  const notes = projectLearningNotes(chat)
  const bridge = useLearningInputBridge(sessionId)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState('')
  const disabled = session.removed || session.running || bridge?.input.phase !== 'plain'
  const progress = planRatio(notes)

  const save = (): void => {
    if (saving || saved || cwd === undefined || cwd === '' || !notes.visible) return
    setSaving(true)
    setFailure('')
    void (async () => {
      try {
        const answer = await call('notes/save', {
          cwd,
          title: notes.goal ?? t('learningNotesTitle'),
          body: savedSessionNoteBody(notes, t),
          kind: 'note',
          sessionId: String(sessionId),
        })
        const record = typeof answer === 'object' && answer !== null
          ? answer as { ok?: unknown; value?: { status?: unknown } }
          : undefined
        if (record?.ok === true && record.value?.status === 'ok') {
          setSaved(true)
        } else if (record?.value?.status === 'no-vault') {
          setFailure(t('learningNotesSaveNoVault'))
        } else {
          setFailure(t('learningNotesSaveFailed'))
        }
      } catch (cause) {
        setFailure(cause instanceof Error ? cause.message : t('learningNotesSaveFailed'))
      } finally {
        setSaving(false)
      }
    })()
  }

  if (!notes.visible) {
    return (
      <main {...learningScope} className={css.viewRoot} data-learning-notes="view">
        <section className={css.emptyView}>
          <p className={css.viewEyebrow}>{t('learningNotesTab')}</p>
          <h1>{t('learningNotesEmptyTitle')}</h1>
          <p>{t('learningNotesEmptyBody')}</p>
        </section>
      </main>
    )
  }

  return (
    <main {...learningScope} className={css.viewRoot} data-learning-notes="view">
      <header className={css.viewHeader}>
        <div>
          <p className={css.viewEyebrow}>{t('learningNotesTab')}</p>
          <h1>{t('learningNotesTitle')}</h1>
          <p className={css.viewIntro}>{t('learningNotesViewIntro')}</p>
        </div>
        <span className={notes.active ? css.viewStatusActive : css.viewStatusDone}>
          {notes.active ? t('learningNotesStatusActive') : t('learningNotesStatusDone')}
        </span>
      </header>

      <section className={css.goalCard}>
        <p className={css.cardEyebrow}>{t('learningNotesGoal')}</p>
        <p className={css.goalText}>{notes.goal ?? t('learningNotesUnknown')}</p>
      </section>

      <div className={css.noteGrid}>
        <section className={css.noteCard}>
          <div className={css.cardHeading}>
            <h2>{t('learningNotesEvidence')}</h2>
            <span className={css.cardCount}>{notes.evidence.length}</span>
          </div>
          {notes.evidence.length === 0
            ? <p className={css.cardMuted}>{t('learningNotesNoEvidence')}</p>
            : <ul className={css.evidenceList}>{notes.evidence.map((item, index) => (
              <li key={`${item}:${String(index)}`}>{item}</li>
            ))}</ul>}
        </section>

        <section className={css.noteCard}>
          <div className={css.cardHeading}>
            <h2>{t('learningNotesRoute')}</h2>
            {notes.plan !== null && <span className={css.cardCount}>{notes.plan.steps.length}</span>}
          </div>
          <p className={css.cardBody}>{routeProgress(notes, t)}</p>
          {notes.plan !== null && (
            <>
              <div className={css.progressTrack} aria-hidden="true">
                <span className={css.progressFill} style={{ transform: `scaleX(${String(progress)})` }} />
              </div>
              <ol className={css.routeList}>
                {notes.plan.steps.map(step => (
                  <li key={step.id} data-complete={notes.plan?.completedStepIds.has(step.id) || undefined}>
                    {step.label}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>

      {!notes.active && (
        <section className={css.resultView} data-learning-result>
          <p className={css.cardEyebrow}>{t('learningResultTitle')}</p>
          <p>{notes.phase === 'complete' ? t('learningResultComplete') : t('learningResultEnded')}</p>
          <p>{notes.verifiedTransfer ? t('learningResultTransfer') : t('learningResultTransferPending')}</p>
          <p className={css.cardMuted}>{t('learningResultEvidenceNote')}</p>
        </section>
      )}

      <footer className={css.viewActions} aria-label={t('learningNotesViewActions')}>
        {notes.active && bridge !== undefined && (
          <>
            <button
              type="button"
              data-lx-control="secondary"
              disabled={disabled}
              data-learning-segment-action="deepen"
              onClick={() => sendIntent(bridge.inputActions, bridge.input, t('learningNotesDeepenPrompt'))}
            >{t('learningNotesDeepen')}</button>
            <button
              type="button"
              data-lx-control="secondary"
              disabled={disabled}
              data-learning-segment-action="rephrase"
              onClick={() => sendIntent(bridge.inputActions, bridge.input, t('learningNotesRephrasePrompt'))}
            >{t('learningNotesRephrase')}</button>
            <button
              type="button"
              className={css.actionEnd}
              data-lx-control="quiet"
              disabled={disabled}
              data-learning-segment-action="end"
              onClick={() => sendIntent(bridge.inputActions, bridge.input, t('learningNotesEndPrompt'))}
            >{t('learningNotesEnd')}</button>
          </>
        )}
        {!notes.active && bridge !== undefined && (
          <>
            <button
              type="button"
              data-lx-control="secondary"
              disabled={disabled}
              data-learning-result-action="practice"
              onClick={() => sendIntent(bridge.inputActions, bridge.input, t('learningResultPracticePrompt'))}
            >{t('learningResultPractice')}</button>
            {/* Only after evidence of independent fresh transfer. A card offered
                before that would invite saving an explanation the learner has
                not yet shown they can reproduce. */}
            {notes.verifiedTransfer && (
              <button
                type="button"
                data-lx-control="secondary"
                disabled={disabled}
                data-learning-result-action="card"
                onClick={() => sendIntent(bridge.inputActions, bridge.input, t('learningResultCardPrompt'))}
              >{t('learningResultCard')}</button>
            )}
            <button
              type="button"
              className={css.actionEnd}
              data-lx-control="quiet"
              disabled={disabled}
              data-learning-result-action="new-topic"
              onClick={() => sendIntent(bridge.inputActions, bridge.input, t('learningResultNewTopicPrompt'))}
            >{t('learningResultNewTopic')}</button>
          </>
        )}
        <button
          type="button"
          className={css.actionSave}
          data-lx-control="primary"
          {...(saved ? { 'data-lx-state': 'done' } : {})}
          disabled={saving || saved || cwd === undefined || cwd === ''}
          data-learning-save="session-note"
          onClick={save}
        >{saving ? t('learningNotesSaving') : saved ? t('learningNotesSaved') : t('learningNotesSave')}</button>
      </footer>
      {failure !== '' && <p className={css.viewError} role="alert">{failure}</p>}
    </main>
  )
}
