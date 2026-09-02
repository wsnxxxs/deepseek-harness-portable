# Swarm mode: mission work on a shared task board

Crew is one backend capability surfaced as a runtime mode and a dossier-backed
workflow. In the user interface the mode is labelled **Swarm mode** (Chinese:
集群模式), while the stable runtime id remains `crew`.

The capability is delivered in two parts that only make sense together:

- an **agent mode** whose runtime composition differs, not just its prompt;
- a **dossier** that gives the board's work something to be grounded in.

## The mode

`crew` is a peer of `standard`, `ptc`, `minimal` and `cordis`, defined in
`apps/runtime/config/agent-presets/crew/`. What makes it a different mode is the
composition, not the persona:

| | Standard | Swarm (`crew`) |
| --- | --- | --- |
| Delegation | continuable children via `tool-subagent-control` | named durable teammates via `tool-agent-team` |
| Coordination | none beyond the parent's own turn | a shared task board with dependencies and write scopes |
| Subagent lifetime | `continuable` | `one-shot` |
| Cross-session recall | — | `tool-session-query` |
| Attached material | — | `dossier_map` / `dossier_read` / `dossier_search` |

The Team topology is intentionally flat: the Lead owns the user-facing mission
and named teammates are direct reports. “Multi-wave” means that the Lead can
run independent tasks in parallel and release dependent tasks after their
predecessors finish; it does not mean that teammates recursively create more
durable Teams. The ordinary `subagent` rows remain one-shot helpers and are not
substitutes for board-tracked teammates.

### Why the Team service is host-plane

`@deepseek-ai/dsh-experimental-agent-team` provides `agentTeams`, and the
Gateway resolves a `direct` Remote invocation's receiver from the **host**
context (`api/gateway/src/index.ts:776`). A preset `isolate` realm would hide
it, so every browser call would answer `service-unavailable`. A preset row
*without* a realm is refused outright at mount
(`preset/agent-presets/src/mount.ts:391`). There is no third option.

So the service is a row in `apps/runtime/src/packaged-bin.ts` and the preset
contributes only the ten model-facing Team tools, which resolve that host
instance up the scope chain. This is the same rule the repo already applies to
`goals`.

Mounting the service unconditionally, rather than with the mode, keeps
`agentTeams.view(sessionId)` answerable for *any* session: a surface asking
about a non-crew session gets a roster of one and an empty board instead of an
error. Sessions that never mount the Team tools emit no team events, so the
service costs them nothing.

### The three-name collision

`tool-subagent-control` registers exactly `send_message`, `interrupt_agent` and
`list_agents` — the same three names `tool-agent-team` claims with durable-roster
semantics. Because they are **preset** rows in `standard`, omitting them from
`crew` is the entire fix: no host patch, and every other mode keeps them.

`contract.composition.forbiddenRows` in `crew/mode.yml` keeps them out by
contract rather than by comment, so a later edit that reintroduces either fails
compilation instead of silently reassigning three tool names.

Both subagent rows are `one-shot`, keeping lightweight fan-out separate from
durable named teammates. Work worth tracking becomes a teammate and a board
entry instead.

### The alpha dependency, and why it is safe

`agent-team` is upstream `experimental`, pinned here at `0.1.2-alpha.4`. A
future submodule bump could rename or drop it.

`apps/runtime/src/capability-report.ts` therefore probes `crew.agent-team` — can
the package be resolved from this build's runtime closure — and both crew
variants require it. If it disappears, `compileModeCatalog` deletes crew's
`preset.yml` and `agent.cordis.yml`, the mode vanishes from the agent-preset
picker, `mode-resolution.json` records why, **and every other mode still
compiles**.

`reconcileCrewRuntime` withdraws the Host `agent-team` row when the Crew
preset cannot be compiled. The DCode Agent Inspector is the single frontend for
Agent orchestration, so it remains available independently of the optional
Crew preset.

That probe is presence, not effect, unlike every other capability here. Presence
is different in kind: a package either resolves or it does not, and there is no
partially working state to discover by running it.

**Verify it.** Rename `vendor/deepseek-harness/packages/experimental/agent-team`
and reboot. Crew must disappear from the agent-preset roster while the Official
and DCode frontend switch remains usable.

### Tool scoping

`tool-agent-team` installs into every live agent at plugin start
(`for (const agent of ctx.agents.list()) maybeInstall(agent)`), and
`ctx.agents.list()` is not scope-filtered. Without a fix, a `standard` session
already running when the first crew session starts would silently get Team
semantics for three tool names.

`patches/manifest.yml` carries `agent-team-tool-scope-isolation`, which filters
that scan by composed preset. `apps/runtime/src/crew-preset-isolation.test.ts`
reproduces the scenario end to end: a live `standard` agent, then a `crew` agent
mounts, and the standard agent's catalogue must stay clean.

## DCode integration

