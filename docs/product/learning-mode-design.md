# 学习模式 3.0 设计：主题库、材料层与学习记忆

> 本文取代 `learning-mode-prd.md` 中 P1-1 / P1-2 / P2-2 的方案部分（其验收标准仍然有效）。
> `learning-mode-analysis.md` 保留为竞品参考，不再作为架构依据。
> `preset/learning/skills/interactive-teaching/references/reference-materials.md` 描述的工作流在本设计中第一次获得真实执行路径，届时需按阶段 B 重写。

---

## 1. 为什么重做

学习模式今天有一份别人没有的资产（证据分型的学习者状态 + 15 种语义级原生视觉 + 单步教学循环），和一个致命的空洞：

**它读不到用户的任何一份材料，也记不住上一次学过什么。**

前者不是"没做完"，是宿主组合里被显式关掉的：

```
vendor/deepseek-harness/packages/bundle/web-app/cordis.patch.yml:333
- id: tool-fs
  disabled: true
- id: tool-fs-search
  disabled: true
```

模型面的工具全部下放到 preset 层，而 `preset/learning/agent.cordis.yml` 只挂了 persona / learning-agent / skill-filesystem / tool-skill / tool-web / compaction。**学习模式的工具目录里没有任何一个能打开文件的工具。**

同时 `packages/attachment/attachment-local/src/` 只有 `image.ts`：桌面端附件提供方只实现图片，本地文档只能变成 `@file` 路径引用，而解引用需要 fs 工具。

后者是键的问题不是机制的问题：`broker.ts:544` 把 full snapshot 写进 session 日志再 fold 回来，刷新 / 恢复 / 压缩 / fork 都能活，但键是 `sessionId`。

## 2. 已确认的宿主事实（设计的地基）

调研结论：**这套东西需要的基础设施，宿主几乎全都已经在跑，学习模式一个都没接。**

| 能力 | 服务 | 在跑吗 | 出处 |
|---|---|---|---|
| 文件读写后端（写有 mode 栅栏，读永远放行） | `ctx.fs` | 是 | `bundle/base/cordis.patch.yml:444` `fs-sandbox` |
| 沙箱策略（mode + workspaceRoot） | `ctx.sandboxPolicy` | 是 | `base:173`，默认 `workspace-write` |
| 持久化工作区（真实目录 + 标题 + 有序 session） | `ctx.workspaceRegistry` | 是 | `web-app:74` |
| 域存储（zod schema + json 后端） | `ctx.storageDomain` | 是 | `web-app:60`，root `dshHome/storages` |
| 历史会话全文检索 + 血缘 | `ctx.sessionQuery` | 是 | `base:118` |
| 大输出落盘 + 有界预览 | `ctx.spillStore` | 是 | `base:347` |
| 附件（图片） | `ctx.attachments` | 是 | `base:107` |
| 子进程（打包的 ripgrep 走这里） | `ctx.subprocess` | 是 | `base:164` |
| **工作区侧边栏 / 原生目录选择器 / 重命名 / 删除 / 分组** | — | 是 | `client/ui-workspace`、`host/directory-picker-native` |
| 文本嵌入 / 向量检索 | — | 否 | `packages/llm/` 只有 `llm-deepseek`、`llm-pi-ai`，均为 chat |
| PDF / docx / pptx 文本抽取 | — | 否 | 全仓库无 `pdfjs` / `mammoth` / `officeparser` |

两个直接推论：

1. **主题库不需要新造实体。** `Workspace` 的语义是"一个 `fs.realpath` 规范化过的真实目录 + 标题 + 有序 session 成员，且成员资格要求 session header 的 cwd 等于该目录"（`packages/workspace/workspace/src/types.ts`）。这正好是主题库，而且 UI 全套已存在。
2. **写入围栏是免费的。** `sandboxPolicy.resolve()` 用的是 `SessionHeader.cwd`（不可变，创建时定），不是 preset 配置。**只要学习会话的 cwd 就是主题库目录，`workspace-write` 模式下的写入自动被 fence 在库内。** 零新机制。

唯一必须从零建的是解析器。

## 3. 六个核心设计决策

**D1 — 主题库 = 一个真实文件夹 = 一个 Workspace。**
不是"做得像 Obsidian"，是字面上同一个东西：一堆 Markdown + frontmatter + `[[wikilink]]`。理由：portable 桌面应用的价值主张就是本地、可带走、无锁定；隐私 / 删除 / 导出（PRD §6.6）全部退化成"删文件夹"；检索退化成路径 + 进程内关键词扫描；锚点退化成人类可读的 `文件#标题`。

