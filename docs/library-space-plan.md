# 学习库 → 通用资料库（Library Space）泛化方案

> 状态：方案稿（未实现）
> 日期：2026-08-29
> 范围：`apps/interactive-learning`、`apps/dcode-ui/src/client/learning`、宿主 broker/RPC 通道
> 目标：把「学习模式的学习库」泛化为通用资料库内核，并在此之上提供 NotebookLM 式的
> 多来源 → 有引用的对话 → 生成产物（Studio）体验，同时保留现有教学模式的全部行为。

---

## 0. 结论摘要

现有学习库已经具备了 NotebookLM 最难复制的那一半：**文件系统即真相的目录结构、解析降级
可陈述、引用锚点可重锚、只读工具 + Host 侧确定性写入的写栅栏**。

缺的是另外一半：**没有索引层（纯字面子串匹配）、来源不可勾选（无 grounding 作用域）、
产物只有笔记和概念卡、来源供给只有本地文件、面板是全量 `useState` 无 store**。

因此方案不是重写，而是 **在现有内核上长出一个 Library 层**：

| | 保留 | 新增 | 改造 |
| --- | --- | --- | --- |
| 存储 | 目录即库、containedPath 防逃逸、分片 extracted + structure | `.library/space.json`、chunk 索引、artifacts | manifest 协议升到 `@2`，兼容读 `@1` |
| 摄入 | 现有 7 种解析器、degradation、vision 补页、reanchor | SourceProvider 接口（url / 剪藏 / 纯文本 / 转录） | `ingestSource` 抽成 provider 之一 |
| 检索 | `planRetrieval` 作为「教学 planner」保留 | chunk + BM25 倒排（CJK bigram）+ 可选向量 | 检索入口从「状态驱动」泛化为 `retrieve(req)` |
| 产出 | notes / concept cards | Artifact（简报 / FAQ / 时间线 / 导图 / 讲稿） | 产物统一带 provenance，可点回原文 |
| 通道 | `/interactive-learning` RPC 通道与 broker 分发 | `library/*`、`artifact/*` endpoint 组 | endpoint 表拆分、协议版本并列 |
| UI | VaultLibrary 四分区、Roster、留到库里 | Space 主页、来源勾选、Studio 面板 | 抽出 `useSpace` store，替换 15 个 useState |

**建议分 5 期，P0 不动任何现有行为，P1 起才可见收益。**

---

## 1. 现状盘点（代码事实）

### 1.1 数据模型：一个主题 = 一个目录 = 一个 Workspace

`src/topic-vault.ts`

```
<space-root>/
├── sources/                     原件
├── extracted/                   提取出的 markdown
├── concepts/                    概念卡（md + front matter）
├── notes/                       笔记 / 待确认概念（md + front matter）
└── .learning/
    ├── manifest.json            dsh-learning-vault@1：sources[] 清单
    └── structure/<sourceId>.json
```

- 主题身份由 `.learning/manifest.json` 的存在判定（L39、L88）。
- 写栅栏是「免费的」：它复用了 Workspace 的 `cwd` 约束 + `ctx.sandboxPolicy`（L1-L15 注释）。
- `containedPath()` 做 canonicalize-then-contain，防 vault 内 symlink 逃逸（L269）。

**这套设计直接就是资料库的 Space 模型，不需要换。**

### 1.2 摄入：7 类格式，降级是数据不是日志

`src/ingest/`：`pdf | markdown | text(code/plain) | docx | pptx` + `zip` 展开。

- 上限 `MAX_SOURCE_BYTES = 64MB`（`ingest/pipeline.ts:37`）。
- 输出 `ParsedSource → SourceStructure`：`sections[]` 带 `headingPath / level / page / line / endLine / quoteHash`（`ingest/types.ts:75-121`）。
- 读不了的部分以 `ParseDegradation` **作为数据返回**，教学侧必须向用户陈述，而不是暗示「全读到了」（`types.ts:51-63`）。
- `contentHash` 相同则跳过；重新导入后用 `quoteHash`（正文开头 160 字，非标题）重锚笔记引用（`material-reanchor.ts`）。
- 扫描页可用视觉模型补读：`material/reparse-pages` endpoint。