The DCode Agent Inspector reads the same durable subagent catalog and
`agentTeams` projections that the Crew tools use. It presents direct children,
running state, one-shot/continuable mode, timing, diagnostics, and the option to
open a child as a full conversation. The Inspector is a frontend presentation
of those Host-owned records; it does not create a second team state store.

## The dossier

`packages/crew-dossier`, built on `packages/space-kernel`.

A dossier is a space at `<workspace>/.dossier` — one per workspace, not per
session, because a crew's teammates work the same directory and a spec attached
by the Lead has to be readable by the teammate implementing against it.

The split is deliberate and is the whole design:

- **The model reads.** `dossier_map` returns the real section outline parsed
  from the files; `dossier_read` returns one section's actual words with the
  anchor to cite; `dossier_search` ranks passages through the kernel's lexical
  index.
- **The operator writes.** Attaching runs over the `/crew-dossier` channel from
  DCode's Agent Inspector, on a path the Host builds. A relative path
  resolves against the *mission's* directory, not the Runtime process's, so the
  same text attaches the same file wherever the Harness was launched from.

A space is trustworthy because nothing the model controls decides what goes into
it or where. Giving the model an attach tool would trade that away for
convenience it does not need.

### Degradation is data

Every source reports what the parser could **not** read, in words:
`pages 12, 13 are images with no extractable text`. The panel shows it under the
source, and the tool descriptions instruct the model to repeat it. Silently
answering from a partial read is the failure this subsystem exists to prevent.

### Citations survive re-import

Quotes are anchored by content hash, not line number, so re-importing a revised
document moves anchors that still match, marks the ones that do not, and
recovers ones that reappear. Which records *hold* quotes is not the kernel's
business: consumers register a `ReanchorHook`. The teaching pack registers its
learner memory and concept cards; `crew-dossier` registers its own seam. That is
what lets one ingest pipeline serve surfaces that know nothing about each other.

## The loop

A mission's **board** says what to do and who is doing it. The **brief** says how
far it has got and where the write scopes collide. The **dossier** says what the
crew is working from, with a citation that opens the exact passage.
`session_search` reaches the missions that came before.

Each part is usable alone. Together they are the reason the mode and the surface
are not a reskin: the board needs durable named teammates to be worth sharing,
the surface needs the board to be worth inverting the layout for, and the
dossier is what makes an answer on the board checkable.

---

## 中文摘要

Crew 是一个产品的三个部分：**运行时组合真的不同**的 agent 模式、**以任务而非对话为
主对象**的前端、以及让看板上的工作**有据可依**的资料档案。

模式层面：`agentTeams` 服务必须在宿主面——Gateway 对 `direct` 调用从宿主上下文解析
接收者，preset 的 `isolate` realm 会把它藏起来，而没有 realm 的 preset 行会在挂载
时被直接拒绝，没有第三条路。因此服务是 `packaged-bin.ts` 的一行，preset 只贡献十个
模型面工具。`tool-subagent-control` 与 `tool-agent-team` 撞了 `send_message` /
`interrupt_agent` / `list_agents` 三个名字；由于前者在 `standard` 里是 preset 行，
crew 不写这两行即可，并由 `forbiddenRows` 契约兜底。

alpha 依赖的安全阀是能力探针 `crew.agent-team`：上游一旦移除该实验包，crew 会失去
两个发现文件、从模式选择器消失、在 `mode-resolution.json` 留下原因，而其它模式照常。
`reconcileCrewRuntime` 会撤下 Crew 唯一的宿主依赖 `agent-team`；前端统一由 DCode
Agent 工作台承载。**请实跑验证**：把
`vendor/.../experimental/agent-team` 改名后重启，crew 必须从 agent preset 选择器消失，
而官方版与 DCode 两套前端切换仍然可用。

看板的第四条性质：**传输失败也是失败**。Remote 调用对宿主判定的拒绝返回 `ok: false`，
但连接断开时是 reject；两条臂必须汇入同一行错误提示，否则未捕获的 reject 会让看板
永远停在首次加载。**新建任务**同样受「首个回合后不可改选」约束：`startSession()` 不返回
会话 id，因此预设是**暂存**的，待空白会话成为当前会话时再应用——与官方 seat store 同一条
规则；被拒绝则如实上报，绝不重试。

资料档案的附加路径若为相对路径，按**该任务的工作目录**解析，而非 Runtime 进程的工作目录。

前端层面：看板是**人机共享产物**，操作者拥有与 Lead 相同的动词，写入一律 CAS，冲突
即重载并说明；刷新由持久会话事件推送触发，不轮询；被超越的读取一律丢弃。运行中的
任务只显示模式**标签**，因为首个回合之后 `AgentPresets.select` 会拒绝改选。

资料档案：一个工作区一份，位于 `<workspace>/.dossier`。模型只读，附加由操作者经
`/crew-dossier` 通道完成——空间之所以可信，正因为放什么、放哪里都不由模型决定。
解析不了的部分以人话陈述并要求模型复述；引用按内容哈希锚定，重新导入后仍然有效。
