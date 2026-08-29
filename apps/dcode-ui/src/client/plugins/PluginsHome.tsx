/**
 * Plugins as a first-class surface.
 *
 * The sidebar's plugin entry lands here rather than in a settings tab,
 * because installing and managing plugins is a task with its own catalogue,
 * its own long-running jobs and its own safety gate — not a preference.
 *
 * Three sections, one subject: the marketplace catalogue, the profile's own
 * inventory, and the settings of the plugins that ship with the harness. The
 * first two are the marketplace Host plugin's `/api/market` routes; the third
 * is the settings registry the classic surface writes, rendered by the same
 * component the settings surface uses. Nothing here is a second copy of
 * either.
 *
 * The marketplace Host is optional. When it is not running, the two
 * marketplace sections explain that rather than failing, and the settings
 * section — which does not depend on it — keeps working.
 * @module @dsh-portable/dcode-ui/client/plugins/PluginsHome
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import {
  IconChevronLeftOutline14, IconCordisPluginOutline14, IconDownloadOutline16,
  IconSettingsOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useRuntime } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { Button, EmptyState, ui } from '../shell/ui.tsx'
import { PluginSettingsSection } from '../settings/PluginSettingsSection.tsx'
import type { DcodeKey } from '../locales.ts'
import type { AuditLocale } from './audits.ts'
import { createMarketClient, type InstalledSnapshot } from './market.ts'
import { MarketSection } from './MarketSection.tsx'
import { InstalledSection } from './InstalledSection.tsx'
import { useOperations } from './useJob.ts'
import css from './PluginsHome.module.css'

/** The three views of the plugins surface. */
export type PluginsSection = 'market' | 'installed' | 'settings'

/** Props of the plugins surface. */
export interface PluginsHomeProps {
  readonly navigation: NavigationStore
}

/** What one read of the profile inventory produced. */
interface InventoryState {
  readonly snapshot: InstalledSnapshot | undefined
  readonly loading: boolean
  readonly error: string | undefined
  /** True when this deployment has no marketplace Host at all. */
  readonly unavailable: boolean
}

const INITIAL_INVENTORY: InventoryState = {
  snapshot: undefined,
  loading: true,
  error: undefined,
  unavailable: false,
}

/**
 * Read the profile inventory, shared by every section that needs it.
 *
 * One read serves the inventory list, the marketplace's self-update banner
 * and the rail's counts, and every mutating verb reloads through the same
 * entry — so the surface never shows two disagreeing answers about what is
 * installed.
 * @param client - the marketplace client.
 * @returns the inventory, and the verb that re-reads it.
 */
function useInventory(client: ReturnType<typeof createMarketClient>): InventoryState & { reload: () => void } {
  const [state, setState] = useState<InventoryState>(INITIAL_INVENTORY)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState(previous => ({ ...previous, loading: true }))
    void client.installed(controller.signal)
      .then((answer) => {
        if (controller.signal.aborted) return
        setState(answer.ok
          ? { snapshot: answer.value, loading: false, error: undefined, unavailable: false }
          : {
            snapshot: undefined,
            loading: false,
            error: answer.error,
            unavailable: answer.unavailable,
          })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setState(previous => ({
          ...previous,
          loading: false,
          error: cause instanceof Error ? cause.message : String(cause),
        }))
      })
    return () => { controller.abort() }
  }, [client, nonce])

  const reload = useCallback(() => { setNonce(value => value + 1) }, [])
  return { ...state, reload }
}

/**
 * The marketplace's own update notice.
 *
 * It updates itself through the same job endpoint every other plugin uses, so
 * the banner is the ordinary operation UI narrowed to one row.
 * @param props - the inventory and its reload verb.
 * @returns the banner, or null while the marketplace is current.
 */
