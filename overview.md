# DeepSeek Harness Desktop 项目概览

DeepSeek Harness Desktop 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的社区桌面分发版。项目把上游 Web runtime 与平台原生运行环境打包进 Electron 外壳，并提供 Windows x64、macOS Apple Silicon 与 Linux x64 产物。

它面向希望直接使用 DeepSeek Harness、又不想自行拼装 Node.js 工具链和桌面运行环境的用户。桌面版保留上游的 Agent 能力，同时增加工作区入口和 DCode 编码界面，也加入插件管理、视觉桥接、交互式学习与可选的集群模式。

## 主要优势

### 安装后即可使用

安装包包含 Electron/Node.js runtime。Windows 用户可选 Setup 或便携 ZIP，macOS 提供 DMG，Linux 提供 AppImage 与 deb。浏览器模式和命令行入口仍然保留，不要求用户只能通过桌面窗口运行。

### 编码任务集中在一个工作台

DCode 将会话和工作区放在同一界面，环境信息与终端，以及文件变更和预览也集中于此。布局会根据窗口宽度调整，会话侧栏的尺寸可以持久化，适合在单屏、分屏或宽屏环境中使用。

### 多智能体任务有共享上下文

集群模式（运行时 id 为 `crew`，英文界面显示为 Swarm mode）将具名队友、共享任务看板、依赖关系和写入范围放在同一任务中；DCode Agent 工作台通过集群编排面板直接读取宿主保存的队伍状态。操作者还可以附加资料档案，让队友通过只读工具检索带来源的任务材料。

### 扩展能力保持独立

插件市场可以搜索和审核第三方插件，也能完成安装和更新，并支持启停与卸载。Vision Bridge、Interactive Learning 与集群模式以独立模块接入；用户停用这些模块时，Standard / Code / Minimal / Cordis 的默认行为不受影响。

### 图片理解复用已有配置

Vision Bridge 复用内核的附件服务与模型目录，也沿用原有 LLM 调用链。支持图片的对话模型可以直接接收图片；纯文本模型需要处理图片时，可转交已经配置的视觉模型。整个过程不需要另设服务商端点或 API 密钥。

### 学习内容有资料边界

Learning 模式支持概念讲解和疑惑澄清，也能用于材料学习。资料通过只读能力提供给模型，讲解可以保留来源锚点；会话笔记与长期学习库分开，概念卡需要符合证据与用户确认规则后才会写入。

### 本地数据与发布行为容易判断

会话与凭据，以及设置和附件都保存在应用目录之外，更新或卸载应用时默认保留。Web runtime 只绑定回环地址，桌面外壳设置 `DSH_TELEMETRY_DISABLED=1`。版本检查只提供提示与发布页入口，不会在后台替换应用文件。

打包流程会在目标原生平台探测 PTY、Shell 和沙箱等真实能力，对写入 Manifest 后的应用再次执行冒烟检查，并为最终产物生成文件清单和 SHA-256。发布脚本只校验并复制已经验证的字节，不在发布阶段重新构建。

## 适合的使用场景

- 需要在桌面窗口中使用 DeepSeek Harness，并在多个工作区与任务间切换。
- 希望使用 DCode 处理代码、终端、文件变更和预览。
- 需要让具名 Agent 围绕共享任务看板并行工作，并从任务资料档案中检索依据。
- 已配置文本或视觉模型，希望在同一会话中处理截图、图表、PDF 页面和本地图片。
- 需要基于 PDF、Markdown、DOCX、PPTX 或代码材料进行带来源锚点的学习。
- 维护者需要从固定上游源码构建，并检查能力探测、Manifest 与发布产物的一致性。

## 当前边界

- 这是社区分发版，当前 Windows、macOS 和 Linux 产物均标记为 `non-official-unsigned`。
- Windows 的 Minimal 模式依赖可用的默认 WSL 发行版；macOS 和 Linux 使用原生 `/bin/bash` POSIX PTY。
- Linux 沙箱模式依赖可用的 bwrap/Landlock 后端，无法执行约束时保持失败关闭。
- 插件市场中的条目属于第三方代码，安装前需要检查来源、构建脚本和权限。
- 集群模式依赖上游 Agent Teams experimental 包；该依赖不可用时，Swarm/`crew` 会从模式选择器中移除，其他模式和 DCode 工作台仍可用。

安装步骤、平台要求和常见问题见[中文 README](README.zh.md)；集群模式的运行时与资料档案见[Swarm 文档](docs/crew.md)，内部能力探测与发布门禁见[运行时架构](docs/runtime-architecture.md)。
