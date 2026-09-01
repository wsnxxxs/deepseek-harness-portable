# DCode UI 全面分析：UX / 相对官方 DSH WebUI 的缺失 / 逻辑缺陷与优化方案

- 日期：2026-08-30（当前工作树，含当日全部提交）
- 方法：apps/dcode-ui 全源码核对 + 官方 node_modules/@deepseek-ai/dsh-client-ui-* 源码盘点 + 真实 git 行为实验 + 截图复核
- 定位：白天产品审计（audit/dcode-ui-review-2026-08-30）之后的二轮深度审计；不再复述已修复项

---

## 0. 结论

DCode 功能广度已全面超过官方 WebUI：Git/Staging/Diff/撤销、命令输出、命令面板、插件市场（含审阅门控）、学习、统计、队列控制、消息反馈均形成工作台优势，且布局自适应、无轮询、面板记忆、键盘支持优于官方。

当前风险排序：**权限审批不可见（安全敏感）> 撤销的隐性数据风险（已用真实 git 实验证实）> 若干状态诚实性问题（就绪误报、删除静默、cwd 基座不一致）> i18n 残留与输入体系与官方的能力差**。

---

## 1. UI/UX 问题

### 1.1 中文界面残留英文
1. 推理卡头硬编码：Transcript.tsx L143-144 / L184 直接拼接 Thinking (Xs)… / Thought for Xs · N tokens，未走 t()，而 locales 已有 chat.thinking / chat.reasoning 键。中文界面下这两处是英文。
2. 消息导航轨书签按钮：MessageNavRail.tsx L164-166 的 aria-label / title 恒为 Remove bookmark from / Bookmark turn / Remove bookmark（英文）；tooltip 里还有 t(key) || Changes / Click to jump / Bookmarked 英文兜底。屏幕阅读器与悬停均见英文。
3. 输入占位文案与实现不符：composer.placeholder 承诺「/ 调用指令 @ 文件或对话」（locales.ts zh L1066），但 @ 菜单只有 文件/技能/命令（Composer.tsx L317-341），无会话候选。
4. 技能与命令分类不一致：技能放在 @ 菜单且 value 写成 /name（Composer.tsx L335），官方将技能放在 / 菜单；两套菜单心智成本。

### 1.2 非 git 工作区噪音与刷新开销
1. TopBar.tsx L143-155：非 git 仓库时顶栏仍显示「不是 git 仓库」chip（与 SummaryCard 文案重复）。
2. 每个工作区组头各自发起 git status（LeftRail.tsx L123），窗口 focus 时全部刷新（useGit.ts L213-218）；多仓库工作区切窗 = N 个 git 子进程。

### 1.3 左栏
1. 状态圆点 aria-hidden（LeftRail.tsx L71-75），读屏不可知运行/完成/空闲（官方行内有 SR 状态文本）。
2. 无 hover 信息卡（官方有标题+路径+时间+复制）；无视图选项（官方：按工作区/单列表 + 排序）；无拖拽重排；组内 >5 条无「展开其余 N 个」溢出折叠（左栏仅整组折叠）；搜索仅匹配标题/路径（官方附带内容搜索降级）。
3. 会话行无 aria-current/aria-selected，当前任务只靠样式。

### 1.4 右栏
1. Details 面板无「跳回 transcript 对应工具卡」入口（命令输出 tab 有 locate，Details 没有）。
2. 命令输出 tab 对每个运行中块每秒 setInterval（Aside.tsx L313-317），多命令并行时批量重渲；建议节流至仅更新头部。
3. 打开详情面板与卡片展开同一次点击触发（ToolCard.tsx L100-103 的 onClick 同时 setOpen + onInspect）：只想展开卡片时却被切到 details tab。

### 1.5 模型选择器
只有名称+勾选；无上下文窗口/视觉/费用/实验/凭据标识（ModelSelect.tsx L326-351）。就绪卡要求用户能判断模型可用性，这里却给不出原因。

