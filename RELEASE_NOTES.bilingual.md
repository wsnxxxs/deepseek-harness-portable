# DeepSeek Harness Desktop v1.6.0

Windows x64 桌面版 · 2026-08-29

v1.6.0 是继 v1.5.6 之后的功能与问题修复版本。

## 重大功能

- **Interactive Learning 资料 grounding**：在本机导入受支持的 PDF、DOCX、PPTX、Markdown 和文本资料，按界限检索证据，并在教学回合中保留资料锚点。
- **概念复习与学习者记忆**：新增结构化概念卡片、复习反馈和可持续的学习进度，便于继续学习。
- **学习意图路由与视觉活动**：优化 learn/not-learn 路由、教学路线、学习笔记和语义视觉活动。
- **自适应 DCode 工作台**：让侧栏、会话区、预览区和环境摘要适配紧凑/中等/宽屏窗口；持久化侧栏宽度，并支持快速切换工作区和任务。
- **插件管理页面**：新增插件市场、已安装和配置三个分区，提供仓库审核、实时任务进度、生命周期操作和重启状态提示。
- **DCode UI 细节优化**：统一会话卡片，增加上下文用量与消息操作，并改善工作台的焦点、无障碍和加载反馈。

## 运行时与兼容性

- **内置运行时刷新**：内核切换到官方 `dsh-v0.1.2-alpha.1`，同步新的 Controller、Client Store、Chat/Session UI 与 User Questions 架构，并更新 Interactive Learning 与 Vision Bridge 组件。
- **会话与附件**：沿用上游归档、`@file/@session` 引用、图片附件和 token 用量能力；保留永久删除、冷会话句柄以及文本/Office 文件上传下载扩展。
- **Windows 路径处理**：拖入的目录现在可以与空文件正确区分。

## 问题修复

- **刷新生成的 Learning bundle，并在打包运行时中保持资料、概念复习和意图路由契约一致。**
- **复用已完成的 Windows 打包层，同时保持最终产物校验不变。**
- **将快速测试与生成产物测试、Windows 平台检查分离，保持发布验证可重复。**

## 组件版本

- 分发：1.6.0
- 桌面外壳：0.1.0-shell.2
- 运行时内核：0.1.2-alpha.1（`dsh-v0.1.2-alpha.1`）

---

## English Release Notes

Windows x64 desktop release · 2026-08-29

v1.6.0 is a feature and bug-fix release following v1.5.6.

### Major Features

- **Interactive Learning material grounding**: ingest supported PDF, DOCX, PPTX, Markdown, and text material locally, retrieve bounded evidence, and keep source anchors for teaching turns.
- **Concept review and learner memory**: add structured concept cards, review feedback, and durable learner progress for continued study.
- **Learning intent routing and visuals**: refine learn/not-learn routing, teaching routes, learning notes, and semantic visual activities.
- **Responsive DCode workbench**: adapt the rail, conversation, preview, and environment summary to compact/medium/wide windows; persist rail sizing and provide quick workspace/task switching.
- **Plugin management surface**: add dedicated Marketplace, Installed, and Configuration sections with repository review gates, live job progress, lifecycle controls, and restart state.
- **DCode UI polish**: standardize conversation cards, add context usage and message actions, and improve focus, accessibility, and loading feedback across the workbench.

### Runtime and Compatibility

- **Bundled runtimes refreshed**: move the kernel to the official `dsh-v0.1.2-alpha.1` release and adopt its Controller, Client Store, Chat/Session UI, and User Questions architecture, while refreshing the Interactive Learning and Vision Bridge components.
- **Sessions and attachments**: use the upstream archive, `@file`/`@session` references, image attachments, and token-usage surfaces; retain permanent deletion, cold-session handles, and the text/Office file upload/download extension.
- **Windows path handling**: dropped directories are now distinguished from empty files in the composer.

### Fixes

- **Refresh generated Learning bundles and preserve the material, concept-review, and intent-routing contracts in the packaged runtime.**
- **Keep the Windows release pipeline reusable by caching completed packaging layers without changing final artifact verification.**
- **Keep fast tests isolated from generated-output and Windows platform checks so release verification remains repeatable.**

### Component Versions

- Distribution: 1.6.0
- Desktop Shell: 0.1.0-shell.2
- Runtime Kernel: 0.1.2-alpha.1 (`dsh-v0.1.2-alpha.1`)

---

## 校验和与安全 / Checksums and security

最终 Windows 便携 ZIP 和 Setup 安装包的 SHA-256 值记录在 `SHA256SUMS.txt`。

产物：`DeepSeek-Harness-1.6.0-win32-x64.zip`、`DeepSeek-Harness-Setup-1.6.0-win32-x64.exe`。

The final Windows portable ZIP and Setup installer SHA-256 values are recorded in `SHA256SUMS.txt`.

Artifacts: `DeepSeek-Harness-1.6.0-win32-x64.zip`, `DeepSeek-Harness-Setup-1.6.0-win32-x64.exe`.
