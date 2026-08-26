#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import {
  OFFLINE_REFERENCE_CANDIDATES,
  OFFLINE_TRAJECTORY_CANDIDATES,
  gradeTeachingSuite,
  gradeTeachingTrajectorySuite,
  type TeachingEvalCandidate,
  type TeachingTrajectoryCandidate,
} from './eval.ts'
import {
  OFFLINE_MATERIAL_CANDIDATES,
  gradeMaterialSuite,
  type MaterialGroundingCandidate,
} from './eval-material.ts'

interface EvalInput {
  teaching: readonly TeachingEvalCandidate[]
  trajectories: readonly TeachingTrajectoryCandidate[]
  material: readonly MaterialGroundingCandidate[]
  fixture: boolean
}

function classify(values: readonly unknown[]): Omit<EvalInput, 'fixture'> {
  const teaching: TeachingEvalCandidate[] = []
  const trajectories: TeachingTrajectoryCandidate[] = []
  const material: MaterialGroundingCandidate[] = []
  for (const value of values) {
    if (typeof value !== 'object' || value === null) {
      teaching.push(value as TeachingEvalCandidate)
      continue
    }
    // A material candidate carries the parsed structure its turns are graded
    // against; that is what distinguishes it from a teaching trajectory.
    if (Array.isArray((value as { sections?: unknown }).sections)) {
      material.push(value as MaterialGroundingCandidate)
    } else if (Array.isArray((value as { turns?: unknown }).turns)) {
      trajectories.push(value as TeachingTrajectoryCandidate)
    } else teaching.push(value as TeachingEvalCandidate)
  }
  return { teaching, trajectories, material }
}

async function candidatesFrom(path: string | undefined): Promise<EvalInput> {
  if (path === undefined) return {
    teaching: OFFLINE_REFERENCE_CANDIDATES,
    trajectories: OFFLINE_TRAJECTORY_CANDIDATES,
    material: OFFLINE_MATERIAL_CANDIDATES,
    fixture: true,
  }
  const text = await readFile(path, 'utf8')
  const parsed = text.trimStart().startsWith('[')
    ? JSON.parse(text) as unknown[]
    : text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as unknown)
  return { ...classify(parsed), fixture: false }
}

const input = process.argv[2]
const candidates = await candidatesFrom(input)
const verdicts = [
  ...(candidates.teaching.length === 0 ? [] : gradeTeachingSuite(candidates.teaching)),
  ...(candidates.trajectories.length === 0 ? [] : gradeTeachingTrajectorySuite(candidates.trajectories)),
  ...(candidates.material.length === 0 ? [] : gradeMaterialSuite(candidates.material)),
]
for (const verdict of verdicts) {
  // A file path proves only that an external grader input was supplied. It is
  // deliberately not labelled CAPTURE: provenance must come from the runner
  // that retained the raw model transcript/events (for example model-canary).
  process.stdout.write(`${candidates.fixture ? 'FIXTURE' : 'EXTERNAL_INPUT'} ${verdict.passed ? 'PASS' : 'FAIL'} ${verdict.caseId}\n`)
  for (const check of verdict.checks.filter(item => !item.passed)) {
    process.stdout.write(`  - ${check.name}: ${check.detail}\n`)
  }
}
if (verdicts.some(verdict => !verdict.passed)) process.exitCode = 1
