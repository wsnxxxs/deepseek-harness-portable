/**
 * Runtime grounding check for `study_map`.
 *
 * A study map is the one visual that claims to describe a person's own source.
 * Until now its `sections[].anchor` was free text, so "Chapter 9" could be
 * emitted for a document that has eight chapters and nothing would notice — the
 * prohibition existed only as a sentence in a reference file with no executor.
 *
 * Inside a learning vault the parse is available, so the claim becomes checkable
 * and this module refuses the map instead of rendering it. The refusal names the
 * real sections, which is what lets the model fix the map on the next step
 * rather than guess again.
 * @module @dsh-portable/interactive-learning/src/material-validation
 */

import type { LearningStudyMapV4 } from './protocol-current.ts'
import { readConceptCards } from './concept-cards.ts'
import { normalizeQuote } from './ingest/types.ts'
import { anchorTargetsOf, resolveAnchorTarget, type AnchorTarget } from './material-anchor.ts'
import { readAllStructures, type TopicVault } from './topic-vault.ts'

/** One reason a study map was refused. */
export interface StudyMapViolation {
  /** Payload path, in the same spelling the protocol validator uses. */
  path: string
  detail: string
}

/** Real section labels offered back to the model, bounded. */
const MAX_SUGGESTIONS = 8

/**
 * Check one study map against the vault's parsed structures.
 *
 * @param vault - The vault this session runs in.
 * @param content - The study-map payload, already schema-valid.
 * @returns every violation found; empty means the map is grounded.
 */
export async function validateStudyMapAgainstVault(
  vault: TopicVault,
  content: LearningStudyMapV4,
): Promise<readonly StudyMapViolation[]> {
  if (content.view === 'concepts') {
    return (await readConceptCards(vault)).length > 0
      ? []
      : [{
          path: 'visual.content',
          detail: 'This learning folder has no approved concept cards to display. '
            + 'Complete an independent fresh transfer and confirm the concept-card proposal first.',
        }]
  }
  const structures = await readAllStructures(vault)
  if (structures.length === 0) {
    return [{
      path: 'visual.content',
      detail: 'This learning folder holds no parsed material, so there is no source to map. '
        + 'Ask the learner to add their material, or teach without a study map.',
    }]
  }

  const targets: readonly AnchorTarget[] = structures.flatMap(structure => anchorTargetsOf(structure))
  const violations: StudyMapViolation[] = []

  const sourceLabel = normalizeQuote(content.sourceLabel).toLowerCase()
  const knownSources = structures.map(structure => ({
    id: structure.sourceId,
    title: normalizeQuote(structure.title).toLowerCase(),
  }))
  const labelsASource = knownSources.some(source =>
    sourceLabel.includes(source.id.toLowerCase())
    || (source.title !== '' && (sourceLabel.includes(source.title) || source.title.includes(sourceLabel))))
  if (!labelsASource) {
    violations.push({
      path: 'visual.content.sourceLabel',
      detail: `'${content.sourceLabel}' names no source in this learning folder. `
        + `Known sources: ${structures.map(structure => `${structure.sourceId} (${structure.title})`).join(', ')}.`,
    })
  }

  for (const [index, section] of content.sections.entries()) {
    const path = `visual.content.sections[${String(index)}]`
    const anchor = typeof section.anchor === 'string' ? section.anchor.trim() : ''
    if (anchor === '') {
      // Inside a vault an unanchored section is an unverifiable claim about the
      // learner's own document, which is exactly what this check exists to stop.
      violations.push({
        path: `${path}.anchor`,
        detail: `Section '${section.label}' has no anchor. Every section of a supplied source `
          + 'must carry the anchor that learning_material_map returned.',
      })
      continue
    }
    if (resolveAnchorTarget(anchor, targets) === undefined) {
      violations.push({
        path: `${path}.anchor`,
        detail: `Anchor '${anchor}' matches no section of the parsed material.`,
      })
    }
  }

  if (violations.length > 0) {
    violations.push({
      path: 'visual.content',
      detail: `Real sections include: ${suggestions(targets).join(' | ')}.`,
    })
  }
  return violations
}

/** A bounded sample of genuine anchors, for the refusal message. */
function suggestions(targets: readonly AnchorTarget[]): readonly string[] {
  return targets
    .slice(0, MAX_SUGGESTIONS)
    .map(target => target.page === undefined
      ? `${target.sourceId}#${target.label}`
      : `${target.sourceId}#${target.label} (p.${target.page})`)
}

/** Render violations as the message the refusing tool result carries. */
export function formatStudyMapViolations(violations: readonly StudyMapViolation[]): string {
  return [
    'study_map is not grounded in this learning folder\'s parsed material:',
    ...violations.map(violation => `- ${violation.path}: ${violation.detail}`),
    'Call learning_material_map to get the real structure, then rebuild the map from it. '
      + 'Do not invent a section, chapter, or page.',
  ].join('\n')
}
