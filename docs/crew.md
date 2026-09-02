# Swarm mode: mission work on a shared task board

Crew is one backend capability surfaced as a runtime mode and a dossier-backed
workflow. In the user interface the mode is labelled **Swarm mode** (Chinese:
集群模式), while the stable runtime id remains `crew`.

The capability is delivered in three parts that only make sense together:

- an **agent mode** whose runtime composition differs, not just its prompt;
- an **orchestration doctrine** that decides when the extra machinery is worth
  paying for, and what has to travel between agents for it to pay off;
- a **dossier** that gives the board's work something to be grounded in.

## The mode

`crew` is a peer of `standard`, `ptc`, `minimal` and `cordis`, defined in
`apps/runtime/config/agent-presets/crew/`. What makes it a different mode is the
composition:

| | Standard | Swarm (`crew`) |
| --- | --- | --- |
| Delegation | continuable children via `tool-subagent-control` | named durable teammates via `tool-agent-team` |
| Coordination | none beyond the parent's own turn | a shared task board with dependencies and write scopes |
| Subagent lifetime | `continuable` | `one-shot` |
| Fan-out shapes | `subagent`, `subagent_fork` | plus `subagent_scout`, which holds no `write`/`edit` |
| Subagent prompt | inherits the preset persona | a bounded helper persona, because a one-shot child holds no Team tools |
| Subagent depth | `maxDepth` 3 (upstream default) | `maxDepth` 2 — helpers are leaves |
| Cross-session recall | — | `tool-session-query` |
| Attached material | — | `dossier_map` / `dossier_read` / `dossier_search` |
| Persona shape | one paragraph | routed blocks: SHARED, LEAD, TEAMMATE |

The Team topology is intentionally flat: the Lead owns the user-facing mission
and named teammates are direct reports. “Multi-wave” means that the Lead can
run independent tasks in parallel and release dependent tasks after their
predecessors finish; it does not mean that teammates recursively create more
durable Teams — `spawn_teammate` is Lead-only and the service enforces it
(`experimental/agent-team/src/roster.ts`, `TEAM_LEAD_REQUIRED`).

Recursion is available one level down instead, and that is deliberate: a
teammate that needs breadth uses one-shot `subagent` helpers rather than asking
the Lead for another lane. Depth is stamped as parent + 1, so the reachable
shape is Lead (0) → teammate (1) → helper (2), and `maxDepth: 2` refuses the
level below it. The board tracks the durable tier; the helper tier is private to
whoever spawned it.

## The doctrine

The composition gives the model a roster, a board and a mailbox. None of that
makes multi-agent work *better* than one careful agent — it only makes it
possible. What decides the outcome is a handful of judgements no tool schema can
make, so the persona in `crew/agent.cordis.yml` is written to carry exactly
those and nothing else.

Several of the rules below were taken from Moonshot's Kimi Code
(`MoonshotAI/kimi-code`), which solves the same problem with a different
topology: its `AgentSwarm` fans one prompt template over N items from a single
main agent, with no durable roster at all. What transfers is not the topology but
its economics — subagent roles enforced by tool list rather than by request, a
fan-out written once and instantiated so that two identical prompts are a
*detectable* partitioning bug, read-only scopes allowed to overlap, briefings
shaped by whether the task is a lookup or an investigation, and the flat
statement that a subagent's final message is the entire handoff. Where the two
designs disagree they disagree for a recorded reason: Kimi tells a swarm not to
conserve subagents and queues up to 128 of them, while this mode's durable
roster caps at eight. That is exactly why the persona had to pull the two tiers
apart and price them separately instead of adopting one posture for both.

**What the persona does not contain.** `tool-agent-team` registers its own
always-on section at `TEAM_POLICY` (order 600) covering quiet-versus-wakeup
delivery, `queued` durability, `wait_agent` preconditions, the
list/get/claim/complete loop, `FS_STALE_VERSION` rebasing, and the reader's own
role and name. The persona (order 0) restates none of it. A duplicated mechanic
is charged to every member on every request and contradicts upstream silently the
first time upstream edits its copy, so `crew-preset.test.ts` asserts the absence.

