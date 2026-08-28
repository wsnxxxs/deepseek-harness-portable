/**
 * Parse an infix math expression into the payload AST.
 *
 * The AST itself is a good runtime representation and a terrible schema. Written
 * out as JSON Schema it has to be inlined once per level, so a depth-4
 * expression expands to roughly a hundred node definitions, each carrying the
 * full operator enums. Measured, that expansion was about 95% of the `plot` and
 * `field_2d` tool schemas — 118k of the 160k characters across all fifteen
 * visual kinds. It is also the least natural thing for a model to write:
 * `sigmoid(w*x + b)` becomes eleven nested objects.
 *
 * So the wire format is the string and the AST stays internal. The tool parses
 * at its boundary, which means the persisted payload, the validator, the
 * compiler, and every renderer are unchanged, and a replayed session from
 * before this change still holds exactly the AST it always did.
 *
 * Deliberately not `eval` or `new Function`: the payload is model-authored, so
 * it is parsed as data and never reaches an interpreter.
 * @module @dsh-portable/interactive-learning/src/math-parser
 */
import { MATH_BINARY_OPERATORS, MATH_UNARY_OPERATORS } from './protocol-schema.ts'
import type { MathExpressionV1 } from './protocol-current.ts'

const BINARY = new Set<string>(MATH_BINARY_OPERATORS)
const UNARY = new Set<string>(MATH_UNARY_OPERATORS)

/** Raised for a source string that is not a well-formed expression. */
export class MathParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MathParseError'
  }
}

/**
 * Names stop at a hyphen, so `-` is always subtraction.
 *
 * Identifiers elsewhere in a visual payload may contain hyphens, but a plot or
 * field parameter id may not, because `w-1` cannot mean both a variable and a
 * subtraction. Resolving that against the declared names was possible and was
 * the first thing tried; it also silently rewrote `normpdf(x)` to the variable
 * `n` in any plot that happened to declare a parameter called `n`. A grammar
 * that needs to know the variables before it can tokenize is the wrong grammar.
 */
function readName(source: string, start: number): string {
  const match = /^[a-z][a-z0-9_]*/.exec(source.slice(start))
  return match === null ? '' : match[0]
}

interface Cursor { readonly source: string; at: number }

function skip(cursor: Cursor): void {
  while (cursor.at < cursor.source.length && /\s/.test(cursor.source[cursor.at]!)) cursor.at += 1
}

function expect(cursor: Cursor, character: string): void {
  skip(cursor)
  if (cursor.source[cursor.at] !== character) {
    throw new MathParseError(`expected ${character} at position ${String(cursor.at)}`)
  }
  cursor.at += 1
}

/** `expr := term (('+' | '-') term)*` */
function parseExpression(cursor: Cursor): MathExpressionV1 {
  let left = parseTerm(cursor)
  for (;;) {
    skip(cursor)
    const character = cursor.source[cursor.at]
    if (character !== '+' && character !== '-') return left
    cursor.at += 1
    left = { op: character === '+' ? 'add' : 'sub', left, right: parseTerm(cursor) }
  }
}

/** `term := factor (('*' | '/') factor)*` */
function parseTerm(cursor: Cursor): MathExpressionV1 {
  let left = parseFactor(cursor)
  for (;;) {
    skip(cursor)
    const character = cursor.source[cursor.at]
    if (character !== '*' && character !== '/') return left
    cursor.at += 1
    left = { op: character === '*' ? 'mul' : 'div', left, right: parseFactor(cursor) }
  }
}

/** `factor := unary ('^' factor)?` — right associative, as exponentiation is. */
function parseFactor(cursor: Cursor): MathExpressionV1 {
  const left = parseUnary(cursor)
  skip(cursor)
  if (cursor.source[cursor.at] !== '^') return left
  cursor.at += 1
  return { op: 'pow', left, right: parseFactor(cursor) }
}

/** `unary := '-' unary | primary` */
function parseUnary(cursor: Cursor): MathExpressionV1 {
  skip(cursor)
  if (cursor.source[cursor.at] !== '-') return parsePrimary(cursor)
  cursor.at += 1
  return { op: 'neg', value: parseUnary(cursor) }
}

/** `primary := number | call | name | '(' expr ')'` */
function parsePrimary(cursor: Cursor): MathExpressionV1 {
  skip(cursor)
  const { source } = cursor
  if (cursor.at >= source.length) throw new MathParseError('expression ended early')

  if (source[cursor.at] === '(') {
    cursor.at += 1
    const inner = parseExpression(cursor)
    expect(cursor, ')')
    return inner
  }

  const number = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(source.slice(cursor.at))
  if (number !== null) {
    cursor.at += number[0].length
    return { op: 'constant', value: Number(number[0]) }
  }

  if (!/[a-z]/.test(source[cursor.at]!)) {
    throw new MathParseError(`unexpected ${JSON.stringify(source[cursor.at])} at position ${String(cursor.at)}`)
  }
  const name = readName(source, cursor.at)
  cursor.at += name.length
  skip(cursor)
  if (source[cursor.at] !== '(') return { op: 'variable', name }

  cursor.at += 1
  const args: MathExpressionV1[] = [parseExpression(cursor)]
  for (;;) {
    skip(cursor)
    if (source[cursor.at] !== ',') break
    cursor.at += 1
    args.push(parseExpression(cursor))
  }
  expect(cursor, ')')

  if (UNARY.has(name)) {
    if (args.length !== 1) throw new MathParseError(`${name} takes one argument`)
    return { op: name as typeof MATH_UNARY_OPERATORS[number], value: args[0]! }
  }
  if (BINARY.has(name)) {
    if (args.length !== 2) throw new MathParseError(`${name} takes two arguments`)
    return { op: name as typeof MATH_BINARY_OPERATORS[number], left: args[0]!, right: args[1]! }
  }
  throw new MathParseError(`unknown function ${name}`)
}

/**
 * Parse one infix expression.
 * @param source - The expression as written, e.g. `sigmoid(w*x + b)`.
 * @returns the equivalent AST.
 * @throws MathParseError when the source is not a well-formed expression.
 */
export function parseMathExpression(source: string): MathExpressionV1 {
  if (source.length > 512) throw new MathParseError('expression exceeds 512 characters')
  const cursor: Cursor = { source: source.toLowerCase(), at: 0 }
  const parsed = parseExpression(cursor)
  skip(cursor)
  if (cursor.at !== cursor.source.length) {
    throw new MathParseError(`unexpected trailing input at position ${String(cursor.at)}`)
  }
  return parsed
}
