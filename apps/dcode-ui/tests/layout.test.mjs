/**
 * The frame fits its panels to its own width, and the operator's own toggles
 * have to survive that fitting. Both halves of the contract are pinned here:
 * where the width classes begin, and what a class change does to a panel the
 * operator has already moved.
 *
 * The modules compile to `lib/types/`, which is the type-stripped ESM the
 * client bundle is built from; importing them there tests the shipped code.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  fitPanels, LAYOUT_BREAKPOINTS, LAYOUT_FIT, resolveLayoutSize,
} from '../lib/types/client/state/layout.js'
import {
  compactOverlayOf, createNavigationStore, orderedAsideTabs, primaryAsideTab,
} from '../lib/types/client/state/navigation.js'

/** The panel pair, which is all these assertions are about. */
const panels = store => {
  const state = store.getSnapshot()
  return { railOpen: state.railOpen, asideOpen: state.asideOpen }
}

test('a width class begins at its breakpoint', () => {
  assert.equal(resolveLayoutSize(360), 'compact')
  assert.equal(resolveLayoutSize(LAYOUT_BREAKPOINTS.medium - 1), 'compact')
  assert.equal(resolveLayoutSize(LAYOUT_BREAKPOINTS.medium), 'medium')
  assert.equal(resolveLayoutSize(LAYOUT_BREAKPOINTS.wide - 1), 'medium')
  assert.equal(resolveLayoutSize(LAYOUT_BREAKPOINTS.wide), 'wide')
  assert.equal(resolveLayoutSize(2560), 'wide')
})

test('an unmeasured frame docks the rail rather than collapsing everything', () => {
  assert.equal(resolveLayoutSize(0), 'medium')
  assert.equal(resolveLayoutSize(Number.NaN), 'medium')
  assert.equal(resolveLayoutSize(-1), 'medium')
})

test('each class opens only what it has room for', () => {
  assert.deepEqual(LAYOUT_FIT.compact, { railOpen: false, asideOpen: false })
  assert.deepEqual(LAYOUT_FIT.medium, { railOpen: true, asideOpen: false })
  assert.deepEqual(LAYOUT_FIT.wide, { railOpen: true, asideOpen: false })
})

test('a panel the operator has not touched follows its class', () => {
  const untouched = { railOpen: false, asideOpen: false, railPinned: false, asidePinned: false }
  assert.deepEqual(fitPanels('wide', untouched), {
    railOpen: true, asideOpen: false, railPinned: false, asidePinned: false,
  })
  assert.deepEqual(fitPanels('medium', { ...untouched, railOpen: true, asideOpen: true }), {
    railOpen: true, asideOpen: false, railPinned: false, asidePinned: false,
  })
})

test('a pinned panel keeps the value the operator gave it', () => {
  assert.deepEqual(fitPanels('wide', {
    railOpen: false, asideOpen: false, railPinned: true, asidePinned: true,
  }), { railOpen: false, asideOpen: false, railPinned: true, asidePinned: true })
  // One pin does not speak for the other panel.
  assert.deepEqual(fitPanels('wide', {
    railOpen: false, asideOpen: false, railPinned: true, asidePinned: false,
  }), { railOpen: false, asideOpen: false, railPinned: true, asidePinned: false })
})

test('compact closes both panels and forgets the pins that held them', () => {
  assert.deepEqual(fitPanels('compact', {
    railOpen: true, asideOpen: true, railPinned: true, asidePinned: true,
  }), { railOpen: false, asideOpen: false, railPinned: false, asidePinned: false })
})

test('a toggle survives every resize inside one class', () => {
  const store = createNavigationStore()
  store.fit('wide')
  assert.deepEqual(panels(store), { railOpen: true, asideOpen: false })
  store.toggleAside()
  store.fit('wide')
  assert.deepEqual(panels(store), { railOpen: true, asideOpen: true })
})

test('a narrowed frame takes both panels back', () => {
  const store = createNavigationStore()
  store.fit('wide')
  store.fit('compact')
  assert.deepEqual(panels(store), { railOpen: false, asideOpen: false })
})

