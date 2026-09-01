/**
 * The `/dcode` endpoint router.
 *
 * Payloads arrive from the browser, so the shape checks in front of every git
 * invocation are the security boundary of this channel; they are pinned here
 * without touching a repository.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DCODE_CHANNEL, DCODE_ENDPOINTS, handleDcodeEndpoint, isDcodeEndpoint } from '../lib/index.js'

test('the channel and its endpoint roster are stable', () => {
  assert.equal(DCODE_CHANNEL, '/dcode')
  assert.deepEqual([...DCODE_ENDPOINTS], [
    'git/status', 'git/diff', 'git/branches', 'git/stage', 'git/unstage', 'git/commit', 'git/undo', 'file/read',
    'memory/state', 'memory/search', 'memory/run', 'memory/abort', 'memory/reset', 'memory/set-enabled', 'memory/forget',
  ])
})

test('only the declared endpoints are routed', () => {
  for (const endpoint of DCODE_ENDPOINTS) assert.equal(isDcodeEndpoint(endpoint), true)
  for (const value of ['git/push', 'git/', '', null, undefined, 42]) {
    assert.equal(isDcodeEndpoint(value), false)
  }
})

test('a non-object payload is a bad request', async () => {
  for (const payload of ['x', 42, null, ['a']]) {
    const answer = await handleDcodeEndpoint('git/status', payload)
    assert.equal(answer.ok, false)
    assert.equal(answer.error.code, 'bad-request')
  }
})

test('a missing or relative cwd is refused before git runs', async () => {
  for (const payload of [{}, { cwd: '' }, { cwd: 'relative/path' }, { cwd: 42 }]) {
    const answer = await handleDcodeEndpoint('git/status', payload)
    assert.equal(answer.ok, false)
    assert.equal(answer.error.code, 'bad-request')
  }
})

test('a diff without a path is refused', async () => {
  const answer = await handleDcodeEndpoint('git/diff', { cwd: process.cwd() })
  assert.equal(answer.ok, false)
  assert.equal(answer.error.code, 'bad-request')
})

test('an empty commit message is refused as a business result, not an exception', async () => {
  const answer = await handleDcodeEndpoint('git/commit', { cwd: process.cwd(), message: '   ' })
  assert.equal(answer.ok, false)
  assert.equal(answer.error.code, 'bad-request')
})

test('undo requires at least one path', async () => {
  const answer = await handleDcodeEndpoint('git/undo', { cwd: process.cwd(), paths: [] })
  assert.equal(answer.ok, false)
  assert.equal(answer.error.code, 'bad-request')
})

test('stage and unstage endpoints update status without commit staging implicitly', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'dcode-git-'))
  const run = (...args) => execFileSync('git', args, { cwd, stdio: 'ignore' })
  try {
    run('init')
    run('config', 'user.name', 'DCode Test')
    run('config', 'user.email', 'dcode@example.invalid')
    await writeFile(join(cwd, 'tracked.txt'), 'one\n')
    run('add', '--', 'tracked.txt')
    run('commit', '--message', 'initial')
    await writeFile(join(cwd, 'tracked.txt'), 'two\n')

    const staged = await handleDcodeEndpoint('git/stage', { cwd, paths: ['tracked.txt'] })
    assert.equal(staged.ok, true)
    let status = await handleDcodeEndpoint('git/status', { cwd })
    assert.equal(status.ok, true)
    assert.equal(status.value.files.find(file => file.path === 'tracked.txt')?.staged, true)

    const unstaged = await handleDcodeEndpoint('git/unstage', { cwd, paths: ['tracked.txt'] })
    assert.equal(unstaged.ok, true)
    status = await handleDcodeEndpoint('git/status', { cwd })
    assert.equal(status.ok, true)
    assert.equal(status.value.files.find(file => file.path === 'tracked.txt')?.staged, false)

    const refused = await handleDcodeEndpoint('git/commit', { cwd, message: 'must not auto-stage' })
    assert.deepEqual(refused, { ok: true, value: { committed: false, reason: 'nothing-staged' } })
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('undo refuses a non-string path entry', async () => {
  const answer = await handleDcodeEndpoint('git/undo', { cwd: process.cwd(), paths: [42] })
  assert.equal(answer.ok, false)
  assert.equal(answer.error.code, 'bad-request')
})

test('a file read outside the workspace is refused', async () => {
  const answer = await handleDcodeEndpoint('file/read', { cwd: process.cwd(), path: '../../../etc/passwd' })
  assert.equal(answer.ok, false)
  assert.equal(answer.error.code, 'bad-request')
})

test('status of a real repository reports its branch and file rows', async () => {
  // This repository is a git work tree; the endpoint is exercised end to end
  // rather than mocked, which is the only way the argv and parser agree.
  const answer = await handleDcodeEndpoint('git/status', { cwd: process.cwd() })
  assert.equal(answer.ok, true)
  assert.equal(answer.value.repository, true)
  assert.equal(typeof answer.value.root, 'string')
  assert.ok(Array.isArray(answer.value.files))
})