**Admission.** Two opposite failures live here, and one sentence has to hold
both off. The upstream policy tells every member to create teammates "only when
the user explicitly asks to use Agent Teams or teammates" — read literally in a
session where the user selected this mode and then said "fix this bug", that is a
standing refusal, and the mode never forms a Team at all. So the persona states
that choosing 集群模式 *is* that ask. The opposite failure is the more common
one: a Team that should never have been formed. The persona therefore defaults to
answering directly and admits fan-out only against a named reason —
**Breadth** (two or more units that can run at once on disjoint write scopes),
**Independence** (the result deserves an opinion from an agent that did not
produce it), or **Reach** (grounding needs more reading than the Lead's context
should carry). The Lead has to say which one applies.

**The delegation economy.** Admission governs the *durable* tier only, and
applying it to the second tier is how this mode quietly degrades into Standard
with extra latency. A roster slot is scarce — eight of them, Lead-only, each
carrying a board task and a name that outlives the turn. A one-shot helper costs
one prompt, returns a conclusion instead of a pile of file dumps, and then does
not exist. So the persona says to be stingy with the first and generous with the
second, and says why: the failure this mode actually produces is not too many
helpers, it is an agent reading the whole repository into its own context and
running out of it halfway through the mission. What follows is a cost test rather
than a taxonomy — delegate when the answer costs more reading than the answer is
worth carrying, do it yourself when it takes a step or two — plus the two ways a
caller throws the saving away after paying for it: re-running the helper's
searches in parallel, and abandoning it mid-flight to finish the job by hand.

**Waves are instantiated, not composed.** A wave is dispatched in one assistant
message, so it runs in parallel rather than in sequence, and it is partitioned by
stating the shape of the work once and then listing what varies across it — the
file, the module, the call site, the question. Two instances that come out with
the same prompt are the signal that the split is wrong, which is Kimi's
duplicate-prompt rejection carried over as a rule the Lead applies to itself.
Two members must never write the same paths; read-only members may overlap,
because two scouts reading one directory cost tokens and not correctness. Where a
wave only reads, the persona says to err toward a finer split and more of them.

**The briefing contract.** A `fresh` teammate knows nothing the Lead knows, so
the quality of a whole lane is decided by one string: the `spawn_teammate`
prompt. The persona states what that string has to answer — what the user
ultimately wants, which board task this is and what done means with the exact
validation command, the ground already covered, the writable paths, and what to
report rather than decide alone — so that what the Lead already learned is handed
over instead of re-derived. The anti-pattern list names the opposite case
explicitly: a teammate re-reading a subsystem the Lead had already mapped because
the briefing left it out.

It is a list of what must be answerable, not a form to fill in, and that
distinction is load-bearing: a lookup and an investigation want opposite prompts.
For a lookup the caller hands over the exact path, symbol or command, because a
helper that has to re-find what the caller already found has bought nothing. For
an investigation the caller hands over the question and the ground covered and
*not* a procedure, because prescribed steps become dead weight the moment the
premise turns out to be wrong. Both share one rule — do not delegate
understanding: if the task turns on one file or one line, find it first and write
it into the prompt. "Length is not thoroughness" is in the text because the
opposite failure, a briefing so detailed the helper has no room left to be
useful, is as real as an empty one.

**The report contract.** The complementary failure is a teammate that narrates
success. Every report leads with `DONE` / `FAIL` / `BLOCKED`, then files changed,
then evidence — the exact command with the verbatim tail of its output, or the
files and lines — then what was *not* done, then residual risk. The Lead is told
it will verify the report, which is what makes an inflated one cost a re-run.

**Reuse before respawn.** A member that already worked an area holds context a
fresh one would have to rebuild, and the roster caps at eight, so work that
continues what somebody already did goes back to that member instead of costing a
slot. The exception is the one case where a blank context is the deliverable, and
it is the next paragraph.

**Independence.** The reviewer is `fresh`, never a fork, and never the
implementer. This is the single move that makes a crew outperform one agent on
correctness rather than only on wall-clock: a reviewer that inherits the
implementer's reasoning inherits its blind spots. `fork` is reserved for the case
where a helper genuinely needs the caller's completed turns.

