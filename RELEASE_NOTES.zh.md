# DeepSeek Harness Desktop v1.5.5

[English](RELEASE_NOTES.md)

Windows x64、macOS Apple Silicon 与 Linux x64 桌面版 · 2026-08-25

v1.5.5 是继 v1.5.4 之后的功能与 bug 修复版本。

## 重大功能

- **本地文件附件**：支持粘贴、拖入或选择图片、PDF、DOCX、XLSX、PPTX、文本、数据和常见源码文件，并在本机提取后交给模型阅读。
- **Learning 视觉系统升级**：新增更丰富的语义渲染器，提供更清晰的标签、更少的拥挤和基于反馈的布局。
- **附件续读**：保留文件 handle，提供有界预览、`read_attachment` 续读、原文件下载和 ZIP 导出。

## 运行时与兼容性

- **本地提取**使用有界 worker 容量，并拒绝不支持的扫描、加密、损坏、旧版 Office、压缩包和任意二进制输入。
- **非图片附件预览**在 DeepSeek 与 pi-ai 请求中使用一致的提供方无关投影。

## 问题修复

- **刷新 Learning 客户端构建产物，并补充新的视觉与附件路径回归覆盖。**
- **保持仅图片命令行为不变，并在提交前拒绝不支持的非图片文件。**

## 组件版本

- 分发：1.5.5
- 桌面外壳：0.1.0-shell.2
- 运行时内核：0.1.1-rc.2（@deepseek-ai/dsh-web-app）
- 标签：v1.5.5

## 校验和与安全

- Windows 便携 ZIP、Setup 安装包以及 Linux AppImage/deb 的 SHA-256 值记录在 `SHA256SUMS.txt`；macOS DMG 的校验值记录在 `SHA256SUMS-darwin-arm64.txt`。
- 运行下载文件前请核对对应的校验文件。
- 市场中的插件属于第三方代码，启用额外插件前请审查其来源和权限。
- Windows 可执行文件和 macOS DMG 均未签名，Windows SmartScreen/Smart App Control 及 macOS Gatekeeper 可能发出警告或阻止运行。
- 更新期间，会话、凭据、设置、附件和桌面偏好均保留在发布目录之外。
