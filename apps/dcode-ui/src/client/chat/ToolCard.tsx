/**
 * One tool execution, closed to a single line.
 *
 * A card head answers "what did it just do" without scrolling; expanding it
 * reveals the arguments and the full output, and nested Code Dispatch calls
 * render as their own cards inside their parent. The card is the same for a
 * running and a settled call, so a call does not jump position when it
 * completes.
 * @module @dsh-portable/dcode-ui/client/chat/ToolCard
 */

import { useEffect, useId, useRef, useState } from 'react'
import {
  IconBrowseOutline16, IconChecklistOutline14, IconChevronRightOutline14,
  IconCodeOutline16, IconEditOutline16, IconSearchOutline16, IconSkillOutline16,
  IconSparkle16, IconUserOutline16, IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import { useT } from '../state/i18n.ts'
import { shimmerActive, Spinner, ui } from '../shell/ui.tsx'
import { AnsiOutput, OutputToolbar } from './AnsiOutput.tsx'
import { formatToolDuration, resultText, summarizeTool, toolChangeStats, toolDurationMs, type ToolKind } from './tools.ts'
import css from './ToolCard.module.css'

/** Glyph per card-head vocabulary word. */
function Glyph({ kind }: { kind: ToolKind }) {
  switch (kind) {
    case 'run': return <IconCodeOutline16 />
    case 'read': return <IconBrowseOutline16 />
    case 'write':
    case 'edit': return <IconEditOutline16 />
    case 'search': return <IconSearchOutline16 />
    case 'web': return <IconBrowseOutline16 />
    case 'agent': return <IconUserOutline16 />
    case 'plan': return <IconChecklistOutline14 size={16} />
    case 'skill': return <IconSkillOutline16 />
    default: return <IconSparkle16 />
  }
}

/** Whether a block is a settled result rather than a still-running call. */
function isSettled(block: ToolCallBlock): block is Extract<ToolCallBlock, { kind: 'tool-result' }> {
  return 'isError' in block
}

/** Props of one tool card. */
export interface ToolCardProps {
  readonly block: ToolCallBlock
  /** Open the details pane on this call. */
  readonly onInspect?: (callId: string) => void
}

/** A compact, expandable tool-execution card. */
export function ToolCard({ block, onInspect }: ToolCardProps) {
  const t = useT()
  const [open, setOpen] = useState(() => isSettled(block) && block.isError)
  const contentId = useId()
  // Wrap is per card and per session: an operator reading a wide table turns
  // it off once, and the next card they open is a stack trace that wants it on.
  const [wrap, setWrap] = useState(true)

  const settled = isSettled(block)
  const startedAt = useRef(block.time)
  const [now, setNow] = useState(Date.now)
  const name = settled ? block.call?.name ?? 'tool' : block.name
  const argsRaw = settled ? block.call?.argsRaw : block.argsRaw
  const summary = summarizeTool(name, argsRaw)
  const failed = settled && block.isError
  const output = settled ? resultText(block.content) : ''
  const duration = settled
    ? toolDurationMs(block)
    : Math.max(0, now - startedAt.current)
  const changes = settled && summary.mutating ? toolChangeStats(block) : undefined
  const emphasized = summary.mutating || summary.kind === 'run'

  useEffect(() => {
    if (settled) return undefined
    const timer = window.setInterval(() => { setNow(Date.now()) }, 100)
    return () => { window.clearInterval(timer) }
  }, [settled])

  useEffect(() => {
    if (failed) setOpen(true)
  }, [failed])

  const verb = failed
    ? t('chat.failed')
    : settled
      ? t('chat.ran')
      : t('chat.running')

  return (
    <div className={css.group}>
      <div className={`${css.card} ${emphasized ? css.cardEmphasized : ''}`}>
        <button
          type="button"
          className={`${css.head} ${ui.cardHeader} ${shimmerActive(!settled)}`}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => {
            setOpen(value => !value)
            onInspect?.(block.callId)
          }}
        >
          <span className={`${css.glyph} ${!settled ? css.runningGlyph : ''} ${failed ? css.error : ''}`} aria-hidden>
            {settled ? failed ? <IconWarningOutline16 /> : <Glyph kind={summary.kind} /> : <Spinner />}
          </span>
          <span className={`${css.verb} ${failed ? css.error : ''}`}>{verb}</span>
          <span className={css.detail}>{summary.detail === '' ? name : summary.detail}</span>
          {changes === undefined
            ? null
            : (
              <span className={css.changes} aria-label={`${changes.additions} lines added, ${changes.deletions} lines removed`}>
                <span className={css.additions}>+{changes.additions}</span>
                <span className={css.deletions}>−{changes.deletions}</span>
              </span>
            )}
          {duration === undefined
            ? null
            : <span className={css.duration}>{formatToolDuration(duration)}{settled ? '' : '…'}</span>}
          <IconChevronRightOutline14 className={`${css.chevron} ${open ? css.chevronOpen : ''}`} />
        </button>
        {open
          ? (
            <div className={css.body} id={contentId}>
              {argsRaw === undefined || argsRaw.trim() === ''
                ? null
                : (
                  <>
                    <span className={css.bodyLabel}>{t('details.arguments')}</span>
                    <pre className={css.output} tabIndex={0} role="region" aria-label={t('details.arguments')}>{argsRaw}</pre>
                  </>
                )}
              {settled
                ? (
                  <>
                    <span className={css.bodyRow}>
                      <span className={css.bodyLabel}>{t('details.output')}</span>
                      {output === '' ? null : <OutputToolbar text={output} wrap={wrap} onWrap={setWrap} />}
                    </span>
                    {output === ''
                      ? <pre className={css.output} tabIndex={0} role="region" aria-label={t('details.output')}>—</pre>
                      : (
                        <AnsiOutput
                          text={output}
                          wrap={wrap}
                          className={failed ? css.error : undefined}
                        />
                      )}
                  </>
                )
                : null}
            </div>
          )
          : null}
      </div>
      {block.subCalls.length === 0
        ? null
        : (
          <div className={css.children}>
            {block.subCalls.map(child => (
              <ToolCard key={child.callId} block={child} onInspect={onInspect} />
            ))}
          </div>
        )}
    </div>
  )
}
