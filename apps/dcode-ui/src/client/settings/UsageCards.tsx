/**
 * The Overview / Models statistics card.
 *
 * One markup source drives both settings surfaces. The two surfaces sit in
 * different token domains — the workbench scale (`--zx-*`) and the official
 * settings aliases (`--dsw-alias-*`) — so each supplies its own CSS Module
 * through {@link UsageCardStyles} instead of the markup being copied.
 *
 * {@link UsageCardStyles} names every class a face must define. It documents
 * the contract and types this file's own reads; it cannot enforce the contract
 * at build time, because the package's CSS-Module shim types every stylesheet
 * as `Record<string, string>`. Each face therefore adopts it through
 * {@link usageCardStyles}, and a class a face forgets renders unstyled rather
 * than failing to compile.
 */

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { DcodeKey, Translate } from '../locales.ts'
import {
  ACTIVITY_DAYS,
  ACTIVITY_WEEKS,
  USAGE_RANGES,
  activityLevel,
  buildUsageModel,
  formatCompact,
  formatFactor,
  formatHour,
  formatTokenCount,
  promptTokensOf,
  totalTokensOf,
  type ModelUsageRow,
  type UsageCardModel,
  type UsageRange,
} from './usage.ts'

/** Class names one surface must supply for the card to render in its style. */
export interface UsageCardStyles {
  readonly card: string
  readonly head: string
  readonly tabs: string
  readonly tab: string
  readonly tabActive: string
  readonly ranges: string
  readonly range: string
  readonly rangeActive: string
  readonly panel: string
  readonly statGrid: string
  readonly stat: string
  readonly statLabel: string
  readonly statValue: string
  readonly heatmap: string
  readonly heatRow: string
  readonly heatCell: string
  readonly level0: string
  readonly level1: string
  readonly level2: string
  readonly level3: string
  readonly level4: string
  readonly chart: string
  readonly axis: string
  readonly axisTick: string
  readonly plot: string
  readonly column: string
  readonly stack: string
  readonly segment: string
  readonly ticks: string
  readonly tick: string
  readonly legend: string
  readonly legendRow: string
  readonly swatch: string
  readonly legendName: string
  readonly legendTokens: string
  readonly legendShare: string
  readonly footnote: string
  readonly empty: string
}

/** Palette for the stacked chart and its legend, longest series first. */
const SERIES_COLORS = [
  'var(--dcode-usage-series-1)',
  'var(--dcode-usage-series-2)',
  'var(--dcode-usage-series-3)',
  'var(--dcode-usage-series-4)',
  'var(--dcode-usage-series-5)',
  'var(--dcode-usage-series-6)',
  'var(--dcode-usage-series-7)',
] as const

/** Y-axis gridlines, as fractions of the tallest column. */
const AXIS_FRACTIONS = [1, 0.75, 0.5, 0.25, 0] as const

/** Days the stacked chart shows per range. */
const RANGE_DAYS: Record<UsageRange, number> = { today: 1, '7d': 7, '30d': 30 }

/** Roughly six evenly spaced date labels, whatever the column count. */
const AXIS_LABEL_COUNT = 6

type UsageTab = 'overview' | 'models'

const TABS: readonly UsageTab[] = ['overview', 'models']

const TAB_LABELS: Record<UsageTab, DcodeKey> = {
  overview: 'usageCard.tabOverview',
  models: 'usageCard.tabModels',
}

const RANGE_LABELS: Record<UsageRange, DcodeKey> = {
  today: 'usageCard.rangeToday',
  '7d': 'usageCard.range7d',
  '30d': 'usageCard.range30d',
}

const COMPARISON_LABELS: Record<string, DcodeKey> = {
  mobyDick: 'usageCard.compareMobyDick',
  warAndPeace: 'usageCard.compareWarAndPeace',
  wikipedia: 'usageCard.compareWikipedia',
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

/** The route's display name; a route the projection never named is unknown. */
function modelLabel(row: ModelUsageRow, t: Translate): string {
  return row.model === '' ? t('usageCard.unknownModel') : row.model
}

function colorOf(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0]
}

/**
 * Adopt one CSS Module as a card face.
 * @param classes - the imported module, typed by the shim as a plain record.
 * @returns the same object under the card's class contract.
 */
export function usageCardStyles(classes: Record<string, string>): UsageCardStyles {
  return classes as unknown as UsageCardStyles
}