### 1.6 键盘/焦点
1. 全局 Ctrl+N/Ctrl+O/Ctrl+B/Ctrl+K 在模态/对话框打开时仍生效（Workbench.tsx L493-538 只豁免 palette）：重命名/删除/风险确认弹层内按 Ctrl+N 会新建任务。
2. LeftRail 重命名/删除/移除四个 Modal 直接用 ui-primitives Modal（未套 useModalFocus），无焦点圈闭与焦点归还。
3. 左栏搜索框 ArrowUp/Down 切换会话（LeftRail.tsx L366-374）无 activedescendant/无选中高亮，易误触。

### 1.7 首次可用性与视觉
1. ReadinessCard 的 x/4（Workbench.tsx L154-159）按固定 4 项计，实际仅 2-3 项可同时出现，数字失真。
2. 无工作区时「新建任务」不传 workspaceId（Workbench.tsx L378-382），依赖 host 兜底。
3. 工作区组头与会话行视觉重量几乎相同；组头 badge+3 按钮在 240px 宽度拥挤；900px（medium）下顶栏 chip 与标题同排被截断，无宽度降级策略。

---

## 2. 相对官方 DSH WebUI 缺失的功能（源码核实）

### 2.1 输入/提及体系
| 能力 | 官方 | DCode |
| --- | --- | --- |
| @ 提及 | 文件+**会话**候选、文件夹 drill（Tab/面包屑）、引号搜索、按工作区亲和排序 | 仅文件（12 条）+技能/命令；无会话、无 drill、无引号 |
| / 命令 | 前缀/边界 fuzzy + 参数槽 popup（PopupSelectView：搜索框/幽灵提示/RiskConfirmation）+ 空格裁决 | 名称包含匹配；无参数 popup、无空格裁决 |
| 技能 | / 菜单 + SkillRow（replay 稳定、展开、inspect） | @ 菜单；工具卡为通用 ToolCard |
| 附件 | 整页拖放（带 overlay/禁用态）+ 粘贴文件 + 预检（数量/大小/类型 toast）+ 重试 | 仅 composer 区域拖放 + 粘贴仅图片；无预检提示、无重试 |
| 发送约束 | 命令不接受图片时保留草稿并提示 | 走官方 input 管线（行为与官方一致） |

### 2.2 对话/会话级能力（官方有，DCode 无）
1. **权限审批面板（最严重）**：官方 ui-approval 经 `conversation.composer` chain 槽的 takeover（select: PendingApproval）渲染 ApprovalPanel（拒绝/允许一次）；DCode 的 Composer 不渲染该槽，且 usePendingQuestion 只识别带 questions 的交互（hooks.ts L112-119）。**agent 的权限请求在 DCode 下没有任何 UI**：请求挂起到 host 超时或被静默放弃——权限门控工具要么长时间无响应要么报错。这是当前最重要缺口（安全相关）。
2. **消息反馈备注**：官方 Like/Dislike 之外还有备注 popover（保存/删除/失败重试）；DCode 只有打分（Transcript.tsx L455-461）。
3. **消息时钟行**：官方有 ran-for / TTFT / tok / s 统计行；DCode 在推理卡显示 Thought for Xs · tokens，无 TTFT/ran-for。
4. **Goal 操作**：官方 GoalBar 支持 resume / 内联编辑（Enter 保存/Esc 取消）/ 清空；DCode GoalPanel 只读（Aside.tsx L64-129）。
5. **计划模式**：官方 PlanChip 按 plan 投影（pending 激活）点击退出计划模式；DCode PlanCard 只是 todo 清单，无计划模式进入/退出控件。
6. **后台任务宿主**：官方会话头部有 jobs 按钮（live 计数+时长列表）；DCode 无任何 jobs/workflow-run 面板（命令输出 tab 只是脚本输出聚合）。
7. **子代理**：官方有 lineage 后代树（头部）+ 只读 composer；DCode 无 subagent 树（settings 里仅扁平只读表）。
8. **交付物 chips**：官方 turnTail 文件 chips（≤6+N，点击打开）；DCode 的 FileChanges 卡是该能力的超集（更好），保留。
9. **轨迹视图**：官方 Trajectory 完整时间线（耗时模式/折叠/ledger 搜索/inspector）；DCode 仅 SummaryCard 最近 8 条 + 详情面板子集，无轨迹搜索。
10. **会话行菜单**：官方有 分叉/重命名/归档/删除 + hover 卡；DCode 行菜单只有 重命名/归档/删除（分叉仅在 assistant 消息卡上）。
11. **拖放重排**：官方会话/工作区可拖拽排序（含跨组）；DCode 无。
12. **连接状态**：官方与 DCode 都没有 reconnecting 指示（共同缺口，DCode 可做成差异点）。

