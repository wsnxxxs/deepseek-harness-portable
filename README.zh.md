# DeepSeek Harness Desktop

[English](README.md) · [更新记录](RELEASE_NOTES.zh.md) · [已发布安装包](https://github.com/wsnxxxs/deepseek-harness-portable/releases) · [问题反馈](https://github.com/wsnxxxs/deepseek-harness-portable/issues)

为官方 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供 Electron 桌面窗口、安装器和便携包的社区项目。

**默认使用官方界面、预设和工具。DCode、Learning、Cluster 等额外功能以插件形式随包提供，默认关闭。** 官方 profile 运行所需的基础插件保持上游设置。

## 当前版本

| 项目 | 状态 |
| --- | --- |
| 桌面分发版本 | **v1.7.2**，见[发布说明](RELEASE_NOTES.zh.md) |
| 官方内核 | `dsh-v0.1.5-rc.2`，固定在 Git 子模块中 |
| Windows x64 | 已完成本地 Setup / ZIP 构建及打包启动验证 |
| macOS arm64、Linux x64 | 保留 DMG、AppImage / deb 构建目标；本次未生成这些平台的 v1.7.2 产物 |

源码版本与 GitHub Releases 分开管理。v1.7.2 安装包目前已在本地生成；可下载的版本以 [Releases](https://github.com/wsnxxxs/deepseek-harness-portable/releases) 中实际上传的附件为准。

## 安装与启动

Windows 安装包自带 Electron 和 Node.js，使用者无需另装 Node.js 或 pnpm。

1. 下载同一版本的安装包与 SHA-256 校验文件。
2. 安装版运行 `DeepSeek-Harness-Setup-<版本>-win32-x64.exe`；便携版解压完整 ZIP。
3. 打开 **DeepSeek Harness Launcher.exe**，按官方界面的引导配置模型和凭据。

便携目录中的常用入口：

| 文件 | 用途 |
| --- | --- |
| `DeepSeek Harness Launcher.exe` | 无控制台桌面启动器 |
| `start-desktop.cmd` | 带控制台的启动与诊断 |
| `start-web.cmd` | 使用内置运行时打开浏览器界面 |
| `dsh.cmd` | 内置 DSH 命令行及更新入口 |
| `update.ps1` | 检查并安装已发布的 Windows 更新 |
| `runtime/` | 应用和依赖，保留完整目录 |

桌面用户数据默认在 `%USERPROFILE%\.dsh`，可用 `DSH_HOME` 指定其他目录；Linux/macOS 默认使用 `~/.dsh`。更新应用前保留数据备份。

本项目为未签名的社区分发，Windows 可能提示未知发布者。不要将源码中的校验值用于其他版本的安装包。

## 默认体验与可选插件

默认保留官方聊天界面，并在设置中提供插件管理和配置入口。管理基础设施常驻，额外功能默认关闭，也不自动安装第三方插件市场。默认启动不要求 WSL；工具自身需要的系统环境遵循官方要求。

| 可选功能 | 启用方式 |
| --- | --- |
| DCode 工作台 | `@dsh-portable/dcode-ui` bundle，自动启用所需的界面切换和会话服务 |
| Learning 学习模式 | `@dsh-portable/interactive-learning` bundle |
| Cluster 团队界面 | `@dsh-portable/cluster-ui` bundle |
| 桌面页面增强 | `@dsh-portable/desktop-enhancements` bundle |
| Portable 预设与能力探测 | `@dsh-portable/runtime` bundle；Crew 还需 Cluster |
| 附件入口 | 设置 → 插件 → 内置功能 |

打开 **设置 → 插件**：

- **内置功能**：管理 Learning、DCode、Cluster、桌面增强及附件入口。
- **插件管理**：管理参考 [dsh-web](https://github.com/zhu1090093659/dsh-web) 0.3.21 整合的功能组件，逐项启用或关闭。
- **插件配置**：编辑已启用插件公开的配置。

开关写入标准 profile 和 Cordis patch，重启后生效。管理器、设置入口与兼容组件保持启用，防止关闭后无法恢复。高级用户仍可编辑 `DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles` 和同目录 `cordis.patch.yml`。

关闭插件时移除对应 bundle，并撤销本地 patch 中的显式启用项，随后重启。本地 patch 优先于 bundle 默认设置，已有的用户选择不会在每次启动时被清空。旧版本标记为自动预装的市场 bundle 会迁移为关闭。

插件遵循 DSH 的 `dsh.bundle.patch` 和 `dsh.client` 规范，共享宿主的 Cordis 实例。插件组合、Portable 与 Learning 共用预设根的配置见[架构与配置说明](docs/architecture-layers.md)。

## 从旧版升级

旧 dsh-plugin-marketplace 改由内置 dsh-web 创意工坊替代（npm 最新版 0.3.21）。原先启用旧市场的配置会迁移为启用创意工坊，新安装仍按需开启。升级保留配置备份，并修复此前插件开关生成的混合 YAML。

v1.7.2 将额外能力改为显式启用，首次启动的外观可能与此前默认 DCode 工作台不同。

启动时自动转换旧 Portable / Learning 历史日志，在同一会话目录生成官方 v3 日志，原始文件保持不变。转换兼容旧附件元数据和子 Agent 描述，并由官方迁移链处理会话事件及序号。详见[升级说明](RELEASE_NOTES.zh.md)。

## 开发与构建

推荐 Node.js 24 和 pnpm 11.21.0。使用包含官方子模块的完整仓库：

```sh
git clone --recurse-submodules https://github.com/wsnxxxs/deepseek-harness-portable.git
cd deepseek-harness-portable
pnpm install --frozen-lockfile
pnpm run build
pnpm run desktop:dev
```

已有仓库在拉取后运行 `git submodule update --init --recursive`，以检出当前提交固定的官方版本。

| 命令 | 用途 |
| --- | --- |
| `pnpm test` | 常规回归 |
| `pnpm run official:test` | 官方默认启动和可选 bundle 的真实装配检查 |
| `pnpm run learning:test` | Learning 的 427 项源码测试 |
| `pnpm run dcode:test` | DCode 组件与行为测试 |
| `pnpm run test:platform` | Windows 启动器、安装交接和更新器检查 |
| `pnpm run readme:check` | 中英文 README 同步检查 |

Windows x64 打包需要 Windows 构建环境和 Inno Setup 6：

```sh
pnpm exec tsx scripts/build-desktop-web-exe.ts --electron --target win32-x64 --output-root dist-desktop/electron-v1.7.2
```

产物位于 `dist-desktop/electron-v1.7.2/windows-artifacts/`，验证后的副本与记录位于 `verified/win32-x64/`。打包流程检查原生模块、实际启动、文件清单，以及安装器内嵌 ZIP 与便携包的一致性。

macOS/Linux 需在对应平台分别执行 `pnpm run desktop:package:mac` 或 `pnpm run desktop:package:linux`。打包不会自动上传；安装包、缓存和本地日志不提交到 Git。

## 仓库结构

- `vendor/deepseek-harness/`：固定版本的官方 Git 子模块。
- `apps/runtime/`、`apps/desktop/`：官方启动适配、桌面外壳和分发配置。
- `apps/dcode-ui/`、`apps/interactive-learning/`、`apps/cluster-ui/`：可选功能。
- `packages/`：通信桥、可选插件和共享服务。
- `scripts/`：构建、测试、打包与发布工具。
- `patches/`：历史转换及清单；当前两个功能补丁清单均为空。

更多说明：[桌面开发](apps/desktop/README.zh.md) · [运行时架构](docs/runtime-architecture.md) · [Learning 测试维护](apps/interactive-learning/tests/README.md)

## 许可证

本仓库使用 [MIT License](LICENSE)。上游及第三方依赖保留各自许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
