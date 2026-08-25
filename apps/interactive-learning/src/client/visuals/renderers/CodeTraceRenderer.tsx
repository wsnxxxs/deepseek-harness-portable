/** `code_trace`: source lines, current execution point, variables, stack and output. */
import { useMemo, useState } from 'react'
import { formatNumber } from '../core/format.ts'
import { SequenceController } from '../core/shell-parts.tsx'
import type { CodeTraceContent, RendererProps } from '../core/types.ts'
import { elementState } from '../state/visual-state.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/code-trace.module.css'

interface CodeToken {
  text: string
  type: 'keyword' | 'type' | 'string' | 'number' | 'comment' | 'operator' | 'plain'
}

function tokenizeLine(lineText: string, language: string): CodeToken[] {
  if (lineText === '') return [{ text: ' ', type: 'plain' }]
  const tokens: CodeToken[] = []
  let cursor = 0
  const len = lineText.length

  const KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'def', 'return', 'if', 'else', 'for', 'while',
    'class', 'import', 'export', 'from', 'in', 'of', 'new', 'async', 'await', 'try',
    'catch', 'yield', 'type', 'interface', 'None', 'null', 'true', 'false', 'True', 'False',
    'elif', 'pass', 'break', 'continue', 'lambda', 'with', 'as', 'is', 'not', 'and', 'or',
  ])
  const TYPES = new Set([
    'number', 'string', 'boolean', 'any', 'void', 'int', 'float', 'str', 'list',
    'dict', 'set', 'tuple', 'self', 'this', 'console', 'print', 'len', 'range', 'Array',
  ])

  while (cursor < len) {
    const char = lineText[cursor]!

    // Comment
    if ((char === '/' && lineText[cursor + 1] === '/') || (char === '#' && language.toLowerCase().includes('py'))) {
      tokens.push({ text: lineText.slice(cursor), type: 'comment' })
      break
    }

    // String literals
    if (char === '"' || char === "'" || char === '`') {
      const quote = char
      let end = cursor + 1
      while (end < len && lineText[end] !== quote) {
        if (lineText[end] === '\\') end += 1
        end += 1
      }
      end = Math.min(len, end + 1)
      tokens.push({ text: lineText.slice(cursor, end), type: 'string' })
      cursor = end
      continue
    }

    // Number literals
    if (/[0-9]/.test(char) && (cursor === 0 || /[\s([\{,+\-*/=><!:]/.test(lineText[cursor - 1]!))) {
      let end = cursor
      while (end < len && /[0-9.eE_]/.test(lineText[end]!)) end += 1
      tokens.push({ text: lineText.slice(cursor, end), type: 'number' })
      cursor = end
      continue
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_$]/.test(char)) {
      let end = cursor
      while (end < len && /[a-zA-Z0-9_$]/.test(lineText[end]!)) end += 1
      const word = lineText.slice(cursor, end)
      if (KEYWORDS.has(word)) tokens.push({ text: word, type: 'keyword' })
      else if (TYPES.has(word)) tokens.push({ text: word, type: 'type' })
      else tokens.push({ text: word, type: 'plain' })
      cursor = end
      continue
    }

    // Operators and delimiters
    if (/[+\-*/%=><!&|^~?:;.,()[\]{}]/.test(char)) {
      tokens.push({ text: char, type: 'operator' })
      cursor += 1
      continue
    }

    // Whitespace / other
    tokens.push({ text: char, type: 'plain' })
    cursor += 1
  }

  return tokens
}

function traceValue(value: CodeTraceContent['steps'][number]['variables'][number]['value']): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') return formatNumber(value)
  return value ? 'true' : 'false'
}

export function CodeTraceRenderer({ content, focus }: RendererProps<CodeTraceContent>) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = content.steps[stepIndex] ?? content.steps[0]
  const lines = useMemo(() => [...content.lines].sort((left, right) => left.number - right.number), [content.lines])
  const tokenizedLines = useMemo(() => new Map(lines.map(line => [line.number, tokenizeLine(line.text, content.language)])), [content.language, lines])
  const sequence = useMemo(() => ({
    initialFrameId: content.steps[0]?.id,
    frames: content.steps.map(item => ({ id: item.id, label: item.label, description: item.description, focusIds: [] })),
  }), [content.steps])

  if (step === undefined) return null

  return (
    <div className={shell.rendererStack}>
      {content.steps.length < 2 ? null : (
        <SequenceController sequence={sequence} frameIndex={stepIndex} onFrameChange={setStepIndex} />
      )}
      <div className={css.workspace}>
        <section className={css.source} aria-label={`${content.language} 代码`}>
          <header><span>{content.language}</span><strong>{step.label}</strong></header>
          <ol>
            {lines.map(line => {
              const current = line.number === step.currentLine
              const tokens = tokenizedLines.get(line.number) ?? [{ text: line.text || ' ', type: 'plain' as const }]
              return (
                <li
                  key={line.number}
                  className={css.codeLine}
                  data-current={current || undefined}
                  data-visual-id={current ? step.id : undefined}
                  data-visual-state={current ? 'current' : elementState(`line-${String(line.number)}`, focus)}
                  aria-current={current ? 'step' : undefined}
                >
                  <span className={css.lineGutter} aria-hidden="true">
                    {current ? <i className={css.stepArrow}>▶</i> : null}
                    {line.number}
                  </span>
                  <code>
                    {tokens.map((token, tokenIdx) => (
                      <span key={tokenIdx} className={token.type !== 'plain' ? css[`token_${token.type}`] : undefined}>
                        {token.text}
                      </span>
                    ))}
                  </code>
                </li>
              )
            })}
          </ol>
        </section>
        <div className={css.inspector}>
          <section className={css.panel} aria-label="变量">
            <h4>变量</h4>
            {step.variables.length === 0 ? <p className={css.empty}>暂无局部变量</p> : (
              <dl className={css.variables}>
                {step.variables.map(variable => (
                  <div key={variable.name}>
                    <dt>{variable.name}{variable.type === undefined ? null : <small>{variable.type}</small>}</dt>
                    <dd>{traceValue(variable.value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
          <section className={css.panel} aria-label="调用栈">
            <h4>调用栈</h4>
            {step.stack.length === 0 ? <p className={css.empty}>调用栈为空</p> : (
              <ol className={css.stack}>
                {step.stack.map((frame, index) => (
                  <li key={frame.id} data-visual-id={frame.id} data-visual-state={elementState(frame.id, focus)}>
                    <span>{index === 0 ? '▶' : String(index + 1)}</span>
                    <strong>{frame.function}</strong>
                    {frame.line === undefined ? null : <small>:{frame.line}</small>}
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className={css.panel} aria-label="输出">
            <h4>输出</h4>
            <pre className={css.output}>{step.output ?? '—'}</pre>
          </section>
        </div>
      </div>
      {step.description === undefined ? null : <p className={css.description}>{step.description}</p>}
    </div>
  )
}
