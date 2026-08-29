/**
 * The catalogue: browse, search and install.
 *
 * The list is the Host's own paginated GitHub sync, so this module owns no
 * copy of it — only the page cursor, the search box and one install operation
 * per repository.
 *
 * Installing is deliberately two steps. A plugin joins the agent's tool
 * surface, its prompts, its network reach and its local processes, and topic
 * membership is not a review, so the primary button opens Portable's review
 * of the repository and only the confirm button inside that panel starts an
 * install.
 * @module @dsh-portable/dcode-ui/client/plugins/MarketSection
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Button as PrimitiveButton, IconChevronRightOutline14, IconRefreshOutline14,
  IconRightUpOutline14, IconSearchOutline16, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useT } from '../state/i18n.ts'
import { Button, EmptyState, IconButton, Spinner } from '../shell/ui.tsx'
import type { DcodeKey, Translate } from '../locales.ts'
import { auditFor, type AuditLocale } from './audits.ts'
import {
  MARKET_TOPIC_URL, type MarketClient, type MarketItem, type MarketPage,
} from './market.ts'
import { JobOutput, JobProgress } from './JobProgress.tsx'
import { useOperations, type Operation } from './useJob.ts'
import css from './PluginsHome.module.css'

/** How long the search box waits before it asks the Host again. */
const SEARCH_DEBOUNCE_MS = 300

/** Props of the catalogue section. */
export interface MarketSectionProps {
  readonly client: MarketClient
  /** Which locale's review notes to show. */
  readonly locale: AuditLocale
  /** Reload the profile inventory once an install has landed. */
  readonly onInstalled: () => void
}

/** One row of the review table. */
interface ReviewRow {
  readonly label: DcodeKey
  readonly value: string
}

/**
 * Build the review table for one repository.
 *
 * A repository Portable has never looked at gets the same seven rows, filled
 * with what is actually known — nothing — rather than being quietly omitted:
 * an absent review and a clean review must not look alike.
 * @param fullName - the repository's `owner/repo`.
 * @param locale - which locale's notes to read.
 * @param t - the bound translate, for the unreviewed fallback.
 * @returns the rows, and whether Portable has reviewed the repository.
 */
function reviewRows(
  fullName: string,
  locale: AuditLocale,
  t: Translate,
): { readonly reviewed: boolean; readonly rows: readonly ReviewRow[] } {
  const audit = auditFor(fullName)
  if (audit === undefined) {
    return {
      reviewed: false,
      rows: [
        { label: 'plugins.review.contract', value: t('plugins.review.unknownContract') },
        { label: 'plugins.review.platform', value: t('plugins.review.unknownPlatform') },
        { label: 'plugins.review.runtime', value: t('plugins.review.unknownRuntime') },
        { label: 'plugins.review.egress', value: t('plugins.review.unknownEgress') },
        { label: 'plugins.review.activation', value: t('plugins.review.unknownActivation') },
        { label: 'plugins.review.issues', value: t('plugins.review.unknownIssues') },
        { label: 'plugins.review.verified', value: t('plugins.review.unknownVerified') },
      ],
    }
  }
  return {
    reviewed: true,
    rows: [
      { label: 'plugins.review.contract', value: audit.contract[locale] },
      { label: 'plugins.review.platform', value: audit.platform[locale] },
      { label: 'plugins.review.runtime', value: audit.runtime[locale] },
      { label: 'plugins.review.egress', value: audit.egress[locale] },
      { label: 'plugins.review.activation', value: audit.activation[locale] },
      { label: 'plugins.review.issues', value: audit.issues[locale] },
      { label: 'plugins.review.verified', value: audit.verified[locale] },
    ],
  }
}

/** Props of one catalogue card. */
interface MarketCardProps {
  readonly item: MarketItem
  readonly locale: AuditLocale
  readonly operation: Operation | undefined
  readonly reviewOpen: boolean
  readonly onToggleReview: () => void
  readonly onInstall: () => void
  readonly onCancel: () => void
  readonly onTranslate: () => void
  readonly translating: boolean
}

