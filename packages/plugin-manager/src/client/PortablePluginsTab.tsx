/**
 * The built-in features page of the official Plugins settings section.
 *
 * It answers the question upstream's read-only inventory cannot: which of this
 * distribution's own feature packages are live, and how do I switch one off.
 * The rows come straight off the running Loader, so a build that ships a new
 * feature lists it here without this component learning its name.
 * @module @dsh-portable/plugin-manager/client/PortablePluginsTab
 */

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PortablePluginRow } from '../host/contract.ts'
import type { PortablePluginApi } from './rpc.ts'
import css from './PortablePluginsTab.module.css'

/** Registration-side operations, bound to the channel by the plugin body. */
export interface PortablePluginsTabInjected {
  /** The typed `/portable-plugins` face. */
  readonly api: PortablePluginApi
}

export type PortablePluginsTabProps =
  PropsRuntime<'settings.plugins.tab'>
  & PropsLocale<'portablePlugins'>
  & InjectFace<PortablePluginsTabInjected>

/** The built-in features page. */
export function PortablePluginsTab(props: PortablePluginsTabProps): ReactNode {
  const { api, t } = props
  const [rows, setRows] = useState<readonly PortablePluginRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyName, setBusyName] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    const answer = await api.list()
    setLoading(false)
    if (answer.ok) {
      setRows(answer.value.plugins)
      setError(undefined)
      return
    }
    setError(answer.error.message)
  }, [api])

  useEffect(() => { void load() }, [load])

  const toggle = async (row: PortablePluginRow): Promise<void> => {
    // The switch acts on what the NEXT launch would do, so pressing it twice
    // returns to where it started rather than chasing the live state.
    const target = !(row.pending ?? row.enabled)
    setBusyName(row.name)
    const answer = await api.setEnabled(row.name, target)
    setBusyName(undefined)
    if (!answer.ok) {
      setError(answer.error.message)
      return
    }
    setError(undefined)
    await load()
  }

  if (!api.available) return <div className={css.notice}>{t('unavailable')}</div>

  const pendingCount = rows.filter(row => row.pending !== undefined).length

  return (
    <section className={css.root}>
      <div className={css.head}>
        <p className={css.lead}>{t('lead')}</p>
        <Button size="sm" disabled={loading} onClick={() => { void load() }}>
          {loading ? t('loading') : t('refresh')}
        </Button>
      </div>
      {loading && rows.length === 0
        ? null
        : rows.length === 0
          ? <div className={css.empty}>{t('empty')}</div>
          : (
            <ul className={css.list}>
              {rows.map((row) => {
                const desired = row.pending ?? row.enabled
                const busy = busyName === row.name
                return (
                  <li className={css.row} key={row.name}>
                    <div className={css.text}>
                      <span className={css.name}>
                        {row.name}
                        {row.enabled ? null : <span className={css.tag}>{t('off')}</span>}
                        {row.pending === undefined
                          ? null
                          : (
                            <span className={`${css.tag} ${css.pending}`}>
                              {row.pending ? t('pendingOn') : t('pendingOff')}
                            </span>
                          )}
                      </span>
                      <span className={css.meta}>
                        {row.version === null ? t('unknownVersion') : t('version', { version: row.version })}
                      </span>
                      {row.description === null ? null : <span className={css.description}>{row.description}</span>}
                    </div>
                    <div className={css.actions}>
                      <Button size="sm" disabled={busy} onClick={() => { void toggle(row) }}>
                        {busy ? t('working') : desired ? t('disable') : t('enable')}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
      {error === undefined ? null : <div className={css.error} role="alert">{error}</div>}
      {pendingCount === 0 ? null : <div className={css.restart}>{t('restart')}</div>}
    </section>
  )
}