test('compact overlays are mutually exclusive reveals, not preferences', () => {
  const store = createNavigationStore()
  store.fit('compact')
  store.toggleRail()
  assert.equal(compactOverlayOf(store.getSnapshot()), 'rail')
  store.toggleAside()
  assert.deepEqual(panels(store), { railOpen: false, asideOpen: true })
  assert.equal(compactOverlayOf(store.getSnapshot()), 'aside')
  store.toggleSummary()
  assert.deepEqual(panels(store), { railOpen: false, asideOpen: false })
  assert.equal(compactOverlayOf(store.getSnapshot()), 'summary')
  // Compact drawer reveals do not become docked-panel preferences. The
  // explicitly summoned summary remains open, now as the desktop card.
  store.fit('medium')
  assert.deepEqual(panels(store), { railOpen: true, asideOpen: false })
  assert.equal(store.getSnapshot().summaryOpen, true)
})

test('opening each compact overlay atomically closes both peers', () => {
  const store = createNavigationStore()
  store.fit('compact')

  store.openCompactOverlay('summary')
  assert.deepEqual({
    railOpen: store.getSnapshot().railOpen,
    asideOpen: store.getSnapshot().asideOpen,
    summaryOpen: store.getSnapshot().summaryOpen,
  }, { railOpen: false, asideOpen: false, summaryOpen: true })
  store.openCompactOverlay('rail')
  assert.equal(compactOverlayOf(store.getSnapshot()), 'rail')
  assert.equal(store.getSnapshot().summaryOpen, false)
  store.openAside('details')
  assert.equal(compactOverlayOf(store.getSnapshot()), 'aside')
  assert.equal(store.getSnapshot().railOpen, false)

  store.closeCompactOverlay()
  assert.equal(compactOverlayOf(store.getSnapshot()), undefined)
})

test('widening restores the workspace context-panel preference', () => {
  const store = createNavigationStore()
  store.fit('wide')
  store.toggleAside()
  store.fit('compact')
  store.fit('wide')
  assert.deepEqual(panels(store), { railOpen: true, asideOpen: true })
})

test('revealing the aside pins it open across a class change', () => {
  const store = createNavigationStore()
  store.fit('wide')
  store.toggleAside()
  store.openDiff('src/client/state/layout.ts')
  store.fit('medium')
  assert.deepEqual(panels(store), { railOpen: true, asideOpen: true })
})

test('task context prioritizes errors, then changes, without losing tabs', () => {
  const context = { hasError: true, hasChanges: true, goalActive: true, failedCallId: 'call-1' }
  assert.equal(primaryAsideTab(context), 'details')
  assert.deepEqual(orderedAsideTabs(context), ['details', 'changes', 'goal', 'terminal'])
  assert.deepEqual(orderedAsideTabs({ ...context, hasError: false }), ['changes', 'goal', 'terminal', 'details'])
})

test('manual context-panel choices are remembered per workspace', () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  }
  try {
    const store = createNavigationStore()
    store.setWorkspace('C:/alpha')
    store.openAside('goal')
    store.setWorkspace('C:/beta')
    assert.equal(store.getSnapshot().asideOpen, false)
    store.setWorkspace('C:/alpha')
    assert.equal(store.getSnapshot().asideOpen, true)
  } finally {
    delete globalThis.localStorage
  }
})

test('the summary card is summoned by hand, never opened by the frame', () => {
  const store = createNavigationStore()
  assert.equal(store.getSnapshot().summaryOpen, false)
  store.fit('wide')
  assert.equal(store.getSnapshot().summaryOpen, false)
  store.toggleSummary()
  assert.equal(store.getSnapshot().summaryOpen, true)
})

test('a summary row hands over to the sidebar it opens', () => {
  const store = createNavigationStore()
  store.toggleSummary()
  store.openAside('changes')
  const state = store.getSnapshot()
  assert.equal(state.summaryOpen, false)
  assert.equal(state.asideOpen, true)
  assert.equal(state.aside, 'changes')
})

test('the compact drawer closes behind a surface switch, and only there', () => {
  const store = createNavigationStore()
  store.fit('compact')
  store.toggleRail()
  store.show('learning')
  assert.equal(store.getSnapshot().railOpen, false)

  store.fit('medium')
  store.show('session')
  assert.equal(store.getSnapshot().railOpen, true)
})