### 2.3 设置与外壳
- 官方设置可「打开配置文件」（loopback）；DCode 无。
- DCode 设置 rail 有 mcp/skills/commands/memory/browser/computer 分节，但 memory/browser/computer 只是只读 JSON dump + 跳官方编辑器按钮（SettingsSurface.tsx L1263-1303），mcp 只有只读库存过滤（PluginSettingsSection mcpOnly），**无 MCP server 增删改入口**。
- 官方设置/外壳中的扩展点生态：DCode root 接管后，官方 conversation.header / conversation.input.* / composer slots 的第三方注入全部不再渲染（数据仍共享）。对插件生态不可见但存在。

---

## 3. 功能逻辑不完善（incomplete）

1. 分支只读：GitPanel L429-447 只能看，不能 切换/新建/删除。
2. 提交前无 staged 摘要确认：仅前 2 文件名 + +N（GitPanel L319-321）。
3. 撤销无预览：确认弹窗不列将恢复/隔离的文件。
4. 命令输出无「重跑」；无「复制并重跑」。
5. 学习与任务未闭环：无法从当前仓库/错误生成概念卡或学习路线。
6. 左栏组折叠状态不持久（LeftRail.tsx L193 useState 初始空集）。
7. 设置页无搜索（DCode 设置分节多于官方，更应做）。
8. 插件生命周期闭环：启用/禁用只改 profile，卡片要手动重启+刷新才更新暴露状态；无「重启后自动恢复」提示（官方亦如此，但 DCode 的 lifecycle 条更容易让用户误解为已生效）。

---

## 4. 功能逻辑不正确（incorrect / risky）

### 4.1 [高] 权限请求无 UI（见 2.2#1）
安全敏感：approval/request 被 ui-approval 消费注册 PendingApproval，但 DCode 不渲染任何审批入口，请求挂起到宿主取消/超时。

### 4.2 [高] 回合撤销会「删除」新建且已暂存的文件（真实 git 实验证实）
undoPaths（host/git.ts L546-553）用 `git restore --staged --worktree --source=HEAD -- <path>`：对「新建后 stage、HEAD 无此路径」的文件，实测 exit=0 且**文件从工作区消失**（既不在 index 也不在 worktree，且无 .dsh/dcode-undo 恢复副本——只有 untracked 分支才做隔离副本）。outcome 报 restored（成功）。
- 触发路径：新建文件 → GitPanel 暂存 → 回合撤销。**数据不可恢复**（除非 git 对象还在）。
- 修复：tracked 分支先判断 `git cat-file -e HEAD:path`，不存在则走 quarantine 分支（复制到 .dsh/dcode-undo 再 restore/删除）。

### 4.3 [中] 未跟踪文件的 hunk 反向撤销语义不一致
untracked 的 diff 头为 `--- /dev/null` + `+++ b/new.txt`（实测）；undoHunk 校验会通过（`+++ b/path` 匹配），随后 `git apply --reverse` 将**新建文件从工作区删除**（副本已存 .dsh/dcode-undo）。这与整路径 undo 的「移入隔离目录」语义不一致，且 DiffViewer 的 revert 按钮对纯新增文件无任何警示。