**这是本项目相对 NotebookLM 的优势：NotebookLM 不会告诉你「第 12-18 页没读出来」。**

### 1.3 检索：目前是字面子串匹配，没有索引

`src/material-retrieval.ts`

- `planRetrieval(state, budget, focus)` 是**纯函数**，从 `LearnerState` 推导 6 种 intent：
  `counter-evidence / second-example / prerequisite-backfill / notation-decode / transfer-context / verbatim-anchor`（L31）。
- 执行侧 `executeRetrievalPlan()`：遍历全部 structure → 按 `section.line..endLine` 切正文 →
  `haystack.includes(term)` 计 distinct 命中数 → 排序 → 截断装配（L401-456）。
- CJK 处理：按助词切分 + 超长复合词退化为 bigram（`keyPhrases`，L117）。
- 预算：`DEFAULT_RETRIEVAL_BUDGET_CHARS = 4000`，最多 4 段。
- 面板侧独立实现 `vault/search`，`MAX_PANEL_HITS = 20`、摘要 220 字（`vault-rpc.ts:95-101`）。

**问题（这是泛化的最大瓶颈）：**

1. 检索粒度是 **section**，不是 chunk。一个大 section 会被 `excerptAround` 截断，尾部信息永久丢失。
2. `includes` 无 tf-idf / 无长度归一 → 长 section 天然占优。
3. 全量线性扫描，20 个来源 × 上千 section 时每次检索都 O(全库)。
4. 没有语义召回：用户说「闭包捕获的是变量还是值」，材料写「captures the variable, not its value」——
   字面匹配能中；但「为什么循环里打印全是 3」就完全召回不到。

### 1.4 产出：只有笔记与概念卡

`src/vault-notes.ts` / `src/vault-concepts.ts`

- 笔记：`note` / `pending-concept` 两类，上限 200 条、单条 20k 字（L56-62）。
- 概念卡：三态 `revealed / review / mastered`，支持 `rate / defer / correct`，有到期复习队列（SRS）。
- 卡片写入有门禁：模型提议需用户确认；用户直接要求则免证据免确认（`docs/product/learning-mode.md`）。

**NotebookLM 的 Studio（简报 / FAQ / 时间线 / 导图 / 音频概览）这里完全缺失。**

### 1.5 通道与权限

- 全部走 `connection.rpc.call('/interactive-learning', endpoint, payload)`，
  Host 侧 `LearningActivityBroker` 分发到 `handleVaultEndpoint`（`broker.ts:464-473`）。
- 20 个 endpoint，见 `vault-rpc.ts:69-91`；`vault/*` 读目录，`concepts/*` 与 `notes/*` 是唯一写组。
- 权限不靠 ACL，靠 `cwd → resolveTopicVault()`：不是 vault 的目录直接返回 `no-vault`。
- Roster 由**客户端**提供 cwds（自 session 列表去重，上限 24），Host 逐个解析（`vault-rpc.ts:376-425`）。

### 1.6 前端

- `client/index.ts` 用 cordis slot 注册：
  `conversation.composer`、`conversation.input.dock`、`conversation.view`（笔记 tab，
  `presetOnly` gate）、`sidebar.footer.action`（学习库 roster）、
  `conversation.chat.assistant-actions`（留到库里）、`tool.call.toolview`。
- `VaultView.tsx`：`VaultLibrary` 四分区 `material / saved / concepts / review`（L408-414），
  **15 个 `useState` + `reloads` 计数器手动刷新**（L429-443），无 store、无推送。
- `apps/dcode-ui/src/client/learning/LearningHome.tsx`：已有一级页面
  `start / current / library / notes / concepts / visuals`，复用同一个 `VaultLibrary`。

**`LearningHome` 就是泛化后的 Space 主页原型，不需要从零设计。**

### 1.7 不可破坏的约束

- 模型**没有**文件写入工具；摄入、笔记、卡片落盘全部由 Host 按确定路径完成
  （`README.md` "Not included"、`docs/product/learning-mode.md`「模式边界」）。
- 不做隐式跨会话画像 / 自动知识图谱。
- 每处行为都有对应测试（`tests/` 40+ spec）。

---