**Convergence.** The Lead may answer only when every task the answer depends on
is completed or explicitly dropped, every teammate it depends on has reported,
the Lead has read the final diff itself, and real validation output exists for
the claims it is about to make. Relaying teammate reports is named as not being
synthesis.

### Role routing, and why it is in the text

Children join their parent's preset — `applyChildComposition` calls
`agentPresets.composeFrom` — so **one** persona text is read by the Lead, by
every durable teammate, and by every one-shot child. `dsh-persona` accepts static
text, so the split cannot be made by the composition; it is made by the text,
which opens with a routing sentence and three labelled blocks (`SHARED`, `LEAD`,
`TEAMMATE`). The role itself arrives later, in the `TEAM_POLICY` section, so the
persona forward-references it rather than assuming the reader is the Lead.

The routing sentence also covers the case where that section is missing
entirely, and it has two causes worth keeping straight: a one-shot child that
was never a member, and a teammate session reopened as a full conversation after
its Lead is gone — `tryMembership` resolves neither, so both hold no Team tools.
The persona tells such a reader to work the task in front of it and never
describe Team actions it cannot take.

One of those two is worth more than a sentence, and is solved by composition
instead. A one-shot child is not a Team member: `tool-agent-team` installs only where
`agentTeams.tryMembership` resolves, so the child holds none of the ten Team
tools and receives no `TEAM_POLICY` section. Before this change it still read the
full orchestration persona — a delegation manual for an agent that cannot
delegate. All three `tool-subagent` rows now carry a bounded `persona` that
states what the helper is, what it does not have, and the outcome-first reply
shape — including that its reply is the entire handoff, because the caller sees
no other part of its run. Durable teammates are unaffected: `spawnTeammate` starts them through
`subagents.startContinuable` directly rather than through those rows, so they
keep the preset persona and the Team policy section.

### The scout, and what enforcement buys

`subagent_scout` is the third delegation row and the only one carrying a
`toolFilter`: `deny: [write, edit]`. `tools.restrict()` removes both names from
the child's catalog — they never reach its prompt, and a call to either is
rejected — so "a scout never changes files" becomes a property of the child
rather than a request to it. This is Kimi's `explore` profile, which reaches the
same result by listing the tools a read-only subagent may hold.

What the enforcement buys is the sentence above it. Two members must never write
the same paths, but two *readers* pointed at one directory cost tokens and
nothing else, so the Lead is told to split read-only waves finely and let their
scopes overlap — which is the fan-out this mode exists for. That advice is only
safe while a scout structurally cannot write, so `crew-preset.test.ts` treats the
filter as load-bearing rather than as a redundant belt.

The filter names those two tools and not the shell on purpose. The shell row is
variant-selected — `tool-bash` on POSIX, `tool-pwsh` on Windows — and
`tools.restrict()` throws on any name the composition does not register, so a
filter naming both would fail the mount on every target:

```
tools.restrict() names unknown global tools "bash", "pwsh";
known global tools: edit, read, write
```

The scout persona carries the half the filter cannot: the shell is for reading,
and writing through it is not a workaround but the thing this row exists to
prevent. Enforcement here is partial and the doc says so — Kimi's `explore`
keeps Bash for the same reason, since `git log` and `git diff` are most of what a
scout runs.

The ordering this depends on holds by construction rather than by luck.
`applyChildComposition` calls `composeFrom` and then `tools.restrict`, and
`composeFrom` is synchronous and mounts nothing — it binds the child's scope key
to the standing preset mount — so `write` and `edit` are already resolvable
through the scope chain at the moment the filter is applied. Verified against a
live context: a parent on this preset sees `edit, read, write`, and a child
composed and filtered the way `applyChildComposition` does it sees `read`.

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

The doctrine is what keeps the loop from being *worse* than one careful agent.
Fan-out buys parallelism, independent judgement, and reach, and it charges
coordination, duplicated reading, and a synthesis step that can launder
unverified claims. The persona spends its budget on exactly those four exchange
rates: admit fan-out only against a named reason, hand over what you already
learned so a lane does not re-derive it, take back evidence rather than
narration, and do not answer until the diff and the validation output are in
front of you.

