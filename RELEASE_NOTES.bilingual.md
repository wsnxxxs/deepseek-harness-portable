# DeepSeek Harness Desktop v1.6.1

跨平台桌面版 · 2026-09-03

## 更新内容

- 优化 DCode 工作台、悬浮输入框、消息导航、变更审阅、终端体验与响应式布局。
- 新增可选的集群编排（英文界面：Swarm mode，运行时 id：`crew`）：DCode Agent 工作台支持具名队友、共享任务看板、历史会话检索和由操作者附加的资料档案。
- DCode UI、Vision Bridge、Cluster 和 Learning 保持默认注入但可自行移除；移除可选插件后不再阻塞桌面核心外壳启动。
- 将集群模式拆为独立的 `@dsh-portable/cluster-ui` 插件，官方界面和兼容的其他界面都可以承载队伍名册与任务看板。
- 抽出可复用的资料库内核，让 Learning 与资料档案任务共享材料摄入、锚点、重锚和词法检索能力。
- 完善插件管理、后台更新、安装器预检和历史缓存清理。
- 更新学习模式与本地资料导入、检索和复习能力；相关功能仍在持续演进。
- 修复 Windows 路径、生成资源与打包校验问题，提升稳定性。

> 后续计划：学习模式和资料库将进行较大幅度调整，本版本中的相关功能不视为最终形态。

---

## English Release Notes

Cross-platform desktop release · 2026-09-03

### Changes

- Refined the DCode workbench, floating composer, message navigation, change review, terminal experience, and responsive layouts.
- Added the optional Swarm (`crew`) mode with named teammates, a shared task board, prior-session search, and operator-attached dossier sources in the DCode Agent workspace.
- Kept DCode UI, Vision Bridge, Cluster, and Learning as default-injected but removable plugin rows; removing an optional row no longer blocks the core desktop shell.
- Split Cluster mode into the standalone `@dsh-portable/cluster-ui` plugin so the official UI and any compatible surface can host the roster and task board.
- Extracted the reusable material-space kernel so Learning and dossier-backed tasks share ingestion, anchors, re-anchoring, and lexical search behavior.
- Improved plugin management, background updates, installer preflight checks, and stale update-cache cleanup.
- Updated Learning Mode and local material import, retrieval, and review capabilities; these areas remain under active development.
- Fixed Windows path handling, generated assets, and packaging verification issues for better stability.

> Roadmap note: Learning Mode and the Library will continue to evolve in future releases; their v1.6.1 design is not final.

---

各目标安装包的 SHA-256 校验值见 `SHA256SUMS-<target>.txt`。产物包括 `DeepSeek-Harness-1.6.1-win32-x64.zip`、`DeepSeek-Harness-Setup-1.6.1-win32-x64.exe`、`DeepSeek-Harness-1.6.1-darwin-arm64.dmg`、`DeepSeek-Harness-1.6.1-linux-x64.AppImage` 与 `DeepSeek-Harness-1.6.1-linux-x64.deb`。

Target-specific SHA-256 checksums are in `SHA256SUMS-<target>.txt`. Artifacts include `DeepSeek-Harness-1.6.1-win32-x64.zip`, `DeepSeek-Harness-Setup-1.6.1-win32-x64.exe`, `DeepSeek-Harness-1.6.1-darwin-arm64.dmg`, `DeepSeek-Harness-1.6.1-linux-x64.AppImage`, and `DeepSeek-Harness-1.6.1-linux-x64.deb`.
