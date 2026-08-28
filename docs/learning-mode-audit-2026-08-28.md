# 学习模式完全审计

> 审计日期：2026-08-28
> 范围：`apps/interactive-learning`（src 31,182 行 / tests 14,423 行）、`docs/product/learning-mode.md`、preset 提示词
> 方法：静态代码审计 + 竞品调研 + 前端 UI/UX 专项审计。所有结论均标注文件与行号。
> 立场：默认现有实现是经过思考的，只在有代码证据时才推翻。

---

## 0. 一句话结论

**这是一个设计水准明显高于行业平均的教学系统，真正的缺陷只有两个，其余是可收敛的冗余。**

两个真缺陷：

1. **概念卡保存同意弹窗完全逃逸了本包的设计系统**（P0）——它是策略文档唯一点名的对话框，却由宿主通用提问器渲染，且必然被误读为"又一个教学提问"。
2. **每轮提示词同时下达了"由你分类"和"不要自己分类"两条相反指令**（P1）——既有 token 成本，也有语义成本。

行业对比上，你做对了一件竞品普遍做错的事：**把"会话内教学过程"和"跨会话长期内容"分层，并给出可追溯的引用与真实的间隔重复**。这正是 ChatGPT Study Mode 被反复批评的架构性短板。

---

## 1. 竞品坐标

### 1.1 市场现状

| 产品 | 形态 |  pedagogic 方法 | 跨会话记忆 | 间隔重复 | 材料接地 |
|---|---|---|---|---|---|
| ChatGPT Study Mode | 全局模式开关（`@study`） | 苏格拉底提问 + 脚手架 + 知识检查 | 仅通用 Memory，**无错误历史** | **无** | 支持上传 PDF/图片 |
| Claude Learning Mode | "Learning" 风格下拉 | 引导发现，先问"你已经知道什么"；编码变体在 `#TODO` 处停顿 | 无 | 无 | Projects 知识库（RAG） |
| Gemini Guided Learning | App 内 | 自适应诊断测验 → 课程 + dashboard | 有 dashboard | 部分 | Workspace 集成 |
| NotebookLM | 独立产品 | 源接地，围绕自有材料建导师 | 笔记本持久 | 有闪卡/测验 | **最强**（逐页引用） |
| Khanmigo | K-12 授权 | 与固定课程大纲绑定的形成性反馈 | 有 | 有 | 课程内 |
| **本项目** | 会话内模式 | Host 判定路线 + 一步一move | **LearnerState + 概念卡 + 复习队列** | **有（自评驱动 SRS）** | **有（收据 + 锚点 + 失效标记）** |

### 1.2 三条能影响决策的结论

**结论一：间隔重复和跨会话错误追踪是行业公认的空白，你已经有实现，不要砍。**
多篇 2026 年评测把"无持久化表现模型 / 无间隔重复 / 无自适应排序"列为 Study Mode 的**架构性**缺陷（非临时缺陷）。你的 `concepts/*.md` + `due/intervalDays` + 复习队列恰好补上了这一格。这是差异化资产，不是过度设计。

**结论二：竞品最大的用户体验投诉是"强制苏格拉底仪式"，你已经在文档和实现里规避了，要保持。**
`docs/product/learning-mode.md:26` 明确"检查点只在回答会改变下一步教学时使用，不做每轮固定的继续/揭示仪式"。这与批评方向一致。**不要因为觉得"教学感不够"而加回每轮提问。**

**结论三：你的入口发现性弱于竞品，这是体验差距，不是架构差距。**
竞品都是一级入口（`@study`、风格下拉、独立产品）。你的入口是"新会话显式选择 + 三个方向模板"。功能上等价，但用户不知道它存在。**这是最高 ROI 的改进方向。**

### 1.3 一条需要警惕的证据

Wharton/Penn 随机对照试验（约 1000 名高中生）： unrestricted GPT **练习时高 48%，撤走 AI 后考试低 17%**；加了提示而非答案的 guardrail 版本 **练习时高 127%，无考试惩罚**。

这直接支持你现有的 `isIndependentlyCorrectEvidence` 严格判定链和"自评不等于掌握"的立场。**但也说明第 2.2 节的 SRS 缺陷是真问题**：让不可靠的自评驱动无上限的间隔增长，会让学习者把自己的卡永久推出复习队列。

---

## 2. 功能逻辑正确性

### 2.1 明确正确、不要改的部分

先说对的地方，避免整改时误伤。