**How to tell whether the mode is earning its keep.** Watch for the failure
shapes the anti-pattern list names, because each has a visible signature in a
transcript: a Team formed for a question; a teammate whose brief contains no file
paths; a wave started before the previous wave's reports were read; a `DONE` with
no command output in it; a reviewer spawned with `context: fork`; two tasks whose
`writeScopes` overlap; a final answer written while `list_agents` still shows a
required member `running`. Any of those means the mode is paying multi-agent
costs for single-agent quality.

Two more belong to the delegation economy rather than to the board, and they are
the ones this mode failed on most often before the redesign: a Lead that read
thirty files into its own context and started no helper at all, and a "wave"
containing exactly one member. Both look like diligence in a transcript. Both are
Standard mode wearing a roster.

---

## 中文摘要

Crew 是一个产品的四个部分：**运行时组合真的不同**的 agent 模式、决定「这套机器什么
时候值得开动」的**编排准则**、**以任务而非对话为主对象**的前端、以及让看板上的工作
**有据可依**的资料档案。

编排准则：组合只提供名册、看板和信箱，它让多 agent**成为可能**，但并不让多 agent
比一个认真的 agent**更好**。真正决定结果的是工具 schema 无法替你做的判断，因此
persona 只承载这些判断，不承载别的：

下列若干条规则取自 Moonshot 的 Kimi Code（`MoonshotAI/kimi-code`）。它用另一种拓扑解
同一个问题：`AgentSwarm` 由单个主 agent 把一份 prompt 模板扇到 N 个 item 上，完全没有
持久名册。可迁移的不是拓扑而是它的**经济学**——子 agent 的角色由工具清单强制而不是靠
嘱咐、扇出「写一次再实例化」使两条相同的 prompt 成为**可检测**的切分错误、只读范围允许
重叠、交底按「查已知」还是「查未知」分成两种写法，以及「子 agent 的最后一条消息就是全部
交接」。两套设计不一致的地方也各有其理由：Kimi 明确要求 swarm **不要节省** subagent（最多
排队 128 个），而本模式的持久名册上限是 8。这正是 persona 必须把两层拆开、分别定价，而
不是对两层采用同一种姿态的原因。

- **不重复上游机制。** `tool-agent-team` 自己在 `TEAM_POLICY`（order 600）注册了
  常驻段落，涵盖静默/唤醒投递、`queued` 的持久性、`wait_agent` 前置条件、
  list/get/claim/complete 循环、`FS_STALE_VERSION` 重放，以及读者自己的角色与名字。
  persona（order 0）一条都不复述：重复的机制要由每个成员在每个请求上买单，而且上游
  一改自己的副本就会无声地互相矛盾。`crew-preset.test.ts` 断言这份「缺席」。
- **准入。** 这里有两个方向相反的失败，要靠一句话同时挡住。上游 policy 要求「只有用户
  明确要求使用 Agent Teams 或队友时才创建队友」——在一个用户已经选了本模式、然后只说
  「修一下这个 bug」的会话里，照字面读就是**永远不组队**，模式因此彻底失效；所以 persona
  明确写出：选择 集群模式 本身就是那个「明确要求」。另一个方向、也更常见的失败，是
  **本就不该组建的队伍**。因此 persona 默认直接作答，只有在能说出理由时才允许扇出：**Breadth**（两个以上单元可在
  互不相交的写入范围上同时推进）、**Independence**（结论值得一个没有参与产出的 agent
  给意见）、**Reach**（打底所需的阅读量超过 Lead 自己的上下文该承担的）。
- **委派经济学。** 准入只管**持久**那一层；把它套到第二层，正是本模式悄悄退化成
  「标准模式 + 额外延迟」的原因。名册席位是稀缺的——共 8 个、只有 Lead 能开、每个都带
  看板任务和一个跨回合存活的名字；而一次性 helper 只花一条 prompt，回来的是结论而不是
  一堆文件转储，然后就不存在了。所以 persona 明写：**对前者吝啬，对后者慷慨**，并给出
  理由——本模式真正会犯的错不是 helper 开太多，而是一个 agent 把整个仓库读进自己的
  上下文，然后在任务过半时耗尽。随后给的是**成本判据**而不是分类法：当答案所需的阅读量
  超过这个答案值得占用的篇幅时就委派，一两步能做完的自己做；并点名两种「付了钱又把
  节省丢掉」的做法——并行重跑 helper 已经在做的检索，以及中途弃用它、自己接手做完。