**D2 — 不做向量检索。** 单主题语料上，"限定第 3 章 + 关键词扫描"通常已经足够。引入向量意味着要么新增网络依赖（破坏离线），要么打包本地模型（换体积）。这条现在就锁死，不留"以后再说"。

**D3 — 模型只读，写入全部由宿主执行。**
学习模式**不挂 `tool-fs`**（它带 `write` / `edit`）。模型只拿到库内受限的 `learning_material_map` / `learning_material_read` / `learning_material_search` / `learning_material_recall`。所有落盘（ingest 产物、概念节点、笔记）由宿主侧确定性代码在用户确认后写入。preset 的承诺因此从"不碰文件"精确化为可验证的更强承诺：**"模型只能读你这个学习库，写字的是宿主，且只写在这个库里。"**

**D4 — 结构由解析产生，不由模型总结。**
`study_map` 的 sections / anchors 从 `extracted/` 的解析结构直接生成。幻觉章节率结构性归零，而不是靠提示词里的祈使句（今天 `reference-materials.md` 的 "Never invent sections, page anchors" 没有任何执行力）。

**D5 — 知识库的节点是学习者自己的解释，材料是被引用的来源。**
NotebookLM 是 source-in（材料进 → 摘要出）。本项目应当是 learner-out：节点 = 学习者的解释 + 当时的锚点 + 当时暴露的误解 + 后来的修正。理由：这是现有教学循环的天然副产品（`LEARNING_CHECKPOINT_EVIDENCE_KINDS = attempt | prediction | explanation | contrast | transfer` 本来就在系统性诱发并分类这些东西，只是用完就扔），同时回答"我到底学会了什么"和"材料工作流的终点是什么"两个问题，且这才是双向链接真正有价值的原因。

**D6 — 检索的 query 由 `LearnerState` 生成，不是由用户提问生成。**
`LearnerGap` / `currentMisconception` / `failedMoves` / `phase` 已经在状态里了。检索接口是一个封闭 intent 集合（阶段 C），不是自由文本 RAG。这才是可以对外讲的差异化，而不是"我们也做了 RAG"。

## 4. 目标形态

```
<主题库>/                       ← 一个 Workspace，session.cwd 指向这里
  sources/                      原始材料，用户拖进来的原件，永不修改
  extracted/                    解析产物：一源一 .md，保留章节 / 页码 / 幻灯片标记
  concepts/                     概念节点：frontmatter 带 mastery / due / anchors
  notes/                        学习者自己的解释（教学循环的产物）
  .learning/
    manifest.json               源清单：原件 hash → 解析产物 → 解析器版本 → 降级记录
    structure/<source>.json     解析出的章节树（study_map 与锚点校验的唯一真源）
    memory.json                 跨会话学习记忆（**不可重建**，见下）
```

> `.learning/` 下有两种生命周期：`manifest.json` 与 `structure/` 是纯派生缓存，删了会自动重建；
> `memory.json` 是用户资产，删了就没了。放在同一目录是为了保住「删掉文件夹 = 删掉全部」这条性质。

数据所有权分层是这套设计的关键，两层生命周期完全不同：

| | `sources/` `extracted/` `.learning/` | `concepts/` `notes/` |
|---|---|---|
| 性质 | 派生 / 缓存 / 可重建 | 用户资产 |
| 材料被替换时 | 整体重建 | 必须存活，并 re-anchor |
| 可否删除 | 随时（`memory.json` 除外） | 仅用户主动 |
| 真源 | 原件 + 解析器 | 文件本身（散文）+ `.learning/memory.json`（类型化状态） |

`concepts/闭包.md` 的形状：

```markdown
---
mastery: emerging          # 来自 LearnerMastery，不是自评
basis: evidence            # LearnerMasteryBasis
due: 2026-08-29
anchors:
  - extracted/js-guide.md#第3章-作用域    # p.42
---

## 我的解释（2026-08-26）
> 闭包就是函数记住了它出生时那个环境……

## 当时的误解
以为闭包捕获的是**值**，不是**变量绑定**。被 `for` + `var` 的例子证伪。→ [[变量提升]]

## 还没验证
没在异步回调这个新语境下独立用过。
```

`mastery` / `basis` / `anchors` 没有一个是为这个设计新发明的字段——全部来自 `learner-state.ts` 已有的类型。

---

# 阶段 A — 打通材料链路

**目标：把一份 PDF 拖进学习模式，它能真的读到、结构化、并在教学中引用真实页码。**
没有 A，B / C / D 全部免谈。

## A1 · 主题库绑定（复用 Workspace，零新实体）

新文件 `apps/interactive-learning/src/topic-vault.ts`：

