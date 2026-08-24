# DeepSeek Harness Desktop v1.5.4

Windows x64 桌面版 · 2026-08-24

v1.5.4 是继 v1.5.3 之后的功能与 bug 修复版本。

## 重大功能

- **Learning 视觉系统升级**：改进公式、图表、曲线、时间线、场景和回忆卡片的视觉呈现，减少拥挤并提供更清晰的标签和反馈布局。
- **使用量设置页**：新增持久化 token 汇总、按模型明细、活跃度历史和会话耗时统计。
- **会话兼容性增强**：安全处理旧版可选事件，并在冷会话中补齐使用量投影。

## 运行时与兼容性

- **原生目录选择和索引**现在覆盖 Windows 与 WSL 兼容环境。
- **运行时元数据兼容**：恢复、压缩及打包升级过程中继续保留旧版可选事件的安全处理。

## 问题修复

- **刷新 Learning 客户端构建产物，并补充视觉布局和回忆反馈回归覆盖。**
- **列出使用量投影加入前创建的会话时，也能继续提供持久化的使用量数据。**

## 组件版本

- 分发：1.5.4
- 桌面外壳：0.1.0-shell.2
- 运行时内核：0.1.1-rc.2

---

## English Release Notes

Windows x64 desktop release · 2026-08-24

v1.5.4 is a feature and bug-fix release following v1.5.3.

### Major Features

- **Learning Mode visual system**: improved formula, graph, plot, timeline, scene, and recall visuals with clearer labels, less crowding, and feedback-aware layouts.
- **Usage settings**: added durable token summaries, per-model breakdowns, activity history, and session timing in Settings.
- **Session compatibility**: added safe handling for optional legacy events and hydration for usage projections on cold sessions.

### Runtime and Compatibility

- **Native directory picking and indexing** now cover Windows and WSL-compatible environments.
- **Runtime metadata compatibility** keeps optional legacy events safe across resume, compaction, and packaged upgrades.

### Fixes

- **Refresh generated Learning client bundles and add regression coverage for visual layout and recall feedback.**
- **Keep durable usage projections available when listing sessions created before the usage projection was introduced.**

### Component Versions

- Distribution: 1.5.4
- Desktop Shell: 0.1.0-shell.2
- Runtime Kernel: 0.1.1-rc.2

---

## 校验和与安全 / Checksums and security

最终 Windows 便携 ZIP、Setup 安装包以及 Linux AppImage/deb 的 SHA-256 值记录在 `SHA256SUMS.txt`，并作为 GitHub Release 附件发布。

The final Windows portable ZIP, Setup installer, and Linux AppImage/deb SHA-256 values are recorded in `SHA256SUMS.txt` and attached to the GitHub Release.

```text
86F18BC4C004F816AEE9B527DFD17478DBE1F317C1ED64A25C30F91CBC933A21 *DeepSeek-Harness-1.5.4-win32-x64.zip
B93E39B5B7CEB9356D441F2C0C96D10285F9F2BC60CDC0FEEAF2AA9A38B1B7A3 *DeepSeek-Harness-Setup-1.5.4-win32-x64.exe
125623E4B8B16F241CB91E3DC3A8267C5E2F589413F4A13E777B14C7F01A31AC *DeepSeek-Harness-1.5.4-linux-x64.AppImage
F27EDE74991F16DFA80B27E25AA4E6CF7E61D36860A99F23E7FFE173D5CCDBE0 *DeepSeek-Harness-1.5.4-linux-x64.deb
```
