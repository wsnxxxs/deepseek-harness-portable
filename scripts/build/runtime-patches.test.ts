import assert from 'node:assert/strict'
import { copyFile, link, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { test } from 'node:test'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import {
  applyRuntimePatchLayer,
  patchAppBootProfileRuntimeFallback,
  patchDirectoryPickerAuto,
  patchDirectoryPickerWorker,
  patchDshProfileStaleLinkRecovery,
  patchAgentTeamToolScope,
  patchFrontendStaticCacheHeaders,
  patchMarketplaceLifecycleHost,
  patchMarketplaceTransparencyClient,
  patchSessionPortableEventMetadata,
} from './runtime-patches.js'

test('Agent Team tool patch limits eager installation to the owning preset scope', async () => {
  const source = await readFile(resolve(
    'apps/runtime/node_modules/@deepseek-ai/dsh-experimental-tool-agent-team/lib/index.js',
  ), 'utf8')
  const output = patchAgentTeamToolScope(source)
  assert.match(output, /scopeChainOf\(scopeOf\(agent\.ctx\)\)\.includes\(ownerScope\)/)
  assert.match(output, /installed\.has\(agent\) \|\| !ownsToolScope\(agent\)/)
  assert.equal(patchAgentTeamToolScope(output), output)
})

test('directory-picker worker patch adds a non-interactive versioned IPC probe', () => {
  const source = [
    'function readUtf16(koffi, address) {',
    '\tconst bytes = Buffer.from(koffi.view(address, 32768));',
    '\tlet end = 0;',
    '\twhile (end + 1 < bytes.length && bytes[end] !== 0) end += 2;',
    '\treturn bytes.toString("utf16le", 0, end);',
    '}',
    'const post = (message) => {',
    '\t/* v8 ignore next 3 -- disconnect needs a live IPC channel the unit lane must not sever (built-worker.e2e.ts owns the real close path). */',
    '\tsend(message, () => {',
    '\t\tif (process.connected) process.disconnect();',
    '\t});',
    '};',
    'process.on("disconnect", () => process.exit(0));',
    '(async () => {',
    '  post({ kind: "result" });',
    '})();',
  ].join('\n')
  const output = patchDirectoryPickerWorker(source)
  assert.match(output, /DSH_DIRECTORY_PICKER_IPC_PROBE/)
  assert.match(output, /post\(\{ kind: "probe", protocolVersion: 1 \}\)/)
  assert.match(output, /if \(!ipcProbe\) \(async \(\) => \{/)
  // koffi.view aborts the worker under the Electron 43 runtime (verified
  // 2026-08-29): the patch must replace it with the lstrlenW copy-out read.
  assert.match(output, /lstrlenW/)
  assert.match(output, /RtlMoveMemory/)
  assert.doesNotMatch(output, /koffi\.view/)
  assert.equal(patchDirectoryPickerWorker(output), output)
  assert.doesNotMatch(output, /process\.disconnect/)
})

test('directory-picker auto patch maps WSL to the Windows native backend', async () => {
  const source = await readFile(resolve('apps/runtime/node_modules/@deepseek-ai/dsh-host-directory-picker-auto/lib/index.js'), 'utf8')
  const output = patchDirectoryPickerAuto(source)
  assert.match(output, /function dshIsWsl\(\)/)
  assert.match(output, /platform: process\.platform === "linux" && dshIsWsl\(\) \? "win32" : process\.platform/)
  assert.equal(patchDirectoryPickerAuto(output), output)
})

test('frontend-static patch disables dynamic HTML caching and caches only hashed assets', async () => {
  const source = await readFile(resolve('apps/runtime/node_modules/@deepseek-ai/dsh-host-frontend-static/lib/index.js'), 'utf8')
  const output = patchFrontendStaticCacheHeaders(source)
  assert.match(output, /IMMUTABLE_STATIC_CACHE/)
  assert.match(output, /DYNAMIC_HTML_CACHE = "no-store"/)
  assert.match(output, /type === HTML_MIME/)
  assert.match(output, /isImmutableStaticAsset/)
  assert.match(output, /assets\\\/\[\^\/\]\+\-/)
  assert.equal(patchFrontendStaticCacheHeaders(output), output)
})

test('app-boot patch resolves bare packages from profile then installed runtime', () => {
  const source = [
    'import { fileURLToPath, pathToFileURL } from "node:url";',
    'function canonicalLinkPath(path) {',
    '\ttry {',
    '\t\treturn join(realpathSync.native(dirname(path)), basename(path));',
    '\t} catch (error) {',
    '\t\t/* v8 ignore next 2 -- a non-ENOENT realpath failure requires a host filesystem fault */',
    '\t\tif (error.code === "ENOENT") return void 0;',
    '\t\t/* v8 ignore next -- see the host-filesystem exception above */',
    '\t\tthrow error;',
    '\t}',
    '}',
    'async function mountRootInclude(ctx, absoluteConfigPath, patches = [], bareModuleBaseUrl) {',
    '\tctx.loader.builtins.include = bareModuleBaseUrl === void 0 ? Include : class HostResolvedRootInclude extends Include {',
    '\t\timport(name, getOuterStack) {',
    '\t\t\tconst specifier = isAbsolute(name) ? pathToFileURL(name).href : name;',
    '\t\t\tif (name.startsWith(".") || name.startsWith("cordis:")) return super.import(specifier, getOuterStack);',
    '\t\t\tconst internal = this.ctx.loader.internal;',
    '\t\t\tif (internal === void 0) return super.import(specifier, getOuterStack);',
    '\t\t\treturn internal.import(specifier, bareModuleBaseUrl, {});',
    '\t\t}',
    '\t};',
    '}',
    'async function boot(binName, absoluteConfigPath, patches, prepare, bareModuleBaseUrl) {',
    '\tawait mountRootInclude(ctx, absoluteConfigPath, patches, bareModuleBaseUrl);',
    '}',
  ].join('\n')
  const output = patchAppBootProfileRuntimeFallback(source)
  assert.match(output, /createRequire/)
  assert.match(output, /requireFromBareFallback/)
  assert.match(output, /internal\.resolveSync\(bareModuleFallbackBaseUrl/)
  assert.match(output, /Stale installation-owned junctions/)
  assert.equal(patchAppBootProfileRuntimeFallback(output), output)
})

test('dsh profile recovery removes dangling local links before pnpm starts', async () => {
  const source = await readFile(resolve('apps/runtime/node_modules/@deepseek-ai/dsh/lib/bin.js'), 'utf8')
  const output = patchDshProfileStaleLinkRecovery(source)
  assert.match(output, /function recoverStaleProfileLinks\(profile\)/)
  assert.match(output, /readablePackageManifest\(target\)/)
  assert.match(output, /removed stale local profile link/)
  assert.match(output, /recoverStaleProfileLinks\(invocation\.profile\)/)
  assert.match(output, /import \{ homedir \} from "node:os";/)
  assert.match(output, /import \{ join, resolve \} from "node:path";/)
  assert.equal(patchDshProfileStaleLinkRecovery(output), output)
})

test('session patch persists an explicit ignorable marker', () => {
  const source = [
    '\tappend(type, data, ...opts) {',
    '\t\tconst surfaceOpts = opts[0];',
    '\t\tconst surfaceMetadata = {',
    '\t\t\t...surfaceOpts?.sourceEventSeqs === void 0 ? {} : { sourceEventSeqs: surfaceOpts.sourceEventSeqs },',
    '\t\t\t...surfaceOpts?.surfaceOp === void 0 ? {} : { surfaceOp: surfaceOpts.surfaceOp }',
    '\t\t};',
    '\t}',
  ].join('\n')
  const output = patchSessionPortableEventMetadata(source)
  assert.match(output, /eventOpts\?\.ignorable === true/)
  assert.equal(patchSessionPortableEventMetadata(output), output)
})

test('marketplace client requires review before the only install confirmation', async () => {
  const source = await readFile(resolve('apps/runtime/node_modules/dsh-plugin-marketplace/lib/client.js'), 'utf8')
  const output = patchMarketplaceTransparencyClient(source)
  assert.match(output, /查看安装信息/)
  assert.match(output, /data-portable-confirm-install/)
  assert.match(output, /Portable 未验证/)
  assert.match(output, /DSH contract/)
  assert.match(output, /联网 \/ 图片外发/)
  assert.match(output, /Installed[\s\S]*Available[\s\S]*Activated[\s\S]*Exposed/)
  assert.doesNotMatch(output, /onClick: function \(\) \{ install\(it\) \},\n\s+disabled/)
  assert.equal(patchMarketplaceTransparencyClient(output), output)
})

test('marketplace host reports lifecycle from package, profile, and boot facts', async () => {
  const source = await readFile(resolve('apps/runtime/node_modules/dsh-plugin-marketplace/lib/index.js'), 'utf8')
  const output = patchMarketplaceLifecycleHost(source)
  assert.match(output, /function pluginAvailable\(name\)/)
  assert.match(output, /available: pluginAvailable\(name\)/)
  assert.match(output, /activated: isBundle/)
  assert.match(output, /MARKETPLACE_BOOT_BUNDLES\.has\(name\)/)
  assert.match(output, /'pending-restart'/)
  assert.equal(patchMarketplaceLifecycleHost(output), output)
})

test('runtime patch layer composes both marketplace host patches in one staging tree', async () => {
  const staging = await mkdtemp(join(tmpdir(), 'dsh-runtime-patches-'))
  const paths = [
    'node_modules/@deepseek-ai/dsh-host-directory-picker-native/lib/index.js',
    'node_modules/@deepseek-ai/dsh-host-directory-picker-native/lib/worker.cjs',
    'node_modules/@deepseek-ai/dsh-host-directory-picker-auto/lib/index.js',
    'node_modules/@deepseek-ai/dsh-host-frontend-static/lib/index.js',
    'node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js',
    'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js',
    'node_modules/@deepseek-ai/dsh/lib/bin.js',
    'node_modules/@deepseek-ai/dsh-session/lib/index.js',
    'node_modules/@deepseek-ai/dsh-experimental-tool-agent-team/lib/index.js',
    'node_modules/dsh-plugin-marketplace/lib/index.js',
    'node_modules/dsh-plugin-marketplace/lib/client.js',
  ]
  try {
    for (const path of paths) {
      const target = join(staging, ...path.split('/'))
      await mkdir(dirname(target), { recursive: true })
      const source = resolve('apps/runtime', ...path.split('/'))
      if (path === 'node_modules/@deepseek-ai/dsh-host-frontend-static/lib/index.js') {
        await link(source, target)
      } else {
        await copyFile(source, target)
      }
    }
    const attestations = await applyRuntimePatchLayer({
      root: resolve('.'),
      staging,
      targetId: 'win32-x64',
    })
    const host = await readFile(join(staging, 'node_modules/dsh-plugin-marketplace/lib/index.js'), 'utf8')
    const client = await readFile(join(staging, 'node_modules/dsh-plugin-marketplace/lib/client.js'), 'utf8')
    const originalFrontendStatic = await readFile(resolve('apps/runtime/node_modules/@deepseek-ai/dsh-host-frontend-static/lib/index.js'), 'utf8')
    assert.doesNotMatch(originalFrontendStatic, /IMMUTABLE_STATIC_CACHE/)
    assert.match(host, /installedRepoGh = repositoryGitHubSpec/)
    assert.match(host, /MARKETPLACE_BOOT_BUNDLES/)
    assert.match(client, /data-portable-confirm-install/)
    assert.deepEqual(attestations.map(item => item.id), [
      'directory-picker-electron-ipc',
      'directory-picker-wsl-platform',
      'frontend-static-hashed-cache',
      'app-boot-profile-runtime-fallback',
      'dsh-profile-stale-link-recovery',
      'portable-session-event-metadata',
      'agent-team-tool-scope-isolation',
      'marketplace-self-update-fallback',
      'marketplace-install-transparency',
    ])
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
})