- **证据三段判定链**（`learner-state.ts:761-783`）：`isIndependentlyCorrectEvidence` 同时要求 source ∈ {learner-message, learner-action}、correctness=correct、independence=independent、confidence≠low、kind≠error。五个条件的交集正好排除了"一次提交/滑块操作/自评"。与文档"不做"清单逐条对应。
- **"段完成"与"迁移掌握"分离**（`learner-state.ts:1178-1185`）：正确且独立的 explanation/attempt 可以结束教学段，但**不**提升 mastery 到 transfer。这是很细腻的区分，多数实现会混为一谈。
- **visual / checkpoint 互斥**（`agent.ts:1149-1156` + `:1060` 每轮清理）：每用户消息清空 `richTeachingMoves`，互斥是 per-turn 而非 session-wide。已验证清理时机正确。
- **`learning_visual_select` → `learning_visual` 两阶段动态工具**：15 种视觉类型的完整 schema 若一次性暴露，token 成本会失控。两阶段是正确取舍，不是冗余。
- **掌握度只升不降 + `boundEvidence` 保留支撑证据**（`learner-state.ts:796-852`）：sticky mastery 会主动把支撑它的那条证据钉在窗口里，保证 invariant 不被裁剪破坏。设计得很干净。

### 2.2 缺陷

#### 【P1】`masteryBasis` 单向锁死，一致性校验被永久关闭

`learner-state.ts:945-948`：用户纠正 mastery 时置 `masteryBasis = 'user-correction'`。
`learner-state.ts:857`：`assertMasteryEvidenceConsistency` 在 basis 为 `user-correction` 时**直接 return**。
全文件 `masteryBasis` 的赋值点只有 885（初始化）、948、954、1161-1163 —— **没有任何路径能把它从 `user-correction` 改回 `evidence`**。

后果：一旦学习者在某一轮手动纠正了掌握度，**该会话此后所有 mastery 断言都不再受校验**。transfer 可以永久停留在一个已被后续证据推翻的值上。

修法（二选一）：
- 小修：`learner_evidence_observed` 分支里，当 `observedMastery === 'unseen'` 且 `next.mastery` 为 `transfer/emerging` 时，不允许 basis 停留在 `user-correction`（把 `state.masteryBasis` 一并置为 `'evidence'`，让校验重新生效）。
- 正修：把"用户纠正"降级为**一次性豁免**——只跳过当次 assert，之后恢复校验。

#### 【P1】间隔重复无上限，且完全由不可靠自评驱动

`concept-cards.ts:183-185`：
```
intervalDays = rating === 'mastered' ? Math.max(1, prior * 2) : Math.max(1, Math.floor(prior / 2))
```
评分语义（`locales.ts:298-300`）：`revealed`=没想起来（不重排期，今天再来）、`review`=有点模糊（减半）、`mastered`=记住了（翻倍）。

两个问题：
1. **无上限**。初值 3 天，连续 8 次"记住了"即 3→6→…→768 天。没有 cap、没有 ease factor、没有可提取性模型。
2. **自评驱动与策略自述冲突**。`teaching-policy.ts:96` 明确"自评是排期信号，不是掌握证据"。但排期算法让这个非证据信号拥有**无界的指数权力**——一个系统性高估自己的学习者会把自己的卡永久推出队列。这正是 1.3 节 RCT 所说的"工具替代了学习"的变体。

修法：给 `prior * 2` 加 cap（建议 60–90 天），并在连续两次 `revealed` 时把 interval 重置回 `INITIAL_REVIEW_INTERVAL_DAYS`（当前 `revealed` 完全不重排期，只当天重来，缺少 lapse 惩罚的持久效果）。

#### 【P2】类型许可了一个结构性无效值

`learner-state.ts:205`：`source` 类型包含 `'user-correction'`。
`learner-state.ts:762`：判定只接受 `'learner-message' | 'learner-action'`。

含义：模型可以提交 `source: 'user-correction'` 的证据，它会被正常存储、正常显示，**但永远不可能计入 mastery**。类型系统与判定逻辑对"这个值有没有用"给出了两个答案。

不是崩溃级问题，但它是个静默陷阱。要么从类型里移除 `'user-correction'`，要么在工具 schema 里明确它的语义（"仅用于记录纠正事实，不计入掌握度"）。

#### 【P2】`boundEvidence` 与 invariant 断言的耦合脆弱

`assertMasteryEvidenceConsistency`（`:854-865`）在任何 mastery 变更路径上抛 `TypeError`。目前唯一保证 invariant 成立的是每条路径都记得调 `boundEvidence`。

