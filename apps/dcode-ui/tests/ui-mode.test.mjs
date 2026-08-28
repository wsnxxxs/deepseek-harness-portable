/**
 * The switch vocabulary is shared by four independent surfaces — the Electron
 * main process, the preload bridge, the DSH host plugin and the browser
 * bundle — so its resolution and URL rules are pinned here rather than
 * re-derived at each call site.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_UI_MODE, UI_MODES, asUiMode, otherUiMode, resolveUiMode,
  uiModeFromSearch, withUiModeParam,
} from '../lib/ui-mode.js'

test('the modern workbench is the default and the classic UI stays selectable', () => {
  assert.equal(DEFAULT_UI_MODE, 'dcode')
  assert.deepEqual([...UI_MODES], ['dcode', 'official'])
})

test('asUiMode admits exactly the two front ends', () => {
  assert.equal(asUiMode('dcode'), 'dcode')
  assert.equal(asUiMode('official'), 'official')
  for (const value of ['DCODE', 'classic', '', null, undefined, 0, {}]) {
    assert.equal(asUiMode(value), undefined)
  }
})

test('resolveUiMode takes the first candidate that names a mode', () => {
  assert.equal(resolveUiMode(undefined, 'official', 'dcode'), 'official')
  assert.equal(resolveUiMode('nonsense', undefined, 'dcode'), 'dcode')
  assert.equal(resolveUiMode(), DEFAULT_UI_MODE)
  assert.equal(resolveUiMode(null, '', {}), DEFAULT_UI_MODE)
})

test('otherUiMode is what a toggle entry selects', () => {
  assert.equal(otherUiMode('dcode'), 'official')
  assert.equal(otherUiMode('official'), 'dcode')
})

test('the URL parameter is written explicitly, including for the default', () => {
  assert.equal(
    withUiModeParam('http://127.0.0.1:7000/', 'dcode'),
    'http://127.0.0.1:7000/?view=dcode',
  )
})

test('rewriting preserves every other query parameter and the path', () => {
  const rewritten = withUiModeParam('http://127.0.0.1:7000/app?token=abc&x=1#frag', 'official')
  const parsed = new URL(rewritten)
  assert.equal(parsed.pathname, '/app')
  assert.equal(parsed.hash, '#frag')
  assert.equal(parsed.searchParams.get('token'), 'abc')
  assert.equal(parsed.searchParams.get('x'), '1')
  assert.equal(parsed.searchParams.get('view'), 'official')
})

test('rewriting an already-stamped URL replaces rather than appends', () => {
  const once = withUiModeParam('http://127.0.0.1:7000/?view=dcode', 'official')
  assert.equal(new URL(once).searchParams.getAll('view').length, 1)
  assert.equal(uiModeFromSearch(new URL(once).search), 'official')
})

test('uiModeFromSearch reads the parameter and ignores an unknown value', () => {
  assert.equal(uiModeFromSearch('?view=official'), 'official')
  assert.equal(uiModeFromSearch('?view=dcode&other=1'), 'dcode')
  assert.equal(uiModeFromSearch('?view=classic'), undefined)
  assert.equal(uiModeFromSearch(''), undefined)
})
