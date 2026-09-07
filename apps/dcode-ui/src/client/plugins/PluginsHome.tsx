/** The community bundle owns plugin discovery, installation and updates. */
import type { ReactNode } from 'react'
import { useRuntime } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { Button } from '../shell/ui.tsx'
import { PluginSettingsSection } from '../settings/PluginSettingsSection.tsx'

export interface PluginsHomeProps { readonly navigation: NavigationStore }
export function PluginsHome({ navigation }: PluginsHomeProps): ReactNode {
  const runtime = useRuntime()
  const t = useT()
  return <section style={{ padding: 24, overflow: 'auto' }}>
    <Button onClick={() => { navigation.show('session') }}>{t('common.close')}</Button>
    <h1>{t('plugins.title')}</h1>
    <p>{t('plugins.webAllBody')}</p>
    <Button onClick={() => { navigation.show('session'); runtime.mode.set('official') }}>
      {t('plugins.webAllOpen')}
    </Button>
    <PluginSettingsSection />
  </section>
}
