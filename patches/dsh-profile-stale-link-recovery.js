'use strict'

const FS_IMPORT = 'import { readFileSync } from "node:fs";'
const FS_IMPORT_PATCHED = 'import { existsSync, lstatSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";'
const URL_IMPORT = 'import { fileURLToPath } from "node:url";'
const URL_IMPORT_PATCHED = `${URL_IMPORT}\nimport { homedir } from "node:os";\nimport { join, resolve } from "node:path";`
const HELPER_MARKER = 'function recoverStaleProfileLinks(profile) {'
const SWITCH_MARKER = 'switch (invocation.mode) {'
const PLUGIN_CASE_RE = /(\tcase "plugin": \{\n)(\t\tconst \{ runPlugin \} = await import\("\.\/plugin-[^"]+\.js"\);)/

const HELPERS = `
function removeStaleProfilePath(path) {
\ttry {
\t\tconst metadata = lstatSync(path);
\t\tif (metadata.isSymbolicLink()) unlinkSync(path);
\t\telse rmSync(path, { recursive: true, force: true });
\t} catch {
\t\t// A missing or already-removed junction is already repaired.
\t}
}

function readablePackageManifest(directory) {
\ttry {
\t\tconst path = join(directory, "package.json");
\t\tif (!existsSync(path)) return false;
\t\tJSON.parse(readFileSync(path, "utf8"));
\t\treturn true;
\t} catch {
\t\treturn false;
\t}
}

/** Remove impossible local dependencies before pnpm tries to inspect them. */
function recoverStaleProfileLinks(profile) {
\tif (typeof profile !== "string" || profile === "") return;
\tconst home = process.env.DSH_HOME || join(homedir(), ".dsh");
\tconst profileDir = join(home, "profiles", profile);
\tconst manifestPath = join(profileDir, "package.json");
\tlet manifest;
\ttry {
\t\tmanifest = JSON.parse(readFileSync(manifestPath, "utf8"));
\t} catch {
\t\treturn;
\t}
\tconst dependencies = manifest && manifest.dependencies;
\tif (!dependencies || typeof dependencies !== "object") return;
\tconst removed = [];
\tfor (const [name, spec] of Object.entries(dependencies)) {
\t\tconst text = String(spec || "");
\t\tif (!/^(?:link|file):/i.test(text)) continue;
\t\tconst value = text.slice(text.indexOf(":") + 1);
\t\tif (!value) continue;
\t\tconst target = resolve(profileDir, value);
\t\tif (readablePackageManifest(target)) continue;
\t\tconst installedPath = join(profileDir, "node_modules", ...String(name).split("/"));
\t\tremoveStaleProfilePath(installedPath);
\t\tdelete dependencies[name];
\t\tremoved.push(name);
\t}
\tif (removed.length === 0) return;
\tconst bundles = manifest.dsh?.profile?.bundles;
\tif (Array.isArray(bundles)) {
\t\tmanifest.dsh.profile.bundles = bundles.filter(name => !removed.includes(name));
\t}
\ttry {
\t\twriteFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\\n", "utf8");
\t} catch (error) {
\t\tthrow new Error('dsh: cannot repair stale local profile link(s) ' + removed.join(', ') + ': ' + String(error?.message || error));
\t}
\tprocess.stderr.write('dsh: removed stale local profile link(s): ' + removed.join(', ') + "\\n");
}
`

/**
 * Repair dangling file/link dependencies before the CLI forwards an install
 * command to pnpm. A broken local link is a profile-state problem, not a
 * network failure; pnpm otherwise aborts while opening its package.json and
 * never reaches the requested plugin.
 */
function patchDshProfileStaleLinkRecovery(source) {
  if (source.includes(HELPER_MARKER)) return source
  let output = source
  if (!output.includes(FS_IMPORT_PATCHED)) {
    if (!output.includes(FS_IMPORT)) throw new Error('dsh profile recovery source no longer matches the reviewed fs import')
    output = output.replace(FS_IMPORT, FS_IMPORT_PATCHED)
  }
  if (!output.includes(URL_IMPORT_PATCHED)) {
    if (!output.includes(URL_IMPORT)) throw new Error('dsh profile recovery source no longer matches the reviewed url import')
    output = output.replace(URL_IMPORT, URL_IMPORT_PATCHED)
  }
  if (!output.includes(SWITCH_MARKER)) throw new Error('dsh profile recovery source no longer matches the reviewed dispatch')
  output = output.replace(SWITCH_MARKER, `${HELPERS}\n${SWITCH_MARKER}`)
  if (!PLUGIN_CASE_RE.test(output)) throw new Error('dsh profile recovery source no longer matches the reviewed plugin dispatch')
  output = output.replace(PLUGIN_CASE_RE, '$1\t\tconst verb = invocation.args.find(argument => !argument.startsWith("-"));\n\t\tif (["add", "install", "update", "up", "upgrade"].includes(verb)) recoverStaleProfileLinks(invocation.profile);\n$2')
  return output
}

module.exports = { patchDshProfileStaleLinkRecovery }
