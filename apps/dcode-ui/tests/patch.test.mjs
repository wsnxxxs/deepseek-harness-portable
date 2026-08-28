/**
 * The unified-patch reader. Line numbers here are what an operator types into
 * an editor to find the change, so an off-by-one is a wrong answer rather than
 * a cosmetic fault — and the hunk header is split into a range and a section
 * that the viewer styles differently.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parsePatch } from '../lib/types/client/git/patch.js'

/** A patch with its lines joined, as git writes it. */
const patch = lines => lines.join('\n')

test('file headers before the first hunk are dropped', () => {
  const lines = parsePatch(patch([
    'diff --git a/src/app.ts b/src/app.ts',
    'index 1234567..89abcde 100644',
    '--- a/src/app.ts',
    '+++ b/src/app.ts',
    '@@ -1,2 +1,2 @@',
    ' keep',
    '-old',
    '+new',
  ]))
  assert.deepEqual(lines.map(line => line.kind), ['hunk', 'context', 'remove', 'add'])
})

test('the hunk header splits into a range and its section context', () => {
  const [hunk] = parsePatch(patch([
    '@@ -10,3 +12,4 @@ export function render() {',
    ' body',
  ]))
  assert.equal(hunk.kind, 'hunk')
  assert.equal(hunk.range, '@@ -10,3 +12,4 @@')
  assert.equal(hunk.section, 'export function render() {')
})

test('a hunk header with no section leaves the section empty, not undefined text', () => {
  const [hunk] = parsePatch(patch(['@@ -1 +1 @@', ' body']))
  assert.equal(hunk.range, '@@ -1 +1 @@')
  assert.equal(hunk.section, '')
})

test('line numbers advance on the sides each kind belongs to', () => {
  const lines = parsePatch(patch([
    '@@ -10,4 +20,4 @@',
    ' context-a',
    '-removed',
    '+added',
    ' context-b',
  ]))
  const [, contextA, removed, added, contextB] = lines
  // Context advances both sides.
  assert.deepEqual([contextA.oldNo, contextA.newNo], [10, 20])
  // A removal is numbered on the old side only, an addition on the new side.
  assert.equal(removed.oldNo, 11)
  assert.equal(removed.newNo, undefined)
  assert.equal(added.newNo, 21)
  assert.equal(added.oldNo, undefined)
  // Both sides have consumed two rows by now — one context and one of their
  // own — so the next context row is 12 against 22.
  assert.deepEqual([contextB.oldNo, contextB.newNo], [12, 22])
})

test('a second hunk restarts numbering from its own header', () => {
  const lines = parsePatch(patch([
    '@@ -1,1 +1,1 @@',
    ' first',
    '@@ -80,1 +90,1 @@',
    ' second',
  ]))
  assert.equal(lines[1].oldNo, 1)
  assert.deepEqual([lines[3].oldNo, lines[3].newNo], [80, 90])
})

test('the marker prefix is stripped so the text column holds source alone', () => {
  const lines = parsePatch(patch(['@@ -1,3 +1,3 @@', ' kept', '-  indented', '+  indented!']))
  assert.equal(lines[1].text, 'kept')
  // Only the marker column goes; the source indentation is content.
  assert.equal(lines[2].text, '  indented')
  assert.equal(lines[3].text, '  indented!')
})

test('the no-newline marker is its own kind rather than content', () => {
  const lines = parsePatch(patch([
    '@@ -1 +1 @@',
    '-old',
    '+new',
    '\\ No newline at end of file',
  ]))
  assert.equal(lines[3].kind, 'meta')
  assert.equal(lines[3].text, '\\ No newline at end of file')
})

test("git's trailing newline does not become an empty last row", () => {
  const lines = parsePatch(patch(['@@ -1,1 +1,1 @@', ' only', '']))
  assert.equal(lines.length, 2)
  assert.equal(lines[1].text, 'only')
})

test('a second file in one patch does not inherit the first file hunk state', () => {
  // A rename shows both sides; without the boundary the second file's own
  // header lines would be numbered as if they were content of the first.
  const lines = parsePatch(patch([
    '@@ -1,1 +1,1 @@',
    ' first-file',
    'diff --git a/b.ts b/b.ts',
    '--- a/b.ts',
    '+++ b/b.ts',
    '@@ -5,1 +5,1 @@',
    ' second-file',
  ]))
  assert.deepEqual(lines.map(line => line.text), [
    '@@ -1,1 +1,1 @@', 'first-file', '@@ -5,1 +5,1 @@', 'second-file',
  ])
  assert.equal(lines[3].oldNo, 5)
})

test('an empty patch yields nothing rather than a phantom row', () => {
  assert.deepEqual(parsePatch(''), [])
  assert.deepEqual(parsePatch('\n'), [])
})
