/**
 * The switch vocabulary is shared by five independent consumers — the Electron
 * main process, the preload bridge, the DSH host plugins, and each surface's
 * browser bundle — so its resolution and URL rules are pinned here rather than
 * re-derived at each call site.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_UI_MODE, UI_MODES, asUiMode, cycleUiMode, resolveUiMode,
  uiModeFromSearch, withUiModeParam,
} from '../lib/ui-mode.js'

test('the workbench is the default and every surface stays selectable', () => {
  assert.equal(DEFAULT_UI_MODE, 'dcode')
  // Presentation order, official first: it is the surface that is always
  // present, because the others shadow it and any of them failing to load
  // leaves it rendering.
  assert.deepEqual([...UI_MODES], ['official', 'dcode', 'crew'])
  assert.ok(UI_MODES.includes(DEFAULT_UI_MODE))
})

test('asUiMode admits exactly the registered surfaces', () => {
  for (const mode of UI_MODES) assert.equal(asUiMode(mode), mode)
  for (const value of ['DCODE', 'classic', 'workbench', '', null, undefined, 0, {}]) {
    assert.equal(asUiMode(value), undefined)
  }
})

test('resolveUiMode takes the first candidate that names a mode', () => {
  assert.equal(resolveUiMode(undefined, 'official', 'dcode'), 'official')
  assert.equal(resolveUiMode('nonsense', undefined, 'crew'), 'crew')
  assert.equal(resolveUiMode(), DEFAULT_UI_MODE)
  assert.equal(resolveUiMode(null, '', {}), DEFAULT_UI_MODE)
})

test('cycleUiMode walks the whole ring in both directions', () => {
  assert.deepEqual(UI_MODES.map(mode => cycleUiMode(mode)), ['dcode', 'crew', 'official'])
  assert.deepEqual(UI_MODES.map(mode => cycleUiMode(mode, -1)), ['crew', 'official', 'dcode'])

  // Every surface must be reachable from every other by repeated cycling;
  // this is what a keyboard entry with no list to pick from relies on.
  let seen = new Set()
  let cursor = DEFAULT_UI_MODE
  for (let step = 0; step < UI_MODES.length; step += 1) {
    seen.add(cursor)
    cursor = cycleUiMode(cursor)
  }
  assert.equal(seen.size, UI_MODES.length)
  assert.equal(cursor, DEFAULT_UI_MODE, 'cycling the full length must return to the start')
})

test('cycleUiMode recovers from a mode this build does not know', () => {
  // A config written by a newer build can name a surface this one lacks.
  // Wrapping off a -1 index would land on the last entry by accident.
  assert.equal(cycleUiMode('retired-surface'), DEFAULT_UI_MODE)
  assert.equal(cycleUiMode('retired-surface', -1), DEFAULT_UI_MODE)
})

test('the URL parameter is written explicitly, including for the default', () => {
  assert.equal(
    withUiModeParam('http://127.0.0.1:7000/', 'dcode'),
    'http://127.0.0.1:7000/?view=dcode',
  )
})

test('rewriting preserves every other query parameter and the path', () => {
  const rewritten = withUiModeParam('http://127.0.0.1:7000/app?token=abc&x=1#frag', 'crew')
  const parsed = new URL(rewritten)
  assert.equal(parsed.pathname, '/app')
  assert.equal(parsed.hash, '#frag')
  assert.equal(parsed.searchParams.get('token'), 'abc')
  assert.equal(parsed.searchParams.get('x'), '1')
  assert.equal(parsed.searchParams.get('view'), 'crew')
})

test('rewriting an already-stamped URL replaces rather than appends', () => {
  const once = withUiModeParam('http://127.0.0.1:7000/?view=dcode', 'official')
  assert.equal(new URL(once).searchParams.getAll('view').length, 1)
  assert.equal(uiModeFromSearch(new URL(once).search), 'official')
})

test('uiModeFromSearch reads the parameter and ignores an unknown value', () => {
  assert.equal(uiModeFromSearch('?view=official'), 'official')
  assert.equal(uiModeFromSearch('?view=crew&other=1'), 'crew')
  assert.equal(uiModeFromSearch('?view=classic'), undefined)
  assert.equal(uiModeFromSearch(''), undefined)
})

test('the CommonJS contract and the ESM vocabulary cannot drift', async () => {
  // The Electron main process reads the .cjs directly; the browser reads the
  // ESM wrapper. A mode added to one and not the other is the exact failure
  // this pair of entry points exists to make impossible.
  const { createRequire } = await import('node:module')
  const contract = createRequire(import.meta.url)('../ui-mode-contract.cjs')

  assert.deepEqual([...contract.UI_MODES], [...UI_MODES])
  assert.equal(contract.DEFAULT_UI_MODE, DEFAULT_UI_MODE)
  for (const mode of UI_MODES) assert.equal(contract.normalizeUiMode(mode), mode)
})
