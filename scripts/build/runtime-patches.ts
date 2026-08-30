import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import {
  attestPatchedFile,
  loadPatchManifest,
  patchApplies,
  patchStatus,
  type PatchAttestation,
  type PatchDefinition,
} from './patch-manifest.js'

const require = createRequire(import.meta.url)
const { patchMarketplaceSelfUpdate } = require('../../patches/dsh-plugin-marketplace-self-update.js') as {
  patchMarketplaceSelfUpdate(source: string): string
}
const {
  patchMarketplaceLifecycleHost,
  patchMarketplaceTransparencyClient,
} = require('../../patches/dsh-plugin-marketplace-transparency.js') as {
  patchMarketplaceLifecycleHost(source: string): string
  patchMarketplaceTransparencyClient(source: string): string
}
const { patchAppBootProfileRuntimeFallback } = require('../../patches/dsh-app-boot-profile-runtime-fallback.js') as {
  patchAppBootProfileRuntimeFallback(source: string): string
}
const { patchDshProfileStaleLinkRecovery } = require('../../patches/dsh-profile-stale-link-recovery.js') as {
  patchDshProfileStaleLinkRecovery(source: string): string
}
const { patchSessionPortableEventMetadata } = require('../../patches/dsh-session-portable-event-metadata.js') as {
  patchSessionPortableEventMetadata(source: string): string
}
const { patchDirectoryPickerAuto } = require('../../patches/dsh-host-directory-picker-auto-index.js') as {
  patchDirectoryPickerAuto(source: string): string
}
const { patchFrontendStaticCacheHeaders } = require('../../patches/dsh-host-frontend-static-cache.js') as {
  patchFrontendStaticCacheHeaders(source: string): string
}

/** Replace a staged file by path so a pnpm hardlink cannot mutate its source. */
async function replaceStagedFile(path: string, content: string): Promise<void> {
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, content)
  try {
    await rm(path, { force: true })
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true })
  }
}

export {
  patchAppBootProfileRuntimeFallback,
  patchDshProfileStaleLinkRecovery,
  patchMarketplaceLifecycleHost,
  patchMarketplaceTransparencyClient,
  patchDirectoryPickerAuto,
  patchFrontendStaticCacheHeaders,
  patchSessionPortableEventMetadata,
}

export interface RuntimePatchOptions {
  readonly root: string
  readonly staging: string
  readonly targetId: string
  readonly dryRun?: boolean
}

function definitionById(definitions: readonly PatchDefinition[], id: string): PatchDefinition {
  const definition = definitions.find(item => item.id === id)
  if (definition === undefined) throw new Error(`patch manifest does not declare required patch ${id}`)
  return definition
}