- **波次是实例化出来的，不是逐条撰写的。** 一个波次在**同一条**助手消息里发出，才是
  并行而不是串行；切分方式是把工作的形状写一次，再列出其中变化的部分——文件、模块、
  调用点、问题。两个实例得到相同的 prompt，就是切分方式错了的信号——这正是 Kimi 的
  「重复 prompt 直接拒绝」被移植成 Lead 自查的规则。两个成员绝不写同一批路径；只读成员
  **可以**重叠，因为两个 scout 读同一个目录只浪费 token，不影响正确性。若一个波次只读，
  persona 要求宁可切得更细、开得更多。
- **交底契约。** `fresh` 队友对 Lead 知道的一切一无所知，一整条工作线的质量因此由
  `spawn_teammate` 的那一个字符串决定。persona 规定了这个字符串必须能回答什么——用户
  最终想要什么（一句话）、这是哪个看板任务、「完成」的可核对定义与确切验证命令、已经
  覆盖过的线索（文件、符号、既有发现、资料档案锚点、约定）、可写路径、以及哪些事必须
  回报而不能自行决定——目的是把 Lead 已经学到的东西**交出去**，而不是让队友重新学一遍。

  它是一份「必须答得上来」的清单，而不是一张待填表格，这个区别是承重的：**查已知**和
  **查未知**要的是相反的 prompt。查已知时，调用者直接交出确切的路径、符号或命令——让
  helper 重新去找调用者已经找到的东西，等于什么也没省下；查未知时，交出的是**问题**和
  已覆盖的线索，而**不是**步骤，因为一旦前提被推翻，规定好的步骤就变成了负担。两者共享
  一条规则：**不要把「理解」委派出去**——如果任务取决于某个文件某一行，先自己找到它，
  再写进 prompt。文本里写了「篇幅不等于周全」，因为相反方向的失败——交底细到 helper
  没有发挥余地——和交底为空一样真实。
- **回报契约。** 对称的失败是队友把「叙述」当成「结果」。每份回报以
  `DONE` / `FAIL` / `BLOCKED` 开头，随后是改动的文件、证据（原样的命令与其输出末尾，
  或支撑结论的文件与行号）、**没做的部分**及原因、以及残留风险。persona 明确告诉队友
  Lead 会去核对，虚报换来的是重跑而不是通过。
- **复用优先于重开。** 已经做过某个区域的成员，手里有新成员需要重建的上下文，而名册
  上限只有 8；因此延续别人做过的工作应当交回给那个成员，而不是再占一个席位。唯一的
  例外是「空白上下文本身就是交付物」的情形，也就是下一条。
- **独立性。** reviewer 必须 `fresh`，绝不 fork，绝不由实现者兼任。这是让集群在**正确性**
  而不只是墙钟时间上胜过单 agent 的那一步：继承了实现者推理的 reviewer，同时继承了它的
  盲区。`fork` 只留给「helper 确实需要调用者已完成回合」的情形。
- **收敛。** Lead 只有在下列条件全部成立时才能作答：答案依赖的每个任务已完成或被明确
  放弃、依赖的每个队友都已回报、Lead 亲自读过最终 diff、要下的每个结论都有真实的验证
  输出。转述队友的回报不算综合。

**角色路由**：子 agent 会加入父级 preset（`applyChildComposition` 调用
`agentPresets.composeFrom`），所以**同一份** persona 会被 Lead、每个持久队友和每个
一次性 helper 读到；而 `dsh-persona` 只接受静态文本，拆分只能写在文本里——开头一句路由
指引加上 `SHARED` / `LEAD` / `TEAMMATE` 三个带标签的段落。角色本身在更靠后的
`TEAM_POLICY` 才出现，所以 persona 前向引用它，而不是假定读者就是 Lead。

