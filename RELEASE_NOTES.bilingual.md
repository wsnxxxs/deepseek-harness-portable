# DeepSeek Harness Desktop v1.5.5

Windows x64、Linux x64 与 macOS Apple Silicon 桌面版 · 2026-08-25

v1.5.5 聚焦本地文件引用、图片原生粘贴和更简单的附件流程。

## 重大功能

- **本地文件引用**：普通 PDF、Office、文本、数据和源码文件只发送 `@file` 路径引用，不自动上传或解析文件内容。
- **原生图片附件**：支持粘贴、拖入或选择图片，并继续以原生图片数据提供给支持图片的模型。
- **Learning 界面**：新增显示学习目标、证据要点和路线进度的会话笔记，并优化视觉活动与反馈布局。

## 运行时与兼容性

- **本地文件处理**保持路径引用语义，不启动文档解析 worker，也不把普通文档字节放入附件包体。

## 问题修复

- **移除文档解析与上传链路，同时保持仅图片命令行为，并在提交前拒绝不支持的非图片文件。**

## 组件版本

- 分发：1.5.5
- 桌面外壳：0.1.0-shell.2
- 运行时内核：0.1.1-rc.2

---

## English Release Notes

Windows x64, Linux x64, and macOS Apple Silicon desktop release · 2026-08-25

v1.5.5 focuses on local file references, native image paste handling, and a simpler attachment flow.

### Major Features

- **Local file references**: ordinary PDF, Office, text, data, and source files are sent as `@file` path references; their bytes are not uploaded or parsed automatically.
- **Native image attachments**: paste, drop, or select images and keep them as native image data for image-capable models.
- **Learning Mode UI**: added session learning notes for goals, evidence, and route progress, with clearer visual activities and feedback layouts.

### Runtime and Compatibility

- **Local file handling** preserves path-reference semantics without starting document-parser workers or placing ordinary document bytes in the attachment package.

### Fixes

- **Simplify submission by removing document-parser/upload paths while preserving image-only commands and rejecting unsupported non-image files.**

### Component Versions

- Distribution: 1.5.5
- Desktop Shell: 0.1.0-shell.2
- Runtime Kernel: 0.1.1-rc.2

---

## 校验和与安全 / Checksums and security

最终 Windows 便携 ZIP、Setup 安装包以及 Linux AppImage/deb 的 SHA-256 值记录在 `SHA256SUMS.txt`。

产物：`DeepSeek-Harness-1.5.5-win32-x64.zip`、`DeepSeek-Harness-Setup-1.5.5-win32-x64.exe`、`DeepSeek-Harness-1.5.5-linux-x64.AppImage`、`DeepSeek-Harness-1.5.5-linux-x64.deb`。

The final Windows portable ZIP, Setup installer, and Linux AppImage/deb SHA-256 values are recorded in `SHA256SUMS.txt`.

Artifacts: `DeepSeek-Harness-1.5.5-win32-x64.zip`, `DeepSeek-Harness-Setup-1.5.5-win32-x64.exe`, `DeepSeek-Harness-1.5.5-linux-x64.AppImage`, and `DeepSeek-Harness-1.5.5-linux-x64.deb`.