/** One repository, its review panel, and its install state. */
function MarketCard(props: MarketCardProps): ReactNode {
  const t = useT()
  const { item, operation } = props
  const { reviewed, rows } = useMemo(
    () => reviewRows(item.fullName, props.locale, t),
    [item.fullName, props.locale, t],
  )
  const running = operation?.status === 'running'
  const failed = operation?.status === 'failed'
  // A repository the Host already reports as present stays installed across a
  // reload; a fresh install adds the same verdict without another round trip.
  const installed = item.installed || operation?.status === 'done'

  return (
    <article className={css.card}>
      <div className={css.cardHead}>
        <div className={css.identity}>
          <a className={css.name} href={item.url} target="_blank" rel="noreferrer">{item.fullName}</a>
          <span className={reviewed ? `${css.tag} ${css.tagSuccess}` : `${css.tag} ${css.tagWarn}`}>
            {t(reviewed ? 'plugins.reviewed' : 'plugins.unreviewed')}
          </span>
        </div>
        <div className={css.actions}>
          {installed
            ? <span className={`${css.tag} ${css.tagSuccess}`}>{t('plugins.installed')}</span>
            : (
              <Button
                primary={!props.reviewOpen}
                disabled={running}
                onClick={props.onToggleReview}
              >
                {running ? t('plugins.installing') : t(failed ? 'plugins.confirmRetry' : 'plugins.install')}
              </Button>
            )}
        </div>
      </div>

      {item.description === ''
        ? null
        : <p className={css.description}>{item.description}</p>}

      <div className={css.facts}>
        <span className={css.tag}>{t('plugins.stars', { count: item.stars })}</span>
        {item.language === '' ? null : <span className={css.tag}>{item.language}</span>}
        {installed && item.needsRestart
          ? <span className={`${css.tag} ${css.tagWarn}`}>{t('plugins.pendingTag')}</span>
          : null}
        {/* The description is the one field upstream writes in whatever
            language it likes, so its translation sits with the other facts
            about the repository rather than competing with the install
            button. */}
        {item.description === ''
          ? null
          : (
            <button
              type="button"
              className={`${css.linkButton} ${css.factsAction}`}
              disabled={props.translating}
              onClick={props.onTranslate}
            >
              {t(props.translating ? 'plugins.translating' : 'plugins.translate')}
            </button>
          )}
      </div>

      {installed
        ? null
        : (
          <details className={css.review} open={props.reviewOpen}>
            <summary
              className={css.reviewSummary}
              onClick={(event) => { event.preventDefault(); props.onToggleReview() }}
            >
              <span className={css.reviewChevron}><IconChevronRightOutline14 /></span>
              {t('plugins.reviewOpen')}
            </summary>
            <div className={css.reviewBody}>
              <div className={css.reviewGrid}>
                {rows.map(row => (
                  <Fragment key={row.label}>
                    <span className={css.reviewKey}>{t(row.label)}</span>
                    <span className={css.reviewValue}>{row.value}</span>
                  </Fragment>
                ))}
              </div>
              {reviewed ? null : <p className={css.reviewWarning}>{t('plugins.review.warning')}</p>}
              <div className={css.reviewActions}>
                <Button primary disabled={running} onClick={props.onInstall}>
                  {running
                    ? t('plugins.installing')
                    : t(failed ? 'plugins.confirmRetry' : 'plugins.confirmInstall')}
                </Button>
                <span className={css.statusLine}>{t('plugins.review.note')}</span>
              </div>
            </div>
          </details>
        )}

      {operation === undefined
        ? null
        : (
          <>
            <JobProgress operation={operation} onCancel={props.onCancel} />
            {operation.status === 'done'
              ? <div className={`${css.statusLine} ${css.statusOk}`}>{t('plugins.installedRestart')}</div>
              : null}
            {failed
              ? (
                <>
                  <div className={`${css.statusLine} ${css.statusError}`}>
                    {t('plugins.installFailed', { error: operation.error ?? '' })}
                  </div>
                  <div className={css.statusLine}>{t('plugins.installFailedHint')}</div>
                  <JobOutput operation={operation} />
                </>
              )
              : null}
          </>
        )}
    </article>
  )
}

/** The state of the description-translation dialog. */
interface TranslationState {
  readonly name: string
  readonly original: string
  readonly text: string | undefined
  readonly error: string | undefined
  readonly loading: boolean
}

