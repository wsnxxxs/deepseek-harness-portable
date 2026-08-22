# DeepSeek Harness Desktop v1.5.3

[English](RELEASE_NOTES.md)

Windows x64、macOS Apple Silicon 与 Linux x64 桌面版 · 2026-08-23

v1.5.3 是继 v1.5.2 之后的功能与 bug 修复版本。

## 重大功能

- **学习模式大幅升级**：新增交互式教学图示、理解检查和会话内学习路线，并支持无障碍使用与会话恢复。
- **已归档聊天管理**：可在设置中浏览已归档会话、恢复会话或永久删除会话。

## 视觉能力与内核

- **原生图片理解**：支持图片的模型可直接处理图片，文本模型继续通过 Vision Bridge 获得图片理解能力。
- **内核升级**：更新至 DeepSeek Harness 0.1.1-rc.2，并新增支持图片输入的 `deepseek-v4-flash-vision-exp` 模型。

## 问题修复

- **支持粘贴最大 32 MiB 的图片，并优化桌面菜单操作响应。**
- **修复 Linux deb 包权限和可执行文件命名问题；安装 deb 后现在可直接使用 `dsh` 命令启动。**
- **选择当前工作区不再触发不必要的重启，桌面菜单改用更清晰且统一的图标。**

## 组件版本

- 分发：1.5.3
- 桌面外壳：0.1.0-shell.2
- 内核：0.1.1-rc.2（@deepseek-ai/dsh-web-app）
- 标签：v1.5.3

## 校验和与安全

- Windows 便携 ZIP 和 Setup 安装包的 SHA-256 值记录在 `SHA256SUMS.txt`；macOS DMG 的校验值记录在 `SHA256SUMS-darwin-arm64.txt`。
- 运行下载文件前请先核对对应的校验文件。
- 市场中的插件属于第三方代码，启用额外插件前请审查其来源和权限。
- Windows 可执行文件和 macOS DMG 均未签名，Windows SmartScreen/Smart App Control 及 macOS Gatekeeper 可能发出警告或阻止运行。
- 更新期间，会话、凭据、设置、附件和桌面偏好均保存在发行目录之外。
