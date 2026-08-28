'use strict'

function replaceOnce(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`app-boot ${label} source no longer matches the reviewed rc7 bundle`)
  return source.replace(pattern, replacement)
}

const STALE_LINK_REPAIR_MARKER = 'Stale installation-owned junctions'

function patchStaleCanonicalLinkPath(source) {
  if (source.includes(STALE_LINK_REPAIR_MARKER)) return source
  return replaceOnce(
    source,
    /\t} catch \(error\) \{\n\t\t\/\* v8 ignore next 2 -- a non-ENOENT realpath failure requires a host filesystem fault \*\/\n\t\tif \(error\.code === "ENOENT"\) return void 0;\n\t\t\/\* v8 ignore next -- see the host-filesystem exception above \*\/\n\t\tthrow error;\n\t\}/,
    '\t} catch {\n\t\t// Stale installation-owned junctions can report UNKNOWN on Windows.\n\t\treturn void 0;\n\t}',
    'stale link canonicalization',
  )
}

/** Add an installed-runtime fallback for bare packages without changing profile priority. */
function patchAppBootProfileRuntimeFallback(source) {
  const hasFallbackPatch = source.includes('requireFromBareFallback') && source.includes('bareModuleFallbackBaseUrl')
  if (hasFallbackPatch) return patchStaleCanonicalLinkPath(source)

  let output = source
  if (!output.includes('import { createRequire } from "node:module";')) {
    output = replaceOnce(
      output,
      /import \{ fileURLToPath, pathToFileURL \} from "node:url";/,
      'import { createRequire } from "node:module";\nimport { fileURLToPath, pathToFileURL } from "node:url";',
      'module import',
    )
  }

  output = replaceOnce(
    output,
    /async function mountRootInclude\(ctx, absoluteConfigPath, patches = \[\], bareModuleBaseUrl\) \{/,
    `async function mountRootInclude(ctx, absoluteConfigPath, patches = [], bareModuleBaseUrl, bareModuleFallbackBaseUrl) {
\tconst requireFromBareBase = bareModuleBaseUrl === void 0 ? void 0 : createRequire(new URL("package.json", bareModuleBaseUrl));
\tconst requireFromBareFallback = bareModuleFallbackBaseUrl === void 0 ? void 0 : createRequire(new URL("package.json", bareModuleFallbackBaseUrl));
\tconst isMissingModule = (error) => {
\t\tconst code = error?.code;
\t\treturn code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND";
\t};
\tconst resolveWithFallback = (resolvePrimary, resolveFallback) => {
\t\ttry {
\t\t\treturn resolvePrimary();
\t\t} catch (primaryError) {
\t\t\tif (resolveFallback === void 0 || !isMissingModule(primaryError)) throw primaryError;
\t\t\ttry {
\t\t\t\treturn resolveFallback();
\t\t\t} catch (fallbackError) {
\t\t\t\tif (!isMissingModule(fallbackError)) throw fallbackError;
\t\t\t\tthrow primaryError;
\t\t\t}
\t\t}
\t};`,
    'mount signature',
  )

  output = replaceOnce(
    output,
    /\t\t\tconst internal = this\.ctx\.loader\.internal;\n(?:\t\t\t\/\*[\s\S]*?\*\/\n)?\t\t\tif \(internal === void 0\) return super\.import\(specifier, getOuterStack\);\n\t\t\treturn internal\.import\(specifier, bareModuleBaseUrl, \{\}\);/,
    `\t\t\tconst internal = this.ctx.loader.internal;
\t\t\tif (isAbsolute(name)) return internal === void 0 ? super.import(specifier, getOuterStack) : internal.import(specifier, bareModuleBaseUrl, {});
\t\t\tif (internal === void 0) {
\t\t\t\tconst resolved = resolveWithFallback(() => requireFromBareBase.resolve(name), requireFromBareFallback === void 0 ? void 0 : () => requireFromBareFallback.resolve(name));
\t\t\t\treturn super.import(pathToFileURL(resolved).href, getOuterStack);
\t\t\t}
\t\t\tconst resolved = resolveWithFallback(() => internal.version === "v2" ? internal.resolveSync(bareModuleBaseUrl, { specifier }).url : internal.resolveSync(specifier, bareModuleBaseUrl, {}).url, bareModuleFallbackBaseUrl === void 0 ? void 0 : () => internal.version === "v2" ? internal.resolveSync(bareModuleFallbackBaseUrl, { specifier }).url : internal.resolveSync(specifier, bareModuleFallbackBaseUrl, {}).url);
\t\t\treturn internal.import(resolved, bareModuleBaseUrl, {});`,
    'include resolver',
  )

  output = replaceOnce(
    output,
    /async function boot\(binName, absoluteConfigPath, patches, prepare, bareModuleBaseUrl\) \{/,
    'async function boot(binName, absoluteConfigPath, patches, prepare, bareModuleBaseUrl, bareModuleFallbackBaseUrl) {',
    'boot signature',
  )
  output = replaceOnce(
    output,
    /await mountRootInclude\(ctx, absoluteConfigPath, patches, bareModuleBaseUrl\);/,
    'await mountRootInclude(ctx, absoluteConfigPath, patches, bareModuleBaseUrl, bareModuleFallbackBaseUrl);',
    'boot mount call',
  )

  if (!output.includes('requireFromBareFallback') || !output.includes('internal.resolveSync(bareModuleFallbackBaseUrl')) {
    throw new Error('app-boot fallback patch did not produce the reviewed dual-anchor resolver')
  }
  return patchStaleCanonicalLinkPath(output)
}

module.exports = { patchAppBootProfileRuntimeFallback }