有一种情况文本解决不了，只能由组合解决：一次性子 agent **不是**队伍成员，
`tool-agent-team` 只在 `agentTeams.tryMembership` 能解析的地方安装，因此它既没有那十个
Team 工具，也收不到 `TEAM_POLICY`。在此之前它却照样要读完整份编排 persona——一份发给
「无法委派者」的委派手册。现在三个 `tool-subagent` 行各自带一份有界 persona，说明它是
什么、没有什么、以及「结论先行」的回复格式，并明确「你的回复就是全部交接：调用者看不到
你这次运行的任何其它部分」；`maxDepth: 2` 把同一句话写成结构：
深度按父级加一标记，Lead 为 0、队友或 Lead 的 helper 为 1、队友的 helper 为 2，再往下
会被拒绝，也就是「helper 是叶子」。持久队友不受影响——`spawnTeammate` 直接走
`subagents.startContinuable`，不经过这两行，因此保留 preset persona 与 Team policy。

递归只开放这一层，而且是刻意的：需要广度的队友用一次性 `subagent` helper 自行铺开，而
不是回头向 Lead 要一条新工作线；看板只跟踪持久那一层。

**scout 与「强制」买到了什么。** `subagent_scout` 是第三个委派行，也是唯一带
`toolFilter` 的一个：`deny: [write, edit]`。`tools.restrict()` 会把这两个名字从子 agent
的工具目录里移除——它们根本不出现在其 prompt 里，调用会被直接拒绝——于是「scout 从不
改文件」成为子 agent 的**属性**，而不是对它的**嘱咐**（对应 Kimi 的 `explore` profile，
后者用「只列出只读工具」达到同一效果）。这条强制买到的正是它上面那句话：两个成员绝不
写同一批路径，但两个**读者**指向同一个目录只是多花 token；所以 persona 才敢让 Lead 把
只读波次切得更细、并允许范围重叠——而这正是本模式存在的意义。因此
`crew-preset.test.ts` 把这个 filter 当作承重件而不是多余的保险。

filter 只点名这两个工具、不点名 shell 是有意的：shell 行由变体选择（POSIX 用
`tool-bash`，Windows 用 `tool-pwsh`），而 `tools.restrict()` 对组合中未注册的名字会抛错，
所以同时点名两者会在**所有**目标上挂载失败（`tools.restrict() names unknown global
tools "bash", "pwsh"`）。filter 管不到的另一半由 scout persona 承担：shell 只用于读取，
绕过去写文件不是变通，正是这一行要防的事。这里的强制是**部分**的，文档如实写明——
Kimi 的 `explore` 保留 Bash 也是同一个原因：`git log`、`git diff` 本就是 scout 的主要
动作。

顺序上的依赖是构造性成立的：`applyChildComposition` 先调 `composeFrom` 再调
`tools.restrict`，而 `composeFrom` 是**同步**的且不挂载任何东西——它只把子 scope key
绑到常驻 preset 挂载点上——所以施加 filter 时 `write` / `edit` 已经能沿 scope 链解析。
已实跑验证：本 preset 上的父 agent 看到 `edit, read, write`，按 `applyChildComposition`
的方式组合并过滤后的子 agent 只看到 `read`。

**怎么判断这套机器有没有挣回成本。** 除了看板层面的失败特征（为一个问题组队、交底里
没有任何文件路径、上一波的回报还没读就开下一波、`DONE` 里没有命令输出、reviewer 用
`context: fork` 开出、两个任务的 `writeScopes` 重叠、依赖的成员还在 `running` 就给出
最终答案），还有两个属于委派经济学、也是本次重构前最常出现的：Lead 把三十个文件读进
自己的上下文却一个 helper 都没开，以及一个只有单个成员的「波次」。这两种在对话记录里
都很像勤勉，实际上都是披着名册的标准模式。

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
即重载并说明；被超越的读取一律丢弃。运行中的任务只显示模式**标签**，因为首个回合
之后 `AgentPresets.select` 会拒绝改选。刷新目前是面板打开时每 5 秒轮询一次
（`ClusterPanel.tsx`），不是会话事件推送——这是已知的待改项，不是设计意图。

资料档案：一个工作区一份，位于 `<workspace>/.dossier`。模型只读，附加由操作者经
`/crew-dossier` 通道完成——空间之所以可信，正因为放什么、放哪里都不由模型决定。
解析不了的部分以人话陈述并要求模型复述；引用按内容哈希锚定，重新导入后仍然有效。
