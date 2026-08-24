# DeepSeek Harness Desktop v1.5.4

[English](RELEASE_NOTES.md)

Windows x64、macOS Apple Silicon 与 Linux x64 桌面版 · 2026-08-24

v1.5.4 是继 v1.5.3 之后的功能与 bug 修复版本。

## 重大功能

- **Learning 视觉系统升级**：改进公式、图表、曲线、时间线、场景和回忆卡片的视觉呈现，减少拥挤并提供更清晰的标签和反馈布局。
- **使用量设置页**：新增持久化 token 汇总、按模型明细、活跃度历史和会话耗时统计。
- **会话兼容性增强**：安全处理旧版可选事件，并在冷会话中补齐使用量投影。

## 问题修复

- **改进 Windows 与 WSL 兼容环境中的原生目录选择和索引。**
- **保持 Learning 状态和运行时事件元数据在恢复、压缩和打包升级过程中的兼容性。**
- **刷新 Learning 客户端构建产物，并补充视觉布局和回忆反馈回归覆盖。**

## 组件版本

- 分发：1.5.4
- 桌面外壳：0.1.0-shell.2
- 内核：0.1.1-rc.2（@deepseek-ai/dsh-web-app）
- 标签：v1.5.4

## 校验和与安全

- Windows 便携 ZIP、Setup 安装包以及 Linux AppImage/deb 的 SHA-256 值记录在 `SHA256SUMS.txt`；macOS DMG 的校验值记录在 `SHA256SUMS-darwin-arm64.txt`。
- 运行下载文件前请先核对对应的校验文件。
- 市场中的插件属于第三方代码，启用额外插件前请审查其来源和权限。
- Windows 可执行文件和 macOS DMG 均未签名，Windows SmartScreen/Smart App Control 及 macOS Gatekeeper 可能发出警告或阻止运行。
- 更新期间，会话、凭据、设置、附件和桌面偏好均保存在发行目录之外。