## 2. 与目标的差距矩阵

| NotebookLM / WorkBuddy 资料库能力 | 现状 | 缺口等级 |
| --- | --- | --- |
| 多来源摄入（本地文件） | ✅ 7 类 + 降级陈述 | — |
| 多来源摄入（网页 / 剪藏 / 复制文本 / 音视频） | ❌ 仅本地文件 | 中 |
| 引用溯源（点回原文段落） | ✅ anchor + quoteHash + 重锚 | — |
| 来源勾选（grounding 作用域） | ❌ 全库一律可用 | **高**（小改动大收益） |
| 可靠检索（大库 / 语义） | ⚠️ section 级字面匹配 | **高** |
| 来源级摘要与概览 | ⚠️ 只有字数/解析器信息 | 中 |
| 生成产物 Studio（简报 / FAQ / 时间线 / 导图 / 讲稿） | ❌ 仅笔记、概念卡 | **高** |
| 高亮 → 存入笔记 | ⚠️ 「留到库里」按整条消息 | 中 |
| 多 Space 管理与切换 | ⚠️ Roster 依赖客户端 cwds | 中 |
| 导出 / 分享 | ❌ | 低（可延后） |

---

## 3. 目标架构

```
┌─────────────────────────────────────────────────────────────┐
│ L3 体验层   Space 主页 · 来源勾选 · Studio 面板 · 分区导航      │
│            （LearningHome 泛化 + VaultLibrary 复用）          │
├─────────────────────────────────────────────────────────────┤
│ L2 产出层   Artifact 工作流（Host 驱动、模型只产内容）          │
│            briefing / faq / timeline / mindmap / script      │
├─────────────────────────────────────────────────────────────┤
│ L1 检索层   Retriever = Planner → Candidate → Rerank → Pack   │
│            planner: ad-hoc | teaching(现有) | artifact        │
│            索引：chunk + BM25 倒排（+ 可选向量 RRF 融合）      │
├─────────────────────────────────────────────────────────────┤
│ L0 内核层   Space（目录即库）· SourceProvider · 写入栅栏        │
│            file(现有7类) | url | clip | text | transcript     │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 L0：Space 内核（目录布局演进）

```diff
  <space-root>/
    sources/<sourceId>/original.<ext>
-   extracted/<sourceId>.md
-   .learning/structure/<sourceId>.json
+   sources/<sourceId>/extracted.md
+   sources/<sourceId>/structure.json
+   sources/<sourceId>/chunks.jsonl
+   .library/space.json          # id/title/schema/activeSourceIds/ingestLog
+   .library/index/postings.json # term -> [[chunkId, tf]]
+   .library/index/vectors.bin   # 可选，仅在启用 embedding 时
+   artifacts/<slug>.md          # 产物，front matter 带 provenance
    concepts/ notes/
