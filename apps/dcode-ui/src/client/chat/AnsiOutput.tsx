/**
 * Terminal output, rendered.
 *
 * A tool's stdout arrives as bytes a terminal would have interpreted, so this
 * interprets them: colour, weight and underline become styling, and the
 * carriage returns behind every progress bar collapse to their last frame.
 * Output with no escapes in it takes a fast path to a single text node — the
 * common case must not pay for the uncommon one.
 * @module @dsh-portable/dcode-ui/client/chat/AnsiOutput
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '../state/i18n.ts'
import { hasAnsi, parseAnsi, stripAnsi, type AnsiSpan } from './ansi.ts'
import css from './AnsiOutput.module.css'

/** Props of the output block. */
export interface AnsiOutputProps {
  readonly text: string
  /** Soft-wrap long lines instead of scrolling them horizontally. */
  readonly wrap: boolean
  /** Extra class, so a caller can mark the block as failed output. */
  readonly className?: string
}

/** Inline style for one span; colours are data, so they cannot be classes. */
function spanStyle(span: AnsiSpan): React.CSSProperties | undefined {
  const style: React.CSSProperties = {}
  if (span.fg !== undefined) style.color = span.fg
  if (span.bg !== undefined) style.background = span.bg
  if (span.bold === true) style.fontWeight = 600
  if (span.dim === true) style.opacity = 0.65
  if (span.italic === true) style.fontStyle = 'italic'
  if (span.underline === true || span.strike === true) {
    style.textDecorationLine = span.underline === true && span.strike === true
      ? 'underline line-through'
      : span.underline === true ? 'underline' : 'line-through'
  }
  return Object.keys(style).length === 0 ? undefined : style
}

/** Styled terminal output. */
export function AnsiOutput({ text, wrap, className }: AnsiOutputProps) {
  const t = useT()
  const styled = hasAnsi(text)
  const document = useMemo(() => (styled ? parseAnsi(text) : undefined), [styled, text])

  const body = document === undefined
    ? text
    : document.lines.map((spans, lineIndex) => (
      // eslint-disable-next-line react/no-array-index-key -- line order is the identity
      <span key={lineIndex}>
        {spans.map((span, spanIndex) => (
          <span key={spanIndex} style={spanStyle(span)}>{span.text}</span>
        ))}
        {lineIndex === document.lines.length - 1 ? null : '\n'}
      </span>
    ))

  return (
    <pre className={`${css.output} ${wrap ? css.wrap : css.nowrap} ${className ?? ''}`}>
      {body}
      {document?.truncated === true ? <span className={css.truncated}>{`\n${t('chat.outputTruncated')}`}</span> : null}
    </pre>
  )
}

/** Props of the output toolbar. */
export interface OutputToolbarProps {
  readonly text: string
  readonly wrap: boolean
  readonly onWrap: (wrap: boolean) => void
}

/**
 * Copy and wrap controls for one output block.
 *
 * Copy takes the *stripped* text: what reaches the clipboard is what the
 * operator can read on screen, not the escape sequences behind it.
 */
export function OutputToolbar({ text, wrap, onWrap }: OutputToolbarProps) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => { setCopied(false) }, 1400)
    return () => { clearTimeout(timer) }
  }, [copied])

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(stripAnsi(text))
      .then(() => { setCopied(true) })
      .catch(() => { setCopied(false) })
  }, [text])

  return (
    <span className={css.toolbar}>
      <button
        type="button"
        className={`${css.action} ${wrap ? css.actionOn : ''}`}
        aria-pressed={wrap}
        onClick={() => { onWrap(!wrap) }}
      >
        {t('chat.wrap')}
      </button>
      <button type="button" className={css.action} onClick={copy}>
        {copied ? t('common.copied') : t('common.copy')}
      </button>
    </span>
  )
}