```ts
export interface TopicVault {
  readonly workspaceId: WorkspaceId
  readonly root: string          // = workspace.path = session.header.cwd
  readonly sources: string       // <root>/sources
  readonly extracted: string     // <root>/extracted
  readonly concepts: string
  readonly notes: string
  readonly internal: string      // <root>/.learning
}

/** 从当前 session 解析主题库；不是学习库时返回 undefined（普通对话照常工作）。 */
export async function resolveTopicVault(ctx: Context, session: Session): Promise<TopicVault | undefined>

/** 幂等地创建四个子目录 + manifest.json。宿主侧写入，不走 ctx.fs 栅栏。 */
export async function ensureVaultLayout(vault: TopicVault): Promise<void>
```

`resolveTopicVault` 直接用 `ctx.workspaceRegistry.resolveByPath(session.header.cwd)`（`packages/workspace/workspace/src/index.ts:329`）。判定一个 Workspace 是不是学习库的依据是 `<root>/.learning/manifest.json` 是否存在——**不改 workspace 记录 schema，不动 vendor 子模块**。

用户路径：侧边栏「Add workspace…」选一个文件夹 → 在该 workspace 下新建会话 → 选学习模式 → 首次拖入材料时 `ensureVaultLayout` 落地。全程复用已有 UI。

> **实现修正（相对初稿）：阶段 A 一个 harness 包依赖都不需要新增。**
> `workspaceRegistry` 用 `ctx.get('workspaceRegistry')` 机会性读取（没挂也照常工作，只是标题退化为目录名），
> 宿主侧写入直接用 `node:fs/promises`。唯一新增的是 `optionalDependencies: { unpdf }`。
> 阶段 C 采用进程内关键词扫描，不新增子进程依赖。

`ensureVaultLayout(root, title)` 会把 `title` 写进 manifest；`resolveTopicVault` 的标题优先级是
**workspace 注册表 → manifest → 目录名**——注册表里的名字是用户能在侧边栏改的那个，所以它最优先。

## A2 · 解析器（唯一从零建的部分）

新目录 `apps/interactive-learning/src/ingest/`：

```
index.ts        parseSource(bytes, name) → ParsedSource   （按扩展名分派）
types.ts        统一中间表示 + slug / quoteHash / 锚点格式化
text.ts         .txt .md .markdown .rst 及常见代码扩展名
zip.ts          自建只读 ZIP 读取器（stored/deflate），docx 与 pptx 共用
pdf.ts          unpdf（可选依赖；缺失时降级为 parser-unavailable）
docx.ts         自建：word/document.xml
pptx.ts         自建：presentation.xml 定序 + slideN.xml
markdown.ts     ParsedSource → extracted/<slug>.md + structure/<slug>.json（同一趟产出，共享行号）
pipeline.ts     ingestSource / ingestDirectory / describeDegradation
```

统一中间表示：

```ts
export interface ParsedBlock {
  kind: 'heading' | 'paragraph' | 'code' | 'table' | 'list' | 'caption'
  level?: number                   // heading 专用，1..6
  text: string
  anchor: SourceAnchor
}

export interface SourceAnchor {
  sourceId: string                 // manifest 中的稳定 id
  headingPath: readonly string[]   // ['第3章 作用域', '3.2 闭包']
  page?: number                    // PDF 页码 / pptx 幻灯片号；docx 无
  quoteHash: string                // 首 160 归一化字符的 sha256 前 16 位，用于重导入时模糊 re-anchor
}

export interface ParsedSource {
  sourceId: string
  title: string
  blocks: readonly ParsedBlock[]
  degradation: readonly ParseDegradation[]   // ← 一等公民，不是错误日志
}

export type ParseDegradation =
  | { kind: 'image-only-pages'; pages: readonly number[] }     // 扫描件
  | { kind: 'multi-column-guess'; pages: readonly number[] }
  | { kind: 'formula-dropped'; count: number }
  | { kind: 'truncated'; afterPage: number; reason: string }
  | { kind: 'unsupported-format'; extension: string }
```

**降级必须是数据而不是日志。** 现有 reference 文档要求"只读到一部分就说清楚覆盖了哪部分"，本设计让这句话有出处：`degradation` 进 `manifest.json`，`study_map` 渲染时显式标注"第 12–15 页是图像，未读取"，模型据此说实话而不是假装读全了。

各格式的锚点来源：

| 格式 | 依赖 | 章节来源 | 页锚点 |
|---|---|---|---|
| txt / md / code | 无 | ATX / Setext 标题；代码文件按顶层符号 | 无 |
| pdf | `unpdf` | 字号聚类 + 行首编号模式（`第N章` / `N.M` / `Chapter N`） | 原生页码 |
| docx | 自建 zip + XML | `Heading n` 样式与 `w:outlineLvl` | 无（docx 无分页概念） |
| pptx | 自建 zip + XML | 每张幻灯片 = 一个 section，标题占位符 = 标题 | 幻灯片号 |

