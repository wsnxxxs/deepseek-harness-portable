/**
 * The marketplace Host is a separately versioned third-party plugin that may
 * be absent, older than this surface, or replaced by a page that answers HTML
 * for a route it never registered. What this file pins is the boundary that
 * has to survive all three: what a drifting payload degrades to, and which
 * failures are reported as "no marketplace here" rather than as a refusal.
 *
 * The modules compile to `lib/types/`, which is the type-stripped ESM the
 * client bundle is built from; importing them there tests the shipped code.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createMarketClient, formatBytes, formatSpeed, lifecycleSteps, normalizeInstalled,
  normalizeJob, normalizeMarketPage, pendingRestart,
} from '../lib/types/client/plugins/market.js'

/** A JSON answer shaped like the Host's. */
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
})

/** What a route the Host never registered actually answers: the SPA shell. */
const htmlResponse = () => new Response('<!doctype html><title>harness</title>', {
  status: 200,
  headers: { 'content-type': 'text/html; charset=utf-8' },
})

test('a catalogue row without a repository name is dropped, not rendered blank', () => {
  const page = normalizeMarketPage({
    items: [
      { fullName: 'owner/plugin', stars: 12, description: 'a plugin' },
      { description: 'no name at all' },
      null,
    ],
    total: 2,
    page: 1,
    hasMore: false,
  }, 1)
  assert.equal(page.items.length, 1)
  assert.equal(page.items[0].fullName, 'owner/plugin')
  assert.equal(page.items[0].stars, 12)
  // A row that carries no link is still openable, because the name is the URL.
  assert.equal(page.items[0].url, 'https://github.com/owner/plugin')
  assert.equal(page.items[0].installed, false)
})

test('an unusable catalogue body renders as an empty page rather than throwing', () => {
  const page = normalizeMarketPage(undefined, 3)
  assert.deepEqual(page.items, [])
  assert.equal(page.total, 0)
  assert.equal(page.page, 3)
  assert.equal(page.hasMore, false)
  assert.equal(page.error, undefined)
})

test('a Host that omits hasMore still paginates', () => {
  assert.equal(normalizeMarketPage({ items: [], total: 120, page: 1 }, 1).hasMore, true)
  assert.equal(normalizeMarketPage({ items: [], total: 40, page: 1 }, 1).hasMore, false)
  // An explicit verdict always wins over the arithmetic.
  assert.equal(normalizeMarketPage({ items: [], total: 120, page: 1, hasMore: false }, 1).hasMore, false)
})

test('built-in plugins never reach the manage list', () => {
  const snapshot = normalizeInstalled({
    plugins: [
      { name: 'dsh-plugin-shell', kind: 'builtin', enabled: true },
      { name: 'third-party', kind: 'installed', enabled: true, exposure: 'boot-configured' },
    ],
    self: { name: 'dsh-plugin-marketplace', version: '0.3.1', latestVersion: '0.4.0', updateAvailable: true },
  })
  assert.deepEqual(snapshot.plugins.map(plugin => plugin.name), ['third-party'])
  assert.equal(snapshot.self.name, 'dsh-plugin-marketplace')
  assert.equal(snapshot.self.updateAvailable, true)
})

test('an older Host that reports no activation flag falls back to enabled', () => {
  const [plugin] = normalizeInstalled({
    plugins: [{ name: 'legacy', kind: 'installed', enabled: true }],
  }).plugins
  assert.equal(plugin.activated, true)
  // Without an exposure the plugin is active but its load state is unknown,
  // which must not be reported as "configured at boot".
  assert.equal(plugin.exposure, 'unknown')
  assert.equal(plugin.available, undefined)
})

test('a disabled plugin with no exposure reads as inactive', () => {
  const [plugin] = normalizeInstalled({
    plugins: [{ name: 'legacy', kind: 'installed', enabled: false }],
  }).plugins
  assert.equal(plugin.exposure, 'inactive')
  assert.deepEqual(lifecycleSteps(plugin).map(step => step.state), ['done', 'unknown', 'off', 'off'])
})

test('the lifecycle separates "switched off" from "waiting for a restart"', () => {
  const enabled = {
    name: 'p', kind: 'installed', enabled: true, available: true,
    activated: true, exposure: 'pending-restart', updateAvailable: false,
  }
  assert.deepEqual(lifecycleSteps(enabled).map(step => step.state), ['done', 'done', 'done', 'pending'])
  assert.equal(pendingRestart(enabled), true)
  const live = { ...enabled, exposure: 'boot-configured' }
  assert.deepEqual(lifecycleSteps(live).map(step => step.state), ['done', 'done', 'done', 'done'])
  assert.equal(pendingRestart(live), false)
})

