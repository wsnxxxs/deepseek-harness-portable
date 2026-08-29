import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createCachedProfileFallbackHealer } from './profile-fallback-cache.js'

test('profile fallback cache skips unchanged healing and invalidates missing entries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-profile-fallback-cache-'))
  const profileDir = join(root, 'profiles', 'web')
  const modulesDir = join(root, 'profiles', 'node_modules')
  const installAnchor = join(root, 'package.json')
  const runtimeDeps = join(root, 'runtime-deps.generated.json')
  await mkdir(profileDir, { recursive: true })
  await writeFile(installAnchor, '{"name":"fixture"}\n')
  await writeFile(runtimeDeps, '{"closureHash":"fixture"}\n')
  const bundles = ['base', 'web']
  let healCount = 0
  const heal = createCachedProfileFallbackHealer({
    profileDir,
    installAnchor,
    runtimeDepsPath: runtimeDeps,
    bundles: () => bundles,
    heal: async () => {
      healCount += 1
      await mkdir(modulesDir, { recursive: true })
      await writeFile(join(modulesDir, 'fixture'), 'ready')
    },
  })
  try {
    await heal()
    await heal()
    assert.equal(healCount, 1)
    await rm(join(modulesDir, 'fixture'))
    await heal()
    assert.equal(healCount, 2)
    bundles.push('marketplace')
    await heal()
    assert.equal(healCount, 3)
    const marker = JSON.parse(await readFile(join(root, 'profiles', '.dsh-profile-fallback-cache-v1.json'), 'utf8')) as {
      key?: string
      entries?: string[]
    }
    assert.match(marker.key ?? '', /^[0-9a-f]{64}$/)
    assert.deepEqual(marker.entries, ['fixture'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
