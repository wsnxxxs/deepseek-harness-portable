# Two surfaces, one page, one runtime

This distribution ships two browser front ends over a single DeepSeek Harness
Runtime:

- **Official** — the upstream DeepSeek Harness interface, unmodified.
- **Workbench** (`@dsh-portable/dcode-ui`) — a compact desktop workbench.
  Default.

Neither is a fork of the other, and selecting one never removes the other.

## Why a slot shadow rather than two applications

DSH's browser shell renders exactly one ctx-level slot, `root`. The upstream
`ui-layout` plugin occupies it with `AppFrame`. Because `root` is a `single`
slot, a later registration shadows the earlier one, and the entry with the
lowest `priority` renders.

That is the entire switch. Each extension surface registers into `root` while it
is the selected one and disposes the registration otherwise:

| Surface | Priority | Registered by |
| --- | --- | --- |
| Official `AppFrame` | `0` | upstream `ui-layout` |
| Workbench | `-1000` | `apps/dcode-ui/src/client/index.ts` |

Priority does not decide *which* surface shows — the mode does, and each surface
registers only for its own mode. The numbers matter only in the instant one
registration replaces another, and the gaps between them leave room for a
further surface without renumbering.

The alternative — serving two applications, or reconfiguring the host plugin
graph per surface — would have meant a Runtime restart per switch and two
copies of every piece of session state. Both instead read the same
`ctx.sessions`, `ctx.workspaces`, `ctx.uiConversation`, projections and Remote
namespaces, so:

- switching never restarts the Harness or drops the Host connection;
- a task started in one surface is already present in the others;
- a streaming turn keeps streaming across a switch;
- settings, theme and language are one set of values, not three.

## The mode is one object, owned by one package

`@dsh-portable/ui-mode` owns the vocabulary, the store, and the switch.

It exists as its own package for two reasons. The Electron main process must
know the mode names without depending on any one front end; and each surface is
separately bundled, so if each created its own store they would not *be* one
store — `set()` notifies only its own listeners, the `storage` event does not
fire in the document that wrote it, and two of them would race to rewrite the
address bar. The package publishes a Cordis client service, `ctx.uiMode`, which
every surface injects.

`UI_MODES` is **presentation order**, not a list of alternatives. Every switch
renders it directly, so a surface appears in the same position everywhere and
adding one means adding an entry and its copy — never editing a switch.

### A surface announces itself

A build can omit the Workbench. Either way the mode must stop being offered, or
an operator selects a name and gets the official UI with no explanation.

So availability is not a claim about a build; it is evidence from it. Each
surface calls `ctx.uiMode.announce(mode)` from its own plugin body, which runs
only once every service it injects resolved. A row that was never mounted never
announces, and `available(mode)` is false for exactly the builds where that
surface cannot render. `official` needs no announcement: it is upstream's own
shell, and it is what renders whenever no extension surface holds `root`.

An unavailable surface stays **listed and disabled** rather than hidden — a name
that silently disappears reads as a bug in the switch, a greyed one reads as a
build that omits it — and a stored preference for one draws a line saying which
surface is actually on screen. The page reports the available set to the
Electron shell over the `desktop:ui-mode` channel, so the application and tray
menus grey out the same entries; until the page reports, the menus offer
everything, because greying the whole submenu during every launch would be
worse than a moment of optimism.

## Selecting a surface

| Entry | Where |
| --- | --- |
| Application menu | `DeepSeek Harness ▸ Interface ▸` |
| Tray menu | the same submenu |
| Official settings | Settings ▸ General ▸ Interface |
| Workbench settings | Settings ▸ Appearance ▸ Interface |
| URL | `?view=official` / `?view=dcode` |

Resolution at boot, highest first: URL parameter → browser `localStorage` → the
desktop config's `uiMode` field → `dcode`.

The switch row inside official settings is registered by `@dsh-portable/ui-mode`
rather than by a surface. Two surfaces each registering their own would put two
switches on one page, and a surface that failed to load would take the ability
to leave it along with it.

The desktop shell stamps `?view=<mode>` onto the harness URL it loads, records
the selection in `config.json`, and keeps its menus ticked from `UI_MODES`. A
switch made inside the page reports back over the `desktop:ui-mode` IPC channel
so the next cold launch opens the same surface.

## What each surface is for

**Official** is the reference. It is always present, because the others shadow
it and any of them failing to load leaves it rendering.

**Workbench** is conversation-first: a session list, a transcript, and panels
for git, goals and progress around it. It is the default because it is the right
shape for one person working one task.

The Workbench is the DCode-native Agent workspace: a conversation rail, a
center transcript/composer, and an Inspector for changed files, goals, plans,
tool activity, and direct subagents. It keeps the same DSH session, projection,
permission, and Remote owners while presenting them in DCode's acrylic style.