export function patchDirectoryPickerWorker(source: string): string {
  let output = source
  // Crash-safe UTF-16 read: `koffi.view` is fatally broken under the Electron
  // 43 runtime (Node 24.18.1, V8 15.0-electron) — the external-buffer N-API
  // call fails and koffi's exception path aborts the worker with
  // `FATAL ERROR: Error::New napi_get_last_error_info` (exit 134), even for a
  // valid pointer. Verified 2026-08-29: the identical call works under
  // standalone Node 22.22.2 / 24.16.0 and aborts under Electron-as-Node, and
  // the copy-out form below works under Electron-as-Node. Copy the string out
  // with lstrlenW + RtlMoveMemory instead; this also removes the fixed
  // 32768-byte over-read past the CoTaskMemAlloc'd path.
  const safeReadUtf16 = `function readUtf16(koffi, address) {
\tconst kernel32 = koffi.load("kernel32.dll");
\tconst lstrlenW = kernel32.func("__stdcall", "lstrlenW", "int", ["void *"]);
\tconst rtlMoveMemory = kernel32.func("__stdcall", "RtlMoveMemory", "void *", ["void *", "void *", "uintptr"]);
\tconst length = lstrlenW(address);
\tif (length <= 0) return "";
\tconst bytes = Buffer.alloc((length + 1) * 2);
\trtlMoveMemory(bytes, address, (length + 1) * 2);
\treturn bytes.toString("utf16le", 0, length * 2);
}`
  // Known upstream shapes of the koffi.view-based readUtf16 (two terminator
  // scan variants); either is replaced wholesale by the copy-out form above.
  const viewReadUtf16Variants = [
    `function readUtf16(koffi, address) {\n\tconst bytes = Buffer.from(koffi.view(address, 32768));\n\tlet end = 0;\n\twhile (end + 1 < bytes.length && bytes[end] !== 0) end += 2;\n\treturn bytes.toString("utf16le", 0, end);\n}`,
    `function readUtf16(koffi, address) {\n\tconst bytes = Buffer.from(koffi.view(address, 32768));\n\tlet end = 0;\n\twhile (end + 1 < bytes.length && !(bytes[end] === 0 && bytes[end + 1] === 0)) end += 2;\n\treturn bytes.toString("utf16le", 0, end);\n}`,
  ]
  const oldPost = `const post = (message) => {\n\t/* v8 ignore next 3 -- disconnect needs a live IPC channel the unit lane must not sever (built-worker.e2e.ts owns the real close path). */\n\tsend(message, () => {\n\t\tif (process.connected) process.disconnect();\n\t});\n};`
  const newPost = `const post = (message) => {\n\tsend(message);\n};`
  for (const variant of viewReadUtf16Variants) {
    if (output.includes(variant)) {
      output = output.replace(variant, safeReadUtf16)
      break
    }
  }
  if (!output.includes(safeReadUtf16)) {
    throw new Error('directory-picker worker readUtf16 no longer matches a known koffi.view implementation; re-review the upstream source before patching')
  }
  if (output.includes(oldPost)) output = output.replace(oldPost, newPost)
  if (!output.includes(newPost)) {
    throw new Error('directory-picker worker no longer matches the reviewed memory/IPC implementation')
  }
  // Report startup-guard failures over IPC instead of dying at the top level.
  // A throw before the async IIFE is an uncaught exception: the process exits
  // without posting, so the driver can only report "exited before reporting a
  // result" with no cause attached.
  const oldGuards = `const title = process.env.DSH_DIALOG_TITLE ?? "";
if (title === "") throw new Error("win32-dialog-worker: DSH_DIALOG_TITLE is required");
if (process.send === void 0) throw new Error("win32-dialog-worker must run as a child process with an IPC channel");`
  const newGuards = `const title = process.env.DSH_DIALOG_TITLE ?? "";
const ipcMissing = process.send === void 0;
const failStartup = (reason) => {
\tprocess.stderr.write(reason + "\\n");
\tif (!ipcMissing) process.send({ kind: "error", message: reason }, () => process.exit(1));
\tprocess.exit(1);
};
if (title === "") failStartup("win32-dialog-worker: DSH_DIALOG_TITLE is required");
if (ipcMissing) failStartup("win32-dialog-worker must run as a child process with an IPC channel");`
  if (output.includes(oldGuards)) output = output.replace(oldGuards, newGuards)
  // Catch anything else reaching the top level (failed koffi import, native
  // abort) so the driver reports a cause instead of a bare exit.
  if (output.includes('const failStartup =') && !output.includes('process.on("uncaughtException"')) {
    const anchor = `const send = process.send.bind(process);`
    if (!output.includes(anchor)) throw new Error('directory-picker worker send anchor is missing')
    output = output.replace(anchor, `${anchor}\nprocess.on("uncaughtException", (error) => {\n\tfailStartup(error instanceof Error ? error.stack ?? error.message : String(error));\n});\nprocess.on("unhandledRejection", (error) => {\n\tfailStartup(error instanceof Error ? error.stack ?? error.message : String(error));\n});`)
  }
  if (!output.includes('DSH_DIRECTORY_PICKER_IPC_PROBE')) {
    const disconnect = `process.on("disconnect", () => process.exit(0));`
    const probe = `${disconnect}\nconst ipcProbe = process.env.DSH_DIRECTORY_PICKER_IPC_PROBE === "1";\nif (ipcProbe) post({ kind: "probe", protocolVersion: 1 });`
    if (!output.includes(disconnect)) throw new Error('directory-picker worker disconnect marker is missing')
    output = output.replace(disconnect, probe)
    const launch = `(async () => {`
    if (!output.includes(launch)) throw new Error('directory-picker worker launch marker is missing')
    output = output.replace(launch, `if (!ipcProbe) ${launch}`)
  }
  return output
}

