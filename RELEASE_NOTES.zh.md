# DeepSeek Harness Desktop v1.5.5

[English](RELEASE_NOTES.md)

Windows x64、macOS Apple Silicon 与 Linux x64 桌面版 · 2026-08-25

v1.5.5 聚焦本地文件引用、图片原生粘贴和更简单的附件流程。

## 更新重点

- **本地文件引用**：普通 PDF、Office、文本、数据和源码文件只发送 `@file` 路径引用，不自动上传或解析文件内容。
- **原生图片附件**：支持粘贴、拖入或选择图片，并继续以原生图片数据提供给支持图片的模型。
- **Learning 界面**：新增显示学习目标、证据要点和路线进度的会话笔记，并优化视觉活动与反馈布局。

## 修复

- **移除文档解析与上传链路，同时保持仅图片命令行为，并在提交前拒绝不支持的非图片文件。**

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
