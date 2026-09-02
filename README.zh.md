# DeepSeek Harness Desktop

[English](README.md) · [发布说明](RELEASE_NOTES.zh.md) · [Issues](https://github.com/wsnxxxs/deepseek-harness-portable/issues)

[![Release](https://img.shields.io/github/v/release/wsnxxxs/deepseek-harness-portable)](https://github.com/wsnxxxs/deepseek-harness-portable/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64%20%7C%20macOS%20arm64%20%7C%20Linux%20x64-blue)](https://github.com/wsnxxxs/deepseek-harness-portable/releases)
[![License](https://img.shields.io/github/license/wsnxxxs/deepseek-harness-portable)](LICENSE)

DeepSeek Harness Desktop 把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 做成可直接安装和携带的桌面应用，并补上工作区管理和 DCode 编码工作台，另有插件市场、图片理解与学习模式。它支持 Windows x64、macOS Apple Silicon 与 Linux x64，由 Electron 桌面外壳和平台原生 runtime 组成。

这是社区分发版，不是 Microsoft 官方签名、Apple 公证或 Linux 发行版签名版本。首次运行前请核对 Release 中的 SHA-256 校验值。

## 目录

- [项目优势](#项目优势)
- [平台支持](#平台支持)
- [快速开始](#快速开始)
- [主要能力](#主要能力)
- [最新发布](#最新发布)
- [安装](#安装)
- [便携目录结构](#便携目录结构)
- [用户数据与API密钥](#用户数据与api密钥)
- [启动与更新](#启动与更新)
- [常见问题](#常见问题)
- [项目文档](#项目文档)
- [构建与发布](#构建与发布)
- [安全与限制](#安全与限制)
- [许可证](#许可证)

## 项目优势

| 优势 | 带来的实际体验 |
| --- | --- |
| 开箱即用的桌面分发 | 安装包自带 Electron/Node.js runtime。普通用户无需准备 Node.js、pnpm 或容器环境，Windows 可选择 Setup 或便携 ZIP，Linux/macOS 也有原生安装产物。 |
| 专门的编码工作台 | DCode 把会话和工作区放进同一个响应式界面，环境摘要和终端，以及文件变更与预览也集中于此，紧凑窗口和宽屏都能使用。 |
| 能力可以按需扩展 | 插件市场支持安装前审核、启停和更新，也能卸载；Vision Bridge、Learning 与可选的集群（Swarm，运行时 id 为 `crew`）模式作为独立能力接入，不会改写 Standard / Code / Minimal / Cordis 的默认行为。 |
| 复用已有模型配置 | Vision Bridge 复用内核的附件、模型目录与调用链。文本模型需要看图时可以转交已配置的视觉模型，无需再维护一套端点和 API 密钥。 |
| 数据与更新边界明确 | 会话与凭据，以及设置和附件都保存在应用目录之外；Web 服务只绑定回环地址，桌面外壳只提示新版本，不会自行替换或回滚应用文件。 |
| 发布过程可检查 | 打包流程会探测目标平台的真实能力，对最终应用执行冒烟检查并记录文件清单与哈希；发布步骤只复制已经验证的产物。 |

上游适配集中在受审查补丁和 Cordis 扩展点中，桌面能力与内核边界保持清楚。项目仍然保留浏览器模式和命令行入口，用户可以按场景选择桌面窗口、Web 页面或终端。

## 平台支持

| 平台 | 安装包 | 极简模式 Shell | 更新方式 | 重要要求 |
| --- | --- | --- | --- | --- |
| Windows x64 | Setup 或便携 ZIP | 通过 WSL 使用 Bash | 检查新版本并打开发布页手动安装 | 默认 WSL 发行版可用且包含 Bash |
| macOS Apple Silicon | DMG | 通过 POSIX PTY 使用原生 `/bin/bash` | 检查新版本并打开发布页手动安装 | 当前 DMG 未签名且未公证 |
| Linux x64 | AppImage 或 deb | 通过 POSIX PTY 使用原生 `/bin/bash` | 检查新版本并打开发布页手动安装 | 沙箱模式需要可用的 bwrap/Landlock 后端 |

安装包已包含应用 runtime，普通用户无需安装 Node.js 或 pnpm。开发构建要求见[构建与发布](#构建与发布)。

## 快速开始

1. 从[最新发布](https://github.com/wsnxxxs/deepseek-harness-portable/releases/latest)下载 Windows Setup/ZIP、macOS 的 `DeepSeek-Harness-<version>-darwin-arm64.dmg`，或 Linux 的 `DeepSeek-Harness-<version>-linux-x64.AppImage`。
2. Windows 运行安装程序；Linux/macOS 下载并检查 Release 中的 `install.sh` 后运行 `sh install.sh`，也可继续手动安装 AppImage/deb 或 DMG。
3. 启动 **DeepSeek Harness**，在 Web UI 的“设置”中配置 DeepSeek API key（或在启动进程的环境中提供）。

首次启动前，请核对与安装包一同发布的校验值。需要使用极简模式的 Windows 用户还应确认 `wsl -- bash -lc true` 能正常执行。

## 主要能力

### 桌面与工作区

- 内置 Electron 桌面外壳和 DeepSeek Harness Web runtime，在回环地址启动；同时保留浏览器模式。
- 支持工作区选择、托盘/应用菜单、更新历史、关于信息与诊断导出。
- 原生侧边栏 Logo 可打开桌面菜单，并同步系统主题。Windows 11 使用 Mica 与标题栏样式，macOS 使用原生菜单；窗口位置和尺寸可跨启动保留，并适配多显示器。
- DCode 工作台在紧凑、中等和宽屏布局间自适应，提供可调整并持久化的会话侧栏、环境摘要、聚焦预览，以及工作区和任务快速切换。

### Agent 与运行环境

- Standard、Code、Cordis、Minimal、Swarm（集群，运行时 id 为 `crew`）和 Learning 模式各自保持清晰边界。Learning 只在用户主动选择后启用，不改变其他模式的默认工具与行为。
- Swarm 模式通过具名队友、共享任务看板、依赖关系、写入范围和历史会话检索来协调任务。DCode 的 Agent 工作台通过集群编排面板展示同一份宿主状态，操作者附加的资料档案则为任务提供可核对的材料依据。
- Minimal 模式在 Windows 使用 WSL Bash，在 Linux/macOS 使用原生 `/bin/bash` POSIX PTY。Linux 沙箱模式沿用上游 bwrap/Landlock 的失败关闭策略。
- 插件市场可移除，支持 GitHub 分页搜索、安装前审核、安装进度、更新管理、启用、停用和卸载，也向 Agent 提供市场工具。

### 图片、文件与学习

- Vision Bridge 的 `view_image` 可以分析本地 PNG、JPEG、WebP、GIF 和 PDF 页面。它会自动选择已配置的图片模型，也允许在插件设置中固定模型。
- 会话输入框会把图片附件保留为图片数据，文本和 Office 文件通过内核 Session Remote 上传；上游 `@file` 路径引用仍可直接使用。
- Learning 模式提供概念讲解、疑惑澄清和材料学习。语义图示与理解检查按需出现，不阻塞普通对话；材料从学习会话中附加和使用。
- 使用量设置页从持久化运行时投影汇总 token 消耗、模型明细、活跃度和会话耗时。

## 最新发布

| 项目 | 版本 |
| --- | --- |
| 发布 | DeepSeek Harness Desktop **v1.6.1**（[下载](https://github.com/wsnxxxs/deepseek-harness-portable/releases/tag/v1.6.1)) |

请阅读[中文发布说明](RELEASE_NOTES.zh.md)，或在桌面端托盘菜单中打开“更新日志”。

## 安装

1. **Windows Setup 安装包：** 从 Releases 下载 `DeepSeek-Harness-Setup-<version>-win32-x64.exe` 并运行。
2. **Windows 在线安装：** 运行仓库中的 `install.ps1`。脚本只接受带可信 SHA-256 摘要的 release ZIP。参数：`-InstallDir <路径>`（默认 `%LOCALAPPDATA%\Programs\DeepSeek Harness`）、`-NoDesktopShortcut`、`-Force`。
3. **Windows 便携 ZIP：** 下载 `DeepSeek-Harness-<version>-win32-x64.zip`，先核对 `SHA256SUMS.txt`，再解压完整目录，不要重命名 `runtime`。
4. **Linux/macOS 校验安装：** 从同一个 Release 下载 `install.sh` 与 `SHA256SUMS-install.txt`，校验并检查脚本后运行 `sh install.sh`。脚本只选择已支持的原生目标，并在安装前使用 `SHA256SUMS-<target>.txt` 校验 AppImage/DMG。Linux 默认安装到 `~/.local/opt/deepseek-harness`，同时创建 `~/.local/bin/deepseek-harness` 和桌面入口；macOS 默认安装到 `~/Applications`。可使用 `--version <版本>`、`--install-dir <路径>` 或 `--help`。
5. **macOS Apple Silicon（手动）：** 下载 `DeepSeek-Harness-<version>-darwin-arm64.dmg`，核对 `SHA256SUMS-darwin-arm64.txt`，打开后将应用拖入“应用程序”。当前 DMG 未签名且未公证；安装脚本不会绕过 Gatekeeper。
6. **Linux x64 AppImage（手动）：** 下载 `DeepSeek-Harness-<version>-linux-x64.AppImage`，核对校验值，运行 `chmod +x DeepSeek-Harness-<version>-linux-x64.AppImage` 后启动。
7. **Linux x64 deb（手动）：** 下载 `DeepSeek-Harness-<version>-linux-x64.deb`，运行 `sudo apt install ./DeepSeek-Harness-<version>-linux-x64.deb` 安装。安装后可直接在终端运行 `dsh` 启动。
8. **卸载：** 使用平台常规的应用移除流程。Windows 便携包包含卸载脚本；除非明确删除，否则会保留用户数据。

> **注意：** `setup-shortcuts.ps1`（安装程序以及便携包中的 `创建桌面快捷方式.bat` 会调用它）会创建指向无控制台 GUI 启动器的桌面快捷方式，并把便携目录加入**用户 PATH**；卸载程序会一并移除这两项。

安装器和更新器会校验 ZIP 摘要和发布清单，以及应用清单和必要的原生模块，不会创建证书，也不会修改 Windows 信任存储。

## 便携目录结构

    DeepSeek Harness-win32-x64/
    ├─ dsh.cmd                     命令行入口：网页模式、`dsh update`、`dsh desktop`、`dsh trust`
    ├─ pnpm.cmd                    插件管理使用的内置包管理器入口
    ├─ start-web.cmd               使用内置 Electron/Node runtime 的浏览器模式入口
    ├─ DeepSeek Harness Launcher.exe  无控制台桌面启动与更新恢复入口
    ├─ start-desktop.cmd           控制台诊断与恢复后备入口
    ├─ update.ps1                  便携版更新器
    ├─ setup-shortcuts.ps1         快捷方式和 PATH 设置
    ├─ release-manifest.json       分发/外壳/内核版本清单
    ├─ 启动桌面版.bat               桌面启动（双击友好）
    ├─ 启动桌面窗口.bat             桌面窗口启动（同上）
    ├─ 启动网页版.bat               网页启动，缺 Node.js 时回退桌面端
    ├─ 在线更新.bat                 更新启动
    ├─ 创建桌面快捷方式.bat         快捷方式/PATH 设置启动
    ├─ 一键解除拦截(自签名信任).bat  签名说明；刻意不创建证书
    ├─ 使用说明.txt                 中文快速指南
    ├─ 使用说明.en.txt              英文快速指南
    └─ runtime/                    Electron 可执行文件和应用依赖

不要删除或重命名 Windows 的 `runtime` 目录。macOS 使用正常的 `.app` Bundle 结构。

Linux AppImage 和 deb 包内含原生 Electron runtime 与桌面入口；deb 安装后还会注册 `/usr/local/bin/dsh`，可在终端快速启动。未压缩的 Linux 构建目录会在 `runtime/` 旁提供 `start-desktop.sh`、`start-web.sh`、`dsh.sh` 和 `portable-pnpm.sh`。

## 用户数据与API密钥

- 会话、凭据、设置、附件和桌面偏好保存在**应用目录之外**：Windows 为 `%USERPROFILE%\.dsh`，Linux/macOS 为 `$HOME/.dsh`（可通过 `DSH_HOME` 环境变量覆盖）。更新后数据保留，除非明确删除否则不会移除。
- 在 Web UI **设置**中配置 DeepSeek API key，或在启动进程的环境中提供。
- 桌面外壳将 Web 服务绑定到回环地址，并设置 `DSH_TELEMETRY_DISABLED=1`。

## 启动与更新

- Windows 快捷方式与便携版用户使用 `DeepSeek Harness Launcher.exe`，在保留更新恢复能力的同时不打开命令行窗口；`start-desktop.cmd` 保留为控制台诊断后备入口。Linux 使用 AppImage/deb 的桌面入口或未压缩目录中的 `start-desktop.sh`；macOS 从“应用程序”启动应用。
- Windows 使用 `start-web.cmd`（或 `启动网页版.bat`），Linux 使用 `start-web.sh`，通过内置 Electron/Node runtime 启动网页版，无需安装系统 Node.js。
- Windows 的 `dsh.cmd` 提供同样的网页版入口、内置插件管理 CLI，并支持分发版子命令：`dsh update`、`dsh desktop`、`dsh trust`。
- 桌面托盘菜单提供“检查更新”“更新日志”和“关于”。
- 检测到新版本时，桌面外壳只在标题栏下方显示轻量提示，并按需打开发布页。应用不会下载、替换或回滚安装目录，用户需要手动安装新版本。
- 新版本提示可按版本选择“不再提示”；“更新日志”和“关于”在卡片式发布信息面板内打开。具体产品历史见[发布说明](RELEASE_NOTES.zh.md)。

## 常见问题

**为什么 Windows 提示可执行文件未签名？**
当前桌面可执行文件没有可信商业 CA 签名，SmartScreen 可能显示警告。请先核对发布的 SHA-256 值（见[安全与限制](#安全与限制)），然后选择**更多信息 → 仍要运行**。本项目刻意不创建自签名证书，也不修改信任存储。

**Smart App Control 是什么？能运行吗？**
Smart App Control 可能直接阻止未签名的应用。如果设备已启用该功能，可能需要为应用将其关闭，或使用经企业批准、CA 签名的构建。参考 Microsoft 的 [Smart App Control 概述](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/overview)。

**需要安装 Node.js 吗？**
不需要。桌面模式和浏览器/网页模式，以及 DSH 插件 CLI、pnpm，均使用 Electron 内置的 Node.js runtime。

**我的数据存在哪里？**
在 `%USERPROFILE%\.dsh`（或 `$DSH_HOME`），位于应用目录之外。见[用户数据与API密钥](#用户数据与api密钥)。

**版本检查失败了怎么办？**
发布信息面板会显示错误状态和重试入口，不会阻塞主界面。你也可以打开项目发布页，手动下载最新平台产物。Windows 便携版用户仍可直接运行独立更新器：`dsh update`、`在线更新.bat` 或 `update.ps1`。

**macOS 极简模式需要 WSL 或 Docker 吗？**
不需要。Apple Silicon macOS 上，极简模式通过原生 POSIX PTY 和 `/bin/bash` 运行，并使用 macOS runtime 的原生进程与沙箱支持。

**Linux 极简模式需要 WSL 或 Docker 吗？**
不需要。Linux 直接使用原生 POSIX PTY 和 `/bin/bash`；沙箱模式优先使用上游 `bwrap`，回退到 Landlock 时若无法实际执行约束会失败关闭，不会静默降级为无沙箱运行。

**为什么极简模式中的长命令会超时？**
极简模式会原样执行模型给出的 Shell 命令。对 vendor 工作区使用递归 `grep` 还会扫描嵌套依赖目录，确实可能超过工具超时；建议改用会遵守忽略规则的 `rg`，或显式排除 `node_modules`。Windows 超时时，桌面桥接只会强制终止该终端对应的 `wsl.exe` 进程树；Linux/macOS 终止原生 POSIX PTY。

## 项目文档

| 文档 | 适用读者 | 内容 |
| --- | --- | --- |
| [项目概览](overview.md) | 新用户与评估者 | 项目定位、主要优势、适用场景和当前边界 |
| [桌面外壳说明](apps/desktop/README.zh.md) | 桌面端贡献者 | Electron 行为、原生产物目录、测试和发布身份 |
| [运行时架构与发布门禁](docs/runtime-architecture.md) | Runtime 与发布维护者 | 能力探测、模式契约、Manifest、CI 和签名门禁 |
| [界面与前端切换](docs/surfaces.md) | 前端贡献者 | 官方版/工作台、可用性上报和共享界面模式状态 |
| [Swarm 模式与资料档案](docs/crew.md) | Runtime 与产品维护者 | 团队运行时、任务看板、DCode 集成和资料档案行为 |
| [交互式学习包](apps/interactive-learning/README.zh.md) | 功能贡献者 | 协议边界、开发流程、启用方式和兼容性 |
| [学习模式产品说明](docs/product/learning-mode.md) | 产品与功能维护者 | 当前学习流程和产品边界 |
| [Vision Bridge](apps/vision-bridge/README.zh.md) | 用户与功能贡献者 | 图片模型路由、配置、失败行为和开发验证 |
| [发布说明](RELEASE_NOTES.zh.md) | 用户与维护者 | 用户可见变更和升级信息 |

## 构建与发布

*面向维护者和贡献者。*

环境要求：Node.js ^22.19.0 或 >=24、pnpm。Windows 发布构建运行于 Windows x64；macOS 发布构建运行于 Apple Silicon macOS，并使用系统自带的 `hdiutil`、`sips` 和 `iconutil`；Linux 发布构建运行于原生 Linux x64，需要 `musl-gcc`、`bwrap`/Landlock 测试环境和 `dpkg-deb`。AppImage/deb 由 `electron-builder` 负责打包。

仓库通过固定 Git submodule `vendor/deepseek-harness` 内置匹配版本的 DeepSeek Harness 源码 workspace。它提供桌面外壳所需的 `@deepseek-ai/*` 包，并在本地构建嵌入式 Web runtime；发布流程不再需要把已有便携 ZIP 作为构建输入。

首次 clone 后只需初始化一次：

    pnpm run desktop:bootstrap

如果工作区中已经存在生成好的 `lib`/`dist` 产物，日常功能开发重新安装依赖时可只安装桌面运行时闭包：

    pnpm run desktop:bootstrap:dev

快速模式不替代从零构建 kernel 或发布安装包所需的完整依赖安装。

之后必须在目标原生主机上打包。打包流程会执行真实能力探测、写入实测模式目录和文件清单、对含 manifest 的最终应用字节再次冒烟、生成平台容器，最后写出不可变的已验证 bundle。打包前先运行默认快速测试；会主动重建或写入生成产物的测试放在 dirty suite，Windows 专用 launcher 与 updater 检查放在 platform suite：

    pnpm test
    pnpm run test:dirty
    pnpm run test:platform

    pnpm run desktop:package:win

如需使用当前 1.6.1 产品版本身份生成一次性的 Windows x64 测试包，建议写入独立目录：

    pnpm exec tsx scripts/build-desktop-web-exe.ts --electron --target win32-x64 --output-root dist-desktop/electron-v1.6.1-test --no-cache

测试 ZIP 与 Setup 安装包位于
`dist-desktop/electron-v1.6.1-test/windows-artifacts/`；未压缩应用和已验证 bundle
也在同一输出目录下。

Windows 已验证 bundle 位于 `dist-desktop/electron/verified/win32-x64/`。发布是独立的只复制操作，必须显式传入该目录：

    pnpm run desktop:release:win -- --input dist-desktop/electron/verified/win32-x64

构建 macOS Apple Silicon DMG：

    pnpm run desktop:package:mac
    pnpm run desktop:release:mac -- --input dist-desktop/electron/verified/darwin-arm64

构建 Linux x64 AppImage 和 deb（必须在原生 Linux x64 主机执行）：

    pnpm run desktop:package:linux
    pnpm run desktop:release:linux -- --input dist-desktop/electron/verified/linux-x64

产物位于 `dist-desktop/electron/linux-artifacts/`，未压缩 runtime 位于
`dist-desktop/electron/DeepSeek Harness-linux-x64/`。官方上游 Landlock launcher
会使用 `musl-gcc` 本地编译并暂存进 Linux runtime；launcher 缺失或 Landlock
内核不可用时，运行时仍保持失败关闭。

打包流程会为源码 workspace 生成指纹，并在输入未变化时复用已成功的编译和运行时部署，也复用补丁、Electron 目录和最终平台容器层。相同源码和目标重复打包时，会跳过耗时较长的 workspace 编译，以及 AppImage/deb、ZIP/Setup 或 DMG 的重新生成。Linux release 包装脚本默认也会保留缓存；排查干净构建时，可向 package 命令传入 `--no-cache`。需要有意打包现有编译产物时，仍可使用 `--skip-build`。release 命令不接受构建参数、不运行测试、不打补丁、不签名、也不重建压缩包；它只会重新校验 `artifact-verification.json` 指定的精确字节并复制它们。

桌面包保留三层独立版本：

- `distributionVersion`：公开 release 标签，以及对应平台的 ZIP、Setup、AppImage/deb 或 DMG 产物版本。
- 桌面外壳版本：Electron 外壳包版本。
- 内核版本：打包进来的 `@deepseek-ai/dsh-web-app` 版本。

原生 package CI matrix 是平台支持的唯一权威：Linux 使用原生 Linux x64，Windows 使用原生 x64 runner，该 runner 带可用 WSL distribution 和 Inno Setup，macOS 使用原生 Apple Silicon runner。交叉构建或未在本机实测的产物不能获得 verification record；release workflow 只消费这些记录，不重新构建。

当前本地包均标记为 `non-official-unsigned`。正式发布会失败关闭，直至附加目标特定证据：Windows Authenticode；macOS 签名与公证；Linux 外部包签名。`--allow-non-official` 仅是维护者发布 prerelease 的显式开关，不会改变产物分类。详见[运行时架构与发布门禁](docs/runtime-architecture.md)。准备新版本时，请同步更新 `RELEASE_NOTES.md`、`RELEASE_NOTES.zh.md` 和 `apps/desktop/src/release-notes.json`。

`dist-desktop/` 是可重建的临时构建目录，发布后可以删除。下一次构建所需的源码保存在 `vendor/deepseek-harness` 中；不要用 `node_modules/` 或便携 ZIP 替代源码提交到仓库。

## 安全与限制

- 运行下载文件前请先核对发布的 SHA-256 值。
- 当前本地 Windows、Linux、macOS 包均明确属于非正式未签名产物；正式发布通道在缺少 TargetSpec 的签名/公证证据时会拒绝发布。
- 本地 Web 服务默认只绑定回环地址。
- 不要把 API key 放入仓库或发布目录。
- 市场条目是从 GitHub 发现的第三方代码。安装前请审查插件仓库和权限；安装过程可能运行包构建脚本，插件会获得其 Cordis 组合所声明的能力。
- 如果组织要求可信可执行文件，请使用受认可的 CA、Microsoft Artifact Signing 或企业代码签名策略。

参考 [Smart App Control](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/overview) 和 [SmartScreen reputation guidance](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).

## 许可证

DeepSeek Harness 使用 [MIT](LICENSE) 许可证，第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。上游源码：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。
