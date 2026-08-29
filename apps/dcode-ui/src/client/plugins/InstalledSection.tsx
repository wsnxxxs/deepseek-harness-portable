/**
 * The inventory: update, enable, disable and uninstall what is installed.
 *
 * The rows are the web profile's own manifest as the Host reads it, so this
 * module owns no second list of plugins and no second notion of "enabled".
 * What it does own is the honesty of the report: every one of these verbs
 * edits the profile rather than the running process, so each row carries the
 * lifecycle strip that says whether what is loaded still matches what the
 * profile now says, and the section carries the restart note that explains
 * why a plugin just switched on is still doing nothing.
 * @module @dsh-portable/dcode-ui/client/plugins/InstalledSection
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Button as PrimitiveButton, IconRefreshOutline14, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useT } from '../state/i18n.ts'
import { Button, EmptyState, IconButton, Spinner } from '../shell/ui.tsx'
import type { DcodeKey } from '../locales.ts'
import {
  lifecycleSteps, pendingRestart,
  type InstalledPlugin, type InstalledSnapshot, type LifecycleStep, type MarketClient,
} from './market.ts'
import { JobOutput, JobProgress } from './JobProgress.tsx'
import { useOperations, type Operation } from './useJob.ts'
import css from './PluginsHome.module.css'

/** Name of each lifecycle stage. */
const STEP_NAME: Readonly<Record<LifecycleStep['id'], DcodeKey>> = {
  installed: 'plugins.lifecycle.installed',
  available: 'plugins.lifecycle.available',
  activated: 'plugins.lifecycle.activated',
  exposed: 'plugins.lifecycle.exposed',
}

/** What each stage says, per state it can be in. */
const STEP_BODY: Readonly<Record<LifecycleStep['id'], Partial<Record<LifecycleStep['state'], DcodeKey>>>> = {
  installed: { done: 'plugins.lifecycle.installedBody' },
  available: { done: 'plugins.lifecycle.availableDone', off: 'plugins.lifecycle.availableOff' },
  activated: { done: 'plugins.lifecycle.activatedDone', off: 'plugins.lifecycle.activatedOff' },
  exposed: {
    done: 'plugins.lifecycle.exposedDone',
    pending: 'plugins.lifecycle.exposedPending',
    off: 'plugins.lifecycle.exposedOff',
  },
}

/** Modifier class per lifecycle state. */
const STEP_CLASS: Readonly<Record<LifecycleStep['state'], string>> = {
  done: css.stepDone,
  pending: css.stepPending,
  off: css.stepOff,
  unknown: css.stepOff,
}