## Capability boundary

Each surface reuses DSH capabilities wherever they exist and adds host-side code
only for what DSH does not own:

| Surface | Host-side addition |
| --- | --- |
| Workbench | version control, as the `/dcode` Connection RPC channel (`git/status`, `git/diff`, `git/branches`, `git/commit`, `git/undo`, `file/read`) |
| Both | none — `@dsh-portable/session-manager` claims nothing on the host; the archive set and the usage projections are already the Workspace and Session controllers' own state |

The Workbench deliberately does **not** reimplement the settings catalogue.
`settings.section` has exactly one declarer, so its settings route keeps the
official pages as the source of truth while the Agent workspace owns only its
presentation and orchestration controls.

### Community pages

Plugin installation, Workshop, archive management and the standard usage page
are provided by the bundled `@linxin666/dsh-web-all`. DCode links to the
standard interface for these operations. Its usage cards retain their own
presentation through `@dsh-portable/session-manager`; no portable archive
controller or second marketplace implementation remains.

See [architecture-layers.md](architecture-layers.md) for the retained capabilities.

Learning mode remains a first-class surface in the workbench rail, driving the
existing Interactive Learning pack through the same `learning` agent preset.
Materials are supplied from the learning conversation; the workbench does not
expose a separate resource or learning library.

## Where the pieces live

| Concern | Location |
| --- | --- |
| Mode vocabulary, store, switch | `packages/ui-mode/` |
| Dependency-free constants for Electron | `packages/ui-mode/ui-mode-contract.cjs` |
| Workbench | `apps/dcode-ui/src/client/` |
| Archive page, usage report, shared folds | `packages/session-manager/` |
| Git/diff/undo host channel | `apps/dcode-ui/src/host/` |
| Plugin-graph insertion | `apps/runtime/src/packaged-bin.ts` |
| Desktop config field | `apps/desktop/src/config-store.cjs` (`uiMode`) |
| Menu, tray, IPC, URL stamp | `apps/desktop/src/main.cjs` |
| Renderer bridge | `apps/desktop/src/desktop-preload.cjs` |

---

## 中文摘要

本发行版在同一个 DSH Runtime 之上提供两套前端：**官方版**（保持原样的上游界面）
与默认的**工作台**（`@dsh-portable/dcode-ui`）。二者互不为分支，选择其一也不会移除另一套。

切换机制只有一句话：DSH 浏览器外壳只渲染一个 ctx 级插槽 `root`，官方 `ui-layout`
以 `AppFrame` 占据它；`root` 是 `single` 插槽，后注册者以更低的 `priority` 遮蔽前者。
工作台占 `-1000`，只在被选中时注册。优先级并不决定
**显示哪一套**——那由模式决定——它只在一次注册替换另一次的瞬间起作用。

因此切换不重启 Harness、不断开 Host 连接、不复制任何会话状态：两套界面读取同一份
`ctx.sessions`、`ctx.workspaces`、`ctx.uiConversation`、projection 与 Remote 命名空间。

模式本身由 `@dsh-portable/ui-mode` 独立拥有：Electron 主进程需要在不依赖任何一套
前端的情况下知道模式名；而各前端是分别打包的，若各建各的 store 就不是**同一个**
store。该包以 Cordis 客户端服务 `ctx.uiMode` 发布，各前端注入使用。`UI_MODES` 是
**展示顺序**，每个切换控件直接渲染它，新增一套界面只需加一项与文案。

一套界面是否**可用**不是构建的自述，而是构建给出的证据：每套前端在自己的插件体内调用
`ctx.uiMode.announce(mode)`，而插件体只有在它注入的所有服务都就绪后才会运行。工作台插件
没有加载时它就不会运行，因此 `available('dcode')` 为假。不可用的界面**保留在列表中并
置灰**，而不是隐藏——名字凭空消失像是切换控件坏了，置灰才读作「本构建不含它」；若被选中
的界面不可用，还会明说当前实际渲染的是哪一套。该可用集合会经 `desktop:ui-mode` 通道回报
给 Electron，应用菜单与托盘菜单同步置灰。

官方设置里的界面切换行由 `@dsh-portable/ui-mode` 注册，而不是由某套前端注册：
两套前端各注册一次会在同一页出现两个切换控件，而加载失败的那一套还会把
「离开它的能力」一并带走。

能力边界上，工作台以 `/dcode` 通道补齐 DSH 不具备的版本控制；Crew 的 Agent
预设、团队工具与 `crew-dossier` 仍是宿主能力来源，但不再单独占用一套前端。