> **实现修正（相对初稿）：docx 不引入 `mammoth`。** 两种 OOXML 格式共用同一个自建 zip 读取器
> （`src/ingest/zip.ts`，约 100 行，只支持 stored/deflate 两种方法），docx 的标题层级直接读
> `w:pStyle` 与 `w:outlineLvl`——比经 HTML 中转再反推层级更准，且给 portable 构建少加一个依赖。
> 结果：**唯一的外部依赖是 `unpdf`，且是 `optionalDependencies`**；缺失时 PDF 报
> `parser-unavailable` 降级，文本 / Markdown / 代码 / docx / pptx 全部照常工作。

xlsx 不在范围内（表格不是本产品意义上的学习材料源）。

`extracted/<slug>.md` 格式固定，便于 grep 与人读：

```markdown
<!-- dsh-learning:source id=js-guide title="JavaScript 权威指南" parser=pdf@1 -->

## 第3章 作用域
<!-- p.38 -->
段落文本……

### 3.2 闭包
<!-- p.42 -->
段落文本……
```

## A3 · 材料摄入（宿主侧，模型不参与）

`src/ingest/pipeline.ts`：

```ts
/** 拖入 / 选择材料后的唯一入口。全程宿主侧，模型看不到原始字节。 */
export async function ingestSource(vault: TopicVault, filePath: string): Promise<IngestResult>
```

流程：复制原件到 `sources/` → 算内容 hash → `parseSource` → 写 `extracted/<slug>.md` + `.learning/structure/<slug>.json` → 更新 `manifest.json`。同 hash 且解析器版本未变则跳过（幂等）。

写入用 `node:fs/promises` 直连，不经 `ctx.fs`：路径是宿主构造并校验过的，不是模型控制的，沙箱栅栏的威胁模型（"信任代码之上的模型控制路径"）在这里不适用。

入口 UI 复用已有能力：桌面端 `getPathInfoForFile`（`apps/desktop/src/desktop-preload.cjs`，commit `156ffbe`）已经能回答拖入的是不是目录；拖入目录 = 批量摄入。

## A4 · 模型面的只读材料工具

新文件 `apps/interactive-learning/src/material-tools.ts`，在 `agent.ts` 现有的工具注册处（`agent.ts:801` 起）追加四个工具。**全部只读，全部硬性限定在 vault 内，路径参数一律先 `realpath` 再做包含检查，越界直接结构化拒绝。**

| 工具 | 参数 | 行为 |
|---|---|---|
| `learning_material_map` | `sourceId?` | 从 `.learning/structure/*.json` 返回章节树（不是模型总结）。无参时返回库内全部源的一级结构 + 各自的 `degradation`。 |
| `learning_material_read` | `sourceId`, `sectionId?` | 按**章节**而不是行号取窗口。默认返回该节；超过 6 KB 时返回首段 + 子标题清单，由模型再次下钻。 |
| `learning_material_search` | `query`, `sourceId?` | 库内关键词检索，进程内扫描即可。 |
| `learning_material_recall` | 无 | 检索目标由学习状态决定；模型只决定何时调用。 |

按锚点而非行号读取不是绕路——因为 `extracted/` 的格式由我们自己定，这是严格更好的接口：**模型引用的东西天然带着可校验的锚点**。

工具结果和检索段落都按固定上限直接裁剪，不把超出部分先生成再落盘；这保证了"不要一次性灌进上下文"同时也是实际预算约束。

## A5 · 学习记忆换键（跨会话）

保留 broker 现有的 snapshot 机制不动，**额外**投影一份到域存储。

新文件 `apps/interactive-learning/src/learner-memory.ts`。

> **实现修正（相对初稿）：记忆写在库内 `.learning/memory.json`，不写 `ctx.storageDomain`。**
> 三个理由：(1) `storage-domain` 需要 `zod`，而本包目前没有这个依赖，为一张表引入它不划算；
> (2) 域存储落在 `dshHome/storages`，会把用户的学习数据切成两半，直接破坏 D1 卖的「删掉文件夹 =
> 删掉全部」；(3) 校验方式与本包既有风格一致——`learner-state.ts` 本来就是手写校验，不是 schema 驱动。
> 代价是没有跨库索引；等真的需要「跨所有主题查到期项」时再加域存储作为**可重建的索引**，而不是真源。

记录形状（手写校验，坏行丢弃而不是整文件失败）：

