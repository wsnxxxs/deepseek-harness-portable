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

import { useState } from 'react'
import {
  IconBrowseOutline16, IconChecklistOutline14, IconChevronRightOutline14,
  IconCodeOutline16, IconEditOutline16, IconSearchOutline16, IconSkillOutline16,
  IconSparkle16, IconUserOutline16, IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import { useT } from '../state/i18n.ts'
import { Spinner } from '../shell/ui.tsx'
import { AnsiOutput, OutputToolbar } from './AnsiOutput.tsx'
import { resultText, summarizeTool, type ToolKind } from './tools.ts'
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
  const [open, setOpen] = useState(false)
  // Wrap is per card and per session: an operator reading a wide table turns
  // it off once, and the next card they open is a stack trace that wants it on.
  const [wrap, setWrap] = useState(true)

  const settled = isSettled(block)
  const name = settled ? block.call?.name ?? 'tool' : block.name
  const argsRaw = settled ? block.call?.argsRaw : block.argsRaw
  const summary = summarizeTool(name, argsRaw)
  const failed = settled && block.isError
  const output = settled ? resultText(block.content) : ''

  const verb = failed
    ? t('chat.failed')
    : settled
      ? t('chat.ran')
      : t('chat.running')

  return (
    <div className={css.group}>
      <div className={css.card}>
        <button
          type="button"
          className={css.head}
          aria-expanded={open}
          onClick={() => {
            setOpen(value => !value)
            onInspect?.(block.callId)
          }}
        >
          <span className={`${css.glyph} ${failed ? css.error : ''}`} aria-hidden>
            {settled ? failed ? <IconWarningOutline16 /> : <Glyph kind={summary.kind} /> : <Spinner />}
          </span>
          <span className={`${css.verb} ${failed ? css.error : ''}`}>{verb}</span>
          <span className={css.detail}>{summary.detail === '' ? name : summary.detail}</span>
          <IconChevronRightOutline14 className={`${css.chevron} ${open ? css.chevronOpen : ''}`} />
        </button>
        {open
          ? (
            <div className={css.body}>
              {argsRaw === undefined || argsRaw.trim() === ''
                ? null
                : (
                  <>
                    <span className={css.bodyLabel}>{t('details.arguments')}</span>
                    <pre className={css.output}>{argsRaw}</pre>
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
                      ? <pre className={css.output}>—</pre>
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
