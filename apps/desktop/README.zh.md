# DeepSeek Harness Desktop v1.7.2

[English](README.md) · [项目说明](../../README.zh.md) · [插件配置](../../docs/architecture-layers.md)

这个目录是官方 DeepSeek Harness 的 Electron 外壳。默认使用原生窗口和官方 Web profile；页面样式、品牌菜单、DCode 等扩展只有启用插件后才加载。

## 开发

在仓库根目录运行：

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm run desktop:dev
```

`src/main.cjs` 管理窗口、工作区和应用菜单；`src/runtime-supervisor.cjs` 启动官方运行时并等待就绪握手。Electron 的 Node 模式通过 `--expose-internals` 满足官方 Cordis Loader/HMR 的要求。

默认 preload 仅提供桌面通信桥。`src/desktop-enhancements.cjs` 中的页面增强由 `@dsh-portable/desktop-enhancements` 插件启用和释放。

桌面数据默认位于 `%USERPROFILE%\.dsh`（Windows）或 `~/.dsh`（Linux/macOS），可通过 `DSH_HOME` 覆盖。插件配置保存在其下 `profiles/web/`，见[配置说明](../../docs/architecture-layers.md)。

## 检查与打包

```sh
pnpm run desktop:test
pnpm run official:test
pnpm run test:platform
pnpm exec tsx scripts/build-desktop-web-exe.ts --electron --target win32-x64 --output-root dist-desktop/electron-v1.7.2
```

`test:platform` 和 Windows 打包在 Windows 主机执行，安装器需要 Inno Setup 6。macOS/Linux 使用根目录对应的 `desktop:package:mac`、`desktop:package:linux` 命令，在目标系统本地构建。

Windows 包与验证记录分别位于输出根目录的 `windows-artifacts/` 和 `verified/win32-x64/`。发布命令读取验证后的产物，不重新打包；普通构建不会上传。

产品版本使用本目录 `package.json` 的 `distributionVersion`；包自身的 `version` 独立维护。修改发布版本时同步本地发布说明、校验文件和版本检查。

## 更新与卸载

应用菜单可检查已发布版本。Windows 的 `update.ps1` 负责校验、替换与失败回滚；桌面启动器处理未完成的更新事务。更新器只操作匹配的安装目录和所属进程。

安装器卸载或便携版卸载脚本默认保留用户数据，除非明确选择删除。旧 Portable 自定义会话会自动转换，原始日志保持不变。详见[发布说明](../../RELEASE_NOTES.zh.md)。