```

- `.learning/manifest.json`（`@1`）继续可读，首次写入时迁移为 `.library/space.json`（`@2`）。
  **迁移是幂等的、只增不删**：老版本程序仍能打开这个目录。
- `space.json` 新增 `activeSourceIds: string[]` —— 这就是来源勾选的落点。
  null/缺省 = 全部来源（保持现有行为）。

### 3.2 L0：SourceProvider

```ts
export interface SourceProvider {
  readonly id: string                       // 'file' | 'url' | 'clip' | 'text' | 'transcript'
  canHandle(ref: SourceRef): boolean
  acquire(ref: SourceRef, space: Space): Promise<AcquiredBytes>
  parse(acquired: AcquiredBytes): Promise<ParsedSource>   // 复用现有 ingest/types
}
```

- `fileProvider` 直接包装现有 `ingest/` 全部分支 → **零行为变化**。
- `urlProvider`（P2）：`fetch` → 去 script/style → markdown。
  依赖取舍：引 `turndown`（~30KB）或自研 ~200 行；**不引 puppeteer**。
- `clipProvider` / `textProvider`（P2）：剪藏片段与手贴文本，带 `originHint`。
- `transcriptProvider`（P3）：音频视频先由外部 ASR 产出文本再入库；
  **不在本项目内做语音识别**，只做「接受转录 → 入库」这一半。

所有 provider 复用同一条下游：parsed → structure → chunks → index。
**`ParseDegradation` 对所有 provider 一视同仁**（网页抓取失败、正文抽取为空也是 degradation）。

### 3.3 L1：索引与检索（核心改造）

**Chunk 化**（新增 `src/index/chunker.ts`）

- 目标 800–1200 字符，重叠 15%，切在段落/句子边界；不跨 section。
- `chunks.jsonl` 每行：
  ```jsonc
  { "chunkId": "s3:ch007", "sourceId": "...", "sectionId": "...", "ord": 7,
    "anchor": "src#H1 › H2 (p.12)", "quoteHash": "...", "text": "..." }
  ```
- chunk 是纯派生缓存，可随时从 `extracted.md` + `structure.json` 重建。

**倒排索引**（新增 `src/index/lexical.ts`）

- 分词沿用现有双脚本策略（可直接复用 `keyPhrases` 的分词部分）：
  Latin 取词 ≥2 字符；CJK 用 **bigram**（中文没有空格，bigram 是零依赖且有效的方案）。
- 打分 **BM25**（k1=1.2, b=0.75），解决「长 section 天然占优」。
- 索引是**增量**的：`contentHash` 未变的 source 不重建。

**可选向量召回**（`src/index/vector.ts`，默认关闭）

- 这是需要你拍板的决策（见 §7 Q1）。建议路径：
  本地 ONNX 小模型（bge-small-zh 量化版 ~30MB）离线可用；或 Host 侧配置一个 embedding API。
- 关闭时不影响任何功能，检索退化为纯 BM25 + 现有 rerank 规则。
- 开启时 BM25 与向量各取 top-60，用 **RRF（k=60）** 融合后统一重排。

**检索入口泛化**（改造 `src/material-retrieval.ts`）

```ts
export interface RetrieveRequest {
  space: Space
  query?: string                    // 用户/模型的原话
  scope?: readonly string[]         // 来源勾选；缺省 = space.activeSourceIds ?? 全部
  budgetChars?: number              // 默认沿用 4000
  planner?: RetrievalPlanner        // 'ad-hoc' | TeachingPlanner | 'artifact'
  preferAnchors?: readonly string[]
}
export function retrieve(req: RetrieveRequest): Promise<RetrievalResult>
```

- **现有的 `planRetrieval(state, budget, focus)` 原样保留**，作为 `TeachingPlanner` 注入。
  它产出的 `RetrievalPlan.terms` 继续作为词法查询，intent 继续驱动重排偏好
  （`second-example` 排除已引段落等规则不动）。
- `RetrievalResult` 形状不变（`plan/passages/learnerPrior/usedChars`），
  passage 增加 `chunkId`。**现有测试与 eval 全部不受影响。**

**收益**：section 级 → chunk 级后，截断丢信息问题消失；BM25 后长文偏置消失；
倒排后检索从 O(全库) 变成 O(命中)。

### 3.4 L2：Artifact（Studio 产物）

原则：**与写入栅栏保持一致 —— 模型不写文件，Host 落盘。**

```ts
export const ARTIFACT_KINDS = ['briefing', 'faq', 'timeline', 'mindmap', 'study-guide', 'script'] as const

