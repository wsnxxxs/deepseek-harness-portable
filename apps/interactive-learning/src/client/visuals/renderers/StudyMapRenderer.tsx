/** `study_map`: a navigable overview of supplied source material. */
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { useVisualLabels, type LearningVisualV4Labels } from '../core/labels.ts'
import { toneAt } from '../core/format.ts'
import { EmptyFigure } from '../core/shell-parts.tsx'
import type { RendererProps, StudyMapContent } from '../core/types.ts'
import { elementState } from '../state/visual-state.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/study.module.css'

function studyRoleLabel(role: StudyMapContent['concepts'][number]['role'], labels: LearningVisualV4Labels): string | undefined {
  if (role === 'foundation') return labels.roleFoundation
  if (role === 'core') return labels.roleCore
  if (role === 'extension') return labels.roleExtension
  if (role === 'practice') return labels.rolePractice
  return undefined
}

function studyMasteryLabel(mastery: StudyMapContent['concepts'][number]['mastery'], labels: LearningVisualV4Labels): string {
  if (mastery === 'transfer') return labels.mastered
  if (mastery === 'emerging') return labels.studyProgress
  return labels.unrated
}

export function StudyMapRenderer({ content, focus }: RendererProps<StudyMapContent>) {
  const labels = useVisualLabels()
  const id = useId()
  const conceptView = content.view === 'concepts'
  const conceptById = useMemo(() => new Map(content.concepts.map(concept => [concept.id, concept])), [content.concepts])
  const dependencyLevels = useMemo(() => {
    const levelCache = new Map<string, number>()
    const levelFor = (conceptId: string, trail: ReadonlySet<string> = new Set()): number => {
      const cached = levelCache.get(conceptId)
      if (cached !== undefined) return cached
      const concept = conceptById.get(conceptId)
      if (concept === undefined || trail.has(conceptId)) return 0
      const nextTrail = new Set(trail)
      nextTrail.add(conceptId)
      const level = Math.max(0, ...(concept.prerequisiteIds ?? []).map(prerequisiteId => levelFor(prerequisiteId, nextTrail) + 1))
      levelCache.set(conceptId, level)
      return level
    }
    const levels: Array<StudyMapContent['concepts']> = []
    for (const concept of content.concepts) {
      const level = levelFor(concept.id)
      levels[level] ??= []
      levels[level]!.push(concept)
    }
    return levels.filter((level): level is StudyMapContent['concepts'] => level !== undefined)
  }, [conceptById, content.concepts])
  const focusedConcept = content.concepts.find(concept => focus.currentIds.has(concept.id))
  const focusedSection = content.sections.find(section => focus.currentIds.has(section.id))
  const [sectionId, setSectionId] = useState(focusedConcept?.sectionId ?? focusedSection?.id ?? content.sections[0]?.id ?? '')
  const [selectedConceptId, setSelectedConceptId] = useState<string | undefined>(focusedConcept?.id)
  useEffect(() => {
    const concept = content.concepts.find(item => focus.currentIds.has(item.id))
    const section = content.sections.find(item => focus.currentIds.has(item.id))
    if (concept !== undefined) { setSectionId(concept.sectionId); setSelectedConceptId(concept.id) }
    else if (section !== undefined) setSectionId(section.id)
  }, [content.concepts, content.sections, focus.currentIds])
  const section = content.sections.find(item => item.id === sectionId) ?? content.sections[0]
  const concepts = content.concepts.filter(concept => concept.sectionId === section?.id)
  const selectedConcept = selectedConceptId === undefined ? undefined : conceptById.get(selectedConceptId)
  const selectSection = (nextId: string): void => { setSectionId(nextId); setSelectedConceptId(undefined) }
  const sectionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1
    const nextIndex = (index + delta + content.sections.length) % content.sections.length
    const next = content.sections[nextIndex]
    if (next !== undefined) {
      selectSection(next.id)
      const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      buttons?.[nextIndex]?.focus()
    }
  }
  // An accepted payload with nothing in it says so, rather than presenting an
  // empty frame that reads as a broken renderer.
  if (content.concepts.length === 0 && content.sections.length === 0) return <EmptyFigure />

  return (
    <div className={shell.rendererStack} data-view={content.view ?? 'material'}>
      <div className={css.studySource}>
        <span>{labels.studySource}</span><strong>{content.sourceLabel}</strong>
        {content.goal === undefined ? null : <p><b>{labels.studyGoal}</b>{content.goal}</p>}
      </div>
      {conceptView ? null : (
        <div className={css.studyDependencyMap} role="img" aria-label={`${labels.prerequisite} ${labels.studyConcepts}`} aria-hidden="true" style={{ gridTemplateColumns: `repeat(${Math.max(1, dependencyLevels.length)}, minmax(0, 1fr))` }}>
          <div className={css.studyDependencyHeader}><span>{labels.prerequisite}</span><span>{labels.studyConcepts}</span></div>
          <div className={css.studyDependencyTrack}>
            {dependencyLevels.map((level, levelIndex) => (
              <div className={css.studyDependencyLevel} key={`level-${String(levelIndex)}`}>
                {level.map(concept => <span key={concept.id} className={css.studyDependencyNode} data-role={concept.role}>{concept.label}</span>)}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={css.studyLayout}>
        <nav className={css.studySections} role="tablist" aria-label={labels.studySections}>
          {content.sections.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`${shell.control} ${css.sectionTab}`}
              role="tab"
              id={`${id}-tab-${item.id}`}
              aria-controls={`${id}-panel`}
              tabIndex={item.id === section?.id ? 0 : -1}
              aria-selected={item.id === section?.id}
              data-visual-state={elementState(item.id, focus, content.concepts.filter(concept => concept.sectionId === item.id).map(concept => concept.id))}
              data-visual-id={item.id}
              onClick={() => selectSection(item.id)}
              onKeyDown={event => sectionKeyDown(event, index)}
            >
              <span>{index + 1}</span><strong>{item.label}</strong>{item.anchor === undefined ? null : <small>{item.anchor}</small>}
            </button>
          ))}
        </nav>
        <section
          className={css.studySectionPanel}
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={section === undefined ? undefined : `${id}-tab-${section.id}`}
        >
          {section === undefined ? null : (
            <header>
              <div>
                <span>{section.anchor === undefined ? labels.studySummary : `${labels.studyAnchor} · ${section.anchor}`}</span>
                <h4>{section.label}</h4>
              </div>
              {section.summary === undefined ? null : <p>{section.summary}</p>}
            </header>
          )}
          <div className={css.studyConcepts} role="group" aria-label={labels.studyConcepts}>
            {concepts.map((concept, index) => {
              const role = studyRoleLabel(concept.role, labels)
              const prerequisites = (concept.prerequisiteIds ?? []).map(prerequisiteId => conceptById.get(prerequisiteId)?.label ?? prerequisiteId)
              return (
                <button
                  key={concept.id}
                  type="button"
                  className={`${shell.control} ${css.conceptCard}`}
                  data-tone={toneAt(concept.tone, index)}
                  data-role={concept.role}
                  data-mastery={concept.mastery}
                  data-due={concept.due === undefined ? undefined : 'true'}
                  data-stale={concept.stale === true ? 'true' : undefined}
                  data-visual-state={concept.id === selectedConceptId ? 'selected' : elementState(concept.id, focus)}
                  data-selected={concept.id === selectedConceptId || undefined}
                  data-visual-id={concept.id}
                  onClick={() => setSelectedConceptId(concept.id)}
                >
                  <span>{conceptView ? studyMasteryLabel(concept.mastery, labels) : role ?? labels.studyConcepts}</span><strong>{concept.label}</strong>
                  {conceptView ? (
                    <small>
                      {concept.due === undefined ? null : <><b>{labels.studyDue}</b>{concept.due}</>}
                      {concept.stale === true ? <><b>{labels.studyStale}</b></> : null}
                    </small>
                  ) : <small><b>{labels.prerequisite}</b>{prerequisites.length === 0 ? labels.noPrerequisite : prerequisites.join(' → ')}</small>}
                </button>
              )
            })}
          </div>
        </section>
      </div>
      <div className={shell.selectionSlot}>
        {selectedConcept === undefined ? <p className={shell.interactionHint}>{labels.studyInteractionHint}</p> : (
          <aside className={css.studyDetail} aria-live="polite">
            <div><span>{conceptView ? studyMasteryLabel(selectedConcept.mastery, labels) : studyRoleLabel(selectedConcept.role, labels) ?? labels.studyConcepts}</span><strong>{selectedConcept.label}</strong></div>
            <p>{selectedConcept.detail ?? labels.noDetail}</p>
            <dl>
              <dt>{conceptView ? labels.studyProgress : labels.prerequisite}</dt>
              <dd>{conceptView ? studyMasteryLabel(selectedConcept.mastery, labels) : (selectedConcept.prerequisiteIds ?? []).map(prerequisiteId => conceptById.get(prerequisiteId)?.label ?? prerequisiteId).join(' → ') || labels.noPrerequisite}</dd>
              {conceptView && selectedConcept.due !== undefined ? <><dt>{labels.studyDue}</dt><dd>{selectedConcept.due}</dd></> : null}
              {conceptView && selectedConcept.stale === true ? <><dt>{labels.studyStale}</dt><dd>{labels.studyStale}</dd></> : null}
            </dl>
            <button type="button" className={`${shell.control} ${shell.closeButton}`} onClick={() => setSelectedConceptId(undefined)} aria-label={labels.closeDetail}>×</button>
          </aside>
        )}
      </div>
    </div>
  )
}
