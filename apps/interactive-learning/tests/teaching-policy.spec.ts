import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LEARNING_TEACHING_POLICY,
  LEARNING_TEACHING_POLICY_CORE,
  LEARNING_GRADED_POLICY,
  LEARNING_VISUAL_POLICY,
  LEARNING_CHINESE_TEMPLATES,
  buildLearningTeachingPolicy,
} from '../src/teaching-policy.ts'

const root = resolve(import.meta.dirname, '..')
const agentSource = readFileSync(join(root, 'src/agent.ts'), 'utf8')
const skillSource = readFileSync(
  join(root, 'preset/learning/skills/interactive-teaching/SKILL.md'),
  'utf8',
)

function expectPolicyToCover(...phrases: string[]): void {
  for (const phrase of phrases) expect(LEARNING_TEACHING_POLICY).toContain(phrase)
}

describe('authoritative compact Learning teaching policy', () => {
  it('is the single standing-prompt source while the Skill remains a reference router', () => {
    expect(agentSource).toContain("import { buildLearningTeachingPolicy } from './teaching-policy.ts'")
    expect(agentSource).toContain('buildLearningTeachingPolicy({')
    expect(agentSource).not.toContain('Optimize for durable learner capability')
    expect(agentSource).not.toContain('Never repeat the same hint in new words')

    expect(skillSource).toContain('single authoritative source')
    expect(skillSource).toContain('routes only to construction references')
    expect(skillSource).toContain('must not restate, weaken, or override the standing policy')
    expect(skillSource).not.toContain('Choose the smallest useful move')
    expect(skillSource).not.toContain('Continue from evidence')
    expect(skillSource).not.toContain('Know when to stop')
  })

  it('keeps route-independent adaptation and defers the per-route move', () => {
    expectPolicyToCover(
      'The route for this turn is supplied with the turn',
      'teach a clear goal and calibrate an underspecified one',
      'Fluent terminology sets the teaching level, not the response shape',
      'decide whether the learner is impatient or genuinely stuck',
      'keep them doing the last step',
      'Check when a deadline appeared',
      'Do the first step for them, change representation, and rebuild with them driving',
      'do not open with a questionnaire',
    )
    // The Host has already classified the turn and states the result in the
    // `learning:turn-route` context. Re-teaching the classification here spent
    // tokens on every turn and let the two disagree.
    for (const perRoute of [
      'short “learn X”, “teach me X”, or “understand X” request with unknown level and goal as calibration',
      'complete/full overview',
      'concrete blocker with opening time pressure gets direct help first',
    ]) {
      expect(LEARNING_TEACHING_POLICY).not.toContain(perRoute)
    }
  })
  it('pins the one-step evidence loop and repair behavior', () => {
    expectPolicyToCover(
      'Each response makes one cognitive move',
      'minimum explanation plus one concrete example',
      'Ask at most one focused learner question',
      'Use observable evidence only',
      'preserve the correct part and raise difficulty slightly',
      'isolate the precise error, add new information, and offer a nearby retry',
      'concept gap needs the concept',
      'procedure gap needs a distinct parallel example',
    )
  })

  it('makes non-repetition and transfer explicit stateful requirements', () => {
    expectPolicyToCover(
      'Never repeat a hint, analogy, question, or explanation fingerprint',
      'shrink the concept or change representation and add new information',
      'require an explanation, prediction, or application in a fresh situation',
      'Stop after independent fresh transfer',
      'do not force, a next step',
      'A plan is tentative and never a completion checklist',
      'phase, last explanation/question, learner-response assessment, current misconception, next move, and move fingerprint',
    )
  })

  it('keeps rich interactions optional and detailed protocols out of standing context', () => {
    expectPolicyToCover(
      'Ordinary conversation is the default',
      'Use a visual only when one relationship is materially clearer',
      'use a checkpoint only when the learner\'s response will change the next move',
      'visual or checkpoint, never both',
      'a skip, cancel, or failed render must never block the lesson',
      'Load the interactive-teaching Skill for visual construction or supplied-source handling',
      'Never invent facts, citations, source anchors, learner evidence, or confidence',
      '`learning_state_update`',
      'Low-confidence evidence may guide support but cannot establish mastery',
    )
    expect(LEARNING_TEACHING_POLICY).not.toContain('2 to 48 nodes')
    expect(LEARNING_TEACHING_POLICY).not.toContain('Mermaid')
    expect(LEARNING_TEACHING_POLICY).not.toContain('formula_steps')
  })

  it('keeps the standing policy within the compact prompt budget', () => {
    // This is a conservative proxy, not a model-specific tokenizer claim.
    // Raised from 5000 when diagnosis, pressure, and tone moved back into the
    // standing layer from Skill references. Those three decide behavior on
    // ordinary turns, and a rule reachable only behind a load-the-Skill
    // decision the model rarely makes is not in the prompt in any real sense.
    // The cap still fails if a construction reference is pasted in wholesale.
    expect(LEARNING_TEACHING_POLICY.length).toBeLessThan(7000)
    expect(Math.ceil(LEARNING_TEACHING_POLICY.length / 4)).toBeGreaterThanOrEqual(800)
    expect(Math.ceil(LEARNING_TEACHING_POLICY.length / 4)).toBeLessThan(1750)
  })

  it('keeps graded and visual guidance out of the core until the route needs it', () => {
    expect(LEARNING_TEACHING_POLICY_CORE).toBe(LEARNING_TEACHING_POLICY)
    expect(LEARNING_TEACHING_POLICY_CORE).not.toContain(LEARNING_GRADED_POLICY)
    expect(LEARNING_TEACHING_POLICY_CORE).not.toContain(LEARNING_VISUAL_POLICY)
    expect(LEARNING_TEACHING_POLICY_CORE).not.toContain(LEARNING_CHINESE_TEMPLATES)
    const core = buildLearningTeachingPolicy({ route: 'teach-minimum', language: 'en' })
    expect(core).toBe(LEARNING_TEACHING_POLICY_CORE)
    const graded = buildLearningTeachingPolicy({ graded: true, route: 'teach-minimum', visual: true, language: 'zh' })
    expect(graded).toContain(LEARNING_GRADED_POLICY)
    expect(graded).toContain(LEARNING_VISUAL_POLICY)
    expect(graded).toContain(LEARNING_CHINESE_TEMPLATES)
  })
})
