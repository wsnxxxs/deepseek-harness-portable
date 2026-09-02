import assert from 'node:assert/strict'
import { test } from 'node:test'
import { packageVersions, readJson, readText } from './dependency-state.js'

const approvedReleaseVersion = '1.6.0'

test('the approved product version is synchronized across release metadata and documentation', () => {
  const desktop = readJson('apps/desktop/package.json')
  assert.equal(desktop.distributionVersion, approvedReleaseVersion)
  assert.match(String(desktop.distributionVersion), /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)

  const notes = readJson('apps/desktop/src/release-notes.json')
  assert.equal(notes.version, approvedReleaseVersion)
  assert.equal(notes.name, `DeepSeek Harness Desktop v${approvedReleaseVersion}`)

  const expectedReleaseArtifacts = [
    `DeepSeek-Harness-${approvedReleaseVersion}-win32-x64.zip`,
    `DeepSeek-Harness-Setup-${approvedReleaseVersion}-win32-x64.exe`,
  ].sort()
  const requiredText = new Map<string, readonly string[]>([
    ['README.md', [`v${approvedReleaseVersion}`, `/releases/tag/v${approvedReleaseVersion}`]],
    ['README.zh.md', [`v${approvedReleaseVersion}`, `/releases/tag/v${approvedReleaseVersion}`]],
    ['apps/desktop/README.md', [`DeepSeek Harness Desktop v${approvedReleaseVersion}`]],
    ['apps/desktop/README.zh.md', [`DeepSeek Harness Desktop v${approvedReleaseVersion}`]],
    ['apps/desktop/使用说明.txt', [`DeepSeek Harness for Win v${approvedReleaseVersion}`]],
    ['apps/desktop/使用说明.en.txt', [`DeepSeek Harness for Win v${approvedReleaseVersion}`]],
    ['RELEASE_NOTES.md', [`DeepSeek Harness Desktop v${approvedReleaseVersion}`]],
    ['RELEASE_NOTES.zh.md', [`DeepSeek Harness Desktop v${approvedReleaseVersion}`]],
    ['RELEASE_NOTES.bilingual.md', [
      `DeepSeek Harness Desktop v${approvedReleaseVersion}`,
      `DeepSeek-Harness-${approvedReleaseVersion}-win32-x64.zip`,
      `DeepSeek-Harness-Setup-${approvedReleaseVersion}-win32-x64.exe`,
      `DeepSeek-Harness-${approvedReleaseVersion}-darwin-arm64.dmg`,
      `DeepSeek-Harness-${approvedReleaseVersion}-linux-x64.AppImage`,
      `DeepSeek-Harness-${approvedReleaseVersion}-linux-x64.deb`,
    ]],
    ['SHA256SUMS.txt', expectedReleaseArtifacts],
  ])
  for (const [path, needles] of requiredText) {
    const content = readText(path)
    for (const needle of needles) assert.ok(content.includes(needle), `${path} must contain ${needle}`)
  }
  const checksumLines = readText('SHA256SUMS.txt').trim().split(/\r?\n/)
  const checksumArtifacts = checksumLines.map(line => {
    const match = /^([A-F0-9]{64}) \*(.+)$/.exec(line)
    assert.ok(match, `invalid SHA256SUMS entry: ${line}`)
    return match[2]!
  }).sort()
  assert.deepEqual(checksumArtifacts, expectedReleaseArtifacts)
})

test('Setup and packaging derive release identity from distributionVersion', () => {
  const build = readText('scripts/build-desktop-web-exe.ts')
  const setup = readText('scripts/setup.iss')
  assert.ok(build.includes('const version = distributionVersion()'))
  assert.ok(build.includes('`DeepSeek-Harness-${version}-win32-x64.zip`'))
  assert.ok(build.includes("case 'inno-setup': return `DeepSeek-Harness-Setup-${version}-${target}.exe`"))
  assert.ok(build.includes("case 'dmg': return `DeepSeek-Harness-${version}-${target}.dmg`"))
  assert.ok(build.includes("case 'app-image': return `DeepSeek-Harness-${version}-${target}.AppImage`"))
  assert.ok(build.includes("case 'deb': return `DeepSeek-Harness-${version}-${target}.deb`"))
  assert.ok(build.includes('`/DMyAppVersion=${version}`'))
  assert.ok(setup.includes('AppVersion={#MyAppVersion}'))
  assert.ok(setup.includes('OutputBaseFilename=DeepSeek-Harness-Setup-{#MyAppVersion}-win32-x64'))
})

test('product version changes do not rewrite package versions', () => {
  for (const [path, expectedVersion] of Object.entries(packageVersions)) {
    const manifest = readJson(path)
    assert.equal(manifest.version, expectedVersion, `${path} package version is independent of the product release`)
    assert.notEqual(manifest.version, approvedReleaseVersion, `${path} must not inherit the product release version`)
  }
})