function SelfUpdateBanner(props: {
  client: ReturnType<typeof createMarketClient>
  inventory: InventoryState
  onReload: () => void
}): ReactNode {
  const t = useT()
  const { operations, start } = useOperations(props.client)
  const self = props.inventory.snapshot?.self
  if (self === undefined || !self.updateAvailable) return null
  const operation = operations[self.name]
  const running = operation?.status === 'running'
  return (
    <div className={css.banner} role="status">
      <span className={css.bannerText}>
        {t('plugins.selfUpdate', {
          current: self.version ?? '?',
          latest: self.latestVersion ?? '?',
        })}
      </span>
      {operation?.status === 'done'
        ? <span className={css.statusOk}>{t('plugins.selfUpdateDone')}</span>
        : (
          <Button
            primary
            disabled={running}
            onClick={() => { start(self.name, () => props.client.update(self.name), props.onReload) }}
          >
            {t(running ? 'plugins.updating' : 'plugins.selfUpdateAction')}
          </Button>
        )}
      {operation?.status === 'failed'
        ? (
          <span className={css.statusError}>
            {t('plugins.actionFailed', { error: operation.error ?? '' })}
          </span>
        )
        : null}
    </div>
  )
}

/** One entry of the surface's own rail. */
interface RailEntry {
  readonly id: PluginsSection
  readonly label: DcodeKey
  readonly icon: ReactNode
  readonly group?: DcodeKey
}

const RAIL: readonly RailEntry[] = [
  { id: 'market', label: 'plugins.section.market', icon: <IconDownloadOutline16 /> },
  { id: 'installed', label: 'plugins.section.installed', icon: <IconCordisPluginOutline14 size={16} />, group: 'plugins.group.manage' },
  { id: 'settings', label: 'plugins.section.settings', icon: <IconSettingsOutline16 /> },
]

/** The marketplace, the profile inventory, and the built-in plugin settings. */
export function PluginsHome({ navigation }: PluginsHomeProps): ReactNode {
  const runtime = useRuntime()
  const t = useT()
  const [section, setSection] = useState<PluginsSection>('market')
  const client = useMemo(() => createMarketClient(), [])
  const inventory = useInventory(client)

  const locale = useSyncExternalStore(
    runtime.locale.subscribe,
    runtime.locale.getSnapshot,
    runtime.locale.getSnapshot,
  )
  // Portable's review notes are written per locale rather than translated, so
  // the surface only has to pick which of the two shipped languages to read.
  const auditLocale: AuditLocale = locale.active.toLowerCase().startsWith('zh') ? 'zh' : 'en'

  const installedCount = inventory.snapshot?.plugins.length
  const marketplaceMissing = inventory.unavailable

  return (
    <div className={css.surface}>
      <nav className={css.rail} aria-label={t('plugins.title')}>
        <button type="button" className={css.back} onClick={() => { navigation.show('session') }}>
          <IconChevronLeftOutline14 />
          {t('nav.backToWorkspace')}
        </button>
        {RAIL.map(entry => (
          <div key={entry.id}>
            {entry.group === undefined ? null : <div className={css.railGroup}>{t(entry.group)}</div>}
            <button
              type="button"
              className={`${css.railItem} ${section === entry.id ? css.railItemActive : ''}`}
              aria-current={section === entry.id ? 'page' : undefined}
              onClick={() => { setSection(entry.id) }}
            >
              {entry.icon}
              <span className={ui.grow}>{t(entry.label)}</span>
              {entry.id === 'installed' && installedCount !== undefined && installedCount > 0
                ? <span className={css.railCount}>{installedCount}</span>
                : null}
            </button>
          </div>
        ))}
      </nav>

      <div className={css.body}>
        <div className={css.inner}>
          {section === 'settings'
            ? <PluginSettingsSection />
            : marketplaceMissing
              ? (
                <>
                  <div>
                    <div className={css.title}>{t('plugins.title')}</div>
                    <p className={css.subtitle}>{t('plugins.subtitle')}</p>
                  </div>
                  <EmptyState>
                    {t('plugins.unavailable')}
                    <span className={css.note}>{t('plugins.unavailableBody')}</span>
                    <Button onClick={() => { setSection('settings') }}>
                      {t('plugins.section.settings')}
                    </Button>
                  </EmptyState>
                </>
              )
              : (
                <>
                  <SelfUpdateBanner
                    client={client}
                    inventory={inventory}
                    onReload={inventory.reload}
                  />
                  {section === 'market'
                    ? (
                      <MarketSection
                        client={client}
                        locale={auditLocale}
                        onInstalled={inventory.reload}
                      />
                    )
                    : (
                      <InstalledSection
                        client={client}
                        snapshot={inventory.snapshot}
                        loading={inventory.loading}
                        error={inventory.error}
                        onReload={inventory.reload}
                        onBrowse={() => { setSection('market') }}
                      />
                    )}
                </>
              )}
        </div>
      </div>
    </div>
  )
}