```ts
export interface LearnerConceptRecord {
  conceptSlug: string          // slugify(goal)，保留 CJK
  label: string                // 就是 LearnerState.goal
  mastery: LearnerMastery
  masteryBasis: LearnerMasteryBasis
  phase: LearnerPhase
  gap: LearnerGap
  misconceptions: readonly string[]
  anchors: readonly string[]   // 来自 LearnerState.sourceAnchors
  evidenceCount: number
  due: string | null           // ISO-8601；概念卡确认后写入
  updatedAt: string
  sessionIds: readonly string[]
}
```

合并规则（`upsertLearnerConcept`）：**掌握度不会被静默回退**——后来的会话在 orient 阶段开局，
不能抹掉更早会话真实观察到的 `transfer`；只有 `masteryBasis === 'user-correction'` 才允许下调。
锚点会按当前结构规范化，失效锚点保留在 `staleAnchors` 中，不会被后来的旧会话状态重新激活；误解、会话 id 取并集并有界。

读写时机：都挂在 `system-prompt/assemble` 这个**被 await 的**瀑布钩子上（`agent.ts`）——它是提示段求值前唯一的异步接缝，
所以在 `learning:learner-state` 渲染时记忆已经是热的。每次组装先把当前状态投影落盘，再读回整库记忆；
一个没有正常收尾的会话（崩溃、直接关窗）因此也已经写下了最后一个完成回合所知道的一切。
注入**有界**：最多 12 条，按 `due` 与最近更新排序，且**每个会话只随第一份完整 transcript 发送一次**——
每轮重复既浪费 token，也会诱导把它当成本轮观察到的证据。

冲突规则：`concepts/*.md` 的散文以文件为准（用户可随手改）；类型化状态以域记录为准，且只能经证据或 `correctSession`（已存在的用户纠正路径）改变。孤儿记录（有域记录无文件）在下次打开库时剪枝。

**这一步同时解锁 PRD 的 P1-2（复习卡跨 session 打开）和 P2-2（主题工作区）。PRD 把这两条排在不同优先级，但它们是同一个前置——这是原排期上的一个真实错误。**

## A6 · preset 变更

`preset/learning/agent.cordis.yml` **不改 plugin 列表**——材料工具由 `learning-agent` 自己注册，因此仍然不引入 `write` / `edit`。只需在文件头补一段注释说明这一点。

preset 的定位句不必推翻，只需补一句：

> 学习模式仍然不会替你运行代码或修改工程文件；它只读取你选定的学习库，写笔记的是宿主，且只写在这个库里。

`preset.yml` 的 `description` 相应更新。

## A7 · 先定指标，再写实现

在 `apps/interactive-learning/src/eval.ts` 追加三个**可自动判定**（不需要模型评委）的指标，跑在 `dsh-learning-eval` 里：

```ts
export interface MaterialGroundingCandidate {
  vaultStructure: readonly ParsedSectionRef[]   // 来自 .learning/structure/*.json
  turns: readonly { text: string; sourceAnchors: readonly string[]; materialBytes: number }[]
}

/** 1. 锚点精确率：断言所引锚点确实包含该断言（归一化子串 / quoteHash 比对）。 */
export function gradeAnchorPrecision(c: MaterialGroundingCandidate): AnchorPrecisionVerdict

/** 2. 幻觉章节率：输出提到的章节必须存在于解析结构中。目标 0。 */
export function gradeSectionHallucination(c: MaterialGroundingCandidate): SectionHallucinationVerdict

/** 3. 上下文预算：每轮真正送进模型的材料字节数分布。 */
export function summarizeMaterialBudget(c: MaterialGroundingCandidate): MaterialBudgetMetrics
```

现有 `TEACHING_TRAJECTORY_CASES` 里已经有带 `sourceAnchors: ['Chapter 2: p. 12']` 的轨迹用例（`eval.ts:1180-1184`）——**锚点管道已经通了，缺的只是让锚点可校验**。这三个指标接的就是那条已有的线。

## A8 · 阶段 A 验收

1. 拖入一份 30 页 PDF：`sources/` 有原件，`extracted/` 有带 `<!-- p.N -->` 的 Markdown，`.learning/structure/` 有章节树，`manifest.json` 记录了解析器版本与降级项。
2. 拖入一份扫描版 PDF：`degradation` 记录 image-only 页，模型的第一句话主动说明"第 X–Y 页是图像，我读不到"。
3. 说"讲第 3 章"：模型调 `learning_material_map` → `learning_material_read`，引用的页码与原文一致。
4. `gradeSectionHallucination` 在离线用例上为 0。
5. 关掉应用重开、在同一个 workspace 新建会话：上次的概念掌握度出现在 `learning:learner-state` 段里。
6. 删掉整个文件夹：应用不崩，该 workspace 降级为普通工作区，孤儿域记录被剪枝。

