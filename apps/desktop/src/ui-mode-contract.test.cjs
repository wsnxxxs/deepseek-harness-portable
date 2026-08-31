const assert = require('node:assert/strict')
const { test } = require('node:test')
const contract = require('@dsh-portable/ui-mode/ui-mode-contract')
const config = require('./config-store.cjs')

test('desktop config consumes the shared UI-mode contract', () => {
  assert.deepEqual([...config.UI_MODES], [...contract.UI_MODES])
  assert.equal(config.DEFAULT_UI_MODE, contract.DEFAULT_UI_MODE)
  assert.equal(config.DEFAULT_CONFIG.uiMode, contract.DEFAULT_UI_MODE)
})

test('desktop URL rewriting comes from the shared contract', () => {
  assert.equal(
    contract.withUiModeParam('http://127.0.0.1:7000/?token=x', 'official'),
    'http://127.0.0.1:7000/?token=x&view=official',
  )
  assert.equal(contract.normalizeUiMode('dcode'), 'dcode')
  assert.equal(contract.normalizeUiMode('unknown'), undefined)
})