这不是现在的 bug（我已逐路径验证现有 4 条路径都调用了），但它是**运行期抛错而非降级**：将来新增一个会修改 `evidence` 的事件类型而漏调 `boundEvidence`，结果是整轮工具调用崩溃，教学中断。

修法：把 `assertMasteryEvidenceConsistency` 从 throw 改为"静默降级到 `evidenceMastery(state.evidence)`"——状态机内部一致性不该变成用户可见的失败面。这也符合你"不要过度设计防御"的取向：**少一道运行期断言，多一层自动修正**。

---

## 3. 工具编排与提示词

### 3.1 工具清单（10 个，编排合理）

| 工具 | 层 | 门控 |
|---|---|---|
| `learning_state_update` | 状态 | 总是可用（非富客户端也可） |
| `learning_material_map/read/search/recall` | 材料 | 需 vault 有材料 |
| `learning_concept_propose` | 落盘 | 需在 vault 内 |
| `learning_concept_recall` | 复习 | 需有已批准卡片 |
| `learning_visual_select` → `learning_visual` | 视觉 | 需富客户端 + 路线 ∈ {teach-minimum, continue, overview, direct+resource-creation} |
| `learning_checkpoint` | 检查点 | 需路线 ∈ {teach-minimum, continue}，且每步唯一 |

编排的三条硬约束都是对的：`learning_state_update` 必须先于 `learning_material_recall`（`agent.ts:1128-1136`）；checkpoint 必须是模型步内唯一调用（`agent.ts:927-931`）；visual 与 checkpoint 每轮二选一（`agent.ts:1149-1156`）。

### 3.2 【P0 级提示词缺陷】意图分类的双重注入与自相矛盾

这是本次审计在提示词层面最重要的发现。

**同一个 system prompt 里同时存在：**

| 来源 | 内容 |
|---|---|
| `learning:policy`（order 20，`teaching-policy.ts:33-35`，**每轮注入**） | `## Learn intent` → `Classify the request before teaching: Learn intent covers definitions… Keep coding/implementation… on their ordinary task route.` |
| `learning:turn-route`（order 19，`agent.ts:428-473`，**每轮注入**） | `## Current turn route` → `intent=learn; trigger=definition; route=teach-minimum; reason=definition.` + 按路线给的具体指令 |
| `teaching-policy.ts:36`（同在 core 里） | `The route for this turn is supplied with the turn; follow it rather than re-deriving one.` |
| `docs/product/learning-mode.md:26` | `每轮的教学路线由 Host 判定并随该轮下发，模型不再自行重新分类。` |

**问题**：Host 已经完成分类并通过 `learning:turn-route` 下发了完整结论，但 standing policy 每轮仍要求模型"先分类"，并附上完整的分类指引。三条来源互相打架：一句说"你来分"，一句说"别自己分"，一句说"已经给你了"。

**成本**：
- token：约 80 tokens × 会话内每一轮。
- 语义：standing policy 的指令权重高于 per-turn context，模型被邀请去做一件已被声明为不需要做的事。低置信度轮次尤其危险——那正是 Host 已经决定求助语义分类器的时刻（`agent.ts:423`），而 policy 同时在说"你自己分"。

**修法**：把 `LEARNING_INTENT_POLICY` 从 `LEARNING_TEACHING_POLICY_CORE` 移出，改为**仅在 `decision.confidence === 'low'` 且未走语义覆盖时注入**。高置信度轮次一律相信 Host 结论，与文档声明一致。

### 3.3 冗杂清单（可安全删除）

| # | 位置 | 内容 | 理由 |
|---|---|---|---|
| 1 | `teaching-policy.ts:113-115` | `visualRoute` 的二次路线判断 | `context.visual` 已由 `learningToolAvailable` 按几乎相同的路线集合算出，二次判断近乎恒真 |
| 2 | `learn-intent.ts:86-110` | 22 条规则的 `kind` 与 `conflict` 字段 | **全无任何代码读取**。只有 `priority`（:290 排序）和 `id`（索引 handler）被使用。纯注释性数据被塞进了运行时常量表 |
| 3 | `learn-intent.ts:64-78` vs `learn-intent.ts:322-325` | `LEARN_INTENT_NATURAL_LANGUAGE_RULES` 与 `LEARNING_INTENT_ROUTING_GUIDANCE` | 两份对同一分类边界的独立散文描述，**且都在注入模型**。应合并为一份 |
| 4 | `tests/learn-intent.spec.ts:76-93` | 断言常量表第一个元素、最后一个元素、以及字符串"包含 Trigger cues:"、"不包含 220:bare-concept" | 结构性/格式性断言，不测行为。删掉不改变任何保护 |
| 5 | 视觉测试 6 个文件 | `visual-legibility`(481) / `visual-crowding` / `visual-layout-improvements` / `visual-corpus`(483) / `visual-no-degradation` / `visual-accessibility` | 6 个文件测 15 个渲染器。保留 legibility 与 accessibility 的**行为**断言，合并 crowding / layout-improvements / no-degradation 三组重叠的几何断言 |