### 4.4 [中] 工作区=仓库子目录时路径基座错位
readStatus 的 porcelain 行是 **repo-relative**（`?? sub/two.txt` 实测），而工具写入路径是 **cwd-relative**；countsFor（FileChanges.tsx L52-64）只按 cwd 前缀裁剪，不换算到 repo root → 行数恒 0；host 侧 undo/stage 用 containedRelativePath(root, path) 解析 cwd-relative 路径会指向 **repo 根下的同名文件**（不触发 escape 检查，静默操作错误对象）。

### 4.5 [中] 就绪误报
readiness.ts L40-41：选中 provider 不在设置行清单时直接返回 model/credential=ready；已失效 provider 被就绪卡与发送门禁误报可用，发送后才失败。

### 4.6 [中] 删除会话失败静默
LeftRail.tsx L534-542 `.catch(() => {})`：失败无提示、弹窗滞留。

### 4.7 [中] GitPanel 全部暂存按钮计数与作用域不一致
GitPanel.tsx L336-342：组头计数用过滤后的 files，但「全部暂存/取消暂存」作用于全量 allFiles；搜索/筛选激活时点它，结果与显示不符。

### 4.8 [中] 发送按钮与键盘 Enter 的 busy 行为不一致
键盘按 busyEnter 偏好（queue/steer），发送按钮硬编码 send('queue')（Composer.tsx L899-908）。

### 4.9 [中] 附件移除的释放时序
Composer.tsx L456-462：removeImage 后查 state 决定 release，异步下可能漏释放。

### 4.10 [中] 自更新与插件卡同 key 竞态
useJob.ts L147-178 + PluginsHome/InstalledSection 共用 self.name 作 key：两处先后点击会启动两个 job 各自轮询，先结束者写回 done。

### 4.11 [低] 其他
- LearningHome 开场 prompt：sessions.open 后立即 binding，绑定未就绪则静默丢失（L129-133）。
- DirectoryPicker 无请求序号守卫，快速连点路径 crumb 可能覆盖结果（L57-76）。
- Reasoning 计时以组件挂载为起点（Transcript.tsx L126）。
- selectModel 桥接用 querySelector 点击（Workbench.tsx L483-485）。
- locales 死键：git.collapse / git.filterModified / git.filterUntracked / git.unstaged（en+zh 8 条无引用）。
- 字号边界 11/22 在 SettingsSurface.tsx L185,193 与 theme.ts 重复硬编码。

---

## 5. 性能与可访问性

- ToolCard/CommandOutputEntry 对运行中块 100ms/1000ms setInterval；并行多命令时批量重渲。
- Transcript 每个节点变更 useLayoutEffect 强制 scrollTop=scrollHeight（L795-799）。
- GitPanel 树虚拟化已做（914e3d3），1000+ 文件待压测；会话搜索 O(组*会话)。
- a11y 弱点：UsageCards 范围 radio 无方向键切换；Market/Plugin 的 role=tab 无 roving tabindex；ContextMeter 用 role=dialog 呈现 popover；SummaryCard 非按钮行 role=note tabIndex=0；Popover/SelectMenu 无 activedescendant。

---

## 6. 优化方案

