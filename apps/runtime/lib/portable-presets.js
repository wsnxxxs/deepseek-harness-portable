/** Optional Cordis preset provider; the desktop launcher never imports this module. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import z from '@deepseek-ai/schemastery';
import AgentPresets from '@deepseek-ai/dsh-agent-presets';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { collectCapabilityReport } from './capability-report.js';
import { compileModeCatalog, canonicalModeId, measuredModeSupport } from './mode-catalog.js';
import { selectableModes } from './preset-roster.js';
import { appendPortableModeResolution, PORTABLE_MODE_RESOLUTION_EVENT_TYPE, registerPortableSessionCompatibility } from './session-compatibility.js';
const NAME = 'portable-presets';
const INSTALL_ANCHOR = fileURLToPath(new URL('../package.json', import.meta.url));
const SHIPPED_PRESET_SOURCES = [{ id: 'desktop', path: fileURLToPath(new URL('../config/agent-presets/', import.meta.url)) }];
function traceBoot(_stage) { }
/** Replacement provider selected only by the optional runtime bundle. */
export const name = 'portable-presets';
export const inject = ['loader', 'sessionProjections', 'agents'];
export const Config = z.object({
    default: z.string().default('standard'),
    roots: z.array(z.object({ path: z.string(), trust: z.union(['system', 'user']).default('user') })).default([]),
});
/** Compile Portable variants before publishing the ordinary agentPresets service. */
export async function apply(ctx, config) {
    registerPortableSessionCompatibility();
    const state = await materializeShippedPresetRoot();
    const available = selectableModes(state.modeCatalog);
    if (available.length === 0)
        throw new Error('portable-presets: no supported preset on this host');
    const selected = available.some(mode => mode.modeId === config.default) ? config.default : available[0].modeId;
    await ctx.plugin(AgentPresets, {
        default: selected,
        roots: [
            { path: state.root, trust: 'system' },
            ...config.roots,
        ],
        includeShippedRoot: false,
        includeUserRoot: true,
    });
    ctx.inject(['webServer'], child => installRuntimeEvidenceSurface(child, state));
}
async function copyPackagedTree(source, target) {
    if ((await stat(source)).isDirectory()) {
        await mkdir(target, { recursive: true });
        for (const name of await readdir(source)) {
            await copyPackagedTree(join(source, name), join(target, name));
        }
        return;
    }
    await writeFile(target, await readFile(source));
}
async function packagedTreeManifest(source, prefix = '') {
    const entries = [];
    const visit = async (directory, relative) => {
        for (const name of (await readdir(directory)).sort()) {
            const sourcePath = join(directory, name);
            const relativePath = relative === '' ? name : `${relative}/${name}`;
            const metadata = await stat(sourcePath);
            if (metadata.isDirectory()) {
                await visit(sourcePath, relativePath);
            }
            else {
                const digest = createHash('sha256').update(await readFile(sourcePath)).digest('hex');
                entries.push({ path: relativePath, size: metadata.size, sha256: digest });
            }
        }
    };
    await visit(source, prefix);
    return JSON.stringify(entries);
}
async function resolveUpstreamCommit() {
    const fromEnvironment = process.env.DSH_UPSTREAM_COMMIT?.trim();
    if (fromEnvironment !== undefined && /^[0-9a-f]{7,40}$/iu.test(fromEnvironment))
        return fromEnvironment;
    const resourcesPath = process.resourcesPath;
    const candidates = [
        ...(resourcesPath === undefined ? [] : [join(resourcesPath, 'release-manifest.json')]),
        join(dirname(INSTALL_ANCHOR), 'release-manifest.json'),
        join(dirname(dirname(INSTALL_ANCHOR)), 'release-manifest.json'),
    ];
    for (const candidate of candidates) {
        try {
            const manifest = JSON.parse(await readFile(candidate, 'utf8'));
            const commit = manifest.source?.upstreamCommit;
            if (typeof commit === 'string' && /^[0-9a-f]{7,40}$/iu.test(commit))
                return commit;
        }
        catch { }
    }
    return 'unknown';
}
/** Materialize shipped presets, omitting unavailable modes from discovery and retaining their diagnostics. */
async function materializeShippedPresetRoot(capabilityReport) {
    traceBoot('presets:start');
    const target = join(resolveDshHome(), '.system-agent-presets');
    for (const source of SHIPPED_PRESET_SOURCES) {
        if (resolve(source.path) === resolve(target)) {
            throw new Error(`${NAME}: shipped preset source and writable materialization target must differ`);
        }
    }
    const manifestPath = join(target, '.manifest.json');
    const evidencePath = join(target, '.runtime-capabilities.json');
    const report = capabilityReport ?? await collectCapabilityReport({
        trace: stage => traceBoot(`capabilities:${stage}`),
    });
    const upstreamCommit = await resolveUpstreamCommit();
    const sourceTrees = await Promise.all(SHIPPED_PRESET_SOURCES.map(async (source) => ({
        id: source.id,
        path: source.path,
        entries: JSON.parse(await packagedTreeManifest(source.path)),
    })));
    const owners = new Map();
    for (const source of sourceTrees) {
        for (const entry of source.entries) {
            const owner = owners.get(entry.path);
            if (owner !== undefined) {
                throw new Error(`${NAME}: shipped preset file ${entry.path} is owned by both ${owner} and ${source.id}`);
            }
            owners.set(entry.path, source.id);
        }
    }
    const manifest = JSON.stringify({
        sources: sourceTrees.map(source => ({ id: source.id, entries: source.entries })),
        target: report.target,
        capabilities: report.capabilities,
        capabilitySnapshotHash: report.snapshotHash,
        upstreamCommit,
    });
    try {
        if ((await readFile(manifestPath, 'utf8')) === manifest) {
            const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
            if (evidence.schemaVersion === 1) {
                traceBoot('presets:cache-hit');
                return { root: target, ...evidence };
            }
        }
    }
    catch { }
    await rm(target, { recursive: true, force: true });
    for (const source of sourceTrees)
        await copyPackagedTree(source.path, target);
    const modeCatalog = await compileModeCatalog(target, report, upstreamCommit);
    const evidence = {
        schemaVersion: 1,
        capabilityReport: report,
        modeCatalog,
        modeSupport: measuredModeSupport(modeCatalog),
    };
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    await writeFile(manifestPath, manifest);
    traceBoot('presets:complete');
    return { root: target, ...evidence };
}
function installRuntimeEvidenceSurface(ctx, state) {
    const responseBody = `${JSON.stringify({
        schemaVersion: 1,
        capabilityReport: state.capabilityReport,
        modeCatalog: state.modeCatalog,
        modeSupport: state.modeSupport,
    })}\n`;
    const webServer = ctx.get('webServer');
    if (webServer !== undefined) {
        const dispose = webServer.register({
            kind: 'exact',
            path: '/api/portable/runtime-capabilities',
            handler: (req, res) => {
                if (req.method !== 'GET') {
                    res.writeHead(405, { Allow: 'GET' });
                    res.end();
                    return;
                }
                res.writeHead(200, {
                    'Cache-Control': 'no-store',
                    'Content-Type': 'application/json; charset=utf-8',
                });
                res.end(responseBody);
            },
        });
        ctx.effect(() => dispose, 'portable-runtime.capability-api');
    }
    const appendTrace = (agent, requestedPreset) => {
        const presets = ctx.get('agentPresets');
        const presetId = canonicalModeId(requestedPreset ?? presets?.composedPreset(agent.ctx) ?? agent.session.header.agentPreset ?? '');
        if (presetId === '')
            return;
        const trace = state.modeCatalog.modes[presetId]?.trace;
        if (trace === undefined)
            return;
        let previous;
        const events = agent.session.snapshotEvents();
        for (let index = events.length - 1; index >= 0; index -= 1) {
            const event = events[index];
            if (event?.type !== PORTABLE_MODE_RESOLUTION_EVENT_TYPE)
                continue;
            previous = event.data;
            break;
        }
        if (previous?.variantId === trace.variantId
            && previous.presetHash === trace.presetHash
            && previous.upstreamCommit === trace.upstreamCommit
            && previous.capabilitySnapshotHash === trace.capabilitySnapshotHash)
            return;
        appendPortableModeResolution(agent.session, trace);
    };
    const events = ctx;
    events.on('agent/created', ({ agent }) => { appendTrace(agent); });
    events.on('agent-preset/selected', (sessionId, presetId) => {
        const agent = events.agents.get(sessionId);
        if (agent !== undefined)
            appendTrace(agent, presetId);
    });
}
//# sourceMappingURL=portable-presets.js.map