export interface ArtifactFrontMatter {
  kind: ArtifactKind
  title: string
  createdAt: string
  scope: readonly string[]                       // 生成时使用的来源
  provenance: readonly { sourceId: string; anchor: string; quoteHash?: string; quote: string }[]
}
```

工作流（Host 侧，`src/artifact/workflow.ts`）：

1. 面板点「生成简报」→ `artifact/generate` RPC（scope 来自 space.json）。
2. Host 用 artifact planner 检索（更大预算，例如 24k chars）→ 组装 prompt。
3. 模型只返回**结构化内容 + 逐条 provenance**（不返回文件路径，无写权限）。
4. Host 校验：每条 provenance 的 `quoteHash` 必须能在 chunk 中定位，
   **校验失败的条目整条丢弃并在产物里标注「未通过校验」**（沿用「不把不可靠引用显示成可靠证据」的既有原则）。
5. 落盘 `artifacts/<slug>.md`，返回给面板渲染。

产物是**普通 markdown 文件**，用户可以在资源管理器里直接打开、编辑、删除 ——
这与「目录即库」的核心价值一致，也是相对云端 NotebookLM 的差异点。

音频概览（P3+）：`script` 产物 + 可选 TTS；**无 TTS 时脚本本身仍有价值**，
不要为了对齐 NotebookLM 而强上语音。

### 3.5 L3：体验层

**来源勾选（P1，性价比最高的一处）**

- 面板 material 分区每个来源加 checkbox → `space/scope` RPC 写 `activeSourceIds`。
- 对话与产物一律按 scope 过滤；UI 上明确显示「当前 3/7 个来源在作用域内」。
- 这是 NotebookLM 最核心的交互，而改动量只有：一个 RPC + manifest 一个字段 + 检索时过滤。

**Space 主页（P2）**

- 把 `LearningHome.tsx` 的 `start/current/library/notes/concepts/visuals` 泛化为
  `SpaceHome`：`概览 / 来源 / 对话 / 产物 / （学习视图：笔记·概念卡·复习）`。
- 学习模式退化为 Space 的一个**视图皮肤**：当 space 的 schema 为 `learning` 时显示教学分区。
  反之通用 space 不显示概念卡与复习。

**Store 化（P2，必要的技术债清偿）**

- `VaultLibrary` 目前 15 个 `useState`，继续往上堆 Studio 会失控。
- 抽 `useSpace(spaceId)`：`useSyncExternalStore` + 一个 SpaceStore（请求去重、失效广播、
  optimistic scope 切换）。RPC 层不变，`VaultView.tsx` 只做渲染。
- 失效广播：摄入完成 / 产物生成完成由 Host 通过既有 lifecycle 事件推 `space/changed`，
  替换现在的 `reloads++` 手动刷新。

**多 Space 管理（P2）**

- Roster 现在吃客户端给的 cwds（上限 24）。改为 Host 侧优先用
  `ctx.get('workspaceRegistry')` 枚举（现在只在取标题时 opportunistic 使用，
  `topic-vault.ts:128`），客户端 cwds 作为降级。
- 这样「资料库」不再依附于「曾经开过会话的目录」。

---

## 4. 分阶段路线

> 每期都必须可独立交付、独立回滚；每期结束跑全量 `pnpm run learning:test` + `desktop:test`。

### P0 —— 内核抽象，零行为变化（约 2 天）

| 工作 | 落点 |
| --- | --- |
| `TopicVault` → `Space` 类型别名与路径常量双写 | 新 `src/space/*.ts`，老 `topic-vault.ts` 改为 re-export |
| manifest `@2` 读写 + `@1` 兼容读 + 幂等迁移 | `src/space/manifest.ts` |
| `SourceProvider` 接口 + `fileProvider` 包装现有 ingest | `src/ingest/provider.ts` |
| 检索入口 `retrieve(req)` + `TeachingPlanner` 适配器 | `src/retrieval/index.ts` |

**验收**：现有 40+ spec 全绿；eval 指标无回归；目录结构不变。

### P1 —— 索引、chunk、来源勾选（约 3 天）★ 优先级最高

| 工作 | 落点 |
| --- | --- |
| chunker（800–1200 字、15% 重叠、不跨 section） | `src/index/chunker.ts` |
| BM25 倒排（CJK bigram / Latin word）+ 增量重建 | `src/index/lexical.ts` |
| `passages` 改用 chunk 装配，保留 budget 语义 | 改 `material-retrieval.ts` 装配段 |
| `activeSourceIds` + `space/scope` RPC + 面板勾选 | `space.json`、`vault-rpc.ts`、`VaultView.tsx` |
| 面板 `vault/search` 切到新检索（hits 仍限 20） | `vault-rpc.ts:547` |

**验收**：新增 chunker/BM25 单测；手工对比「大 section 尾部信息」召回是否改善；
教学 eval 的 budget/引用准确率不下降。

### P2 —— Provider 泛化、产物、Space 主页（约 5 天）

| 工作 | 落点 |
| --- | --- |
| `urlProvider`（fetch → 去噪 → md）、`textProvider`、`clipProvider` | `src/providers/*` |
| Artifact 工作流 + `artifact/*` RPC + 校验 provenance | `src/artifact/*`、`vault-rpc.ts` |
| 三类首发产物：briefing / faq / timeline | 产物模板 |
| `SpaceHome` 泛化；学习视图作为 schema 皮肤 | `dcode-ui/.../SpaceHome.tsx` |
| `useSpace` store 化 + `space/changed` 事件刷新 | `src/client/space-store.ts` |
| Roster 改 Host 侧 workspaceRegistry 枚举 | `vault-rpc.ts:387` |

### P3 —— 增强（按需）

- 可选向量召回 + RRF 融合（取决于 §7 Q1）
- mindmap / study-guide / script 产物
- 段落级高亮 → 存笔记（现在只能整条消息「留到库里」）
- 来源级自动摘要（摄入后生成，可关）

### P4 —— 延后 / 可能不做

- 分享链接、协作（**需要服务端，与本项目「本地便携发行版」定位冲突**）
- 内置 ASR / TTS
- 跨 Space 检索

---

## 5. 兼容与迁移

| 对象 | 策略 |
| --- | --- |
| `.learning/manifest.json` | 只读兼容，首次写迁移；不删除，老程序可用 |
| 20 个 `vault/*` `notes/*` `concepts/*` endpoint | **不删不改名**，新增 `space/*` `library/*` `artifact/*` 并列 |
| `VAULT_RPC_PROTOCOL` | 升 `@2`，`@1` payload 继续解析（现有 protocol 已有 replay 先例） |
| 4 个 `learning_material_*` 工具 | 保留；新增 `library_search` / `library_read` 作为通用面 |
| `LearnerState` / 教学策略 | 完全不动，仅作为 planner 之一注入 |
| 用户目录内容 | 只增结构，不移动用户文件（`sources/` 内的原件不动） |

---

## 6. 风险

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 索引与 extracted.md 不一致 | 引用指向错误段落 | 索引是纯缓存，带 `contentHash` + `parser` 版本；不匹配即重建 |
| CJK bigram 索引体积膨胀 | 大库磁盘占用 | 实测后再定：必要时 CJK 只用 bigram 建**倒排**，正文不重复存 |
| BM25 引入后教学 eval 回归 | 教学质量下降 | `TeachingPlanner` 的 intent 重排规则**保持原样**，仅替换候选生成 |
| 网页抓取的不稳定与反爬 | 摄入失败率 | degradation 机制已能优雅陈述失败；明确不承诺「任何网页都能抓」 |
| 向量依赖破坏离线便携性 | 与项目定位冲突 | 默认关闭，作为可选 provider；不进默认构建产物 |
| `VaultView` store 化引入回归 | 面板行为变化 | P2 单独做，先补快照测试再重构 |

---

## 7. 需要你拍板的 4 个决策

**Q1. 是否引入向量召回？**
- A（建议）：**P1 只做 BM25**，P3 再按实测决定是否加向量。理由：项目是离线便携发行版，
  且 BM25 + chunk 已经能解决当前 80% 的召回问题（粒度与长文偏置）。
- B：P1 直接上本地 ONNX 向量（+30MB 体积、+索引复杂度）。

**Q2. 来源勾选（scope）的默认值？**
- A（建议）：缺省 = 全部来源（保持现有行为），用户可显式收窄。
- B：新来源摄入后默认不勾选，强制用户选择（更接近 NotebookLM，但改变现有手感）。

**Q3. 学习模式与通用资料库的关系？**
- A（建议）：**一个内核、两种 schema**。学习模式 = `schema: 'learning'` 的 Space，
  教学分区只在此时出现。共用检索、索引、产物。
- B：两套并行的库，各自演进（重复实现多，不推荐）。

**Q4. 分享/协作做不做？**
- A（建议）：**不做**。需要服务端，与本地便携定位冲突。导出 zip/JSON 即可满足多数场景。
- B：做只读分享（需要引入服务端与鉴权，工作量翻倍）。

---

## 附：一句话路线

> P0 抽象不破行为 → **P1 chunk + BM25 + 来源勾选（体验跃迁点）** → P2 网页摄入 +
> 产物 Studio + Space 主页 → P3 增强 → P4 分享视需而定。
