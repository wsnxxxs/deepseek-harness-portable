/**
 * The vault panel: a window onto the topic folder, not another view of the chat.
 *
 * Four sections behind one rail: material (read-only), notes (free Markdown,
 * plus the pending-card inbox), concepts (prose edits and two narrow schedule
 * outlets) and review (a local deck). The ordinary browse, edit and review
 * actions are Host-side file I/O over the session's own vault; the material
 * pane also exposes an explicit visual re-read that calls a model.
 * @module @dsh-portable/interactive-learning/src/client/VaultView
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { learningScope } from './tokens.ts'
import { ConceptsSection, ReviewSection, type Ask, type Concept, type ConceptList } from './VaultConcepts.tsx'
import { NotesSection, type Note, type NoteList } from './VaultNotes.tsx'
import { ReparseControl } from './VaultReparse.tsx'
import css from './VaultView.module.css'

/** Business face supplied by the slot registration. */
export interface VaultViewInjected {
  /** The session's immutable working directory; the vault is this folder. */
  cwd: string | undefined
  /** One Connection RPC call on the `/interactive-learning` channel. */
  call: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>
}

type VaultViewProps = ConvViewProps
  & InjectFace<VaultViewInjected>
  & PropsLocale<'interactive-learning'>

/** Milliseconds of quiet before a query is sent; typing must not thrash the disk. */
const SEARCH_DEBOUNCE_MS = 220

/** Below this many characters a section is a heading with no body of its own. */
const THIN_SECTION_CHARS = 1

interface Degradation { kind: string; pages?: number[]; count?: number; afterPage?: number; reason?: string; extension?: string; module?: string }
interface Section { id: string; label: string; level: number; page?: number; charCount: number; degraded: boolean }
interface Source {
  sourceId: string
  title: string
  originalName: string
  parser: string
  bytes: number
  ingestedAt: string
  sourcePath: string
  totalChars: number
  sectionCount: number
  lastPage: number
  degradation: Degradation[]
  sections: Section[]
}
interface Summary {
  status: string
  title: string
  root: string
  sources: number
  concepts: number
  notes: number
  pendingNotes: number
  due: number
  degradedSources: number
}
interface Hit {
  path: string
  title: string
  section?: string
  sourceId?: string
  sectionId?: string
  page?: number
  excerpt: string
  matched: string[]
}
interface SearchResult { status: string; terms: string[]; material: Hit[]; concepts: Hit[]; notes: Hit[] }
interface Reading {
  status: string
  sourceId: string
  sectionId: string
  label: string
  headingPath: string[]
  page?: number
  body: string
  truncated: boolean
  children: Section[]
}

type Phase = 'loading' | 'no-vault' | 'ready' | 'error'

function shaped<T>(value: unknown): T | undefined {
  return typeof value === 'object' && value !== null ? value as T : undefined
}

/** `{ ok, value }` envelopes are unwrapped here so no caller repeats the shape. */
function unwrap<T>(answer: unknown): T | undefined {
  const record = shaped<{ ok?: unknown; value?: unknown; error?: unknown }>(answer)
  if (record?.ok !== true) {
    const error = shaped<{ message?: unknown }>(record?.error)
    const message = typeof error?.message === 'string' && error.message.trim() !== ''
      ? error.message
      : 'vault RPC failed'
    throw new Error(message)
  }
  return shaped<T>(record.value)
}

function kilo(chars: number): string {
  return chars >= 1000 ? `${(chars / 1000).toFixed(1)}k` : String(chars)
}

function megabytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${String(bytes)} B`
}

function pageList(pages: readonly number[] | undefined): string {
  if (pages === undefined || pages.length === 0) return ''
  const sorted = [...pages].sort((left, right) => left - right)
  const runs: string[] = []
  let start = sorted[0] as number
  let previous = start
  for (const page of sorted.slice(1)) {
    if (page === previous + 1) { previous = page; continue }
    runs.push(start === previous ? String(start) : `${String(start)}–${String(previous)}`)
    start = page
    previous = page
  }
  runs.push(start === previous ? String(start) : `${String(start)}–${String(previous)}`)
  return runs.join(', ')
}

/**
 * One degradation entry as a sentence a learner can act on.
 *
 * Deliberately concrete about WHICH pages: "some pages could not be read" is the
 * kind of summary that makes a person distrust the whole import, while "pages
 * 12–15 are images" tells them exactly what to go check.
 */
function degradationText(item: Degradation, t: VaultViewProps['t']): string {
  switch (item.kind) {
    case 'image-only-pages':
      return t('vaultDegradeImageOnly', { pages: pageList(item.pages) })
    case 'multi-column-guess':
      return t('vaultDegradeMultiColumn', { pages: pageList(item.pages) })
    case 'formula-dropped':
      return t('vaultDegradeFormula', { count: String(item.count ?? 0) })
    case 'truncated':
      return t('vaultDegradeTruncated', { page: String(item.afterPage ?? 0), reason: item.reason ?? '' })
    case 'unsupported-format':
      return t('vaultDegradeUnsupported', { extension: item.extension ?? '' })
    case 'parser-unavailable':
      return t('vaultDegradeParserMissing', { extension: item.extension ?? '', module: item.module ?? '' })
    case 'empty-source':
      return item.reason ?? t('vaultDegradeEmpty')
    default:
      return item.kind
  }
}

/**
 * Coverage strip: one segment per section, width proportional to its own text.
 *
 * Sections rather than pages, because sections are what the parsers actually
 * persist. A page-proportional bar would need a page COUNT, and no parser
 * records one — rendering "47 of 51" would mean inventing the denominator.
 * This bar is exact, works for formats with no pages at all (docx), and shows
 * the thing a person actually wants: where the text is, and where it is missing.
 */
function CoverageStrip({ source, t }: { source: Source; t: VaultViewProps['t'] }) {
  const total = source.sections.reduce((sum, section) => sum + Math.max(section.charCount, 0), 0)
  if (source.sections.length === 0) {
    return <div className={css.stripEmpty}>{t('vaultNoStructure')}</div>
  }
  return (
    <div
      className={css.strip}
      role="img"
      aria-label={t('vaultCoverageAria', {
        sections: String(source.sectionCount),
        chars: kilo(source.totalChars),
      })}
    >
      {source.sections.map((section) => {
        const thin = section.charCount < THIN_SECTION_CHARS
        const share = total === 0 ? 1 : Math.max(section.charCount, total / 400)
        const label = section.page === undefined
          ? section.label
          : `${section.label} · p.${String(section.page)}`
        return (
          <i
            key={section.id}
            className={[
              css.segment,
              section.degraded ? css.segmentDegraded : '',
              thin ? css.segmentThin : '',
            ].filter(Boolean).join(' ')}
            style={{ flexGrow: share }}
            title={`${label} · ${kilo(section.charCount)}`}
          />
        )
      })}
    </div>
  )
}

/** One source row: provenance, coverage, honest degradation, then its tree. */
function SourceCard({
  source, reading, onOpen, onClose, ask, onReparsed, t,
}: {
  source: Source
  reading: Reading | undefined
  onOpen: (sourceId: string, sectionId: string) => void
  onClose: () => void
  ask: Ask
  onReparsed: () => void
  t: VaultViewProps['t']
}) {
  const [expanded, setExpanded] = useState(false)
  const degraded = source.degradation.length > 0
  const visuallyDegraded = source.degradation.some(item => item.kind === 'image-only-pages')

  useEffect(() => {
    if (reading !== undefined) setExpanded(true)
  }, [reading])

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <h3 className={css.cardTitle}>{source.title}</h3>
        <span className={css.meta}>
          {source.parser}
          {source.lastPage > 0 ? ` · ${t('vaultReadTo', { page: String(source.lastPage) })}` : ''}
          {` · ${t('vaultSectionCount', { count: String(source.sectionCount) })}`}
          {` · ${kilo(source.totalChars)}`}
        </span>
        <span className={css.metaRight}>{megabytes(source.bytes)}</span>
      </header>

      <CoverageStrip source={source} t={t} />

      {degraded && (
        <ul className={css.chips}>
          {source.degradation.map((item, index) => (
            <li key={`${item.kind}-${String(index)}`} className={css.chipWarn}>
              {degradationText(item, t)}
            </li>
          ))}
        </ul>
      )}

      {visuallyDegraded && (
        <ReparseControl
          sourceId={source.sourceId}
          degraded={visuallyDegraded}
          ask={ask}
          onDone={onReparsed}
          t={t}
        />
      )}

      <footer className={css.cardFoot}>
        <button
          type="button"
          className={css.button}
          aria-expanded={expanded}
          onClick={() => { setExpanded(value => !value) }}
        >
          {expanded ? t('vaultHideSections') : t('vaultShowSections')}
        </button>
        <code className={css.path}>{source.sourcePath}</code>
      </footer>

      {expanded && (
        <ol className={css.tree}>
          {source.sections.map(section => (
            <li key={section.id} style={{ paddingInlineStart: `${String(Math.min(section.level - 1, 4) * 14)}px` }}>
              <button
                type="button"
                className={[
                  css.treeRow,
                  reading?.sectionId === section.id && reading.sourceId === source.sourceId ? css.treeRowOpen : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  if (reading?.sectionId === section.id && reading.sourceId === source.sourceId) onClose()
                  else onOpen(source.sourceId, section.id)
                }}
              >
                <span className={css.treeLabel}>{section.label}</span>
                {section.degraded && <span className={css.treeFlag}>{t('vaultSectionDegraded')}</span>}
                <span className={css.treeMeta}>
                  {section.page === undefined ? '' : `p.${String(section.page)} · `}
                  {kilo(section.charCount)}
                </span>
              </button>
              {reading?.sectionId === section.id && reading.sourceId === source.sourceId && (
                <article className={css.reading}>
                  <p className={css.readingCrumbs}>
                    {reading.headingPath.join(' / ')}
                    {reading.page === undefined ? '' : ` · p.${String(reading.page)}`}
                  </p>
                  <pre className={css.readingBody}>{reading.body === '' ? t('vaultSectionEmpty') : reading.body}</pre>
                  {reading.truncated && <p className={css.readingNote}>{t('vaultReadTruncated')}</p>}
                  {reading.children.length > 0 && (
                    <p className={css.readingNote}>
                      {t('vaultReadChildren', { count: String(reading.children.length) })}
                    </p>
                  )}
                </article>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** One search group; rendered only when it has hits, so empties never pad the page. */
function HitGroup({
  label, hits, onOpen,
}: {
  label: string
  hits: readonly Hit[]
  onOpen?: (sourceId: string, sectionId: string) => void
}) {
  if (hits.length === 0) return null
  return (
    <section className={css.group}>
      <h4 className={css.groupTitle}>{label}<span className={css.groupCount}>{hits.length}</span></h4>
      <ul className={css.hits}>
        {hits.map((hit, index) => {
          const openable = onOpen !== undefined && hit.sourceId !== undefined && hit.sectionId !== undefined
          const body = (
            <>
              <span className={css.hitHead}>
                <span className={css.hitTitle}>{hit.title}</span>
                {hit.section !== undefined && <span className={css.hitSection}>{hit.section}</span>}
                {hit.page !== undefined && <span className={css.hitPage}>p.{hit.page}</span>}
              </span>
              <span className={css.hitExcerpt}>{hit.excerpt}</span>
              <code className={css.hitPath}>{hit.path}</code>
            </>
          )
          return (
            <li key={`${hit.path}-${hit.sectionId ?? String(index)}`} className={css.hit}>
              {openable
                ? (
                  <button
                    type="button"
                    className={css.hitButton}
                    onClick={() => { onOpen(hit.sourceId as string, hit.sectionId as string) }}
                  >
                    {body}
                  </button>
                )
                : <div className={css.hitStatic}>{body}</div>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * Rail sections, in reading order: what you were given, what you kept, what you
 * made, what is due.
 *
 * Notes sit between material and concepts because that is the actual path a
 * kept explanation travels — read it, keep it, and only then, if the learner
 * ever demonstrates the idea, does it reach a card.
 */
const SECTIONS = [
  { id: 'material', label: 'vaultNavMaterial' },
  { id: 'notes', label: 'vaultNavNotes' },
  { id: 'concepts', label: 'vaultNavConcepts' },
  { id: 'review', label: 'vaultNavReview' },
] as const

type SectionId = typeof SECTIONS[number]['id']

/**
 * The panel.
 *
 * Every fetch keys off the session's `cwd`. A session whose folder is not a
 * vault gets the `no-vault` screen rather than an error: for a learning session
 * that is simply the state before the first attachment, and the screen's job is
 * to say how the folder becomes one.
 *
 * Concepts and the review queue are fetched with the summary rather than lazily
 * per section, because the rail badges the due count — the number has to be
 * right before anyone clicks "review" to find out.
 */
export function VaultView({ cwd, call, t }: VaultViewProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [failure, setFailure] = useState('')
  const [section, setSection] = useState<SectionId>('material')
  const [summary, setSummary] = useState<Summary | undefined>(undefined)
  const [sources, setSources] = useState<readonly Source[]>([])
  const [concepts, setConcepts] = useState<ConceptList | undefined>(undefined)
  const [notes, setNotes] = useState<NoteList | undefined>(undefined)
  const [queue, setQueue] = useState<ConceptList | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | undefined>(undefined)
  const [reading, setReading] = useState<Reading | undefined>(undefined)
  const [searchFailure, setSearchFailure] = useState('')
  const [readingFailure, setReadingFailure] = useState('')
  /** Bumped to re-run the whole load; a re-read rewrites the source on disk. */
  const [reloads, setReloads] = useState(0)
  const live = useRef(true)

  const reload = useCallback(() => { setReloads(value => value + 1) }, [])

  useEffect(() => () => { live.current = false }, [])

  const ask = useCallback(async <T,>(
    endpoint: string,
    payload: Record<string, unknown> = {},
  ): Promise<T | undefined> => {
    if (cwd === undefined || cwd === '') return undefined
    const value = unwrap<T>(await call(endpoint, { ...payload, cwd }))
    if (value === undefined) throw new Error(`${endpoint} did not return a usable response`)
    return value
  }, [call, cwd])

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    setFailure('')
    setSearchFailure('')
    setReadingFailure('')
    setReading(undefined)
    setResults(undefined)
    void (async () => {
      try {
        const [head, list, cards, due, kept] = await Promise.all([
          ask<Summary>('vault/summary'),
          ask<{ status: string; sources: Source[] }>('vault/sources'),
          ask<ConceptList>('concepts/list'),
          ask<ConceptList>('concepts/review'),
          ask<NoteList>('notes/list'),
        ])
        if (cancelled || !live.current) return
        // A failed RPC is represented by undefined and must remain an error,
        // never an empty or missing vault. Check all five answers before
        // honouring an explicit no-vault status from any of them.
        if (head === undefined || list === undefined || cards === undefined || due === undefined || kept === undefined) {
          const failed = [
            ['vault/summary', head],
            ['vault/sources', list],
            ['concepts/list', cards],
            ['concepts/review', due],
            ['notes/list', kept],
          ] as const
          const missing = failed.find(([, value]) => value === undefined)
          throw new Error(`${missing?.[0] ?? 'vault'} did not return a usable response`)
        }
        if ([head.status, list.status, cards.status, due.status, kept.status].includes('no-vault')) {
          setPhase('no-vault')
          return
        }
        const invalid = [
          ['vault/summary', head.status],
          ['vault/sources', list.status],
          ['concepts/list', cards.status],
          ['concepts/review', due.status],
          ['notes/list', kept.status],
        ].find(([, status]) => status !== 'ok' && status !== 'empty')
        if (invalid !== undefined) {
          throw new Error(`${invalid[0]} returned status ${invalid[1]}`)
        }
        setSummary(head)
        setSources(list?.sources ?? [])
        setConcepts(cards)
        setQueue(due)
        setNotes(kept)
        setPhase('ready')
      } catch (cause) {
        if (cancelled || !live.current) return
        setFailure(cause instanceof Error ? cause.message : String(cause))
        setPhase('error')
      }
    })()
    return () => { cancelled = true }
  }, [ask, reloads])

  // Debounced so a query runs on a pause in typing, not on every keystroke:
  // each run reads every extracted file in the vault.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === '') {
      setResults(undefined)
      setSearchFailure('')
      return
    }
    let cancelled = false
    setSearchFailure('')
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const found = await ask<SearchResult>('vault/search', { query: trimmed })
          if (cancelled || !live.current) return
          setResults(found)
        } catch (cause) {
          if (cancelled || !live.current) return
          setResults(undefined)
          setSearchFailure(cause instanceof Error ? cause.message : String(cause))
        }
      })()
    }, SEARCH_DEBOUNCE_MS)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [ask, query])

  const openSection = useCallback((sourceId: string, sectionId: string) => {
    setSection('material')
    setResults(undefined)
    setReading(undefined)
    setReadingFailure('')
    void (async () => {
      try {
        const found = await ask<Reading>('vault/read', { sourceId, sectionId })
        if (!live.current) return
        if (found === undefined) {
          setReadingFailure(t('vaultFailed'))
          return
        }
        if (found.status !== 'ok') {
          setReadingFailure(`${t('vaultFailed')}: ${found.status}`)
          return
        }
        setReading(found)
      } catch (cause) {
        if (!live.current) return
        setReadingFailure(cause instanceof Error ? cause.message : String(cause))
      }
    })()
  }, [ask, t])

  /**
   * Fold one changed card back into both lists without refetching.
   *
   * The review queue is deliberately NOT refiltered here. A card rated
   * "mastered" is no longer due, and dropping it from the live queue would make
   * the deck jump under the learner's cursor; the deck advances by index and
   * rebuilds its queue the next time the panel loads.
   */
  const conceptChanged = useCallback((next: Concept) => {
    const replace = (list: ConceptList | undefined): ConceptList | undefined => list === undefined
      ? undefined
      : {
          ...list,
          concepts: list.concepts.map(item => (
            item.conceptSlug === next.conceptSlug ? next : item
          )),
        }
    setConcepts((list) => {
      const updated = replace(list)
      if (updated === undefined) return updated
      return {
        ...updated,
        due: updated.concepts.filter(item => item.due_now).length,
        stale: updated.concepts.filter(item => item.staleAnchors.length > 0).length,
      }
    })
    setQueue(replace)
  }, [])

  /**
   * Fold one changed note back into the list without refetching.
   *
   * Recounts `pending` and `blocked` from the list itself rather than trusting
   * the pre-write numbers: promoting a draft flips exactly those two counts,
   * and the group headings would otherwise keep claiming a decision is pending
   * that the person just made.
   */
  const recount = useCallback((rows: readonly Note[]): NoteList => ({
    status: 'ok',
    notes: [...rows],
    pending: rows.filter(note => note.kind === 'pending-concept').length,
    blocked: rows.filter(note => note.gate === 'blocked').length,
  }), [])

  const noteChanged = useCallback((next: Note) => {
    setNotes(list => (list === undefined
      ? undefined
      : recount(list.notes.map(note => (note.noteSlug === next.noteSlug ? next : note)))))
  }, [recount])

  const noteRemoved = useCallback((noteSlug: string) => {
    setNotes(list => (list === undefined
      ? undefined
      : recount(list.notes.filter(note => note.noteSlug !== noteSlug))))
  }, [recount])

  const noteCreated = useCallback((next: Note) => {
    setNotes(list => recount([next, ...(list?.notes ?? [])]))
  }, [recount])

  const totals = useMemo(() => ({
    chars: sources.reduce((sum, source) => sum + source.totalChars, 0),
    sections: sources.reduce((sum, source) => sum + source.sectionCount, 0),
  }), [sources])

  if (phase === 'loading') {
    return <div {...learningScope} className={css.state}>{t('vaultLoading')}</div>
  }

  if (phase === 'error') {
    return (
      <div {...learningScope} className={css.state}>
        <p className={css.stateTitle}>{t('vaultFailed')}</p>
        <p className={css.stateBody}>{failure}</p>
      </div>
    )
  }

  if (phase === 'no-vault') {
    return (
      <div {...learningScope} className={css.state}>
        <p className={css.stateTitle}>{t('vaultNoneTitle')}</p>
        <p className={css.stateBody}>{t('vaultNoneBody')}</p>
        {cwd !== undefined && cwd !== '' && <code className={css.path}>{cwd}</code>}
      </div>
    )
  }

  // The live list is preferred so a rating updates the badge without a refetch,
  // but the summary is the fallback: if `concepts/list` failed, reporting zero
  // due cards would be the panel quietly under-reporting the one number a
  // person acts on.
  const counts: Record<SectionId, number> = {
    material: sources.length,
    // Falls back to the summary so one failed list call cannot make the panel
    // claim zero of something the header already counted.
    notes: notes?.notes.length ?? summary?.notes ?? 0,
    concepts: concepts?.concepts.length ?? summary?.concepts ?? 0,
    review: concepts?.due ?? summary?.due ?? 0,
  }

  const materialPane = sources.length === 0
    ? (
      <div className={css.state}>
        <p className={css.stateTitle}>{t('vaultEmptyTitle')}</p>
        <p className={css.stateBody}>{t('vaultEmptyBody')}</p>
      </div>
    )
    : (
      <div className={css.sources}>
        {readingFailure !== '' && <p className={css.staleNote} role="alert">{readingFailure}</p>}
        {sources.map(source => (
          <SourceCard
            key={source.sourceId}
            source={source}
            reading={reading?.sourceId === source.sourceId ? reading : undefined}
            onOpen={openSection}
            onClose={() => { setReading(undefined) }}
            ask={ask as Ask}
            onReparsed={reload}
            t={t}
          />
        ))}
        <p className={css.foot}>
          {t('vaultFootTotals', {
            sections: String(totals.sections),
            chars: kilo(totals.chars),
          })}
          {' · '}
          <code className={css.path}>{summary?.root ?? ''}</code>
        </p>
      </div>
    )

  return (
    <div {...learningScope} className={css.root}>
      <header className={css.head}>
        <div className={css.headRow}>
          <h2 className={css.title}>{summary?.title ?? ''}</h2>
          <ul className={css.counts}>
            <li className={css.count}>{t('vaultCountSources', { count: String(summary?.sources ?? 0) })}</li>
            <li className={css.count}>{t('vaultConceptCount', { count: String(counts.concepts) })}</li>
            {counts.review > 0 && (
              <li className={css.countDue}>{t('vaultCountDue', { count: String(counts.review) })}</li>
            )}
            {(notes?.blocked ?? summary?.pendingNotes ?? 0) > 0 && (
              <li className={css.countWarn}>
                {t('vaultPendingCount', { count: String(notes?.blocked ?? summary?.pendingNotes ?? 0) })}
              </li>
            )}
            {(concepts?.stale ?? 0) > 0 && (
              <li className={css.countWarn}>{t('vaultStaleCount', { count: String(concepts?.stale ?? 0) })}</li>
            )}
            {(summary?.degradedSources ?? 0) > 0 && (
              <li className={css.countWarn}>
                {t('vaultCountDegraded', { count: String(summary?.degradedSources ?? 0) })}
              </li>
            )}
          </ul>
        </div>
        <input
          type="search"
          className={css.search}
          value={query}
          placeholder={t('vaultSearchPlaceholder')}
          aria-label={t('vaultSearchPlaceholder')}
          onChange={(event) => { setQuery(event.target.value) }}
        />
        <p className={css.local}>{t('vaultLocalOnly')}</p>
      </header>

      {searchFailure !== ''
        ? <p className={css.staleNote} role="alert">{t('vaultFailed')}: {searchFailure}</p>
        : results !== undefined
        ? (
          <div className={css.results}>
            {results.material.length + results.concepts.length + results.notes.length === 0
              ? (
                <p className={css.stateBody}>
                  {t('vaultSearchNone', { terms: results.terms.join('、') })}
                </p>
              )
              : (
                <>
                  <HitGroup label={t('vaultGroupMaterial')} hits={results.material} onOpen={openSection} />
                  <HitGroup label={t('vaultGroupConcepts')} hits={results.concepts} />
                  <HitGroup label={t('vaultGroupNotes')} hits={results.notes} />
                </>
              )}
          </div>
        )
        : (
          <div className={css.body}>
            <nav className={css.rail} aria-label={t('vaultTab')}>
              {SECTIONS.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  className={entry.id === section ? css.railItemOn : css.railItem}
                  aria-current={entry.id === section ? 'page' : undefined}
                  onClick={() => { setSection(entry.id) }}
                >
                  <span>{t(entry.label)}</span>
                  <span className={entry.id === 'review' && counts.review > 0 ? css.railDue : css.railCount}>
                    {counts[entry.id]}
                  </span>
                </button>
              ))}
            </nav>
            <div className={css.pane}>
              {section === 'material' && materialPane}
              {section === 'notes' && (
                <NotesSection
                  list={notes}
                  ask={ask as Ask}
                  onChanged={noteChanged}
                  onRemoved={noteRemoved}
                  onCreated={noteCreated}
                  onConcept={conceptChanged}
                  t={t}
                />
              )}
              {section === 'concepts' && (
                <ConceptsSection list={concepts} ask={ask as Ask} onChanged={conceptChanged} t={t} />
              )}
              {section === 'review' && (
                <ReviewSection list={queue} ask={ask as Ask} onChanged={conceptChanged} t={t} />
              )}
            </div>
          </div>
        )}
    </div>
  )
}
