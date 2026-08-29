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
import { createNavigationStore } from '../lib/types/client/state/navigation.js'

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
  assert.deepEqual(LAYOUT_FIT.wide, { railOpen: true, asideOpen: true })
})

test('a panel the operator has not touched follows its class', () => {
  const untouched = { railOpen: false, asideOpen: false, railPinned: false, asidePinned: false }
  assert.deepEqual(fitPanels('wide', untouched), {
    railOpen: true, asideOpen: true, railPinned: false, asidePinned: false,
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
  }), { railOpen: false, asideOpen: true, railPinned: true, asidePinned: false })
})

test('compact closes both panels and forgets the pins that held them', () => {
  assert.deepEqual(fitPanels('compact', {
    railOpen: true, asideOpen: true, railPinned: true, asidePinned: true,
  }), { railOpen: false, asideOpen: false, railPinned: false, asidePinned: false })
})

test('a toggle survives every resize inside one class', () => {
  const store = createNavigationStore()
  store.fit('wide')
  assert.deepEqual(panels(store), { railOpen: true, asideOpen: true })
  store.toggleAside()
  store.fit('wide')
  assert.deepEqual(panels(store), { railOpen: true, asideOpen: false })
})

test('a narrowed frame takes both panels back', () => {
  const store = createNavigationStore()
  store.fit('wide')
  store.fit('compact')
  assert.deepEqual(panels(store), { railOpen: false, asideOpen: false })
})

test('a panel summoned in compact is a reveal, not a preference', () => {
  const store = createNavigationStore()
  store.fit('compact')
  store.toggleRail()
  store.toggleAside()
  assert.deepEqual(panels(store), { railOpen: true, asideOpen: true })
  // Both were transient: widening docks the rail and puts the card away
  // again, exactly as it would for an operator who had touched neither.
  store.fit('medium')
  assert.deepEqual(panels(store), { railOpen: true, asideOpen: false })
})

test('widening restores the defaults a compact pass cleared', () => {
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
