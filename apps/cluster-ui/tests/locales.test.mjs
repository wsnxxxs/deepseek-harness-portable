/**
 * The dictionaries are this package's own, so nothing else will notice a key
 * that exists in one language and not the other. These checks do.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CLUSTER_NS, en, zh } from '../lib/types/client/locales.js'

test('the namespace is the one the plugin registers and the panel binds', () => {
  assert.equal(CLUSTER_NS, 'cluster')
})

test('every English key has a translation, and no translation is orphaned', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
})

test('no entry is left blank or untranslated by accident', () => {
  for (const [key, value] of Object.entries(zh)) {
    assert.equal(typeof value, 'string')
    assert.notEqual(value.trim(), '', `${key} has no copy`)
  }
})

test('placeholders survive translation', () => {
  // A dropped `{count}` would render "个运行中" with no number and no error.
  const placeholders = (value) => (value.match(/\{\w+\}/g) ?? []).sort()
  for (const key of Object.keys(en)) {
    assert.deepEqual(placeholders(zh[key]), placeholders(en[key]), `${key} lost or gained a placeholder`)
  }
})