---

# 阶段 B — 结构与锚点的可信度

A 打通了链路，B 让链路上的每个断言都可追溯、可重建。

## B1 · `study_map` 改为结构驱动

现状：`study_map`（`protocol-schema.ts:455`）的 `sections[].anchor` 是模型自由填写的字符串，可以凭空捏造。

> **实现修正（相对初稿）：校验的是 `anchor`，不是 `sections[].id`。**
> `sections[].id` 受协议的 `id` 语法约束（短标识符），而结构层的 section id 含 `/` 与中文，两者对不上。
> 而 `anchor` 字段本来的语义就是"源位置"，正好是该被校验的东西。
> `concepts[].sectionId` 必须指向已声明 section 这一条协议层**早就有了**（`protocol-current.ts:2045`），不需要新增。

改动（`src/material-validation.ts`，接在 `learning_visual` 的 execute 里）：当会话处于学习库中时，
`study_map` 必须满足——库内有已解析材料；`sourceLabel` 命中某个真实源的 id 或标题；
**每个 `sections[].anchor` 必须能解析到 `.learning/structure/` 里真实存在的 section**。
任何一条不满足就抛结构化错误，消息里列出真实章节并指明去调 `learning_material_map`。
拒绝发生在 ephemeral 工具被 dispose **之前**，所以模型可以就地用真实结构重建这张图。

**运行时校验与离线指标共用同一个解析器**（`src/material-anchor.ts`）。这是刻意的：
如果 `learning_visual` 的拒绝逻辑和 `eval-material` 的锚点精确率各用一套匹配，指标就不再描述产品实际强制的东西。

`MAX_ACTIVITY_BYTES = 64 KB` 决定了一张图放不下一整本书——因此 `study_map` 一次只渲染一层：源总览 → 单章 → 单概念。这与 `reference-materials.md` 里 "progressive disclosure is the design" 是同一条规则，只是现在由 schema 校验强制。

## B2 · 重导入与 re-anchor

材料更新时（同名不同 hash）：

1. `sources/`、`extracted/`、`structure/` 整体重建（它们是缓存）。
2. 学习记忆里的 `anchors` **不动其归属**，但逐条重解析（`src/material-reanchor.ts`）：
   - `headingPath` 精确命中 → 直接更新页码；
   - 不中则用**上一版解析记录的 `quoteHash`** 在新结构里匹配；
   - 仍不中 → 移入 `staleAnchors`，**绝不静默保留旧页码**；
   - 之前 stale 的锚点若在新版里又出现 → 自动摘掉 stale 标记。

结果通过 `learning_material_map` 的 `added` 字段告诉学习者（"N 条引用已移动 / M 条已失效"），
而不是当作静默的账目细节。

> **实现修正（相对初稿）：`SourceSection.quoteHash` 改为哈希该节的开头正文，而不是标题。**
> 初稿哈希的是标题——但 re-anchor 存在的意义恰恰是"新版改了标题"，标题哈希会在最需要它的时候一起变掉，
> 等于没有回退路径。改成正文开头后，"同一段话换了个标题"这个最常见的再版情形能被正确找回。
> 连带删掉了 `blocksOfSection()`：它用 quoteHash 做重名章节消歧，而 `line`/`endLine` 区间已经更准确地取代了它，且没有任何调用方。

这条正是 `reference-materials.md` 里 "rebuild only the affected map sections instead of pretending old anchors are still valid" 的实现。

## B3 · 教学策略层接线

`teaching-policy.ts` 的 `LearningPolicyContext` 增加 `material?: boolean`，条件层 `LEARNING_MATERIAL_POLICY`
仅在会话所在的库**确实存有已解析材料**时注入（判据是 manifest 的 `sources.length > 0`，比读全部结构便宜）。
要点（与 `LEARNING_TEACHING_POLICY_CORE` 的既有禁令一致，不重述不削弱）：

- 引用材料前必须先 `learning_material_read`；未读过的章节不得描述、概述、摘要或引用。
- 一次只读一节；长节返回开头 + 子节清单，跟着需要的子节下钻，而不是因为"能拿到"就把整章拉进来。
- 每条来自材料的断言必须携带 `source_anchors_observed`，且**逐字使用工具返回的锚点串**（该事件已存在，`broker.ts:241`）。
- 材料有 `degradation` 时，先用自己的话说明覆盖边界，不得把未读部分当作已覆盖；材料与自己的说法冲突时，以材料为准并明说。

