import { strict as assert } from 'node:assert'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { setPortablePluginEnabled } from '../lib/types/host/rpc.js'

test('DCode activation persists a standard bundle and its required rows, preserving user patches', () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'portable-plugin-toggle-'))
  try {
    writeFileSync(join(profileDir, 'package.json'), JSON.stringify({ name: 'test-profile', private: true, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } } }))
    writeFileSync(join(profileDir, 'cordis.patch.yml'), '# user setting\n- id: user-row\n  disabled: true\n')
    const deps = { profileDir, facts: () => undefined, loader: { entries: () => ['dcode-ui', 'ui-mode', 'session-manager'].map(id => ({ id, disabled: true, options: { name: `@dsh-portable/${id}` } })) } }
    assert.equal(setPortablePluginEnabled(deps, { name: '@dsh-portable/dcode-ui', enabled: true }).ok, true)
    let manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
    assert.ok(manifest.dsh.profile.bundles.includes('@dsh-portable/dcode-ui'))
    assert.equal(manifest.dsh.profile.portablePlugins['@dsh-portable/ui-mode'], true)
    assert.match(readFileSync(join(profileDir, 'cordis.patch.yml'), 'utf8'), /# user setting/)
    assert.equal(setPortablePluginEnabled(deps, { name: '@dsh-portable/ui-mode', enabled: false }).ok, true)
    manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
    assert.ok(!manifest.dsh.profile.bundles.includes('@dsh-portable/dcode-ui'))
    assert.equal(manifest.dsh.profile.portablePlugins['@dsh-portable/dcode-ui'], false)
  } finally { rmSync(profileDir, { recursive: true, force: true }) }
})
