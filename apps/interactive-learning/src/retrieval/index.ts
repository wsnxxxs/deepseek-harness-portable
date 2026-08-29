/** General retrieval facade; the existing teaching planner remains one mode. */

import {
  DEFAULT_RETRIEVAL_BUDGET_CHARS,
  executeRetrievalPlan,
  keyPhrases,
  planRetrieval,
  type RetrievalPlan,
  type RetrievalResult,
} from '../material-retrieval.ts'
import { createInitialLearnerState, type LearnerState } from '../learner-state.ts'
import type { Space } from '../space/index.ts'

export type RetrievalPlanner = 'ad-hoc' | 'teaching' | 'artifact'

/** Named value for callers that want to inject the existing teaching planner. */
export const TeachingPlanner: RetrievalPlanner = 'teaching'

export interface RetrieveRequest {
  space: Space
  query?: string
  scope?: readonly string[]
  budgetChars?: number
  planner?: RetrievalPlanner
  preferAnchors?: readonly string[]
  state?: LearnerState
  sessionQuery?: Parameters<typeof executeRetrievalPlan>[3]
}

function adHocPlan(
  query: string,
  budgetChars: number,
  preferredAnchors: readonly string[],
): RetrievalPlan {
  return {
    intent: 'verbatim-anchor',
    rationale: 'the caller supplied a direct library query',
    terms: keyPhrases(query),
    preferredAnchors,
    includeLearnerPrior: false,
    budgetChars,
  }
}

/** Retrieve from a Space using ad-hoc, teaching, or future artifact planning. */
export async function retrieve(request: RetrieveRequest): Promise<RetrievalResult> {
  const budgetChars = request.budgetChars ?? DEFAULT_RETRIEVAL_BUDGET_CHARS
  const state = request.state ?? createInitialLearnerState('library-retrieval')
  const planner = request.planner ?? (request.state === undefined ? 'ad-hoc' : 'teaching')
  const preferredAnchors = request.preferAnchors ?? state.sourceAnchors.slice(0, 4)
  const planned = planner === 'teaching'
    ? planRetrieval(state, budgetChars, request.query ?? '')
    : adHocPlan(request.query ?? '', budgetChars, preferredAnchors)
  const plan = planned === undefined
    ? adHocPlan('', budgetChars, preferredAnchors)
    : { ...planned, preferredAnchors }
  return await executeRetrievalPlan(
    request.space,
    plan,
    state,
    request.sessionQuery,
    { sourceIds: request.scope },
  )
}

export type { RetrievalPlan, RetrievalResult } from '../material-retrieval.ts'
