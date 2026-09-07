import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { ensureWebAllProfile, WEB_ALL_PACKAGE, WEB_ALL_VERSION } from './web-all-profile.js'

test('migrates the marketplace to the shipped bundle and respects subsequent uninstall', () => {
  const dir = mkdtempSync(join(tmpdir(), 'portable-web-all-'))
  const path = join(dir, 'package.json')
  try {
    writeFileSync(path, JSON.stringify({
      dependencies: { 'dsh-plugin-marketplace': 'file:old', custom: '1.0.0' },
      dsh: { profile: { bundles: ['base', 'dsh-plugin-marketplace', 'custom'], portablePlugins: { custom: false } } },
    }))
    ensureWebAllProfile(dir)
    const manifest = JSON.parse(readFileSync(path, 'utf8'))
    assert.deepEqual(manifest.dsh.profile.bundles, ['base', 'custom', WEB_ALL_PACKAGE])
    assert.deepEqual(manifest.dependencies, { custom: '1.0.0', [WEB_ALL_PACKAGE]: WEB_ALL_VERSION })
    assert.equal(manifest.dsh.profile.portablePlugins.custom, false)
    manifest.dsh.profile.bundles.pop()
    delete manifest.dependencies[WEB_ALL_PACKAGE]
    writeFileSync(path, JSON.stringify(manifest))
    const removed = readFileSync(path, 'utf8')
    ensureWebAllProfile(dir)
    assert.equal(readFileSync(path, 'utf8'), removed)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