### P0（本周：正确性与安全）
1. **审批接入**：在 DCode 中渲染 PendingApproval——优先复用官方 ApprovalPanel（把 conversation.composer 链槽或 PendingApproval store 直接挂进 DCode 的 Composer/Transcript 区），至少提供 拒绝/允许一次 + 理由 + 超时提示。上线前必须验证。
2. **撤销安全修复**：undoPaths 对「HEAD 无该路径」的 tracked 文件改走 quarantine；undoHunk 对纯新增文件禁用或加「将删除文件（副本已保存）」提示；单元测试用真实 git 仓库覆盖三个分支。
3. **路径基座统一**：status/diff/undo 全部以 repo root 为唯一基座；FileChanges 把 cwd-relative 转 repo-relative（先 workTreeRoot 再换算）；GitPanel 显示路径保持一致。
4. **就绪兜底**：provider 未命中 → missing + 引导去设置。
5. 删除/移除/重命名 Modal：补错误展示与焦点圈闭（useModalFocus）；LeftRail 删除失败显示。
6. 全局快捷键在任意对话框打开时挂起。
7. i18n：Reasoning/Thinking、MessageNavRail 书签与 tooltip 全部走 t()；占位文案改为「文件+技能」或立即补 @会话。

### P1（1-2 周：对齐官方 + 体验）
1. @会话候选：接 remote.sessionReferenceResolver（官方同款），会话显示年龄与工作区；技能移回 / 菜单；菜单补「无更多结果」提示。
2. / 命令参数 popup：带 input 的命令 claim 后展示参数引导（复用 PopupSelectView 思路）。
3. 分支闭环：branch/switch、branch/delete、branch/create 新端点 + 下拉菜单动作。
4. 左栏：状态点 SR 语义、hover 卡、组内溢出折叠、搜索内容降级提示、aria-current。
5. 提交确认：staged 文件列表 + 行数摘要 + 消息校验。
6. Goal 操作（resume/edit/clear）按官方投影支持度加。
7. 消息反馈备注（官方 controller 已支持 note，直接复用）。
8. 命令输出：节流（仅运行中/1s/仅头）＋ 复制重跑。
9. Git 刷新 debounce（300ms）+ 仅刷新可见工作区。
10. 右键/拖放重排（可选，工作量大，先做「最近更新排序」视图对齐）。

### P2（4-6 周：差异化）
1. 子代理/任务活动中心（subagentsByParent + jobs + workflow-run 投影）——官方已有雏形，DCode 做交互式时间线。
2. 完整轨迹视图 + 搜索（对齐官方 Trajectory，含耗时模式折叠）。
3. 学习闭环（从当前仓库/错误生成概念卡）。
4. Usage 决策化（按工作区/模型分析 token、时长、失败率、上下文浪费）。
5. MCP server 配置入口（设置 rail 的 mcp 页从只读库存升级为编辑器）。

### 建议验收
- 中文界面全文检索：无 Thinking / Thought / Bookmark / Remove bookmark 残留；@ 输入会话名有候选。
- 新建文件→暂存→回合撤销：文件出现在 .dsh/dcode-undo 且工作区无数据丢失；未跟踪 hunk 撤销有明确提示。
- 权限请求（permission=ask 场景 × 触发一次写命令）：DCode 出现审批 UI 并可裁决。
- 工作区=仓库子目录：行数、diff、undo、stage 全部一致（加 2 个浏览器回归用例）。
- 弹层内快捷键失效；Tab 不逃逸；删除失败可见。

---

## 7. 官方同类缺陷（对标参考，非 DCode 义务）
- 官方：列宽不持久、会话树行不可键盘聚焦、行展开双份状态错位、拖序/归档失败静默、手柄无键盘、Modal 无焦点圈闭、审批无可见超时、附件无显式按钮、无删除消息/重生成、分支不可用仅 tooltip。
- DCode 在行可聚焦、宽度持久、失败可见性、键盘支持等多数项已优于官方。

---

## 8. 修复记录（2026-08-30，已实施并验证）

本报告全部结论已核验；以下项已完成代码修复（`pnpm --filter @dsh-portable/dcode-ui exec tsc -b` 通过，vitest 客户端 10/10 通过，node 测试通过，`tsdown` 打包通过；撤销修复另以真实 git 仓库 + 内置 `lib/index.js` 做了端到端验证）：

