# DeepSeek Harness Desktop v1.7.2

2026-09-13

## 修复内容

- 旧 dsh-plugin-marketplace 改由内置 dsh-web 创意工坊替代（npm 最新版 0.3.21）。原先启用旧市场的配置会迁移为启用创意工坊，新安装仍按需开启。升级保留配置备份，并修复此前插件开关生成的混合 YAML。
- 内置功能与 dsh-web 插件管理共同编辑同一份 YAML 文档，保留 Cordis 表达式、注释和其他配置。

---

## Fixes

- The retired dsh-plugin-marketplace is replaced by the bundled dsh-web Workshop (latest npm version 0.3.21). Profiles that previously enabled the old market enable Workshop during migration. Fresh installations keep it optional. The updater preserves configuration backups and repairs mixed YAML left by earlier plugin toggles.
- Built-in and dsh-web plugin controls now edit one YAML document, preserving Cordis expressions, comments and unrelated settings.

## Packaging targets / 打包目标

Windows 本地构建 / local build:

- `DeepSeek-Harness-1.7.2-win32-x64.zip`
- `DeepSeek-Harness-Setup-1.7.2-win32-x64.exe`

以下目标需在对应系统另行构建，本次不提供 / Require separate native builds; not included here:

- `DeepSeek-Harness-1.7.2-darwin-arm64.dmg`
- `DeepSeek-Harness-1.7.2-linux-x64.AppImage`
- `DeepSeek-Harness-1.7.2-linux-x64.deb`