export interface UsageCardsProps {
  readonly list: SessionListState
  readonly t: Translate
  readonly styles: UsageCardStyles
}

/** The two-tab usage card, shared by both settings surfaces. */
export function UsageCards({ list, t, styles }: UsageCardsProps): ReactNode {
  const [tab, setTab] = useState<UsageTab>('overview')
  const [range, setRange] = useState<UsageRange>('today')
  const panelId = useId()
  const tabPrefix = useId()

  // One timestamp per mount rather than per render: every day bucket below is
  // derived from it, so a re-render must not silently shift the window.
  const [now] = useState(() => Date.now())

  // A tablist takes one tab stop, so the tabs carry a roving tabindex and the
  // arrow keys must move between them — without this the second tab has no
  // keyboard route at all.
  const tabRefs = useRef<Partial<Record<UsageTab, HTMLButtonElement | null>>>({})
  const moveTab = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    const next = step === 0
      ? event.key === 'Home' ? TABS[0] : event.key === 'End' ? TABS[TABS.length - 1] : undefined
      : TABS[(index + step + TABS.length) % TABS.length]
    if (next === undefined) return
    event.preventDefault()
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  const model = useMemo(
    () => buildUsageModel(list, range, now, ACTIVITY_DAYS, RANGE_DAYS[range]),
    [list, now, range],
  )

  const colorByKey = new Map(model.models.map((row, index) => [row.key, colorOf(index)]))

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div className={styles.tabs} role="tablist" aria-label={t('usageCard.title')}>
          {TABS.map((entry, index) => (
            <button
              key={entry}
              ref={element => { tabRefs.current[entry] = element }}
              type="button"
              role="tab"
              id={`${tabPrefix}-${entry}`}
              aria-selected={tab === entry}
              aria-controls={panelId}
              tabIndex={tab === entry ? 0 : -1}
              className={`${styles.tab} ${tab === entry ? styles.tabActive : ''}`}
              onClick={() => { setTab(entry) }}
              onKeyDown={event => { moveTab(event, index) }}
            >
              {t(TAB_LABELS[entry])}
            </button>
          ))}
        </div>
        <div className={styles.ranges} role="radiogroup" aria-label={t('usageCard.rangeLabel')}>
          {USAGE_RANGES.map(entry => (
            <button
              key={entry}
              type="button"
              role="radio"
              aria-checked={range === entry}
              className={`${styles.range} ${range === entry ? styles.rangeActive : ''}`}
              onClick={() => { setRange(entry) }}
            >
              {t(RANGE_LABELS[entry])}
            </button>
          ))}
        </div>
      </div>

      <div
        className={styles.panel}
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${tabPrefix}-${tab}`}
        tabIndex={0}
      >
        {tab === 'overview'
          ? <OverviewPanel model={model} t={t} styles={styles} />
          : <ModelsPanel model={model} colorByKey={colorByKey} t={t} styles={styles} />}
      </div>
    </section>
  )
}

function Stat({ label, value, styles }: { label: string; value: string; styles: UsageCardStyles }): ReactNode {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
    </div>
  )
}

function OverviewPanel({ model, t, styles }: {
  model: UsageCardModel
  t: Translate
  styles: UsageCardStyles
}): ReactNode {
  const favorite = model.favorite
  const peakCells = model.activity.reduce((peak, cell) => Math.max(peak, cell.value), 0)
  const levelClass = [styles.level0, styles.level1, styles.level2, styles.level3, styles.level4]

  return (
    <>
      <div className={styles.statGrid}>
        <Stat label={t('usageCard.sessions')} value={formatTokenCount(model.sessions)} styles={styles} />
        <Stat label={t('usageCard.messages')} value={formatTokenCount(model.messages)} styles={styles} />
        <Stat label={t('usageCard.totalTokens')} value={formatCompact(model.totalTokens)} styles={styles} />
        <Stat label={t('usageCard.activeDays')} value={formatTokenCount(model.activeDays)} styles={styles} />
        <Stat label={t('usageCard.currentStreak')} value={t('usageCard.days', { count: model.currentStreak })} styles={styles} />
        <Stat label={t('usageCard.longestStreak')} value={t('usageCard.days', { count: model.longestStreak })} styles={styles} />
        <Stat label={t('usageCard.peakHour')} value={model.peakHour === null ? '—' : formatHour(model.peakHour)} styles={styles} />
        <Stat
          label={t('usageCard.favoriteModel')}
          value={favorite === null ? '—' : modelLabel(favorite, t)}
          styles={styles}
        />
      </div>

      <div
        className={styles.heatmap}
        role="img"
        aria-label={t('usageCard.activityAlt', {
          days: model.activeDays,
          weeks: ACTIVITY_WEEKS,
          tokens: formatCompact(model.totalTokens),
        })}
      >
        {Array.from({ length: 7 }, (_, weekday) => (
          <div className={styles.heatRow} key={weekday}>
            {Array.from({ length: ACTIVITY_WEEKS }, (_, week) => {
              const cell = model.activity[week * 7 + weekday]
              if (cell === undefined) return null
              const level = activityLevel(cell.value, peakCells)
              return (
                <span
                  key={cell.date.getTime()}
                  className={`${styles.heatCell} ${levelClass[level]}`}
                  title={`${formatDay(cell.date)} · ${formatCompact(cell.value)}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      {model.comparison === null ? null : (
        <p className={styles.footnote}>
          {t('usageCard.comparison', {
            factor: formatFactor(model.comparison.factor),
            reference: t(COMPARISON_LABELS[model.comparison.id] ?? 'usageCard.compareMobyDick'),
          })}
        </p>
      )}
      <p className={styles.footnote}>{t('usageCard.dayBucketNote')}</p>
    </>
  )
}

