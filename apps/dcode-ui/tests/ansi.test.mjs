/**
 * The ANSI reader turns bytes a terminal would have interpreted into styled
 * text. Everything it gets wrong shows up as either litter in the output or
 * colour bleeding across a line, so the sequence grammar, the colour models
 * and the carriage-return rule are pinned here.
 *
 * The module compiles to `lib/types/`, which is the type-stripped ESM the
 * client bundle is built from; importing it there tests the shipped code.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applySgr, hasAnsi, parseAnsi, stripAnsi, xtermColor } from '../lib/types/client/chat/ansi.js'

const ESC = '\u001b'
const BEL = '\u0007'

/** The flat text of a parsed document, line by line. */
const textOf = document => document.lines.map(spans => spans.map(span => span.text).join(''))

test('plain text takes the fast path and is returned unchanged', () => {
  assert.equal(hasAnsi('nothing to see'), false)
  assert.equal(hasAnsi(`${ESC}[32mgreen`), true)
  // A carriage return alone still needs the reader: it rewrites the line.
  assert.equal(hasAnsi('50%\r100%'), true)
  assert.equal(stripAnsi('nothing to see'), 'nothing to see')
})

test('SGR colours become themeable palette references', () => {
  const document = parseAnsi(`${ESC}[31mred${ESC}[0m plain`)
  assert.deepEqual(document.lines[0], [
    { fg: 'var(--zx-ansi-1)', text: 'red' },
    { text: ' plain' },
  ])
})

test('bright colours land in the upper half of the palette', () => {
  const document = parseAnsi(`${ESC}[91mbright${ESC}[104mon-blue`)
  assert.equal(document.lines[0][0].fg, 'var(--zx-ansi-9)')
  assert.equal(document.lines[0][1].bg, 'var(--zx-ansi-12)')
})

test('attributes accumulate and clear individually', () => {
  const document = parseAnsi(`${ESC}[1m${ESC}[4mboth${ESC}[24monly-bold${ESC}[22mneither`)
  const [bold, underline, plain] = document.lines[0]
  assert.deepEqual(bold, { bold: true, underline: true, text: 'both' })
  assert.deepEqual(underline, { bold: true, text: 'only-bold' })
  assert.deepEqual(plain, { text: 'neither' })
})

test('256-colour and truecolour carry their own values', () => {
  // The first sixteen stay themeable; the cube and the grey ramp do not.
  assert.equal(xtermColor(9), 'var(--zx-ansi-9)')
  assert.equal(xtermColor(196), '#ff0000')
  assert.equal(xtermColor(231), '#ffffff')
  assert.equal(xtermColor(232), '#080808')
  assert.equal(xtermColor(255), '#eeeeee')

  const indexed = parseAnsi(`${ESC}[38;5;196mred${ESC}[48;5;21mon-blue`)
  assert.equal(indexed.lines[0][0].fg, '#ff0000')
  assert.equal(indexed.lines[0][1].bg, '#0000ff')

  const truecolor = parseAnsi(`${ESC}[38;2;18;52;86mexact`)
  assert.equal(truecolor.lines[0][0].fg, '#123456')
})

test('the ITU colon spelling of an extended colour is accepted', () => {
  // `38:2::r:g:b` leaves an empty colour-space slot that must be skipped, not
  // read as a channel.
  const document = parseAnsi(`${ESC}[38:2::18:52:86mexact`)
  assert.equal(document.lines[0][0].fg, '#123456')
})

test('inverse swaps the colours it has and borrows the ones it does not', () => {
  const explicit = parseAnsi(`${ESC}[31;47;7mswapped`)
  assert.equal(explicit.lines[0][0].fg, 'var(--zx-ansi-7)')
  assert.equal(explicit.lines[0][0].bg, 'var(--zx-ansi-1)')

  const bare = parseAnsi(`${ESC}[7mswapped`)
  assert.equal(bare.lines[0][0].fg, 'var(--zx-ansi-bg)')
  assert.equal(bare.lines[0][0].bg, 'var(--zx-ansi-fg)')
})

test('non-SGR sequences are discarded whole rather than leaked as text', () => {
  // Cursor moves, erases, an OSC title, and a bare two-byte escape.
  const noisy = `${ESC}[2J${ESC}[1;1Hclean${ESC}]0;window title${BEL}er${ESC}(Bs`
  assert.deepEqual(textOf(parseAnsi(noisy)), ['cleaners'])
})

test('an OSC terminated by ST rather than BEL is also consumed', () => {
  assert.deepEqual(textOf(parseAnsi(`${ESC}]8;;https://example.test${ESC}\\link`)), ['link'])
})

test('a truncated escape at the end of the buffer does not leak', () => {
  assert.deepEqual(textOf(parseAnsi(`done${ESC}[3`)), ['done'])
  assert.deepEqual(textOf(parseAnsi(`done${ESC}`)), ['done'])
})

test('a carriage return collapses a redrawn line to its last frame', () => {
  const progress = 'downloading  1%\rdownloading 50%\rdownloading 100%\ndone'
  assert.deepEqual(textOf(parseAnsi(progress)), ['downloading 100%', 'done'])
  // Copy takes the same collapsed text, not the redraw history.
  assert.equal(stripAnsi(progress), 'downloading 100%\ndone')
})

test('styling carries across a line break but a line is its own span list', () => {
  const document = parseAnsi(`${ESC}[32mfirst\nsecond`)
  assert.equal(document.lines.length, 2)
  assert.equal(document.lines[0][0].fg, 'var(--zx-ansi-2)')
  assert.equal(document.lines[1][0].fg, 'var(--zx-ansi-2)')
})

test('adjacent runs of one style merge into a single span', () => {
  // Two escapes that resolve to the same style must not produce two nodes.
  const document = parseAnsi(`${ESC}[32mone${ESC}[32mtwo`)
  assert.equal(document.lines[0].length, 1)
  assert.equal(document.lines[0][0].text, 'onetwo')
})

test('the trailing newline every CLI writes does not add an empty row', () => {
  assert.deepEqual(textOf(parseAnsi('one\ntwo\n')), ['one', 'two'])
  // A deliberate blank line in the middle is content and survives.
  assert.deepEqual(textOf(parseAnsi('one\n\ntwo\n')), ['one', '', 'two'])
})

test('control characters that are not newlines or tabs are dropped', () => {
  assert.deepEqual(textOf(parseAnsi('a\u0000b\u0008c\td')), ['abc\td'])
})

test('limits bound the DOM and are reported', () => {
  const many = Array.from({ length: 50 }, (_value, index) => `line ${index}`).join('\n')
  const capped = parseAnsi(many, { maxLines: 10 })
  assert.equal(capped.truncated, true)
  assert.equal(capped.lines.length, 10)

  const long = parseAnsi('0123456789', { maxChars: 4 })
  assert.equal(long.truncated, true)
  assert.deepEqual(textOf(long), ['0123'])

  const exact = parseAnsi('one\ntwo')
  assert.equal(exact.truncated, false)
})

test('an unknown SGR parameter leaves the style it does not understand alone', () => {
  assert.deepEqual(applySgr({ bold: true }, ['53']), { bold: true })
  assert.deepEqual(applySgr({ bold: true, fg: 'x' }, ['0']), {})
  // An extended colour cut short consumes what is there without reading the
  // following parameters as channels.
  assert.deepEqual(applySgr({}, ['38', '2', '18']), {})
})
