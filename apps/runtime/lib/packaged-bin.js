#!/usr/bin/env node
/** Desktop process adapter for the official dsh web launcher. No feature plugins are imported here. */
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initProfile, PROFILE_TEMPLATES, resolveProfileDir, healProfilesModuleFallback } from '@deepseek-ai/dsh-app-boot';
import { prepareOfficialProfile, linkPluginManagement } from './official-profile.js';
import { migratePortableHistories } from './history-migration.js';
const installAnchor = fileURLToPath(new URL('../package.json', import.meta.url));
const require = createRequire(installAnchor);
const { protocolEnabled, encodeRuntimeEvent } = require('@dsh-portable/desktop-protocol');
if (protocolEnabled())
    console.log(encodeRuntimeEvent({ protocolVersion: 1, type: 'hello', pid: process.pid }));
if (!process.env.DSH_HOME?.trim() && !/^(?:node|electron)(?:\.exe)?$/i.test(process.execPath.split(/[\\/]/).at(-1) ?? '')) {
    process.env.DSH_HOME = join(dirname(process.execPath), '.dsh');
}
const profileDir = resolveProfileDir('web');
const template = PROFILE_TEMPLATES.web;
initProfile(profileDir, template.bundles, template.patchReload);
const manifestPath = join(profileDir, 'package.json');
const original = await readFile(manifestPath, 'utf8');
const managementPath = dirname(require.resolve('@dsh-portable/web-plugins/package.json'));
const updated = JSON.stringify(prepareOfficialProfile(JSON.parse(original), managementPath), null, 2) + '\n';
if (updated !== original)
    await writeFile(manifestPath, updated);
await healProfilesModuleFallback({ installAnchor });
await linkPluginManagement(profileDir, managementPath);
const migration = await migratePortableHistories(join(profileDir, '..', '..', 'sessions'));
if (migration.migrated)
    console.log(`Migrated ${migration.migrated} Portable histories; original logs preserved.`);
for (const failure of migration.failures)
    console.error(`Portable history migration: ${failure}`);
const args = process.argv.slice(2);
if (args[0]?.toLowerCase() === 'web')
    args.shift();
process.argv = [process.argv[0], require.resolve('@deepseek-ai/dsh/lib/bin.js'), '--profile', 'web', ...args];
const cli = await import(pathToFileURL(process.argv[1]).href);
await cli.runCli();
//# sourceMappingURL=packaged-bin.js.map