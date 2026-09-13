# DeepSeek Harness Desktop v1.7.1

2026-09-13

## 更新内容

- 内置官方 DeepSeek Harness 更新至 0.1.5-rc.2。
- 整合 dsh-web 0.3.21 的插件管理与配置；管理入口常驻，功能插件默认关闭。
- 默认使用官方界面与预设，Portable 自有及内置扩展默认关闭。
- 桌面增强、DCode、Learning、Cluster 等功能按 DSH Bundle 规范显式启用，统一使用宿主 Cordis 依赖。
- 适配官方附件、反馈、RPC 与会话持久化接口。
- Learning 测试从 657 项精简至 427 项，保留核心行为与集成回归。

## 升级说明

- 启动时自动将旧 Portable / Learning 自定义事件历史转换为官方 v3 日志，原始文件保持不变，不删除历史对话。

---

## Changes

- Updated the bundled official DeepSeek Harness to 0.1.5-rc.2.
- Integrated dsh-web 0.3.21 plugin management and configuration. Management stays available while feature plugins start disabled.
- The default experience uses official UI and presets; Portable extensions are disabled by default.
- Desktop enhancements, DCode, Learning and Cluster activate explicitly through DSH bundles and share the host Cordis dependency.
- Adapted attachments, feedback, RPC and session persistence to upstream APIs.
- Consolidated Learning tests from 657 to 427 while retaining core behavior and integration regressions.

## Upgrade note

- Startup automatically migrates earlier Portable / Learning custom-event histories to official v3 logs. Original files remain unchanged; no history is deleted.

## Packaging targets / 打包目标

Windows 本地构建 / local build:

- `DeepSeek-Harness-1.7.1-win32-x64.zip`
- `DeepSeek-Harness-Setup-1.7.1-win32-x64.exe`

以下目标需在对应系统另行构建，本次不提供 / Require separate native builds; not included here:

- `DeepSeek-Harness-1.7.1-darwin-arm64.dmg`
- `DeepSeek-Harness-1.7.1-linux-x64.AppImage`
- `DeepSeek-Harness-1.7.1-linux-x64.deb`
