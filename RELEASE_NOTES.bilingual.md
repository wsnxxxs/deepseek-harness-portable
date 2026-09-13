# DeepSeek Harness Desktop v1.7.3

2026-09-13

## 更新内容

- Learning、DCode、Cluster、桌面增强及附件入口等内置插件统一接入 dsh-web 原生「插件管理」页面，删除独立的「内置功能」标签及其界面代码。
- Cordis 适配器在 dsh-web 管理服务就绪后连接。可选插件仍默认关闭；DCode 依赖开关同步更新，配置保存后重启生效。

---

## Changes

- Bundled Learning, DCode, Cluster, desktop enhancements and attachment controls now use dsh-web's native Plugin management page. The separate Built-in features tab and its UI code have been removed.
- The Cordis adapter connects when dsh-web provides its management service. Optional plugins remain disabled by default; DCode dependency changes refresh together and persist across restarts.

## Packaging targets / 打包目标

Windows 本地构建 / local build:

- `DeepSeek-Harness-1.7.3-win32-x64.zip`
- `DeepSeek-Harness-Setup-1.7.3-win32-x64.exe`

以下目标需在对应系统另行构建，本次不提供 / Require separate native builds; not included here:

- `DeepSeek-Harness-1.7.3-darwin-arm64.dmg`
- `DeepSeek-Harness-1.7.3-linux-x64.AppImage`
- `DeepSeek-Harness-1.7.3-linux-x64.deb`
