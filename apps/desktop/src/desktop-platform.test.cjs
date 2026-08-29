const test = require('node:test')
const assert = require('node:assert/strict')
const {
  browserCommand,
  nativeShellState,
  releaseAssetName,
  windowMaterial,
  windowsBuild,
} = require('./desktop-platform.cjs')

test('Linux uses native POSIX shell state', () => {
  assert.deepEqual(nativeShellState('linux', path => path === '/bin/bash'), {
    platform: 'linux',
    native: true,
    available: true,
    probed: true,
    distros: ['POSIX Bash'],
    executable: '/bin/bash',
  })
})

test('native POSIX shell state reports a missing bash executable', () => {
  assert.deepEqual(nativeShellState('linux', () => false), {
    platform: 'linux',
    native: true,
    available: false,
    probed: true,
    distros: [],
    executable: '/bin/bash',
  })
})

test('browser commands are platform-native', () => {
  assert.deepEqual(browserCommand('https://example.test', 'linux'), {
    command: 'xdg-open',
    args: ['https://example.test'],
    options: {},
  })
  assert.deepEqual(browserCommand('https://example.test', 'darwin'), {
    command: 'open',
    args: ['https://example.test'],
    options: {},
  })
  assert.deepEqual(browserCommand('https://example.test', 'win32'), {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', 'start', '', 'https://example.test'],
    options: { windowsHide: true },
  })
})

test('release assets are platform-specific', () => {
  assert.equal(releaseAssetName('1.2.3', 'linux', 'x64'), 'DeepSeek-Harness-1.2.3-linux-x64.AppImage')
  assert.equal(releaseAssetName('1.2.3', 'linux', 'arm64'), 'DeepSeek-Harness-1.2.3-linux-arm64.AppImage')
  assert.equal(releaseAssetName('1.2.3', 'darwin', 'arm64'), 'DeepSeek-Harness-1.2.3-darwin-arm64.dmg')
  assert.equal(releaseAssetName('1.2.3', 'win32', 'x64'), 'DeepSeek-Harness-1.2.3-win32-x64.zip')
  assert.equal(releaseAssetName('0.0.0', 'linux', 'x64'), undefined)
})

test('window build numbers come out of the release string', () => {
  assert.equal(windowsBuild('10.0.22631'), 22631)
  assert.equal(windowsBuild('10.0.19045'), 19045)
  assert.equal(windowsBuild('6.1.7601'), 7601)
  assert.equal(windowsBuild('not-a-release'), 0)
  assert.equal(windowsBuild(undefined), 0)
})

test('the window material is the strongest backdrop the OS can render', () => {
  // Windows 11 22H2 and later render the acrylic backdrop.
  assert.equal(windowMaterial('win32', '10.0.22621'), 'acrylic')
  assert.equal(windowMaterial('win32', '10.0.26200'), 'acrylic')
  // Windows 11 before 22H2 has mica but not acrylic.
  assert.equal(windowMaterial('win32', '10.0.22000'), 'mica')
  assert.equal(windowMaterial('win32', '10.0.22620'), 'mica')
  // Windows 10 has neither, and must keep an opaque window surface.
  assert.equal(windowMaterial('win32', '10.0.19045'), 'none')
  // Nothing else takes a backdrop material at all.
  assert.equal(windowMaterial('darwin', '23.0.0'), 'none')
  assert.equal(windowMaterial('linux', '6.5.0'), 'none')
})