/** The four-stage strip from package on disk to loaded capability. */
function Lifecycle({ plugin }: { plugin: InstalledPlugin }): ReactNode {
  const t = useT()
  return (
    <div className={css.lifecycle} aria-label={t('plugins.lifecycle')}>
      {lifecycleSteps(plugin).map(step => (
        <div className={`${css.step} ${STEP_CLASS[step.state]}`} key={step.id}>
          <span className={css.stepName}>{t(STEP_NAME[step.id])}</span>
          <span className={css.stepBody}>
            {t(STEP_BODY[step.id][step.state] ?? 'plugins.lifecycle.unknown')}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Props of one inventory card. */
interface InstalledCardProps {
  readonly plugin: InstalledPlugin
  /** The marketplace's own package, which cannot act on itself. */
  readonly self: boolean
  readonly operation: Operation | undefined
  readonly onUpdate: () => void
  readonly onToggle: () => void
  readonly onUninstall: () => void
  readonly onCancel: () => void
}

/** One installed plugin, its state, and the verbs that apply to it. */
function InstalledCard(props: InstalledCardProps): ReactNode {
  const t = useT()
  const { plugin, operation } = props
  const busy = operation?.status === 'running'
  return (
    <article className={css.card}>
      <div className={css.cardHead}>
        <div className={css.identity}>
          {plugin.homepage === undefined
            ? <span className={css.name}>{plugin.name}</span>
            : (
              <a className={css.name} href={plugin.homepage} target="_blank" rel="noreferrer">
                {plugin.name}
              </a>
            )}
          {props.self ? <span className={`${css.tag} ${css.tagAccent}`}>{t('plugins.selfTag')}</span> : null}
          {plugin.updateAvailable && plugin.latestVersion !== undefined
            ? (
              <span className={`${css.tag} ${css.tagAccent}`}>
                {t('plugins.updateTag', { version: plugin.latestVersion })}
              </span>
            )
            : null}
          {plugin.enabled ? null : <span className={`${css.tag} ${css.tagMuted}`}>{t('plugins.disabledTag')}</span>}
          {pendingRestart(plugin)
            ? <span className={`${css.tag} ${css.tagWarn}`}>{t('plugins.pendingTag')}</span>
            : null}
        </div>
        <div className={css.actions}>
          {plugin.updateAvailable && plugin.latestVersion !== undefined
            ? (
              <Button primary disabled={busy} onClick={props.onUpdate}>
                {busy ? t('plugins.updating') : t('plugins.update', { version: plugin.latestVersion })}
              </Button>
            )
            : null}
          {props.self
            ? null
            : (
              <>
                <Button disabled={busy} onClick={props.onToggle}>
                  {busy ? t('plugins.working') : t(plugin.enabled ? 'plugins.disable' : 'plugins.enable')}
                </Button>
                <Button className={css.dangerConfirm} disabled={busy} onClick={props.onUninstall}>
                  {t('plugins.uninstall')}
                </Button>
              </>
            )}
        </div>
      </div>

      <div className={css.facts}>
        <span className={css.tag}>
          {plugin.version === undefined
            ? t('plugins.versionUnknown')
            : t('plugins.version', { version: plugin.version })}
        </span>
        {plugin.latestVersion === undefined || plugin.latestVersion === plugin.version
          ? null
          : <span className={css.tag}>{t('plugins.latestVersion', { version: plugin.latestVersion })}</span>}
      </div>

      {plugin.description === undefined
        ? null
        : <p className={css.description}>{plugin.description}</p>}

      <Lifecycle plugin={plugin} />

      {props.self ? <div className={css.statusLine}>{t('plugins.selfNote')}</div> : null}

      {operation === undefined
        ? null
        : (
          <>
            <JobProgress operation={operation} onCancel={props.onCancel} />
            {operation.status === 'done'
              ? <div className={`${css.statusLine} ${css.statusOk}`}>{t('plugins.actionDone')}</div>
              : null}
            {operation.status === 'failed'
              ? (
                <>
                  <div className={`${css.statusLine} ${css.statusError}`}>
                    {t('plugins.actionFailed', { error: operation.error ?? '' })}
                  </div>
                  <JobOutput operation={operation} />
                </>
              )
              : null}
          </>
        )}
    </article>
  )
}

/** Props of the inventory section. */
export interface InstalledSectionProps {
  readonly client: MarketClient
  readonly snapshot: InstalledSnapshot | undefined
  readonly loading: boolean
  readonly error: string | undefined
  readonly onReload: () => void
  /** Send the operator to the catalogue when nothing is installed yet. */
  readonly onBrowse: () => void
}

/** Manage the plugins this profile has installed. */
export function InstalledSection(props: InstalledSectionProps): ReactNode {
  const t = useT()
  const { operations, start, cancel } = useOperations(props.client)
  const [uninstallTarget, setUninstallTarget] = useState<InstalledPlugin | undefined>()

  const plugins = props.snapshot?.plugins ?? []
  const updatable = plugins.filter(plugin => plugin.updateAvailable).length
  const selfName = props.snapshot?.self?.name

  return (
    <>
      <div>
        <div className={css.title}>{t('plugins.installedTitle')}</div>
        <p className={css.subtitle}>{t('plugins.installedBody')}</p>
      </div>

      <div className={css.toolbar}>
        <span className={css.meta}>
          {t('plugins.installedCount', { count: plugins.length })}
          {updatable === 0 ? '' : ` · ${t('plugins.updatableCount', { count: updatable })}`}
        </span>
        <IconButton label={t('plugins.refresh')} disabled={props.loading} onClick={props.onReload}>
          <IconRefreshOutline14 />
        </IconButton>
      </div>

      {props.error === undefined
        ? null
        : <div className={css.error}>{t('plugins.readFailed', { error: props.error })}</div>}
      {props.snapshot?.error === undefined
        ? null
        : <div className={css.error}>{t('plugins.readFailed', { error: props.snapshot.error })}</div>}

      {plugins.length === 0
        ? (
          <EmptyState>
            {props.loading
              ? <Spinner />
              : (
                <>
                  {t('plugins.emptyInstalled')}
                  <Button primary onClick={props.onBrowse}>{t('plugins.browseMarket')}</Button>
                </>
              )}
          </EmptyState>
        )
        : (
          <div className={css.list}>
            {plugins.map(plugin => (
              <InstalledCard
                key={plugin.name}
                plugin={plugin}
                self={plugin.name === selfName}
                operation={operations[plugin.name]}
                onUpdate={() => {
                  start(plugin.name, () => props.client.update(plugin.name), props.onReload)
                }}
                onToggle={() => {
                  start(
                    plugin.name,
                    () => props.client.setEnabled(plugin.name, !plugin.enabled),
                    props.onReload,
                  )
                }}
                onUninstall={() => { setUninstallTarget(plugin) }}
                onCancel={() => { cancel(plugin.name) }}
              />
            ))}
            <p className={css.footer}>{t('plugins.restartNote')}</p>
          </div>
        )}

      <Modal
        open={uninstallTarget !== undefined}
        onClose={() => { setUninstallTarget(undefined) }}
        title={uninstallTarget === undefined
          ? t('plugins.uninstall')
          : t('plugins.uninstallTitle', { name: uninstallTarget.name })}
        closeLabel={t('common.close')}
        description={t('plugins.uninstallBody')}
        footer={(
          <>
            <PrimitiveButton variant="outline" autoFocus onClick={() => { setUninstallTarget(undefined) }}>
              {t('common.cancel')}
            </PrimitiveButton>
            <PrimitiveButton
              variant="outline"
              className={css.dangerConfirm}
              onClick={() => {
                const target = uninstallTarget
                setUninstallTarget(undefined)
                if (target === undefined) return
                start(target.name, () => props.client.uninstall(target.name), props.onReload)
              }}
            >
              {t('plugins.uninstall')}
            </PrimitiveButton>
          </>
        )}
      />
    </>
  )
}