### 3.4 提示词写得好的部分（不要动）

- `visual-routing.md`（8.4KB）：15 种视觉类型的 pairwise 消歧规则（`node_link` vs `causal_loop` vs `state_transition`、`scene_2d` vs `field_2d` vs `plot`）写得非常具体，带反例。这不是冗杂，是必要的——15 个 kind 天然重叠，没有这些规则模型必错。
- `teaching-policy.ts:39-40`：区分"真没听懂"和"不耐烦"，并指出"有截止时间的开场白"与"被问了 productive question 之后才冒出来的截止时间"是两种东西。这是全文件最有价值的两句。
- 分层注入（`buildLearningTeachingPolicy`）：graded / visual / material / concept-save / review / zh-templates 六层条件注入，避免普通轮次为用不到的细节付费。架构正确。

### 3.5 一个待验证的结构性观察

15 种 visual kind 对应 5,818 行渲染器代码 + 约 2,500 行视觉测试。组成本不低，但**没有任何使用频次数据**。

建议：先加一行埋点记录 `learning_visual_select.kind` 的分布，跑两周再决定是否合并长尾（`sequence_buffer`/`code_trace` 都是"索引槽位逐步推演"，`relation`/`data_table` 都偏表格）。**在没有频次数据之前不要动渲染器**——这是最容易做错方向的优化。

---

## 4. UI / UX

完整证据见前端专项审计，此处只列结论与优先级。

### 4.1 【P0】概念卡保存同意弹窗逃逸设计系统

已亲自复核确认，非推测：

1. `concept-tools.ts:198-211` 用 `id: 'concept-card-confirm'` 发起提问，`detail` 是 Markdown 卡片正文。
2. `LearningComposer.tsx:28-36` 的 `envelopeOf` 要求 `decodeLearningCheckpointQuestionId(question.id) === checkpoint.waitId`。
3. `transport.ts:86-90`：`decodeLearningCheckpointQuestionId` 要求 id 以 `dsh-learning/checkpoint-wait@1:` 开头 → `'concept-card-confirm'` 返回 `undefined`。
4. 于是 `envelopeOf` 返回 `undefined` → `LearningComposer` 与 `LearningInteraction` 双双 `return null` → **弹窗落到宿主通用提问器**。

三重后果：
- **本包没有一行代码渲染这个弹窗**，`teaching-policy.ts:89` 的要求在 UI 上零落地。
- 无 `data-learning-scope` → `tokens.module.css` 的控件配方、焦点环、色调令牌**对它全部不生效**。唯一被文档点名的对话框，是全套设计系统里唯一完全失控的对话框。
- 它与 checkpoint 共用同一个提问组件族 —— **用户看到的确实就是"又一个问答"**，正是文档要求避免的误读。

修法：在 `LearningComposer.tsx` 的 `envelopeOf` 之外增加 `concept-card-confirm` 认领分支，用 `data-learning-scope` + primary/secondary 双按钮渲染，文案点明"这是写入文件，不是提问"。

### 4.2 P1 清单

