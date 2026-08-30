/**
 * The git layer's parsers and its path guard.
 *
 * Porcelain and numstat are parsed rather than shelled through a formatter, so
 * their shapes are pinned here; `containedRelativePath` is the guard between a
 * browser-supplied path and an argv, so its rejections are pinned too.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolve } from 'node:path'
import {
  containedRelativePath, parseBranchHeader, parseNumstat, parsePorcelain,
} from '../lib/index.js'

const ROOT = resolve('/repo')

test('porcelain rows carry their status letter, staging and path', () => {
  const rows = parsePorcelain(['M  src/a.ts', ' M src/b.ts', '?? new.txt', 'D  gone.ts'].join('\0'))
  assert.deepEqual(rows.map(row => [row.path, row.status, row.staged]), [
    ['src/a.ts', 'modified', true],
    ['src/b.ts', 'modified', false],
    ['new.txt', 'untracked', false],
    ['gone.ts', 'deleted', true],
  ])
})

test('a rename record consumes its following source path', () => {
  const rows = parsePorcelain(['R  after.ts', 'before.ts', 'M  other.ts'].join('\0'))
  assert.equal(rows.length, 2)
  assert.equal(rows[0].status, 'renamed')
  assert.equal(rows[0].path, 'after.ts')
  assert.equal(rows[0].from, 'before.ts')
  assert.equal(rows[1].path, 'other.ts')
})

test('conflicted rows are not reported as ordinary modifications', () => {
  const rows = parsePorcelain(['UU merged.ts', 'AA both.ts'].join('\0'))
  assert.deepEqual(rows.map(row => row.status), ['conflicted', 'conflicted'])
  assert.deepEqual(rows.map(row => row.staged), [false, false])
})

test('a path changed in the index and work tree appears in both groups', () => {
  const rows = parsePorcelain(['MM src/a.ts', 'AM src/new.ts'].join('\0'))
  assert.deepEqual(rows.map(row => [row.path, row.status, row.staged]), [
    ['src/a.ts', 'modified', true],
    ['src/a.ts', 'modified', false],
    ['src/new.ts', 'added', true],
    ['src/new.ts', 'modified', false],
  ])
})

test('numstat counts land per path and a binary blob counts as zero', () => {
  const counts = parseNumstat(['12\t3\tsrc/a.ts', '-\t-\timage.png', ''].join('\0'))
  assert.deepEqual(counts.get('src/a.ts'), { insertions: 12, deletions: 3 })
  assert.deepEqual(counts.get('image.png'), { insertions: 0, deletions: 0 })
})

test('the branch header carries tracking distance', () => {
  assert.deepEqual(parseBranchHeader('## main...origin/main [ahead 2, behind 1]'), {
    branch: 'main', upstream: 'origin/main', ahead: 2, behind: 1, detached: false,
  })
})

test('an untracked branch header has no upstream and no distance', () => {
  assert.deepEqual(parseBranchHeader('## feature/x'), {
    branch: 'feature/x', ahead: 0, behind: 0, detached: false,
  })
})

test('a detached HEAD is reported as detached rather than as a branch', () => {
  assert.deepEqual(parseBranchHeader('## HEAD (no branch)'), {
    ahead: 0, behind: 0, detached: true,
  })
})

test('contained paths are normalized to forward-slashed root-relative form', () => {
  assert.equal(containedRelativePath(ROOT, 'src/a.ts'), 'src/a.ts')
  assert.equal(containedRelativePath(ROOT, resolve(ROOT, 'src', 'b.ts')), 'src/b.ts')
})

test('a path escaping the work tree is refused', () => {
  assert.throws(() => containedRelativePath(ROOT, '../outside.ts'), /escapes the workspace/)
  assert.throws(() => containedRelativePath(ROOT, 'src/../../outside.ts'), /escapes the workspace/)
  assert.throws(() => containedRelativePath(ROOT, resolve('/elsewhere/x.ts')), /escapes the workspace/)
})

test('empty and NUL-bearing paths are refused before reaching argv', () => {
  assert.throws(() => containedRelativePath(ROOT, ''), /non-empty/)
  assert.throws(() => containedRelativePath(ROOT, '   '), /non-empty/)
  assert.throws(() => containedRelativePath(ROOT, 'a\0b'), /NUL/)
})

test('the work-tree root itself is not a file path', () => {
  assert.throws(() => containedRelativePath(ROOT, ROOT), /escapes the workspace/)
})
