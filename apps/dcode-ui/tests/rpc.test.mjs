/**
 * The `/dcode` endpoint router.
 *
 * Payloads arrive from the browser, so the shape checks in front of every git
 * invocation are the security boundary of this channel; they are pinned here
 * without touching a repository.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DCODE_CHANNEL, DCODE_ENDPOINTS, handleDcodeEndpoint, isDcodeEndpoint } from '../lib/index.js'

test('the channel and its endpoint roster are stable', () => {
  assert.equal(DCODE_CHANNEL, '/dcode')
  assert.deepEqual([...DCODE_ENDPOINTS], [
    'git/status', 'git/diff', 'git/branches', 'git/commit', 'git/undo', 'file/read',
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
