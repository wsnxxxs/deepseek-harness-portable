# DeepSeek Harness Desktop v1.5.5

Windows x64 桌面版 · 2026-08-25

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
- 运行时内核：0.1.1-rc.2

---

## English Release Notes

Windows x64 desktop release · 2026-08-25

v1.5.5 is a feature and bug-fix release following v1.5.4.

### Major Features

- **Local file attachments**: paste, drop, or select images, PDF, DOCX, XLSX, PPTX, text, data, and common source-code files for local extraction and model-assisted reading.
- **Learning Mode visual system**: added richer semantic renderers with clearer labels, less crowding, and feedback-aware layouts.
- **Attachment continuation**: retained file handles expose bounded previews, `read_attachment` continuation reads, raw downloads, and ZIP export.

### Runtime and Compatibility

- **Local extraction** uses bounded worker capacity and rejects unsupported scanned, encrypted, damaged, legacy Office, archive, and arbitrary binary inputs.
- **Non-image attachment previews** use the same provider-neutral projection for DeepSeek and pi-ai requests.

### Fixes

- **Refresh generated Learning client bundles and add regression coverage for the new visual and attachment paths.**
- **Keep image-only command behavior unchanged while rejecting unsupported non-image files before submission.**

### Component Versions

- Distribution: 1.5.5
- Desktop Shell: 0.1.0-shell.2
- Runtime Kernel: 0.1.1-rc.2

---

## 校验和与安全 / Checksums and security

最终 Windows 便携 ZIP、Setup 安装包以及 Linux AppImage/deb 的 SHA-256 值记录在 `SHA256SUMS.txt`，并作为 GitHub Release 附件发布。

The final Windows portable ZIP, Setup installer, and Linux AppImage/deb SHA-256 values are recorded in `SHA256SUMS.txt` and attached to the GitHub Release.

```text
D7ECF2B3E077BC5D247E20D00443714B9FC0E24C0C7310BC7797F43890BB1022  *DeepSeek-Harness-1.5.5-win32-x64.zip
554744E74560BB08AB710AEB4C90BB9B8EF0ABC35750E4DCAE5A5824AE355734  *DeepSeek-Harness-Setup-1.5.5-win32-x64.exe
B8AC536A09CEE2DB4A1D5FFD4F519219B83DF81B064ED69BAC5FB3BC21A298FA  *DeepSeek-Harness-1.5.5-linux-x64.AppImage
0560AB18276F421B7DA9FC467227824058ADBD0C363830F71B0DBD617B298E6F  *DeepSeek-Harness-1.5.5-linux-x64.deb
```
