# Interactive Learning Experience Pack

`@dsh-portable/interactive-learning` 为 DeepSeek Harness 提供可选的
`learning` Agent preset。它增加学习体验，但不改变 Standard、Code、Minimal 和
Cordis 的默认工具与行为。

产品行为、界面分层和范围判断见
[`docs/product/learning-mode.md`](../../docs/product/learning-mode.md)。本文只保留
包级接入、边界和维护者需要的内容。

## 能力概览

- 普通对话仍是默认路径；学习模式只在用户明确选择后启用。
- 学习模式支持概念讲解和疑惑澄清，也支持材料学习；当前会话上下文会连续保留。
- 用户用 `@` 提供材料后，Host 在当前学习会话中准备材料，模型通过受限的只读能力读取材料。
- 当前会话提供“对话 / 轨迹 / 笔记”；不再提供独立的资料库或学习库界面。
- 语义图示和理解检查都是可选增强；不可渲染时，普通文字仍须完整表达答案。
- 概念卡只能在出现独立迁移证据后提出，并须用户确认才写入；模型没有文件写入工具。

## 用户流程

1. 在新会话中选择 Learning，或继续使用默认普通对话。
2. 通过“理解一个概念”“解决一个疑惑”“学习一份材料”开始；快捷入口只填入模板，不预填主题。
3. 学习中的追问和短回答继承当前片段；明确换任务或结束后回到普通路径。
4. 在当前会话中继续学习、尝试新例子，或从当前结果开始新的主题。

## 包级边界

- `preset/learning/` 只挂载 Learning 的 persona、教学 Agent、材料读取、Skill 和可选 Web 搜索能力，不挂载 shell、编辑或自动化工具。
- Host 负责材料摄入与提取、锚点处理，以及学习状态落盘；模型只能读取当前学习会话范围内的材料。
- `LearnerState` 是当前 session 的暂定教学状态，不是跨会话画像、学习风格或长期掌握度。
- 可视化使用声明式原生组件；主对话不等待 Client，也不把每轮变成固定的检查点流程。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `preset/learning/` | preset 描述、组合和教学 Skill |
| `src/agent.ts`、`src/teaching-policy.ts` | 模式行为与教学策略 |
| `src/ingest/`、`src/topic-vault.ts` | 材料解析、会话材料存储和锚点基础设施 |
| `src/learner-state*`、`src/concept-*` | 会话状态、概念卡和确认流程 |
| `src/client/` | 学习模式 UI 和工具结果渲染 |
| `src/protocol*` | 版本化的声明式活动协议 |

## 开发与验证

源码变化后，真实桌面运行时需要重新构建并重启：

```powershell
pnpm --filter @dsh-portable/interactive-learning run build
pnpm --filter @dsh-portable/interactive-learning run test:source
```

发布包前再执行包级检查：

```powershell
pnpm --filter @dsh-portable/interactive-learning run test:package
```

无凭证的离线教学评估可按需运行：

```powershell
pnpm --filter @dsh-portable/interactive-learning eval
```

协议字段、渲染器细节和测试范围以源码与 package scripts 为准，不在 README 中维护重复清单。

## 外部启用

在创建 Loader、agent loop 或恢复 configured session 之前导入 bootstrap：

```ts
import '@dsh-portable/interactive-learning/bootstrap'
```

然后在 Host composition 中加入包，并让 Web module loader 读取包内的 `dsh.client` 声明：

```yaml
- id: interactive-learning
  name: '@dsh-portable/interactive-learning'
```

安装并重启 preset：

```powershell
dsh-learning-preset install --home <DSH_HOME>
```

新会话中选择 Learning。卸载使用：

```powershell
dsh-learning-preset uninstall --home <DSH_HOME>
```

安装器会记录其管理的文件，只更新仍由安装器拥有的内容，不覆盖用户改动。

## 不包含

不包含任意可执行 widget，也不提供模型驱动的文件写入；学习状态不建立隐式跨会话画像或自动知识图谱；学习回答不会静默转成卡片。