| # | 位置 | 问题 |
|---|---|---|
| 1 | `VaultView.tsx:642-649` | error 态无重试按钮。一次瞬时 RPC 失败 = 永久死面板（`reload()` 已存在，只接在 `onReparsed` 上） |
| 2 | `VaultView.tsx:514` | 直接渲染 `cause.message`，可能含 `ENOENT` 与绝对路径，且未本地化 |
| 3 | `VaultView.tsx:481-491` | 10 行只为找出"哪个是 undefined"，然后把"没有文件夹"报成英文内部错误。同文件已有专门的 `no-vault` 阶段 |
| 4 | `VaultKeep.tsx:174-244` / `VaultRoster.tsx:197-250` | 弹层/模态无初始聚焦、无焦点陷阱、关闭后焦点不归还 |
| 5 | `locales.ts` 术语三分 | 同一物件叫"概念卡"（16 处）、"学习卡片"（`learningResultCard`）、"笔记概念"（`vaultKeep`，是"笔记"+"概念卡"的错误拼接）。`vaultKeep` 还被用作 aria-label 与 slot label |
| 6 | `visuals/styles/field-2d.module.css:18-25` | 6 处硬编码 `#14141a`/`#ffffff`，不随主题翻转（深色模式下矢量场箭头失效） |
| 7 | `LearningCheckpoint.tsx:100-107` + `:209` | 「结束这里」用 `quiet`（最低视觉权重）却静默清空草稿，无二次确认 |
| 8 | `tokens.module.css:309-310` vs `LearningNotes.tsx:575,582,601,612` | 注释规定 segment actions 用 chip，实现用了 8px 的 secondary。注释与实现直接冲突 |

### 4.3 布局与信息架构

- **`VaultView.tsx` 819 行 / `VaultLibrary` 单函数 386 行 / 14 个 useState**，混合了 4 个全局阶段 × 3 种主体形态 × 4 个分区。建议按 `useVaultLoad` / `useVaultMutations` / `VaultRail` / `VaultHeader` / `VaultSource` / `VaultSearch` 拆分。
- **搜索导致整体塌陷**（`VaultView.tsx:751-811` 三层嵌套三元）：输入任意字符后整个 rail + pane 被替换为结果列表，清空后重建。搜索框常驻 header 但结果替换 body，用户失去"我在第几个分区"的位置感。
- **文档说的克制未完全落地**：文档要求"计数只在它所属的分区旁出现"，实现里 `VaultView.tsx:784-786` 对值 0 仍渲染"0"。0 是无信息噪声。
- **已写好但从未使用的空态动作**：`VaultView.module.css:49-71` 的 `.stateNext` / `.stateActions` 定义了引导句和按钮行，**没有任何 TSX 引用**。no-vault 态告诉用户"用 @ 附材料"却不给入口。

### 4.4 一致性总评

令牌化程度**高于平均**：字号 100% 走令牌，颜色仅 10 处硬编码（6 处集中在 field-2d），间距 418 处令牌调用 vs 29 处字面量。真正离刻度的只有 2 处 14px 和圆角上的 24/28px。

主要不一致在**语义层而非数值层**：同一个"取消"有三种表达、`data-lx-control` 的角色规则与实现冲突、三个"关闭"三种实现、删除与掌握度降级共用同一 `danger` 权重。

---

## 5. 过度设计清单

按你的要求单独列出，这些都是**可以直接删**的。

### 5.1 过度防御

| 位置 | 内容 |
|---|---|
| `VaultConcepts.tsx:305,582,618,624` / `VaultNotes.tsx:320,618,624,630` | **8 处** `list === undefined` 分支。父组件只在 `phase === 'ready'` 时挂载它们，永不成立 |
| `VaultView.tsx:665-672` | `notes?.notes.length ?? summary?.notes ?? 0` 等兜底。`481-491` 已保证这些非 undefined，后半段永不执行；`:662-664` 的注释还与前面的 throw 自相矛盾 |
| `VaultView.tsx:507` | `setSources(list?.sources ?? [])`，`sources` 在类型上必填 |
| `LearningComposer.tsx:57-58` | `void matched; void t`（组件整个 return null） |
| `client/index.ts:104-108` | `.then()` 里唯一语句是 `if (ok === false) return`，`.catch(() => {})` 空体。两条路径都什么都不做 |
| `learner-state.ts:854-865` | 见 2.2 —— 一致性断言抛 `TypeError` 而非自动修正 |

### 5.2 过度测试

| 位置 | 内容 |
|---|---|
| `tests/learn-intent.spec.ts:76-93` | 断言常量表首尾元素、断言字符串包含/不包含特定格式片段。测的是数据结构形状，不是行为 |
| 6 个视觉测试文件 | crowding / layout-improvements / no-degradation 三组的几何断言高度重叠 |

**总体测试量是健康的**：tests 14,423 行 vs src 31,182 行，比例 0.46，处于正常区间。**问题是分布而非总量**——约 2,500 行给了视觉几何，而 `learner-state.ts`（82KB，最复杂的状态机）的测试是 1,552 行。如果只砍一处，砍视觉几何测试；如果要补一处，补状态机的降级路径。

### 5.3 死代码