test('a job snapshot keeps its percentage inside the bar', () => {
  assert.equal(normalizeJob({ percent: 42.6 }).percent, 43)
  assert.equal(normalizeJob({ percent: 140 }).percent, 100)
  // A Host that cannot estimate sends -1, which must stay indeterminate
  // rather than rendering as an empty but definite bar.
  assert.equal(normalizeJob({ percent: -1 }).percent, undefined)
  assert.equal(normalizeJob({}).percent, undefined)
  assert.equal(normalizeJob(undefined), undefined)
})

test('an unknown job phase still renders as a phase', () => {
  assert.equal(normalizeJob({ phase: 'quantum-tunnelling' }).phase, 'pending')
  assert.equal(normalizeJob({ phase: 'downloading' }).phase, 'downloading')
})

test('sizes and rates read at the precision each magnitude justifies', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(1023), '1023 B')
  assert.equal(formatBytes(1024), '1.0 KB')
  assert.equal(formatBytes(1024 * 1024), '1.0 MB')
  assert.equal(formatBytes(1024 ** 3), '1.00 GB')
  assert.equal(formatBytes(Number.NaN), '0 B')
  assert.equal(formatSpeed(0), '')
  assert.equal(formatSpeed(2048), '2 KB/s')
  assert.equal(formatSpeed(1024 ** 2 * 3), '3.0 MB/s')
})

test('a route the Host never registered is reported as no marketplace at all', async () => {
  const client = createMarketClient(async () => htmlResponse())
  const answer = await client.installed()
  assert.equal(answer.ok, false)
  assert.equal(answer.unavailable, true)
})

test('a marketplace that answers and refuses is not mistaken for a missing one', async () => {
  const client = createMarketClient(async () => jsonResponse({ ok: false, error: 'bad spec' }, 400))
  const answer = await client.install('owner/repo')
  assert.equal(answer.ok, false)
  assert.equal(answer.unavailable, false)
  assert.equal(answer.error, 'bad spec')
})

test('an install reports its job id, and a synchronous Host reports none', async () => {
  const async = createMarketClient(async () => jsonResponse({ ok: true, jobId: 'job-1' }, 202))
  assert.deepEqual(await async.install('owner/repo'), { ok: true, value: 'job-1' })
  const sync = createMarketClient(async () => jsonResponse({ ok: true }))
  assert.deepEqual(await sync.install('owner/repo'), { ok: true, value: undefined })
})

test('an install posts the repository as the spec the Host resolves', async () => {
  let seen
  const client = createMarketClient(async (url, init) => {
    seen = { url, method: init.method, body: JSON.parse(init.body) }
    return jsonResponse({ ok: true, jobId: 'job-2' }, 202)
  })
  await client.install('owner/repo')
  assert.equal(seen.url, '/api/market/install')
  assert.equal(seen.method, 'POST')
  assert.deepEqual(seen.body, { spec: 'owner/repo' })
})

test('a search reaches the Host as a paged query', async () => {
  let seen
  const client = createMarketClient(async (url) => {
    seen = url
    return jsonResponse({ items: [], total: 0, page: 2, hasMore: false })
  })
  await client.list('vision', 2)
  assert.match(seen, /^\/api\/market\/list\?/)
  const params = new URLSearchParams(seen.slice(seen.indexOf('?') + 1))
  assert.equal(params.get('q'), 'vision')
  assert.equal(params.get('page'), '2')
  assert.equal(params.get('per_page'), '50')
  // An empty keyword asks for the whole topic rather than for the empty string.
  await client.list('', 1)
  assert.equal(new URLSearchParams(seen.slice(seen.indexOf('?') + 1)).get('q'), null)
})

test('a job the Host has forgotten terminates polling instead of hanging it', async () => {
  const client = createMarketClient(async () => jsonResponse({ ok: false, error: 'job not found', done: true }, 404))
  const answer = await client.job('job-3')
  assert.equal(answer.ok, false)
  assert.equal(answer.unavailable, true)
})

test('enable and uninstall answer the acknowledgement they were given', async () => {
  const ok = createMarketClient(async () => jsonResponse({ ok: true }))
  assert.deepEqual(await ok.setEnabled('p', false), { ok: true, value: undefined })
  assert.deepEqual(await ok.uninstall('p'), { ok: true, value: undefined })
  const refused = createMarketClient(async () => jsonResponse({ ok: false, error: 'not installed' }))
  assert.deepEqual(await refused.uninstall('p'), { ok: false, error: 'not installed', unavailable: false })
})

test('a transport failure is an ordinary refusal, not a missing marketplace', async () => {
  const client = createMarketClient(async () => { throw new Error('offline') })
  const answer = await client.list('', 1)
  assert.equal(answer.ok, false)
  assert.equal(answer.unavailable, false)
  assert.equal(answer.error, 'offline')
})
