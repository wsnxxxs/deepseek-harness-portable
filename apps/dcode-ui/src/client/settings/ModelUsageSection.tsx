/** Official-settings section for the shared local model usage projection. */

import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { aggregateUsage, formatPercent, formatTokenCount, summarizeUsage } from './usage.ts'
import css from './ModelUsageSection.module.css'

export type ModelUsageSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'dcode'>

function Metric(props: { title: string; value: string }): ReactNode {
  return (
    <div className={css.metric}>
      <span className={css.metricTitle}>{props.title}</span>
      <strong className={css.metricValue}>{props.value}</strong>
    </div>
  )
}

/** Keep the official UI's model usage page independent from DCode navigation. */
export function ModelUsageSection({ useSessions, t }: ModelUsageSectionProps): ReactNode {
  const list = useSessions(snapshot => snapshot)
  const totals = summarizeUsage(aggregateUsage(list))

  if (list.phase === 'pending') {
    return (
      <section className={css.section}>
        <h2 className={css.title}>{t('settings.modelUsage')}</h2>
        <p className={css.intro}>{t('settings.modelUsageBody')}</p>
        <div className={css.status} role="status">{t('settings.usageLoading')}</div>
      </section>
    )
  }

  if (list.state === 'error') {
    return (
      <section className={css.section}>
        <h2 className={css.title}>{t('settings.modelUsage')}</h2>
        <p className={css.intro}>{t('settings.modelUsageBody')}</p>
        <div className={css.status} role="alert">{list.error?.message ?? t('settings.usageError')}</div>
      </section>
    )
  }

  return (
    <section className={css.section}>
      <h2 className={css.title}>{t('settings.modelUsage')}</h2>
      <p className={css.intro}>{t('settings.modelUsageBody')}</p>
      <div className={css.total}>
        <span className={css.totalTitle}>{t('settings.usageTotal')}</span>
        <strong className={css.totalValue}>{formatTokenCount(totals.totalTokens)}</strong>
        <span className={css.totalScope}>
          {t('settings.usageScope', {
            sessions: formatTokenCount(totals.sessions),
            usageSessions: formatTokenCount(totals.usageSessions),
          })}
        </span>
      </div>
      <div className={css.grid}>
        <Metric title={t('settings.usageInput')} value={formatTokenCount(totals.promptTokens)} />
        <Metric title={t('settings.usageOutput')} value={formatTokenCount(totals.outputTokens)} />
        <Metric title={t('settings.usageCacheRead')} value={formatTokenCount(totals.cacheReadTokens)} />
        <Metric title={t('settings.usageCacheWrite')} value={formatTokenCount(totals.cacheWriteTokens)} />
      </div>
      <dl className={css.rows}>
        <div className={css.row}>
          <dt>{t('settings.usageSessions')}</dt>
          <dd>{formatTokenCount(totals.sessions)}</dd>
        </div>
        <div className={css.row}>
          <dt>{t('settings.usageTurns')}</dt>
          <dd>{totals.hasStats ? formatTokenCount(totals.turns) : '—'}</dd>
        </div>
        <div className={css.row}>
          <dt>{t('settings.usageSteps')}</dt>
          <dd>{totals.hasStats ? formatTokenCount(totals.steps) : '—'}</dd>
        </div>
        <div className={css.row}>
          <dt>{t('settings.usageCacheHit')}</dt>
          <dd>{totals.cacheHit === null ? '—' : formatPercent(totals.cacheHit)}</dd>
        </div>
      </dl>
      {!totals.hasUsage ? <p className={css.empty}>{t('settings.usageEmpty')}</p> : null}
    </section>
  )
}
