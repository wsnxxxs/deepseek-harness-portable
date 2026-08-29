import { memo, useEffect, useId, useMemo, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { ConversationNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { useT } from '../state/i18n.ts'
import { messageText, splitTurns } from '../chat/tools.ts'
import css from './MessageNavRail.module.css'

export interface MessageNavRailProps {
  readonly nodes: readonly ConversationNode[]
  readonly scrollerRef: RefObject<HTMLDivElement | null>
  readonly onNavigate: (turnIndex: number) => void
}

interface PromptTurn {
  readonly turnIndex: number
  readonly seq: number
  readonly time: number
  readonly summary: string
}

type DotPosition = CSSProperties & { readonly '--message-nav-position': string }

function dotPosition(index: number, count: number): DotPosition {
  return { '--message-nav-position': `${String(count <= 1 ? 0 : index / (count - 1) * 100)}%` }
}

function promptSummary(node: Extract<ConversationNode, { kind: 'user' }>): string {
  const text = messageText(node.content).replace(/\s+/g, ' ').trim()
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}

function promptTurns(nodes: readonly ConversationNode[]): readonly PromptTurn[] {
  return splitTurns(nodes).flatMap((turn, turnIndex) => {
    const prompt = turn.find((node): node is Extract<ConversationNode, { kind: 'user' }> => node.kind === 'user')
    return prompt === undefined
      ? []
      : [{ turnIndex, seq: prompt.seq, time: prompt.time, summary: promptSummary(prompt) }]
  })
}

function MessageNavRailView({ nodes, scrollerRef, onNavigate }: MessageNavRailProps) {
  const t = useT()
  const tooltipId = useId()
  const turns = useMemo(() => promptTurns(nodes), [nodes])
  const [activeTurn, setActiveTurn] = useState(turns[0]?.turnIndex ?? 0)
  const [previewTurn, setPreviewTurn] = useState<number | undefined>(undefined)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (scroller === null || turns.length < 2) return undefined
    const visible = new Map<number, IntersectionObserverEntry>()
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const index = Number((entry.target as HTMLElement).dataset.turnIndex)
        if (entry.isIntersecting) visible.set(index, entry)
        else visible.delete(index)
      }
      const candidates = [...visible.entries()].sort((left, right) => left[0] - right[0])
      if (candidates.length === 0) return
      const marker = (candidates[0]?.[1].rootBounds?.top ?? scroller.getBoundingClientRect().top) + 72
      const containing = candidates.find(([, entry]) => entry.boundingClientRect.top <= marker && entry.boundingClientRect.bottom > marker)
      const next = containing ?? candidates.find(([, entry]) => entry.boundingClientRect.top > marker) ?? candidates.at(-1)
      if (next !== undefined) setActiveTurn(next[0])
    }, { root: scroller, threshold: 0 })

    for (const turn of turns) {
      const anchor = scroller.querySelector<HTMLElement>(`[data-turn-index="${String(turn.turnIndex)}"]`)
      if (anchor !== null) observer.observe(anchor)
    }
    return () => { observer.disconnect() }
  }, [scrollerRef, turns])

  if (turns.length < 2) return null
  const previewIndex = turns.findIndex(turn => turn.turnIndex === previewTurn)
  const preview = previewIndex < 0 ? undefined : turns[previewIndex]

  return (
    <div className={css.slot}>
      <nav className={css.rail} aria-label={t('chat.turnNavigation.label')}>
        <div className={css.line} aria-hidden />
        {turns.map((turn, index) => {
          const active = turn.turnIndex === activeTurn
          const previewing = turn.turnIndex === previewTurn
          return (
            <div className={css.dotPosition} style={dotPosition(index, turns.length)} key={turn.seq}>
              <button
                type="button"
                className={`${css.dot} ${active ? css.dotActive : ''}`}
                aria-label={t('chat.turnNavigation.turn', { count: index + 1 })}
                aria-current={active ? 'true' : undefined}
                aria-describedby={previewing ? tooltipId : undefined}
                onPointerEnter={() => { setPreviewTurn(turn.turnIndex) }}
                onPointerLeave={() => { setPreviewTurn(undefined) }}
                onFocus={() => { setPreviewTurn(turn.turnIndex) }}
                onBlur={() => { setPreviewTurn(undefined) }}
                onClick={() => {
                  setActiveTurn(turn.turnIndex)
                  onNavigate(turn.turnIndex)
                }}
              />
            </div>
          )
        })}
        {preview !== undefined && (
          <div
            id={tooltipId}
            role="tooltip"
            className={css.tooltip}
            style={dotPosition(previewIndex, turns.length)}
          >
            <div className={css.tooltipMeta}>
              <span>Turn {previewIndex + 1}</span>
              <time dateTime={new Date(preview.time).toISOString()}>
                {new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(preview.time)}
              </time>
            </div>
            <div className={css.tooltipPrompt}>{preview.summary || '…'}</div>
          </div>
        )}
      </nav>
    </div>
  )
}

export const MessageNavRail = memo(MessageNavRailView)