async function applyDefinition(
  options: RuntimePatchOptions,
  definition: PatchDefinition,
  transforms: Readonly<Record<string, (source: string) => string>>,
): Promise<PatchAttestation> {
  if (!patchApplies(definition, options.targetId)) return { id: definition.id, status: 'not-applicable', files: [] }
  const results: Array<{ changed: boolean; attestation: PatchAttestation['files'][number] }> = []
  for (const file of definition.files) {
    const target = join(options.staging, ...file.path.split('/'))
    const transform = transforms[file.path]
    if (transform === undefined) throw new Error(`patch ${definition.id} has no implementation for ${file.path}`)
    if (options.dryRun) {
      console.log(`runtime-patches: [dry-run] ${definition.id} -> ${target}`)
      continue
    }
    const result = attestPatchedFile(definition, file, await readFile(target, 'utf8'), transform)
    if (result.changed) await replaceStagedFile(target, result.output)
    results.push({ changed: result.changed, attestation: result.attestation })
  }
  return {
    id: definition.id,
    status: options.dryRun ? 'applied' : patchStatus(results),
    files: results.map(result => result.attestation),
  }
}

/** Apply the reviewed runtime patch layer and return its input/output hash attestations. */
export async function applyRuntimePatchLayer(options: RuntimePatchOptions): Promise<readonly PatchAttestation[]> {
  const definitions = await loadPatchManifest(resolve(options.root, 'patches/manifest.yml'))
  const directoryPicker = definitionById(definitions, 'directory-picker-electron-ipc')
  const directoryPickerAuto = definitionById(definitions, 'directory-picker-wsl-platform')
  const appBoot = definitionById(definitions, 'app-boot-profile-runtime-fallback')
  const dshProfileRecovery = definitionById(definitions, 'dsh-profile-stale-link-recovery')
  const portableSession = definitionById(definitions, 'portable-session-event-metadata')
  const marketplace = definitionById(definitions, 'marketplace-self-update-fallback')
  const marketplaceTransparency = definitionById(definitions, 'marketplace-install-transparency')
  const directoryIndex = await readFile(resolve(options.root, 'patches/dsh-host-directory-picker-native-index.js'), 'utf8')
  const frontendStatic = definitionById(definitions, 'frontend-static-hashed-cache')
  const baseAttestations = await Promise.all([
    applyDefinition(options, directoryPicker, {
      'node_modules/@deepseek-ai/dsh-host-directory-picker-native/lib/index.js': () => directoryIndex,
      'node_modules/@deepseek-ai/dsh-host-directory-picker-native/lib/worker.cjs': patchDirectoryPickerWorker,
    }),
    applyDefinition(options, directoryPickerAuto, {
      'node_modules/@deepseek-ai/dsh-host-directory-picker-auto/lib/index.js': patchDirectoryPickerAuto,
    }),
    applyDefinition(options, frontendStatic, {
      'node_modules/@deepseek-ai/dsh-host-frontend-static/lib/index.js': patchFrontendStaticCacheHeaders,
    }),
    applyDefinition(options, appBoot, {
      'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js': patchAppBootProfileRuntimeFallback,
    }),
    applyDefinition(options, dshProfileRecovery, {
      'node_modules/@deepseek-ai/dsh/lib/bin.js': patchDshProfileStaleLinkRecovery,
    }),
    applyDefinition(options, portableSession, {
      'node_modules/@deepseek-ai/dsh-session/lib/index.js': patchSessionPortableEventMetadata,
    }),
    applyDefinition(options, marketplace, {
      'node_modules/dsh-plugin-marketplace/lib/index.js': patchMarketplaceSelfUpdate,
    }),
  ])
  // Both reviewed Marketplace patches touch lib/index.js. Apply the
  // transparency/lifecycle layer after the self-update fallback so concurrent
  // reads cannot race and overwrite one another in the staging tree.
  const transparencyAttestation = await applyDefinition(options, marketplaceTransparency, {
    'node_modules/dsh-plugin-marketplace/lib/index.js': patchMarketplaceLifecycleHost,
    'node_modules/dsh-plugin-marketplace/lib/client.js': patchMarketplaceTransparencyClient,
  })
  const attestations = [...baseAttestations, transparencyAttestation]
  const declared = new Set(definitions.map(item => item.id))
  const implemented = new Set(attestations.map(item => item.id))
  const missing = [...declared].filter(id => !implemented.has(id))
  if (missing.length > 0) throw new Error(`patch manifest contains unimplemented patch(es): ${missing.join(', ')}`)
  return attestations
}