function ModelsPanel({ model, colorByKey, t, styles }: {
  model: UsageCardModel
  colorByKey: Map<string, string>
  t: Translate
  styles: UsageCardStyles
}): ReactNode {
  if (model.models.length === 0) {
    return <p className={styles.empty}>{t('usageCard.empty')}</p>
  }

  const peakColumn = model.series.reduce((peak, column) => Math.max(peak, column.total), 0)
  const step = Math.max(1, Math.ceil(model.series.length / AXIS_LABEL_COUNT))
  const ticks = model.series.filter((_, index) => index % step === 0)

  return (
    <>
      <div className={styles.chart}>
        <div className={styles.axis} aria-hidden>
          {AXIS_FRACTIONS.map(fraction => (
            <span className={styles.axisTick} key={fraction}>{formatCompact(peakColumn * fraction)}</span>
          ))}
        </div>
        <div
          className={styles.plot}
          role="img"
          aria-label={t('usageCard.chartAlt', {
            days: model.series.length,
            tokens: formatCompact(model.totalTokens),
          })}
        >
          {model.series.map(column => (
            <div
              className={styles.column}
              key={column.date.getTime()}
              title={`${formatDay(column.date)} · ${formatCompact(column.total)}`}
            >
              <div
                className={styles.stack}
                style={{ height: peakColumn === 0 ? '0%' : `${(column.total / peakColumn) * 100}%` }}
              >
                {model.models.map((row) => {
                  const value = column.byModel.get(row.key) ?? 0
                  if (value === 0) return null
                  return (
                    <span
                      className={styles.segment}
                      key={row.key}
                      style={{
                        flexGrow: value,
                        background: colorByKey.get(row.key) ?? colorOf(0),
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.ticks} aria-hidden>
        {ticks.map(column => <span className={styles.tick} key={column.date.getTime()}>{formatDay(column.date)}</span>)}
      </div>

      <ul className={styles.legend}>
        {model.models.map(row => (
          <li className={styles.legendRow} key={row.key}>
            <span
              className={styles.swatch}
              style={{ background: colorByKey.get(row.key) ?? colorOf(0) }}
              aria-hidden
            />
            <span className={styles.legendName}>{modelLabel(row, t)}</span>
            <span className={styles.legendTokens}>
              {t('usageCard.inOut', {
                input: formatCompact(promptTokensOf(row)),
                output: formatCompact(row.outputTokens),
              })}
            </span>
            <span className={styles.legendShare}>
              {model.totalTokens === 0
                ? '—'
                : `${(Math.round((totalTokensOf(row) / model.totalTokens) * 1_000) / 10).toFixed(1)}%`}
            </span>
          </li>
        ))}
      </ul>

      <p className={styles.footnote}>
        {model.estimated ? t('usageCard.estimatedNote') : t('usageCard.dayBucketNote')}
      </p>
    </>
  )
}
