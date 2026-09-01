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

import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Button as PrimitiveButton, IconChevronRightOutline14, IconRefreshOutline14,
  IconRightUpOutline14, IconSearchOutline16, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useT } from '../state/i18n.ts'
import { Button, EmptyState, IconButton, Pill, Spinner } from '../shell/ui.tsx'
import type { DcodeKey, Translate } from '../locales.ts'
import { auditFor, type AuditLocale } from './audits.ts'
import {
  MARKET_TOPIC_URL, type CompatibilityStatus, type MaintenanceStatus, type MarketClient,
  type MarketItem, type MarketPage, type PluginCategory,
} from './market.ts'
import { JobOutput, JobProgress } from './JobProgress.tsx'
import { useOperations, type Operation } from './useJob.ts'
import css from './PluginsHome.module.css'
import ui from '../shell/ui.module.css'

/** How long the search box waits before it asks the Host again. */
const SEARCH_DEBOUNCE_MS = 300

interface DiscoveryMetadata {
  readonly featured: boolean
  readonly featuredSource: string | undefined
  readonly category: PluginCategory
  readonly compatibility: CompatibilityStatus
  readonly maintenance: MaintenanceStatus
}

function platformKey(platform: string): 'win32' | 'darwin' | 'linux' | undefined {
  const value = platform.toLowerCase()
  if (value.includes('win')) return 'win32'
  if (value.includes('mac') || value.includes('darwin')) return 'darwin'
  if (value.includes('linux')) return 'linux'
  return undefined
}

/** Merge Host discovery facts with the bundled review record, never guesses. */
function metadataFor(item: MarketItem, locale: AuditLocale, platform: string): DiscoveryMetadata {
  const audit = auditFor(item.fullName)
  const platformId = platformKey(platform)
  return {
    featured: item.featured || audit?.featured === true,
    featuredSource: audit?.featuredSource[locale] ?? item.featuredSource,
    category: audit?.category ?? item.category,
    compatibility: audit !== undefined && platformId !== undefined
      ? audit.compatibility[platformId]
      : item.compatibility,
    maintenance: item.maintenance,
  }
}

/** Search ranking: repository name, then description, then stars. */
function searchRank(item: MarketItem, query: string): readonly [number, number] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [0, item.stars]
  const fullName = item.fullName.toLowerCase()
  const name = fullName.split('/').at(-1) ?? fullName
  const description = item.description.toLowerCase()
  const score = name === needle ? 4 : name.startsWith(needle) ? 3 : name.includes(needle) ? 2 : description.includes(needle) ? 1 : 0
  return [score, item.stars]
}

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
  readonly platform: string
}