- `VaultView.module.css`：141 个类中 **28 个从未被引用**（`coverage*`×5、`reading*`×4、`searchRow/searchClear/searchStatus/searchSummary`×4、`roster*`×6、`stateNext/stateActions`×2 等）
- 5 条 `:focus-visible` 规则与 `tokens.module.css:273` 的全局规则逐字相同
- `learner-state.ts`：`LearnerEvidenceBase.source` 类型中的 `'user-correction'` 在判定中结构性无效

---

## 6. 优化方案

按 ROI 排序，分三批。**第一批都是低风险高收益**。

### 第一批：正确性 + 一致性（建议本轮做）

| # | 级别 | 动作 | 文件 |
|---|---|---|---|
| 1 | P0 | 为 `concept-card-confirm` 增加认领分支，用本包设计系统渲染保存同意弹窗 | `client/LearningComposer.tsx` |
| 2 | P0 | 把 `LEARNING_INTENT_POLICY` 从 core 移出，仅在低置信度轮次注入，消除"你来分 / 别自己分"的矛盾 | `src/teaching-policy.ts` |
| 3 | P1 | error 态加重试按钮，接上已有的 `reload()`；错误文案改为本地化兜底 + 折叠技术详情 | `client/VaultView.tsx:642,514` |
| 4 | P1 | 删掉 10 行 undefined 探测，改为 `cwd === ''` 时直接进 `no-vault` 阶段 | `client/VaultView.tsx:481-491` |
| 5 | P1 | SRS 间隔加 cap（60–90 天），连续两次 `revealed` 重置回初始间隔 | `src/concept-cards.ts:183-185` |
| 6 | P1 | 修 `masteryBasis` 单向锁死：后续证据到达时恢复校验 | `src/learner-state.ts:945-948,857` |
| 7 | P1 | 统一术语：学习卡片 → 概念卡；重写 `vaultKeep` 的"笔记概念" | `client/locales.ts` |
| 8 | P1 | `field-2d` 硬编码颜色改读主题令牌 | `visuals/styles/field-2d.module.css:18-25` |
| 9 | P1 | 弹层/模态补初始聚焦、焦点陷阱、关闭后焦点归还 | `client/VaultKeep.tsx`, `client/VaultRoster.tsx` |

### 第二批：减冗（下一轮）

| # | 动作 |
|---|---|
| 10 | 删除 8 处不可达 `list === undefined` 分支 + `?? summary?.x` 兜底 + `void matched` + 空 `.then/.catch` |
| 11 | 合并两份意图分类散文描述；删除 22 条规则表中未被读取的 `kind`/`conflict` 字段 |
| 12 | 删除 `tests/learn-intent.spec.ts:76-93` 的结构性断言；合并 3 组重叠的视觉几何测试 |
| 13 | 清理 28 个未引用 CSS 类 + 5 条重复 focus-visible 规则 |
| 14 | 把 `assertMasteryEvidenceConsistency` 从 throw 改为静默降级，缩小失败面 |
| 15 | 修正 `tokens.module.css:309-310` 与 `LearningNotes.tsx` 的 chip/8px 冲突（二选一，别各改一半） |

### 第三批：结构与体验（需要设计决策）

| # | 动作 | 为什么现在不做 |
|---|---|---|
| 16 | 拆分 `VaultView.tsx`（819 行 → 8 个模块） | 需要先冻结一批功能，否则拆分与改动会互相打架 |
| 17 | 重构搜索：结果改为覆盖层或保留 rail，消除整体塌陷 | 需要先确定搜索的定位（全局搜索 vs 分区内过滤） |
| 18 | 启用 `.stateNext`/`.stateActions`，给空态补下一步动作 | 需要文案与引导流程设计 |
| 19 | 加强入口发现性（对标 `@study` / 风格下拉） | 需要产品决策：是否让它成为一级模式开关 |
| 20 | 加视觉 kind 埋点，用数据决定是否合并 15 种渲染器 | 需要先有两周真实数据 |

---

## 7. 最后一句

这个系统最稀缺的品质是**它知道自己在哪些地方应该不作为**：不自动建知识图谱、不把自评当掌握、不为了教学感加每轮提问、不让富交互阻塞主对话。这些"不做"比已经做的"做"更难，也更值钱。

整改时最大的风险是**为了消掉第 5 节的冗余，顺手动了第 2.1 节的判据**。五个条件的证据链、段完成与迁移掌握的分离、sticky mastery 的支撑证据保留——这三处看着像可以简化的防御，实际上正是让这个系统不沦为"另一个问答机器"的东西。