该层由 `system-prompt/assemble` 里同一次 await 的刷新决定（与学习记忆共用一次 vault 解析），
测试断言它在无材料的会话中**不出现**，避免为拿不到的能力付 token。

---

# 阶段 C — 状态驱动检索

这是差异化真正发生的地方。B 之前，检索只是"模型想看就看"；C 让**学习者状态决定去材料里找什么**。

## C1 · 封闭 intent 集合

新文件 `apps/interactive-learning/src/material-retrieval.ts`：

```ts
export type RetrievalIntent =
  | 'counter-evidence'        // currentMisconception 非空 → 找能证伪它的原文
  | 'second-example'          // failedMoves 已含 worked_example → 找同概念的另一个例子
  | 'prerequisite-backfill'   // gap === 'prerequisite' → 找前置概念所在章节
  | 'notation-decode'         // gap === 'notation' → 找符号定义处
  | 'transfer-context'        // phase === 'transfer' → 找不同语境的应用
  | 'verbatim-anchor'         // 需要精确引用

/** 由状态推导检索计划；不接受自由文本 query。 */
export function planRetrieval(state: LearnerState): RetrievalPlan | undefined
```

`planRetrieval` 是纯函数，可直接单测——检索质量因此变成一个确定性问题而不是玄学。触发条件全部读自 `LearnerState` 已有字段（`gap` / `currentMisconception` / `failedMoves` / `phase`），**零新增状态**。

> **实现修正（相对初稿）：`learner-prior` 不是第七个 intent，而是 plan 上的一个布尔位。**
> 它和另外六个不是同一类东西：那六个回答"去材料里找什么"，它回答"要不要同时看学习者自己以前说过什么"。
> 做成并列的 intent 会强迫二选一，而实际上"有活跃误解"时**两者都要**。
> 现在 `includeLearnerPrior` 由 intent 确定性推出（counter-evidence / second-example / transfer-context 为真）。

模型面是 `learning_material_recall`，**参数表为空**——没有 query 字段可填。这是 D6 最直接的表达：
要找什么由状态推出，模型只决定何时该找。状态不足以规划时返回 `no-plan` 并说明改用 map/read。
返回里带 `intent` 与 `rationale`（内部依据，策略层明确要求不要念给学习者听）。

## C2 · 三条检索腿（一条都不是向量）

1. **结构域限定** —— 由 `planRetrieval` 输出的 section id 集合限定搜索范围。零成本，来自解析产物。
2. **关键词检索** —— 进程内扫描 `extracted/`，按**命中的不同 term 数**打分（而不是出现次数：只把一个词重复十遍的段落，不该压过真正把学习者卡住的两个概念联系起来的那段）。
   > **实现修正：没有引入 ripgrep。** 单主题语料下进程内扫描足够，且省掉了打包二进制的解析风险。
   > 这一层是纯函数化的打分，换成 `ctx.subprocess` + 打包 rg 只是替换一个函数——等真的量到瓶颈再说，现在做属于臆测优化。
3. **学习者自己的历史** —— `ctx.sessionQuery.filterEvents`，限定 `type: user/message` + 字面词，会话范围取自**学习记忆里该概念的 `sessionIds`**。
   > **实现修正：用 `filterEvents` 而不是 `searchEvents`。** 后者是抽象方法、需要 sqlite FTS 后端；
   > 前者在基类里已实现，是"字面、大小写不敏感、空白宽松的语义文本扫描"，无需任何 FTS provider 就能工作。
   > 这条腿全程机会性获取（`ctx.get('sessionQuery')`），没挂就返回空；单个会话日志读不出来只少一条摘录，绝不让教学回合失败。
   **这条腿是三条里最独特的：它同时需要"哪些会话教过这个概念"的持久记录（A5）和扫描那些会话文本的能力——NotebookLM 结构上两者都没有。**

**CJK 的检索词提取是这一层真正的难点。** 直接把连写整段当一个词（`闭包捕获的是变量绑定`）几乎不可能在材料里命中，
因为**词必须是材料的子串**。做法是：按虚词（的/是/了/在/与…）切分 → 2–4 字的复合词整体保留 →
更长的降级为字符二元组。二元组是刻意带噪的：`为闭` 匹配不到任何东西也就不得分，而 `闭包`、`捕获` 会命中该命中的段落；
由于打分数的是**不同 term 的命中数**，噪声只损失词表的精度，不损失排序。
词表里**目标概念名排最前**——因为 `terms[0]` 正是检索学习者历史所用的那个词。

## C3 · 预算

`planRetrieval` 输出附带 `budgetChars`，默认每轮 ≤ 4000 字符材料进上下文。

