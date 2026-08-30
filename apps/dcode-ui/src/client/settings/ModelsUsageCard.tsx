/**
 * The usage card as it appears on the official Models settings page.
 *
 * It joins that page through `settings.models.footer`, the extension seat the
 * Models section declares for plugins shipped outside the harness repository,
 * so the official UI needs no edit of its own. `useSessions` is part of the
 * global standard props every slot component receives, which is why a
 * root-scoped footer entry can still read the session corpus.
 */

import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { UsageCards, usageCardStyles } from './UsageCards.tsx'
import classes from './ModelsUsageCard.module.css'

const css = usageCardStyles(classes)

export type ModelsUsageCardProps = PropsRuntime<'settings.models.footer'> & PropsLocale<'dcode'>

/** Render the shared statistics card in the official settings token domain. */
export function ModelsUsageCard({ useSessions, t }: ModelsUsageCardProps): ReactNode {
  const list = useSessions(snapshot => snapshot)
  return (
    <section className={classes.section}>
      <h2 className={classes.title}>{t('settings.modelUsage')}</h2>
      <p className={classes.intro}>{t('settings.modelUsageBody')}</p>
      <UsageCards list={list} t={t} styles={css} />
    </section>
  )
}
