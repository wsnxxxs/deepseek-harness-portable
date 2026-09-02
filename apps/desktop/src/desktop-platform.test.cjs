const test = require('node:test')
const assert = require('node:assert/strict')
const {
  browserCommand,
  nativeShellState,
  releaseAssetName,
  windowMaterial,
  windowsBuild,
} = require('./desktop-platform.cjs')

test('the shell starts unprobed and WSL-backed', () => {
  assert.deepEqual(nativeShellState(), {
    platform: 'win32',
    native: false,
    available: false,
    probed: false,
    distros: [],
    executable: 'wsl.exe',
  })
})

test('POSIX targets use the native Bash shell', () => {
  assert.deepEqual(nativeShellState('darwin'), {
    platform: 'darwin',
    native: true,
    available: true,
    probed: true,
    distros: [],
    executable: '/bin/bash',
  })
  assert.deepEqual(nativeShellState('linux'), {
    platform: 'linux',
    native: true,
    available: true,
    probed: true,
    distros: [],
    executable: '/bin/bash',
  })
})

test('the browser opens through the Windows shell', () => {
  assert.deepEqual(browserCommand('https://example.test'), {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', 'start', '', 'https://example.test'],
    options: { windowsHide: true },
  })
})

test('POSIX targets open URLs with their native browser command', () => {
  assert.deepEqual(browserCommand('https://example.test', 'darwin'), {
    command: 'open',
    args: ['https://example.test'],
    options: {},
  })
  assert.deepEqual(browserCommand('https://example.test', 'linux'), {
    command: 'xdg-open',
    args: ['https://example.test'],
    options: {},
  })
})

test('release assets name the Windows portable ZIP', () => {
  assert.equal(releaseAssetName('1.2.3'), 'DeepSeek-Harness-1.2.3-win32-x64.zip')
  assert.equal(releaseAssetName('0.0.0'), undefined)
  assert.equal(releaseAssetName('not-a-version'), undefined)
  assert.equal(releaseAssetName(undefined), undefined)
})

test('release assets use the native installer for POSIX targets', () => {
  assert.equal(releaseAssetName('1.2.3', 'darwin'), 'DeepSeek-Harness-1.2.3-darwin-arm64.dmg')
  assert.equal(releaseAssetName('1.2.3', 'linux'), 'DeepSeek-Harness-1.2.3-linux-x64.AppImage')
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
})
