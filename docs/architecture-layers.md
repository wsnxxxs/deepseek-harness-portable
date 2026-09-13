# 官方内核与可选插件

当前内核固定为官方 `dsh-v0.1.5-rc.2`（`fb2c4b9e698e30edb738bca4cf0618587db7d203`）。桌面发行版只负责启动、窗口、进程监督和打包；默认使用官方 Web profile、界面、预设、会话格式与工具行为。

## 默认启动

`apps/runtime/src/packaged-bin.ts` 初始化官方 Web profile，然后调用官方 `runCli()`。常驻的 `desktop-bridge`，它等待官方 Loader 并报告桌面进程握手与服务地址，不注册界面或 Agent 功能。

`packages/desktop-protocol/cordis.patch.yml` 提供管理入口及默认关闭的功能行：

| 行 | 功能 |
| --- | --- |
| `desktop-enhancements` | 原有桌面页面样式、品牌菜单、提示和更新日志面板 |
| `ui-mode` | 可选界面切换 |
| `session-manager` | DCode 会话用量展示 |
| `composer-attach` | 输入框文件/目录附加入口 |
| `plugin-manager` | 将内置插件接入 dsh-web 原生插件管理页的 Cordis 适配器 |
| `dcode-ui` | DCode 工作台 |
| `interactive-learning` | 学习工具和界面 |
| `cluster-ui` | 团队状态与任务看板 |
| `agent-team` | 随包提供的官方实验性团队插件 |

官方标准 profile 自身需要的内置插件保持官方设置。`@dsh-portable/web-plugins` 参考 dsh-web 0.3.21 组合，只启用 compat、settings、plugin-manager 三个管理组件，其他功能行全部默认关闭；i18n、better-sidebar 同样默认关闭。旧版标记为自动启用的 dsh-web-all bundle 会迁移为关闭；用户后来明确添加的 bundle 和自定义配置不会被每次启动重置。

默认启动不编译 Portable 预设、不执行 Portable 能力探测、不强制 SQLite、不修改目录选择后端，也不预注册学习事件。Electron 使用原生标题栏，默认 preload 不注入页面 CSS、不替换官方品牌按钮。桌面增强插件启用后才载入原有页面增强；关闭该插件时重载页面，释放其 DOM、监听器和 IPC 回调。

## 启用与关闭

使用 DSH 的标准 profile 配置。停止应用后，在 `DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles` 中保留现有官方 bundle，并按需追加以下包名，重新启动：

| Bundle | 自动配置 |
| --- | --- |
| `@dsh-portable/desktop-enhancements` | 启用桌面页面增强 |
| `@dsh-portable/dcode-ui` | 启用 `ui-mode`、`session-manager`、`dcode-ui` |
| `@dsh-portable/interactive-learning` | 启用学习插件，并通过 `learningPresetSource` 注入官方预设服务 |
| `@dsh-portable/cluster-ui` | 启用团队服务和 Cluster 界面 |
| `@dsh-portable/runtime` | 启用 Portable 能力探测与预设编译，替代官方预设提供者；Crew 预设需同时启用 Cluster bundle |

删除对应 bundle 后重启即可关闭。若曾通过插件管理器或本地 patch 显式启用，还应撤销对应设置；用户的 `cordis.patch.yml` 优先于 bundle 默认值。

简单功能可以直接在同目录 `cordis.patch.yml` 中启用：

```yaml
- id: composer-attach
  disabled: false
```

插件管理器常驻，在设置 → 插件 → 插件管理中操作。Portable 通过 Cordis 的 `pluginManager` 服务，将内置插件接入 dsh-web 原生页面的「内置产品」分组，不注册独立设置标签。dsh-web 异步提供服务后适配器才连接，卸载时恢复原方法，不阻塞官方启动。开关写入标准 `cordis.patch.yml` 和 profile bundle 列表，重启生效；DCode 的必需依赖会一起启用，关闭必需依赖时也关闭 DCode。它不能关闭桌面通信桥或预设基础服务。

同时使用 Portable 预设和 Learning 时，在启用两者 bundle 后，给 Portable 提供者补上学习根：

```yaml
- id: portable-agent-presets
  inject: [learningPresetSource]
  config:
    default: standard
    roots: !!js "[ctx.learningPresetSource]"
```

只启用 Learning 时不需要这段配置，直接使用官方预设服务。

## DSH / Cordis 约束

- Bundle 使用包清单的 `dsh.bundle.patch` 与独立 `cordis.patch.yml`。`name` 是 patch 的匹配校验，不是替换字段；替换服务必须关闭旧行并插入新行。
- Host 插件用 `inject` 声明服务依赖，使用 `ctx.effect`、`ctx.on`、`ctx.inject` 绑定生命周期。Cordis 4 的对象形式 inject 是服务名到 intercept 配置的映射，不支持旧式 `{ required, optional }`。
- 扩展 RPC 用 `connection.fetch.register` 注册 `/api/<插件>/<端点>` 的精确路由，复用官方认证和请求封装；Gateway 独占共享 RPC 拦截器。Loader 的运行时完整 id 只用于定位，本地 patch 使用 `entry.options.id`。
- UI 使用官方 `clientBundle` 构建，包清单声明 `dsh.client.inject` / `external`；不把独立 Cordis 实例打进插件 bundle。
- 扩展包以 `peerDependencies` 和 `devDependencies` 声明 `@deepseek-ai/cordis`。发行版 runtime 作为宿主持有实际依赖，所有插件解析到同一个官方 Cordis 4.0.2 工作区实例。
- Bundle 中引用的插件包列在 dependencies。运行时依赖闭包通过 `scripts/runtime/sync-runtime-deps.ts` 生成并校验。
- `patches/manifest.yml` 与 `patches/kernel-manifest.yml` 均为空。历史 transform 保留供追溯，当前构建和打包不应用任何功能补丁，上游源码与构建输出保持官方实现。

## 验证与升级边界

`pnpm run build` 构建官方内核与可选插件。`pnpm run official:test` 在隔离 DSH_HOME 中验证官方默认启动、可选 bundle 激活、预设和浏览器模块图。常规单测通过 `pnpm test` 执行。打包冒烟验证插件文件完整但默认不启用；默认发行清单不宣称 Portable 模式已经执行能力探测。

本次升级还适配了官方 `native/system` 工作区、persona `prefix` 配置、新会话持久化接口，命令说明的动态函数形式，以及 DCode 的统一附件和反馈对话框接口。

启动时自动将旧 Portable / Learning 自定义事件历史转换为官方 v3 日志，原始文件保持不变，不删除历史对话。转换器只兼容已知 Portable 扩展事件、旧附件元数据与子 Agent 描述，其余事件由官方格式迁移链处理。转换后再次严格校验，并以新代日志原子发布；已有新版日志不覆盖。
