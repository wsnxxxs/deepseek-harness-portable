# Two front ends, one runtime

This distribution ships two browser front ends over a single DeepSeek Harness
Runtime:

- **Official** — the upstream DeepSeek Harness interface, unmodified.
- **Workbench** (`@dsh-portable/dcode-ui`) — a compact desktop workbench.
  Default.

Neither is a fork of the other, and neither can be removed by selecting the
other.

## Why a slot shadow rather than two applications

DSH's browser shell renders exactly one ctx-level slot, `root`. The upstream
`ui-layout` plugin occupies it with `AppFrame`. Because `root` is a `single`
slot, a second registration shadows the first, and the entry with the lowest
`priority` renders.

That is the entire switch. `@dsh-portable/dcode-ui` registers into `root` at
`priority: -1000` while the modern surface is selected and disposes the
registration otherwise.

The alternative — serving two applications, or reconfiguring the host plugin
graph per surface — would have meant a Runtime restart per switch and two
copies of every piece of session state. Both front ends instead read the same
`ctx.sessions`, `ctx.workspaces`, `ctx.uiConversation`, projections and
Remote namespaces, so:

- switching never restarts the Harness or drops the Host connection;
- a task started in one surface is already present in the other;
- a streaming turn keeps streaming across a switch;
- settings, theme and language are one set of values, not two.

## Selecting a front end

| Entry | Where |
| --- | --- |
| Application menu | `DeepSeek Harness ▸ Interface ▸` |
| Tray menu | the same submenu |
| Workbench settings | Settings ▸ Appearance ▸ Interface, and Settings ▸ General |
| Official settings | 设置 ▸ 界面设置 |
| URL | `?view=dcode` / `?view=official` |
| Command palette | "Switch to the official interface" |

Resolution at boot, highest first: URL parameter → browser `localStorage` →
the desktop config's `uiMode` field → `dcode`.

The desktop shell stamps `?view=<mode>` onto the harness URL it loads, records
the selection in `config.json`, and keeps its menus ticked. A switch made
inside the page reports back over the `desktop:ui-mode` IPC channel so the
next cold launch opens the same surface.

## Capability boundary

The workbench reuses DSH capabilities wherever they exist. It adds host-side
code for exactly one thing DSH does not own — version control — as a
`/dcode` Connection RPC channel (`git/status`, `git/diff`, `git/branches`,
`git/commit`, `git/undo`, `file/read`). That is a host plugin, not a desktop
feature, so the web surface has the same Git panel as the packaged app.

Learning mode is a first-class surface in the workbench rail, but it drives the
existing Interactive Learning pack: the same `learning` agent preset, the same
`/interactive-learning` channel, and the pack's own `VaultLibrary` component.
There is one learning backend and one vault. The official interface keeps its
own learning entries unchanged.

## Where the pieces live

| Concern | Location |
| --- | --- |
| Shared switch constants | `apps/dcode-ui/ui-mode-contract.cjs` |
| Typed browser helpers | `apps/dcode-ui/src/ui-mode.ts` |
| Browser switch + workbench | `apps/dcode-ui/src/client/` |
| Git/diff/undo host channel | `apps/dcode-ui/src/host/` |
| Plugin-graph insertion | `apps/runtime/src/packaged-bin.ts` |
| Desktop config field | `apps/desktop/src/config-store.cjs` (`uiMode`) |
| Menu, tray, IPC, URL stamp | `apps/desktop/src/main.cjs` |
| Renderer bridge | `apps/desktop/src/desktop-preload.cjs` |

---

## 中文摘要

本发行版在同一个 DSH Runtime 之上提供两套前端：**官方版**（保持原样的上游
DeepSeek Harness 界面）与默认的**工作台**（`@dsh-portable/dcode-ui`）。二者不是
彼此的分支，选择其一也不会移除另一个。

切换机制只有一句话：DSH 浏览器外壳只渲染一个 ctx 级插槽 `root`，官方 `ui-layout`
以 `AppFrame` 占据它；`root` 是 `single` 插槽，后注册者以更低的 `priority` 遮蔽前者。
工作台被选中时以 `priority: -1000` 注册进 `root`，否则释放该注册——官方 AppFrame
原样恢复。

因此切换不重启 Harness、不断开 Host 连接、不复制任何会话状态：两套界面读取同一份
`ctx.sessions`、`ctx.workspaces`、`ctx.uiConversation`、projection 与 Remote 命名空间。
在一侧新建的任务在另一侧已经存在，流式回合可跨切换继续。

切换入口：应用菜单、托盘菜单、两套界面各自的设置面板、URL 参数 `?view=`、命令面板。
启动解析顺序为 URL 参数 → `localStorage` → 桌面配置 `uiMode` → `dcode`。

能力边界上，工作台尽量复用 DSH 既有能力；只有 DSH 当前不具备的版本控制能力，
以 `/dcode` Connection RPC 通道在 Host 侧补齐（状态、差异、分支、提交、撤销、文件读取），
因此网页端与桌面端拥有同一个 Git 面板。撤销是非破坏性的：已跟踪文件从 HEAD 还原，
未跟踪文件移动到 `.dsh/dcode-undo/<时间戳>/`，绝不直接删除。

学习模式是工作台左侧导航的一级入口，但驱动的是既有的 Interactive Learning 能力包：
同一个 `learning` 预设、同一条 `/interactive-learning` 通道、以及该包自己的
`VaultLibrary` 组件。学习后端与学习库只有一份，官方版中原有的学习入口也保持不变。
