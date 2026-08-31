/**
 * The mission dossier panel.
 *
 * This is where the loop closes. A board task says what to do; the brief says
 * how far the mission has got; the dossier says what the crew is working FROM.
 * Attaching a spec here is what makes `dossier_search` answer, and every answer
 * carries an anchor that opens the passage it came from.
 *
 * Two things are shown that a document list normally hides, and both are the
 * reason to trust the answers:
 *
 * - what the parser could NOT read, per source, in words;
 * - the passage behind a search hit, so a citation can be checked rather than
 *   taken on faith.
 *
 * Attaching is an operator action by design: no model-facing tool can put a
 * file into a space, which is what makes the space's contents knowable.
 * @module @dsh-portable/crew-ui/client/shell/DossierPanel
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRuntime } from '../state/runtime.ts'
import css from './DossierPanel.module.css'

/** One attached source, as the host channel reports it. */
export interface DossierSourceView {
  readonly sourceId: string
  readonly title: string
  readonly sections: number
  readonly unread: readonly string[]
  readonly outline: readonly { readonly sectionId: string, readonly heading: string, readonly page?: number }[]
}

/** One passage returned by a search. */
export interface DossierPassageView {
  readonly sourceId: string
  readonly title: string
  readonly anchor: string
  readonly heading: string
  readonly page?: number
  readonly text: string
  readonly truncated: boolean
}

/** Props of the dossier panel. */
export interface DossierPanelProps {
  /** Working directory of the mission; a dossier belongs to one. */
  readonly cwd: string | undefined
}

/** The attached-sources panel. */
export function DossierPanel({ cwd }: DossierPanelProps) {
  const runtime = useRuntime()
  const { t } = runtime
  const [sources, setSources] = useState<readonly DossierSourceView[] | undefined>(undefined)
  const [passages, setPassages] = useState<readonly DossierPassageView[]>([])
  const [query, setQuery] = useState('')
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  // A superseded answer must not repaint a panel that has moved on to another
  // mission, so every read carries the cwd it was made for.
  const cwdRef = useRef(cwd)
  cwdRef.current = cwd

  const load = useCallback(async () => {
    const target = cwdRef.current
    const result = await runtime.dossier('summary', { cwd: target })
    if (cwdRef.current !== target) return
    if (!result.ok) {
      // Leave `sources` undefined and let the render treat "errored" as its own
      // state. Showing the loading notice next to a failure is what makes a
      // dead channel look like a slow one, and the operator has no way to ask
      // again from a notice.
      setError(`${result.error.message} (${result.error.code})`)
      return
    }
    setError(undefined)
    setSources((result.value as { sources: DossierSourceView[] }).sources)
  }, [runtime])

  useEffect(() => {
    setSources(undefined)
    setPassages([])
    setError(undefined)
    void load()
  }, [cwd, load])

  const attach = async (): Promise<void> => {
    const file = path.trim()
    if (file === '') return
    setBusy(true)
    try {
      const result = await runtime.dossier('attach', { cwd: cwdRef.current, path: file })
      if (!result.ok) {
        setError(`${result.error.message} (${result.error.code})`)
        return
      }
      setPath('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const search = async (): Promise<void> => {
    const text = query.trim()
    if (text === '') {
      setPassages([])
      return
    }
    setBusy(true)
    try {
      const target = cwdRef.current
      const result = await runtime.dossier('search', { cwd: target, query: text })
      if (cwdRef.current !== target) return
      if (!result.ok) {
        setError(`${result.error.message} (${result.error.code})`)
        return
      }
      setError(undefined)
      setPassages((result.value as { passages: DossierPassageView[] }).passages)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={css.root} aria-label={t('dossier.title')}>
      <header className={css.head}>
        <h2 className={css.title}>{t('dossier.title')}</h2>
      </header>

      {error !== undefined
        ? (
          <div className={css.error} role="alert">
            <span>{error}</span>
            <button type="button" disabled={busy} onClick={() => { setError(undefined); void load() }}>
              {t('dossier.retry')}
            </button>
          </div>
        )
        : null}

      <div className={css.attach}>
        <input
          className={css.input}
          value={path}
          placeholder={t('dossier.attachPlaceholder')}
          disabled={busy || cwd === undefined}
          onChange={(event) => { setPath(event.target.value) }}
          onKeyDown={(event) => { if (event.key === 'Enter') void attach() }}
        />
        <button type="button" disabled={busy || path.trim() === '' || cwd === undefined} onClick={() => { void attach() }}>
          {t('dossier.attach')}
        </button>
      </div>

      <div className={css.attach}>
        <input
          className={css.input}
          value={query}
          placeholder={t('dossier.searchPlaceholder')}
          disabled={busy}
          onChange={(event) => { setQuery(event.target.value) }}
          onKeyDown={(event) => { if (event.key === 'Enter') void search() }}
        />
        <button type="button" disabled={busy} onClick={() => { void search() }}>{t('dossier.search')}</button>
      </div>

      {passages.length > 0
        ? (
          <ul className={css.hits}>
            {passages.map(passage => (
              <li key={passage.anchor + passage.text.slice(0, 24)} className={css.hit}>
                {/* The anchor is the citation an answer quotes; showing it here
                    is what lets a reader check one rather than trust it. */}
                <p className={css.anchor}>{passage.anchor}</p>
                <p className={css.excerpt}>{passage.text}</p>
              </li>
            ))}
          </ul>
        )
        : null}

      {/* Errored is a third state, not a slow first one: a failed read keeps
          `sources` undefined, so the loading notice is suppressed while the
          alert above carries the reason and the way to try again. */}
      {sources === undefined
        ? (error === undefined ? <p className={css.notice}>{t('dossier.loading')}</p> : null)
        : sources.length === 0
          ? (
            <div className={css.empty}>
              <p className={css.emptyTitle}>{t('dossier.empty')}</p>
              <p className={css.emptyBody}>{t('dossier.emptyBody')}</p>
            </div>
          )
          : (
            <ul className={css.sources}>
              {sources.map(source => (
                <li key={source.sourceId} className={css.source}>
                  <p className={css.sourceTitle}>{source.title}</p>
                  <p className={css.sourceMeta}>{t('dossier.sections', { count: source.sections })}</p>
                  {/* Never hidden, never summarized away: an answer drawn from
                      this source has to be able to state its gaps. */}
                  {source.unread.map(gap => (
                    <p key={gap} className={css.unread}>{gap}</p>
                  ))}
                </li>
              ))}
            </ul>
          )}
    </section>
  )
}
