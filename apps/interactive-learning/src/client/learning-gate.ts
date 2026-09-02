/**
 * Gate the current-session learning progress surfaces.
 *
 * `conversation.view` is a global list slot, so an unconditional registration
 * would put the learning progress tab above ordinary sessions. This small gate
 * follows the active session and mounts the tab only for the learning preset.
 * @module @dsh-portable/interactive-learning/src/client/learning-gate
 */

/** Preset id the installer registers the learning experience under. */
export const LEARNING_PRESET_ID = 'learning'

/** The session-row fields the gate reads. */
export interface LearningSessionRow {
  readonly projectionValues?: { readonly agentPreset?: string | null }
  /** Compatibility with older session summaries. */
  readonly agentPreset?: string | null
}

/** The session-list slice the gate reads. */
export interface LearningSessions {
  readonly current: string | undefined
  readonly byId: Readonly<Record<string, LearningSessionRow>>
}

/** Everything the gate needs; injected so it stays independent of React. */
export interface LearningGateOptions {
  readonly sessions: {
    getSnapshot(): LearningSessions
    subscribe(fn: () => void): () => void
  }
  /** Registers the learning-only surfaces and returns their disposer. */
  mount(): () => void
  /** Test seam: called after each evaluation settles, mounted state included. */
  onSettled?(mounted: boolean): void
}

export function wantsLearningViewByPreset(row: LearningSessionRow | undefined): boolean {
  return row?.projectionValues?.agentPreset === LEARNING_PRESET_ID
    || row?.agentPreset === LEARNING_PRESET_ID
}

/** Mount or dispose the learning progress surfaces as the active session changes. */
export function startLearningGate(options: LearningGateOptions): () => void {
  const { sessions, mount, onSettled } = options
  let dispose: (() => void) | undefined
  let stopped = false

  const evaluate = (): void => {
    const snapshot = sessions.getSnapshot()
    const row = snapshot.current === undefined ? undefined : snapshot.byId[snapshot.current]
    const wanted = wantsLearningViewByPreset(row)

    if (stopped) {
      if (dispose !== undefined) { dispose(); dispose = undefined }
      return
    }
    if (wanted && dispose === undefined) dispose = mount()
    else if (!wanted && dispose !== undefined) { dispose(); dispose = undefined }
    onSettled?.(dispose !== undefined)
  }

  const unsubscribe = sessions.subscribe(evaluate)
  evaluate()

  return () => {
    stopped = true
    unsubscribe()
    if (dispose !== undefined) { dispose(); dispose = undefined }
  }
}