> **实现修正（相对初稿）：不走 `spillStore`。**
> 初稿说"超出部分走 spillStore"，但那意味着先生成一大坨再落盘——**在规划时就按预算裁剪严格更好**：
> 装不下的段落根本不会被组装，一个字节都不浪费在这一回合用不上的文本上。
> 预算本身就是机制。`summarizeMaterialBudget`（A7 定义的指标）监控这条线。

---

# 阶段 D — 笔记生长与复习调度

## D1 · 概念节点由教学循环生长

不做"自动抽取概念建图"。节点在**独立迁移证据出现时**才诞生：

`teaching-policy` 的既有终止条件是"independent fresh transfer 之后停止"。在那个时刻——且仅在那个时刻——宿主提议写一张概念卡，内容取自本轮已经发生过的东西：学习者的解释原文、当时的锚点、被证伪的误解、尚未验证的迁移语境。用户确认后落盘。

**不确认就不写。** 这是 PRD §6.6「长期保存必须由用户主动选择」的直接实现，也让 `concepts/` 天然稀疏——只有真学会的东西才成为节点，这正是双向链接有价值的前提。

链接来源同样不靠抽取：`[[变量提升]]` 出现的原因是**这个误解是在讲变量提升时被证伪的**，路径本身就是边。

## D2 · 复习调度写在 frontmatter

`due` 字段同时存在于 `concepts/*.md` 的 frontmatter（用户可读可改，Obsidian 里直接可见）与 `learning` 域记录（机器用）。调度用朴素的 SM-2 变体，间隔由 `mastery` 与最近一次证据的 `independence` 决定——不引入调度库。

到期项在会话开始时进入 `learning:learner-state` 段（A5 已建的注入点），由模型决定是否发起复习；**不阻塞**，符合 §6.5「学习模式随时可退出」。

`recall_deck`（`LEARNING_VISUAL_KINDS_V4` 已有）在此处第一次有了真实数据源——今天它只能凭空生成卡片。

## D3 · 跨概念视图

`study_map` 的第二种用法：不再渲染材料结构，而是渲染 `concepts/` 的实际状态（掌握度着色、到期高亮、stale 锚点标记）。这是"我到底学会了什么"的答案，也是 PRD P0-2「学习进度与成果卡」的最终形态。

## D4 · 阶段 D 验收

1. 完成一次带独立迁移的完整教学 → 系统提议写卡 → 拒绝则不落盘 → 接受则 `concepts/` 出现文件，且 Obsidian 能直接打开并显示双向链接。
2. 修改材料后重导入：概念卡存活，页码更新，找不到的引用显示 `stale`。
3. 三天后重开：到期概念出现在会话开始的状态段里，且不打断用户当前的提问。

---

## 5. 明确不做

- 向量索引 / embedding（D2）
- GraphRAG、跨文档实体图
- 一次性全量知识图谱（`MAX_ACTIVITY_BYTES` 与 progressive disclosure 双重排除）
- "先看地图再选主题"的阻塞式入口（违反 §6.5）
- xlsx 解析
- 模型可写文件（D3）

除非 A7 的指标量出确切需要，否则以上均不重新讨论。

## 6. 风险与诚实的代价

| 风险 | 缓解 |
|---|---|
| 库是文件夹 → 用户会手动破坏它 | 所有读取路径必须容忍缺文件、坏 frontmatter、非法 YAML；任何一条都不得让会话失败。这是选择本地可见格式的必然代价。 |
| PDF 解析质量决定一切；扫描件 / 双栏 / 公式会毁掉链路 | `ParseDegradation` 作为一等数据，宁可少读且说清楚，也不假装读全（B3 策略层强制） |
| `unpdf` + `mammoth` 给 portable 应用增加体积 | 接受；这是"全做"决策的已知成本。解析器按需 `import()`，未用到的格式不进启动路径。 |
| preset 定位句需要改写 | 新表述比旧的更强也更可验证："模型只读你的学习库，写字的是宿主"（A6） |
| Obsidian 兼容会被要求支持 Dataview / canvas / 插件 | 对外表述始终是"你的学习记录是普通 Markdown 文件夹，恰好 Obsidian 能打开"，**不承诺兼容性** |
| 域记录与文件双写不一致 | 单向真源规则（A5）：散文以文件为准，类型化状态以域为准，孤儿剪枝 |

## 7. 一句话总结

不是"建材料知识空间 → 检索 → 学习"，而是：

> **用材料的解析结构做骨架，用学习者自己产出的证据做节点，让学习状态而非提问来驱动检索——整个东西是磁盘上一个用户自己拥有的文件夹。**
