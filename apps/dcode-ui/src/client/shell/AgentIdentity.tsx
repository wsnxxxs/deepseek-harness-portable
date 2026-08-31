/**
 * The Metis-style agent identity seat in the chat header.
 *
 * The label is resolved from the same agent-preset projection and roster used
 * by the composer. It is a navigation affordance, not a second preset store:
 * clicking it opens the existing preset editor owned by DSH.
 * @module @dsh-portable/dcode-ui/client/shell/AgentIdentity
 */

import { useMemo } from 'react'
import { IconAgentPresetOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useAsync, useProjectionValue } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useRuntime } from '../state/runtime.ts'
import type { NavigationStore } from '../state/navigation.ts'
import css from './AgentIdentity.module.css'

interface AgentPresetRow {
  readonly id: string
  readonly name?: string
  readonly isDefault?: boolean
}

interface AgentPresetCatalog {
  readonly presets?: readonly AgentPresetRow[]
}

/** Current agent identity, patterned after Metis's ChatHeader agent pill. */
export function AgentIdentity({ navigation, sessionId }: { navigation: NavigationStore; sessionId: SessionId | undefined }) {
  const runtime = useRuntime()
  const t = useT()
  const selected = useProjectionValue<string | null>(sessionId, 'agentPreset')
  const catalog = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime])
  const presets = catalog.value?.ok === true
    ? ((catalog.value.value as AgentPresetCatalog).presets ?? [])
    : []
  const current = useMemo(
    () => selected ?? presets.find(preset => preset.isDefault)?.id ?? presets[0]?.id,
    [presets, selected],
  )
  const row = presets.find(preset => preset.id === current)
  const label = row?.name ?? current ?? t('top.agent')

  return (
    <button
      type="button"
      className={css.trigger}
      title={t('top.agentSettings')}
      aria-label={`${t('top.agent')}: ${label}`}
      onClick={() => { navigation.openSettings('agentPresets') }}
    >
      <span className={css.avatar} aria-hidden><IconAgentPresetOutline16 /></span>
      <span className={css.copy}>
        <span className={css.kicker}>{t('top.agent')}</span>
        <span className={css.name}>{label}</span>
      </span>
    </button>
  )
}
