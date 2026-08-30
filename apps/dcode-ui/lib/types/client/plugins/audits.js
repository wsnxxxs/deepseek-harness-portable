/**
 * Portable's own review notes for marketplace repositories.
 *
 * Membership of the GitHub `dsh-plugin` topic is a label anybody can add to a
 * repository; it is not a compatibility claim and not a safety claim. This
 * table is the only place either claim is made, and it is deliberately short:
 * a repository absent from it is reported as unverified rather than assumed
 * benign, because installing a plugin changes the agent's tools, prompts,
 * network reach and local processes.
 *
 * The notes are facts about a specific audited revision, so they are carried
 * in both shipped locales rather than translated at runtime — a machine
 * translation of a security note is not the note.
 * @module @dsh-portable/dcode-ui/client/plugins/audits
 */
/** Reviewed repositories, keyed by lowercased `owner/repo`. */
const REVIEWED = {
    'omdsh-dev/dsh-genui': {
        reviewed: true,
        featured: true,
        featuredSource: { en: 'Portable review catalog', zh: 'Portable 审阅目录' },
        category: 'interface',
        compatibility: { win32: 'unknown', darwin: 'unknown', linux: 'unknown' },
        contract: {
            en: '^0.1.0-rc.6 (no exact-profile compatibility claim for rc7/Portable)',
            zh: '^0.1.0-rc.6（rc7/Portable 未做 exact-profile 兼容声明）',
        },
        platform: {
            en: 'CI: Ubuntu, Node 22/24. Windows and macOS unverified',
            zh: 'CI: Ubuntu, Node 22/24；Windows 与 macOS 未验证',
        },
        runtime: {
            en: 'Node ^22.19.0 || >=24; bundles Mermaid / Three front-end assets',
            zh: 'Node ^22.19.0 || >=24；内置 Mermaid / Three 前端资源',
        },
        egress: {
            en: 'May open HTTP(S) links; form and action data is written back into the conversation and reaches the model; images are not uploaded by default',
            zh: '可能打开 HTTP(S) 链接；表单/action 数据会回写对话并进入模型；默认不上传图片',
        },
        activation: {
            en: 'Installs as a global tool and a standing glossary, not agent-scoped',
            zh: '安装后为全局工具与 standing glossary；不是 Agent-scoped',
        },
        issues: {
            en: 'rc7 has no native fence registry; the long-lived DOM observer path is not adopted; actions are not durable; the standing prompt carries a fixed token cost',
            zh: 'rc7 无原生 fence registry；长期 DOM observer 兼容路径不采用；action 非 durable；standing prompt 有固定 token 成本风险',
        },
        verified: {
            en: 'Report checked 2026-08-17 · v0.8.6 · 2187fa4',
            zh: '报告核查 2026-08-17 · v0.8.6 · 2187fa4',
        },
    },
    'anionex/dsh-vision-toolkit': {
        reviewed: true,
        featured: true,
        featuredSource: { en: 'Portable review catalog', zh: 'Portable 审阅目录' },
        category: 'vision',
        compatibility: { win32: 'unknown', darwin: 'unknown', linux: 'unknown' },
        contract: {
            en: '^0.1.0-rc.6 (no exact-profile compatibility claim for rc7/Portable)',
            zh: '^0.1.0-rc.6（rc7/Portable 未做 exact-profile 兼容声明）',
        },
        platform: {
            en: 'CI: Ubuntu, Node 22/24 + Python 3.11. Windows and macOS unverified',
            zh: 'CI: Ubuntu, Node 22/24 + Python 3.11；Windows 与 macOS 未验证',
        },
        runtime: {
            en: 'Python runtime; pinned upstream snapshot; pip/uv versions locked but wheels and sdists are not fully hashed',
            zh: 'Python runtime；固定上游 snapshot；pip/uv 版本锁定但 wheel/sdist 未全哈希',
        },
        egress: {
            en: 'Remote tools send the selected image bytes and the prompt; the local crop/trace/diff/palette/foreground paths send nothing',
            zh: '远程工具会发送所选图片字节与 prompt；crop/trace/diff/palette/foreground 等本地路径不外发',
        },
        activation: {
            en: 'Registers agent-scoped tools only after a successful bootstrap; Settings stays available for repair when the runtime fails',
            zh: 'bootstrap 成功后才注册 Agent-scoped 工具；runtime 失败时保留 Settings 供修复',
        },
        issues: {
            en: 'May contend with Vision Bridge for the paste owner; the shared service retention policy is unknown; the Python supply chain needs a separate audit',
            zh: '与 Vision Bridge 可能争用 paste owner；共享服务的保留政策未知；Python 供应链需独立审计',
        },
        verified: {
            en: 'Report checked 2026-08-17 · v0.1.28 · 28e9a98',
            zh: '报告核查 2026-08-17 · v0.1.28 · 28e9a98',
        },
    },
    'zseven-w/dsh-openpencil': {
        reviewed: true,
        featured: true,
        featuredSource: { en: 'Portable review catalog', zh: 'Portable 审阅目录' },
        category: 'design',
        compatibility: { win32: 'unknown', darwin: 'unknown', linux: 'unknown' },
        contract: {
            en: 'Several ^0.1.0-rc.6 packages (no exact-profile compatibility claim for rc7/Portable)',
            zh: '多个 ^0.1.0-rc.6 包（rc7/Portable 未做 exact-profile 兼容声明）',
        },
        platform: {
            en: 'CI: Ubuntu, Node 24 + Rust 1.94. Windows and macOS unverified',
            zh: 'CI: Ubuntu, Node 24 + Rust 1.94；Windows 与 macOS 未验证',
        },
        runtime: {
            en: 'OpenPencil binary/daemon; preview may fall back to Jian; Web SDK / CanvasKit',
            zh: 'OpenPencil binary/daemon；预览可尝试 Jian fallback；Web SDK / CanvasKit',
        },
        egress: {
            en: 'Calls no remote vision service by default; the viewer/editor use a same-origin signed grant; model output still sees file and binary paths',
            zh: '不默认调用远程视觉服务；viewer/editor 使用同源 signed grant；模型结果仍可见文件与 binary 路径',
        },
        activation: {
            en: 'The runtime continues without the binary; rendering can degrade to Jian; a diagnostic is offered when the managed editor is unavailable',
            zh: '缺 binary 时 Runtime 应继续；render 可降级 Jian；managed editor 不可用时提供修复诊断',
        },
        issues: {
            en: 'Windows 11 managed editor 401 (#2); binary provenance, hashing, upgrade rollback and render containment are not fully governed yet',
            zh: 'Windows 11 managed editor 401 (#2)；binary 来源/哈希/升级回滚与 render containment 尚未完整治理',
        },
        verified: {
            en: 'Report checked 2026-08-17 · v0.1.0-rc.1 · ff9074d',
            zh: '报告核查 2026-08-17 · v0.1.0-rc.1 · ff9074d',
        },
    },
};
/**
 * Look up Portable's review of one repository.
 * @param fullName - the repository's `owner/repo`.
 * @returns the review, or undefined when Portable has never reviewed it.
 */
export function auditFor(fullName) {
    return REVIEWED[fullName.toLowerCase()];
}
/** Repositories that have a real bundled review record. */
export function reviewedRepositories() {
    return Object.keys(REVIEWED);
}
//# sourceMappingURL=audits.js.map