/** Browse, search and install from the marketplace catalogue. */
export function MarketSection({ client, locale, onInstalled }: MarketSectionProps): ReactNode {
  const t = useT()
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState<MarketPage | undefined>()
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<string | undefined>()
  const [reviewOpen, setReviewOpen] = useState<string | undefined>()
  const [translation, setTranslation] = useState<TranslationState | undefined>()
  const [nonce, setNonce] = useState(0)
  const { operations, start, cancel } = useOperations(client)

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(draft.trim()) }, SEARCH_DEBOUNCE_MS)
    return () => { clearTimeout(timer) }
  }, [draft])

  // The first page reloads whenever the keyword or an explicit refresh
  // changes; further pages are appended by the button below the list.
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setFailure(undefined)
    void client.list(query, 1, controller.signal)
      .then((answer) => {
        if (controller.signal.aborted) return
        if (answer.ok) setPage(answer.value)
        else setFailure(answer.error)
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort() }
  }, [client, query, nonce])

  const loadMore = useCallback(() => {
    const current = page
    if (current === undefined || loading) return
    setLoading(true)
    void client.list(query, current.page + 1)
      .then((answer) => {
        if (!answer.ok) { setFailure(answer.error); return }
        setPage({ ...answer.value, items: [...current.items, ...answer.value.items] })
      })
      .finally(() => { setLoading(false) })
  }, [client, loading, page, query])

  const translate = useCallback((item: MarketItem) => {
    setTranslation({
      name: item.fullName,
      original: item.description,
      text: undefined,
      error: undefined,
      loading: true,
    })
    void client.translate(item.description).then((answer) => {
      setTranslation(previous => previous?.name !== item.fullName
        ? previous
        : {
          ...previous,
          loading: false,
          ...answer.ok ? { text: answer.value } : { error: answer.error },
        })
    })
  }, [client])

  const items = page?.items ?? []
  const syncedAt = page === undefined || page.fetchedAt === 0
    ? t('plugins.neverSynced')
    : t('plugins.syncedAt', { time: new Date(page.fetchedAt).toLocaleString() })

  return (
    <>
      <div>
        <div className={css.title}>{t('plugins.section.market')}</div>
        <p className={css.subtitle}>{t('plugins.source')}</p>
      </div>

      <div className={css.toolbar}>
        <label className={css.searchField}>
          <IconSearchOutline16 />
          <input
            className={css.searchInput}
            type="search"
            value={draft}
            placeholder={t('plugins.search')}
            aria-label={t('plugins.search')}
            onChange={(event) => { setDraft(event.target.value) }}
          />
        </label>
        <span className={css.meta}>
          {t('plugins.shownOfTotal', { shown: items.length, total: page?.total ?? 0 })}
          {' · '}
          {syncedAt}
        </span>
        <IconButton
          label={t('plugins.refresh')}
          disabled={loading}
          onClick={() => { setNonce(value => value + 1) }}
        >
          <IconRefreshOutline14 />
        </IconButton>
        <a className={css.meta} href={MARKET_TOPIC_URL} target="_blank" rel="noreferrer">
          {t('plugins.sourceLink')} <IconRightUpOutline14 />
        </a>
      </div>

      {failure === undefined
        ? null
        : <div className={css.error}>{t('plugins.syncFailed', { error: failure })}</div>}
      {page?.error === undefined
        ? null
        : <div className={css.error}>{t('plugins.syncFailed', { error: page.error })}</div>}

      {items.length === 0
        ? (
          <EmptyState>
            {loading
              ? <Spinner />
              : query === ''
                ? t('plugins.emptyMarket')
                : t('plugins.emptySearch', { query })}
          </EmptyState>
        )
        : (
          <div className={css.list}>
            {items.map(item => (
              <MarketCard
                key={item.fullName}
                item={item}
                locale={locale}
                operation={operations[item.fullName]}
                reviewOpen={reviewOpen === item.fullName}
                translating={translation?.name === item.fullName && translation.loading}
                onToggleReview={() => {
                  setReviewOpen(current => current === item.fullName ? undefined : item.fullName)
                }}
                onInstall={() => {
                  start(item.fullName, () => client.install(item.fullName), onInstalled)
                }}
                onCancel={() => { cancel(item.fullName) }}
                onTranslate={() => { translate(item) }}
              />
            ))}
            {page?.hasMore === true
              ? (
                <Button onClick={loadMore} disabled={loading}>
                  {t(loading ? 'plugins.loading' : 'plugins.loadMore')}
                </Button>
              )
              : null}
          </div>
        )}

      <Modal
        open={translation !== undefined}
        onClose={() => { setTranslation(undefined) }}
        title={translation === undefined
          ? t('plugins.translate')
          : t('plugins.translateTitle', { name: translation.name })}
        closeLabel={t('common.close')}
        footer={(
          <PrimitiveButton variant="outline" onClick={() => { setTranslation(undefined) }}>
            {t('common.close')}
          </PrimitiveButton>
        )}
      >
        {translation === undefined
          ? null
          : (
            <>
              {translation.original === ''
                ? null
                : (
                  <div className={css.translationOriginal}>
                    {`${t('plugins.translateOriginal')}: ${translation.original}`}
                  </div>
                )}
              <div className={css.translationText}>
                {translation.loading
                  ? t('plugins.translating')
                  : translation.error !== undefined
                    ? t('plugins.translateFailed', { error: translation.error })
                    : translation.text === undefined || translation.text === ''
                      ? t('plugins.translateEmpty')
                      : translation.text}
              </div>
            </>
          )}
      </Modal>
    </>
  )
}
