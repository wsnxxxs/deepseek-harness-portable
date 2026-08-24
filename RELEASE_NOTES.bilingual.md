# DeepSeek Harness Desktop v1.5.3

Windows x64 桌面版 · 2026-08-23

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
- 运行时内核：0.1.1-rc.2

---

## English Release Notes

Windows x64 desktop release · 2026-08-23

v1.5.3 is a feature and bug-fix release following v1.5.2.

### Major Features

- **Learning Mode overhaul**: added interactive teaching visuals, understanding checks, and session-scoped learning routes, with accessible presentation and session recovery.
- **Archived chats management**: browse archived conversations in Settings, restore them, or permanently delete them.

### Vision and Kernel

- **Native image understanding**: image-capable models receive images directly, while text-only models continue to use the Vision Bridge fallback.
- **Kernel update**: updated to DeepSeek Harness 0.1.1-rc.2, including the image-capable `deepseek-v4-flash-vision-exp` model.

### Fixes

- **Allow pasted images up to 32 MiB and improve desktop menu action responsiveness.**
- **Fix Linux deb permissions and executable naming; installing the deb now registers the `dsh` command.**
- **Selecting the current workspace no longer triggers an unnecessary restart, and the desktop menu now uses clearer, consistent icons.**

### Component Versions

- Distribution: 1.5.3
- Desktop Shell: 0.1.0-shell.2
- Runtime Kernel: 0.1.1-rc.2

---

## 校验和与安全 / Checksums and security

最终便携 ZIP 和 Setup 安装包的 SHA-256 值记录在 `SHA256SUMS.txt`，并作为 GitHub Release 附件发布。

The final portable ZIP and Setup installer SHA-256 values are recorded in `SHA256SUMS.txt` and attached to the GitHub Release.

```text
D9C5868BC462C2F77FD986C90C84AC04CC8D1FED99D44806B3549041CF112106 *DeepSeek-Harness-1.5.3-win32-x64.zip
86A2FDB6C69085B05F69A1688BA414CD155A888A8F8143FE65871953A1984FA8 *DeepSeek-Harness-Setup-1.5.3-win32-x64.exe
```
