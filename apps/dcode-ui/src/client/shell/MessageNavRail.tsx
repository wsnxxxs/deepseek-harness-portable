import { memo, useEffect, useId, useMemo, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { ConversationNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { Translate } from '../locales.ts'
import { useT } from '../state/i18n.ts'
import { changedPaths, messageText, splitTurns, summarizeTool } from '../chat/tools.ts'
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
  readonly marker: 'change' | 'plan' | 'error' | 'message'
  readonly bookmarkId: string
}

type DotPosition = CSSProperties & { readonly '--message-nav-position': string }

function dotPosition(index: number, count: number): DotPosition {
  return { '--message-nav-position': `${String(count <= 1 ? 0 : index / (count - 1) * 100)}%` }
}

function promptSummary(node: Extract<ConversationNode, { kind: 'user' }>): string {
  const text = messageText(node.content).replace(/\s+/g, ' ').trim()
  return text.length > 240 ? `${text.slice(0, 240)}…` : text
}

function promptTurns(nodes: readonly ConversationNode[]): readonly PromptTurn[] {
  return splitTurns(nodes).flatMap((turn, turnIndex) => {
    const prompt = turn.find((node): node is Extract<ConversationNode, { kind: 'user' }> => node.kind === 'user')
    const hasError = turn.some(node => node.kind === 'turn-error' || (node.kind === 'tool-result' && node.isError))
    const hasPlan = turn.some(node => node.kind === 'tool-result'
      && summarizeTool(node.call?.name ?? '', node.call?.argsRaw).kind === 'plan')
    const marker = hasError ? 'error' : changedPaths(turn).length > 0 ? 'change' : hasPlan ? 'plan' : 'message'
    return prompt === undefined
      ? []
      : [{
          turnIndex,
          seq: prompt.seq,
          time: prompt.time,
          summary: promptSummary(prompt),
          marker,
          bookmarkId: `${String(prompt.time)}:${String(prompt.seq)}`,
        }]
  })
}

const BOOKMARK_STORAGE = 'dcode.turn-bookmarks'

function savedBookmarks(): ReadonlySet<string> {
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(BOOKMARK_STORAGE) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [])
  } catch {
    return new Set()
  }
}

function markerGlyph(marker: PromptTurn['marker']): string {
  switch (marker) {
    case 'change': return '±'
    case 'plan': return '✓'
    case 'error': return '!'
    default: return ''
  }
}

function markerDetails(marker: PromptTurn['marker'], t: Translate) {
  switch (marker) {
    case 'change':
      return { label: t('chat.turnNavigation.marker.change') || 'Changes', icon: '±' }
    case 'plan':
      return { label: t('chat.turnNavigation.marker.plan') || 'Plan', icon: '✓' }
    case 'error':
      return { label: t('chat.turnNavigation.marker.error') || 'Error', icon: '!' }
    default:
      return { label: t('chat.turnNavigation.marker.message') || 'Prompt', icon: '💬' }
  }
}

function MessageNavRailView({ nodes, scrollerRef, onNavigate }: MessageNavRailProps) {
  const t = useT()
  const tooltipId = useId()
  const turns = useMemo(() => promptTurns(nodes), [nodes])
  const [activeTurn, setActiveTurn] = useState(turns[0]?.turnIndex ?? 0)
  const [previewTurn, setPreviewTurn] = useState<number | undefined>(undefined)
  const [bookmarks, setBookmarks] = useState(savedBookmarks)

  const toggleBookmark = (id: string): void => {
    setBookmarks(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { globalThis.localStorage?.setItem(BOOKMARK_STORAGE, JSON.stringify([...next])) } catch { /* private mode */ }
      return next
    })
  }

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
  const previewMarker = preview !== undefined ? markerDetails(preview.marker, t) : undefined

  return (
    <div className={css.slot}>
      <nav className={css.rail} aria-label={t('chat.turnNavigation.label')}>
        <div className={css.line} aria-hidden />
        {turns.map((turn, index) => {
          const active = turn.turnIndex === activeTurn
          const previewing = turn.turnIndex === previewTurn
          const bookmarked = bookmarks.has(turn.bookmarkId)
          return (
            <div className={css.dotPosition} style={dotPosition(index, turns.length)} key={turn.seq}>
              <button
                type="button"
                className={`${css.dot} ${css[`dot_${turn.marker}`]} ${active ? css.dotActive : ''} ${bookmarked ? css.dotBookmarked : ''}`}
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
              ><span aria-hidden>{markerGlyph(turn.marker)}</span></button>
              <button
                type="button"
                className={`${css.bookmark} ${bookmarked ? css.bookmarkActive : ''}`}
                aria-label={`${bookmarked ? 'Remove bookmark from' : 'Bookmark'} turn ${String(index + 1)}`}
                aria-pressed={bookmarked}
                title={bookmarked ? 'Remove bookmark' : 'Bookmark turn'}
                onClick={() => { toggleBookmark(turn.bookmarkId) }}
              >★</button>
            </div>
          )
        })}
        {preview !== undefined && previewMarker !== undefined && (
          <div
            id={tooltipId}
            role="tooltip"
            className={css.tooltip}
            style={dotPosition(previewIndex, turns.length)}
          >
            <div className={css.tooltipHeader}>
              <div className={css.tooltipBadgeGroup}>
                <span className={css.tooltipTurnBadge}>
                  {t('chat.turnNavigation.turnBadge', { count: previewIndex + 1 }) || `Turn ${previewIndex + 1}`}
                </span>
                <span className={`${css.tooltipMarkerBadge} ${css[`marker_${preview.marker}`]}`}>
                  <span className={css.markerIcon} aria-hidden>{previewMarker.icon}</span>
                  <span>{previewMarker.label}</span>
                </span>
              </div>
              <time className={css.tooltipTime} dateTime={new Date(preview.time).toISOString()}>
                {new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(preview.time)}
              </time>
            </div>
            <div className={css.tooltipPrompt}>{preview.summary || '…'}</div>
            <div className={css.tooltipFooter}>
              <span className={css.tooltipHint}>{t('chat.turnNavigation.hint') || 'Click to jump'}</span>
              {bookmarks.has(preview.bookmarkId) && (
                <span className={css.tooltipBookmarkedBadge}>★ {t('chat.turnNavigation.bookmarked') || 'Bookmarked'}</span>
              )}
            </div>
          </div>
        )}
      </nav>
    </div>
  )
}

export const MessageNavRail = memo(MessageNavRailView)
