import {
  reduceLearnerState,
  type LearnerState,
  type LearnerStateEvent,
  type ObservableLearnerEvent,
} from '../src/learner-state.ts'

/**
 * Shared fixtures for the LearnerState specs.
 *
 * The reducer spec and the session specs construct observations and fold
 * events the same way, so both import them from here instead of keeping
 * divergent copies that drift apart.
 */
export function observation(
  id: string,
  source: ObservableLearnerEvent['source'] = 'learner-message',
  summary = `Observed ${id}`,
  turn = 1,
): ObservableLearnerEvent {
  return { id, source, summary, turn }
}

export function apply(state: LearnerState, ...events: LearnerStateEvent[]): LearnerState {
  return events.reduce(reduceLearnerState, state)
}
