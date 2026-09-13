/** Built-runtime checks for official defaults and explicit bundle activation. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { runtimeRpc } from '../build/packaged-smoke.js'

const require = createRequire(import.meta.url)
const { createRuntimeEventDecoder } = require('../../packages/desktop-protocol/src/index.cjs')
const { readSessionCookie, parseBootManifest, waitForOnboardingReady } = require('../../apps/desktop/src/ready-url.cjs')
const root = resolve(import.meta.dirname, '../..')

async function withRuntime(bundles: string[], check: (url: string, home: string) => Promise<void>, patch?: string): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), 'dsh-official-contract-'))
  const profile = join(home, 'profiles', 'web')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    name: 'official-smoke-profile', private: true, type: 'module', dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', ...bundles] } },
  }))
  if (patch) await writeFile(join(profile, 'cordis.patch.yml'), patch)
  const child = spawn(process.execPath, [join(root, 'apps/runtime/lib/packaged-bin.js'), '--host', '127.0.0.1', '--port', '0', '--no-open'], {
    cwd: home, windowsHide: true,
    env: { ...process.env, DSH_HOME: home, DSH_CWD: home, DSH_RUNTIME_PROTOCOL_VERSION: '1', DSH_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  try {
    const url = await new Promise<string>((resolveUrl, reject) => {
      const timer = setTimeout(() => reject(new Error(`runtime readiness timed out:\n${output}`)), 30_000)
      const decoder = createRuntimeEventDecoder((event: { type: string; url?: string }) => {
        if (event.type === 'listening' && event.url) { clearTimeout(timer); resolveUrl(event.url) }
      })
      child.stdout.on('data', chunk => { output += chunk; decoder.push(chunk) })
      child.stderr.on('data', chunk => { output += chunk })
      child.once('error', error => { clearTimeout(timer); reject(error) })
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`runtime exited ${code}:\n${output}`)) })
    })
    await waitForOnboardingReady(url, { timeoutMs: 15_000 })
    await check(url, home)
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error}\n${output}`, { cause: error })
  } finally {
    if (child.exitCode === null) {
      child.kill()
      await new Promise<void>(done => child.once('close', () => done()))
    }
    await rm(home, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  }
}

async function clientIds(url: string): Promise<string[]> {
  const login = await fetch(url, { redirect: 'manual' })
  const cookie = readSessionCookie(login)
  const page = new URL(url)
  page.search = ''
  const response = await fetch(page, { headers: cookie ? { cookie } : {} })
  const manifest = parseBootManifest(await response.text())
  assert.ok(manifest?.entries)
  return manifest.entries.map((entry: { id: string }) => entry.id)
}

async function pluginRpc(url: string, method: string, payload: object): Promise<unknown> {
  const login = await fetch(url, { redirect: 'manual' })
  const cookie = readSessionCookie(login)
  const endpoint = new URL(`/api/${method}`, url)
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ type: 'client-request', rpcId: 'plugin-smoke', method, payload }),
  })
  assert.ok(response.ok, `${method}: HTTP ${response.status}`)
  const body = await response.json() as { result: { ok: boolean; value?: unknown; error?: unknown } }
  assert.equal(body.result.ok, true, JSON.stringify(body.result.error))
  return body.result.value
}

test('default desktop keeps plugin management available without enabling feature plugins', async () => {
  await withRuntime([], async (url, home) => {
    const ids = await clientIds(url)
    assert.ok(ids.includes('@deepseek-ai/dsh-client-ui-layout'))
    assert.ok(ids.includes('@dsh-portable/plugin-manager'))
    for (const feature of ['@dsh-portable/dcode-ui', '@dsh-portable/interactive-learning', '@dsh-portable/cluster-ui', 'dsh-better-sidebar']) {
      assert.ok(!ids.includes(feature), feature)
    }
    const login = await fetch(url, { redirect: 'manual' })
    const cookie = readSessionCookie(login)
    // The untouched official template starts with comments followed by `[]`.
    // A built-in toggle must leave YAML readable by the other manager too.
    for (const enabled of [true, false]) {
      await pluginRpc(url, 'portable-plugins/set-enabled', { name: '@dsh-portable/interactive-learning', enabled })
    }
    const inventory = await fetch(new URL('/api/plugin-manager/list', url), { headers: cookie ? { cookie } : {} })
    assert.ok(inventory.ok, `management inventory: ${inventory.status}`)
    const plugins = await inventory.json() as { plugins: Array<{ id: string; children?: Array<{ id: string; enabled: boolean }> }> }
    const webPlugins = plugins.plugins.find(plugin => plugin.id === '@dsh-portable/web-plugins')
    assert.ok(webPlugins?.children?.some(row => row.id === 'web-ui-plugin-manager' && row.enabled))
    assert.ok(webPlugins?.children?.some(row => row.id === 'web-ui-pet' && !row.enabled))
    for (const enabled of [true, false]) {
      const response = await fetch(new URL('/api/plugin-manager/set-enabled', url), {
        method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify({ id: 'web-ui-pet', enabled }),
      })
      assert.ok(response.ok, await response.clone().text())
      const result = await response.json() as { plugin: { children: Array<{ id: string; enabled: boolean }> } }
      assert.equal(result.plugin.children.find(row => row.id === 'web-ui-pet')?.enabled, enabled)
      assert.ok(result.plugin.children.find(row => row.id === 'web-ui-plugin-manager')?.enabled)
    }
    const roster = await runtimeRpc(url, 'agentPresets.list', {}, 5_000) as { presets: Array<{ id: string }> }
    assert.ok(roster.presets.some(preset => preset.id === 'standard'))
    assert.ok(!roster.presets.some(preset => ['learning', 'crew'].includes(preset.id)))
    await assert.rejects(readFile(join(home, '.system-agent-presets', '.runtime-capabilities.json')), { code: 'ENOENT' })
  })
})

test('DCode bundle explicitly activates its UI dependencies', async () => {
  await withRuntime(['@dsh-portable/dcode-ui'], async url => {
    const ids = await clientIds(url)
    for (const name of ['dcode-ui', 'ui-mode', 'session-manager']) assert.ok(ids.includes(`@dsh-portable/${name}`), name)
    assert.ok(!ids.includes('@dsh-portable/interactive-learning'))
  })
})

test('Learning bundle adds its preset through the official roster provider', async () => {
  await withRuntime(['@dsh-portable/interactive-learning'], async url => {
    const roster = await runtimeRpc(url, 'agentPresets.list', {}, 5_000) as { presets: Array<{ id: string; broken?: unknown }> }
    assert.ok(roster.presets.some(preset => preset.id === 'standard'))
    const learning = roster.presets.find(preset => preset.id === 'learning')
    assert.ok(learning)
    assert.equal(learning.broken, undefined)
    assert.ok((await clientIds(url)).includes('@dsh-portable/interactive-learning'))
  })
})

test('Portable presets and Cluster activate only through explicit bundles', async () => {
  await withRuntime(['@dsh-portable/runtime', '@dsh-portable/cluster-ui'], async (url, home) => {
    const roster = await runtimeRpc(url, 'agentPresets.list', {}, 5_000) as { presets: Array<{ id: string; broken?: unknown }> }
    assert.ok(roster.presets.some(preset => preset.id === 'standard'))
    assert.ok(roster.presets.some(preset => preset.id === 'crew' && !preset.broken), JSON.stringify(roster))
    assert.ok((await clientIds(url)).includes('@dsh-portable/cluster-ui'))
    assert.ok(await readFile(join(home, '.system-agent-presets', '.runtime-capabilities.json')))
  })
})

test('all Portable bundles compose with explicit shared preset roots and no missing injection', async () => {
  await withRuntime([
    '@dsh-portable/dcode-ui', '@dsh-portable/interactive-learning', '@dsh-portable/runtime',
    '@dsh-portable/cluster-ui', '@dsh-portable/desktop-enhancements',
  ], async url => {
    const ids = await clientIds(url)
    for (const name of ['desktop-enhancements', 'composer-attach', 'plugin-manager', 'interactive-learning', 'dcode-ui', 'cluster-ui']) {
      assert.ok(ids.includes(`@dsh-portable/${name}`), name)
    }
    const roster = await runtimeRpc(url, 'agentPresets.list', {}, 5_000) as { presets: Array<{ id: string }> }
    for (const id of ['standard', 'learning', 'crew']) assert.ok(roster.presets.some(preset => preset.id === id), id)
    const plugins = await pluginRpc(url, 'portable-plugins/list', {}) as { plugins: Array<{ id: string }> }
    assert.ok(plugins.plugins.some(plugin => plugin.id === 'dcode-ui'), JSON.stringify(plugins))
    await pluginRpc(url, 'dcode/git/status', { cwd: root })
  }, `- id: composer-attach
  disabled: false
- id: plugin-manager
  disabled: false
- id: portable-agent-presets
  inject: [learningPresetSource]
  config:
    default: standard
    roots: !!js "[ctx.learningPresetSource]"
`)
})
