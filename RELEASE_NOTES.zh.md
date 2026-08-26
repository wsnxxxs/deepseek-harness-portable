# DeepSeek Harness Desktop v1.5.6

[English](RELEASE_NOTES.md)

Windows x64、macOS Apple Silicon 与 Linux x64 桌面版 · 2026-08-27

v1.5.6 是继 v1.5.5 之后的功能与问题修复版本。

## 重大功能

- **Interactive Learning 资料 grounding**：在本机导入受支持的 PDF、DOCX、PPTX、Markdown 和文本资料，按界限检索证据，并在教学回合中保留资料锚点。
- **概念复习与学习者记忆**：新增结构化概念卡片、复习反馈和可持续的学习进度，便于继续学习。
- **学习意图路由与视觉活动**：优化 learn/not-learn 路由、教学路线、学习笔记和语义视觉活动。

## 运行时与兼容性

- **内置运行时刷新**：更新打包后的 Interactive Learning 与 Vision Bridge 组件。
- **Windows 路径处理**：拖入的目录现在可以与空文件正确区分。

## 修复

- **刷新生成的 Learning bundle，并在打包运行时中保持资料、概念复习和意图路由契约一致。**
- **复用已完成的 Windows 打包层，同时保持最终产物校验不变。**

## 组件版本

- 分发：1.5.6
- 桌面外壳：0.1.0-shell.2
- 运行时内核：0.1.1-rc.2（@deepseek-ai/dsh-web-app）
- 标签：v1.5.6

## 校验和与安全

- Windows 便携 ZIP、Setup 安装包以及 Linux AppImage/deb 的 SHA-256 值记录在 `SHA256SUMS.txt`；macOS DMG 的校验值记录在 `SHA256SUMS-darwin-arm64.txt`。
- 运行下载文件前请核对对应的校验文件。
- 市场中的插件属于第三方代码，启用额外插件前请审查其来源和权限。
- Windows 可执行文件和 macOS DMG 均未签名，Windows SmartScreen/Smart App Control 及 macOS Gatekeeper 可能发出警告或阻止运行。
- 更新期间，会话、凭据、设置、附件和桌面偏好均保留在发布目录之外。