- **P0-1 撤销数据丢失**（`src/host/git.ts`）：新增 `cat-file -e HEAD:<path>` 判定：索引命中但 HEAD 无此路径 = 新建已暂存文件，先 `restore --staged` 清索引，再移入 `.dsh/dcode-undo/<ts>/`（不再是 `restore --source=HEAD` 直接删除）。另补“索引未命中但 HEAD 存在”分支：已删除的跟踪文件从 HEAD 恢复（原先落入 untracked 分支误报 skipped）。端到端验证：旧文件 `restored` 回到 v1；新文件 `quarantined` 进隔离目录且内容完整、工作区无残留、索引已清。
- **P0-2 审批 UI 接入**（`ApprovalCard.tsx`、`runtime.ts`、`hooks.ts`、`Workbench.tsx`、`QuestionComposer.module.css`）：新增 `DcodePendingApproval` 类型与 `usePendingApproval`（`kind === 'approval'`）；新增 ApprovalCard（允许一次/拒绝/错误可见），优先级高于提问卡片。官方 `dsh-client-ui-approval` 本就随 web-app 插件集加载（vendored cordis.patch.yml L205-206），事件消费一直有效，此前仅缺 DCode 侧渲染。
- **P1 就绪误报**（`readiness.ts`）：provider 未命中改为 `model: 'missing'`（原为 ready，发送时才失败）。
- **P1 会话删除失败静默**（`LeftRail.tsx`）：catch 记录 `deleteError`，弹窗内 alert 展示（`session.deleteFailed`）。
- **P1 全部暂存作用域**（`GitPanel.tsx`）：组按钮操作与头部计数相同的文件集（`files` 而非 `allFiles`）。
- **P1 路径基座错位**（`FileChanges.tsx`）：新增 `repoRelative(path, cwd, status.root)`；行数匹配、行点击 diff、撤销全部使用 repo-relative 形式，子目录工作区不再计数恒 0、不再误操作仓库根同名文件。
- **P2 英文残留**：Transcript 推理标题/等待行改用 `chat.thinkingProgress`/`chat.thoughtFor`；MessageNavRail 书签 aria/title 与 tooltip fallback 全部走 `t()`；`@` 菜单补会话候选（`@[label](dsh-session:…)` 规范提及，含标签转义与 base64url 编码），使 `composer.placeholder` 的“文件或对话”名副其实。
- **P2 交互**：ToolCard 头部点击只负责展开，新增独立“详情”按钮（a11y 合规，不再嵌套交互控件）；Details 面板新增“在对话中定位”；运行中时长轮询 100ms→1s；全局快捷键在 `[role=dialog]` 打开时挂起；左栏 4 个 Modal 换用 `FocusingModal`（焦点圈闭+还原）；左栏会话行状态文本读屏可见＋`aria-current`＋组折叠 localStorage 持久化；顶栏不再显示“不是 git 仓库”chip（内容区已呈现）；useGit 聚焦刷新 150ms 防抖；LearningHome 开场 prompt 失败可见；selectModel 改为 `ModelSelectHandle.open()` 命令式句柄，删除 DOM 点击桥。
- **功能对齐**：GoalPanel 增加 继续/编辑/清除（经 `remote.goals`，CAS 引用来自投影，含编辑态与错误展示）；助手消息增加反馈备注（官方 controller 的 `rate(messageId, rating, note)`/`clearNote`，内联编辑器，保存/取消/移除齐全）。
- 未实施项（需新功能规模或依赖清单外能力，见 §2 的 P2+ 清单）：MCP 配置编辑器（`dsh-mcp-client` 实例经 cordis.yml 配置，无浏览器设置通道）、分支创建/切换、`/` 命令参数弹窗、Trajectory 全量视图+搜索、子代理 lineage 树、jobs 面板、计划模式退出控制、回合消息时钟行、`transcript/reasoning` 等未引用键清理（零行为影响，待逐键核对）。
