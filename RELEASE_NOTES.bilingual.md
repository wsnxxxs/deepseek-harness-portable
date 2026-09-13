# DeepSeek Harness Desktop v1.7.4

2026-09-13

## 更新内容

- 插件管理迁移到「设置 → Web 插件」。该页显示 dsh-web 原生的插件安装、已安装插件、内置插件开关及更新操作，下方保留已启用 Web 插件的配置表单。
- 移除原来的「插件管理」标签；「设置 → 插件」保留插件配置与插件列表。已有插件选择及共用 Cordis 服务保持不变。

---

## Changes

- Plugin management now lives in Settings → Web Plugins. The page contains the native dsh-web installer, installed plugins, bundled plugin switches and update controls, followed by configuration forms from enabled Web plugins.
- The former Plugin management tab is removed. Plugin configuration and Plugin list remain under Settings → Plugins. Existing plugin choices and the shared Cordis service are preserved.

## Packaging targets / 打包目标

Windows 本地构建 / local build:

- `DeepSeek-Harness-1.7.4-win32-x64.zip`
- `DeepSeek-Harness-Setup-1.7.4-win32-x64.exe`

以下目标需在对应系统另行构建，本次不提供 / Require separate native builds; not included here:

- `DeepSeek-Harness-1.7.4-darwin-arm64.dmg`
- `DeepSeek-Harness-1.7.4-linux-x64.AppImage`
- `DeepSeek-Harness-1.7.4-linux-x64.deb`
