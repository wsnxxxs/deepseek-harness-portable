import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
export const WEB_ALL_PACKAGE = '@linxin666/dsh-web-all';
export const WEB_ALL_VERSION = '0.3.16';
/** Register the shipped bundle once; later removal and row overrides belong to the user. */
export function ensureWebAllProfile(profileDir, bundledSourceDir) {
    const path = join(profileDir, 'package.json');
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    manifest.dsh ??= {};
    manifest.dsh.profile ??= {};
    const profile = manifest.dsh.profile;
    if (profile.portableWebAllSeeded === true)
        return;
    const bundles = profile.bundles ?? [];
    profile.bundles = bundles.filter(name => name !== 'dsh-plugin-marketplace');
    if (!profile.bundles.includes(WEB_ALL_PACKAGE))
        profile.bundles.push(WEB_ALL_PACKAGE);
    manifest.dependencies ??= {};
    manifest.dependencies[WEB_ALL_PACKAGE] ??= WEB_ALL_VERSION;
    delete manifest.dependencies['dsh-plugin-marketplace'];
    // The community inventory reads the profile's own node_modules. Reuse the
    // bundled bytes without a network install; pnpm may replace this link on update.
    const target = join(profileDir, 'node_modules', '@linxin666', 'dsh-web-all');
    if (bundledSourceDir !== undefined && !existsSync(target)) {
        mkdirSync(dirname(target), { recursive: true });
        symlinkSync(bundledSourceDir, target, process.platform === 'win32' ? 'junction' : 'dir');
    }
    profile.portableWebAllSeeded = true;
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
//# sourceMappingURL=web-all-profile.js.map