/** One repository, its review panel, and its install state. */
function MarketCard(props: MarketCardProps): ReactNode {
  const t = useT()
  const { item, operation } = props
  const { reviewed, rows } = useMemo(
    () => reviewRows(item.fullName, props.locale, t),
    [item.fullName, props.locale, t],
  )
  const metadata = useMemo(
    () => metadataFor(item, props.locale, props.platform),
    [item, props.locale, props.platform],
  )
  const reviewId = useId()
  const running = operation?.status === 'running'
  const failed = operation?.status === 'failed'
  // A repository the Host already reports as present stays installed across a
  // reload; a fresh install adds the same verdict without another round trip.
  const installed = item.installed || operation?.status === 'done'

  return (
    <article className={`${css.card} ${css.compactCard}`}>
      <div className={`${css.cardHead} ${ui.cardHeader}`}>
        <div className={css.identity}>
          <a className={css.name} href={item.url} target="_blank" rel="noreferrer">{item.fullName}</a>
          {metadata.featured
            ? <Pill className={css.tagAccent}>{t('plugins.featured')}</Pill>
            : null}
        </div>
        <div className={css.actions}>
          {installed
            ? <Pill className={css.tagSuccess}>{t('plugins.installed')}</Pill>
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

      <div className={css.cardBody}>
        {item.description === ''
          ? null
          : <p className={css.description}>{item.description}</p>}

      <div className={css.facts}>
        <Pill>{t(`plugins.category.${metadata.category}` as DcodeKey)}</Pill>
        <Pill className={metadata.compatibility === 'compatible' ? css.tagSuccess : metadata.compatibility === 'incompatible' ? css.tagWarn : css.tagMuted}>
          {t(`plugins.compatibility.${metadata.compatibility}` as DcodeKey)}
        </Pill>
        <Pill className={metadata.maintenance === 'active' ? css.tagSuccess : css.tagMuted}>
          {t(`plugins.maintenance.${metadata.maintenance}` as DcodeKey)}
        </Pill>
        <Pill>{t('plugins.stars', { count: item.stars })}</Pill>
        {item.language === '' ? null : <Pill>{item.language}</Pill>}
        {installed && item.needsRestart
          ? <Pill className={css.tagWarn}>{t('plugins.pendingTag')}</Pill>
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
      {metadata.featuredSource === undefined ? null : <div className={css.statusLine}>{t('plugins.featuredSource', { source: metadata.featuredSource })}</div>}

      {installed
        ? null
        : (
          <div className={`${css.review} ${props.reviewOpen ? css.reviewOpen : ''}`}>
            <button
              type="button"
              className={css.reviewSummary}
              aria-expanded={props.reviewOpen}
              aria-controls={reviewId}
              onClick={props.onToggleReview}
            >
              <span className={css.reviewChevron}><IconChevronRightOutline14 /></span>
              {t('plugins.reviewOpen')}
            </button>
            {props.reviewOpen
              ? <div id={reviewId} className={css.reviewBody} role="region" aria-label={t('plugins.reviewOpen')}>
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
              : null}
          </div>
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
      </div>
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
  const moreLoading = useRef(false)
  const moreController = useRef<AbortController | null>(null)
  const { operations, start, cancel } = useOperations(client)
  // The marketplace opens directly on the complete catalogue. Search is the
  // only refinement; the default view never hides repositories by metadata.
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(draft.trim()) }, SEARCH_DEBOUNCE_MS)
    return () => { clearTimeout(timer) }
  }, [draft])

  // The first page reloads whenever the keyword or an explicit refresh
  // changes; further pages are appended by the button below the list.
  useEffect(() => {
    const controller = new AbortController()
    moreController.current?.abort()
    moreController.current = null
    moreLoading.current = false
    setPage(undefined)
    setLoading(true)
    setFailure(undefined)
    void client.list(query, 1, controller.signal, 'explore')
      .then((answer) => {
        if (controller.signal.aborted) return
        if (answer.ok) setPage(answer.value)
        else setFailure(answer.error)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setFailure(cause instanceof Error ? cause.message : String(cause))
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => {
      controller.abort()
      moreController.current?.abort()
      moreController.current = null
      moreLoading.current = false
    }
  }, [client, nonce, query])

  const loadMore = useCallback(() => {
    const current = page
    if (current === undefined || loading || moreLoading.current) return
    const controller = new AbortController()
    moreController.current = controller
    moreLoading.current = true
    setLoading(true)
    void client.list(query, current.page + 1, controller.signal, 'explore')
      .then((answer) => {
        if (controller.signal.aborted) return
        if (!answer.ok) { setFailure(answer.error); return }
        setFailure(undefined)
        setPage(previous => previous === undefined
          ? answer.value
          : { ...answer.value, items: [...previous.items, ...answer.value.items] })
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setFailure(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (moreController.current !== controller) return
        moreController.current = null
        moreLoading.current = false
        if (!controller.signal.aborted) setLoading(false)
      })
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
    }).catch((cause: unknown) => {
      setTranslation(previous => previous?.name !== item.fullName
        ? previous
        : { ...previous, loading: false, error: cause instanceof Error ? cause.message : String(cause) })
    })
  }, [client])

  const platform = page?.platform || (typeof navigator === 'undefined' ? '' : navigator.userAgent)
  const items = useMemo(() => {
    return (page?.items ?? []).slice()
      .sort((left, right) => {
        const [leftMatch, leftStars] = searchRank(left, query)
        const [rightMatch, rightStars] = searchRank(right, query)
        return rightMatch - leftMatch || rightStars - leftStars || left.fullName.localeCompare(right.fullName)
      })
  }, [page?.items, query])
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

      <div className={css.exploreWarning}>{t('plugins.exploreWarning')}</div>

      {failure === undefined
        ? null
        : <div className={css.error} role="alert">{t('plugins.syncFailed', { error: failure })}</div>}
      {page?.error === undefined
        ? null
        : <div className={css.error} role="alert">{t('plugins.syncFailed', { error: page.error })}</div>}

      {items.length === 0
        ? (
          loading
            ? <div className={css.loadingState} role="status"><Spinner size="sm" />{t('plugins.loading')}</div>
            : <EmptyState>{query === '' ? t('plugins.emptyMarket') : t('plugins.emptySearch', { query })}</EmptyState>
        )
        : (
          <div className={css.compactGrid}>
            {items.map(item => (
              <MarketCard
                key={item.fullName}
                item={item}
                locale={locale}
                operation={operations[item.fullName]}
                reviewOpen={reviewOpen === item.fullName}
                translating={translation?.name === item.fullName && translation.loading}
                platform={platform}
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
