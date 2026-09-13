import { deepStrictEqual, strictEqual } from 'node:assert/strict'
import { test } from 'node:test'
import { detectLength, documentEndSpan } from '../lib/types/client/caret.js'

test('a chip-free draft measures the same in both projections', () => {
  strictEqual(detectLength('read this', []), 9)
})

test('each chip collapses to one detect character', () => {
  // '@src/a.ts ' is 10 clipboard characters standing for 1 detect character.
  strictEqual(detectLength('@src/a.ts hello', [{ length: 9 }]), 7)
})

test('the span lands collapsed at the detect document end', () => {
  deepStrictEqual(
    documentEndSpan('@src/a.ts hi', [{ length: 9 }], 12),
    { start: 4, end: 4, draftRev: 12 },
  )
})
