# Interactive Learning Experience Pack

`@dsh-portable/interactive-learning` 为 DeepSeek Harness 提供可选的
`learning` Agent preset。它增加学习体验，但不改变 Standard、Code、Minimal 和
Cordis 的默认工具与行为。

产品行为、界面分层和范围判断见
[`docs/product/learning-mode.md`](../../docs/product/learning-mode.md)。本文只保留
包级接入、边界和维护者需要的内容。

## 能力概览

- 普通对话仍是默认路径；学习模式只在用户明确选择后启用。
- 学习模式支持概念讲解、疑惑澄清和材料学习，并保留连续的当前会话上下文。
- 用户用 `@` 提供材料后，Host 在工作区内建立学习库，模型通过受限的只读能力读取材料。
- 当前会话提供“对话 / 轨迹 / 笔记”；外部学习库管理“材料 / 已保存 / 概念卡 / 复习”。
- 语义图示和理解检查都是可选增强；不可渲染时，普通文字仍须完整表达答案。
- 概念卡只能在出现独立迁移证据后提出，并须用户确认才写入；模型没有文件写入工具。

## 用户流程

1. 在新会话中选择 Learning，或继续使用默认普通对话。
2. 通过“理解一个概念”“解决一个疑惑”“学习一份材料”开始；快捷入口只填入模板，不预填主题。
3. 学习中的追问和短回答继承当前片段；明确换任务或结束后回到普通路径。
4. 需要长期保留时，把当前回答或会话笔记保存到学习库；确认后的概念卡才会进入复习。

## 包级边界

- `preset/learning/` 只挂载 Learning 的 persona、教学 Agent、材料读取、Skill 和可选 Web 搜索能力，不挂载 shell、编辑或自动化工具。
- 材料摄入、提取、锚点和笔记/概念卡落盘由 Host 处理；模型只能读取当前学习库范围内的内容。
- `LearnerState` 是当前 session 的暂定教学状态，不是跨会话画像、学习风格或长期掌握度。
- 可视化使用声明式原生组件；主对话不等待 Client，也不把每轮变成固定的检查点流程。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `preset/learning/` | preset 描述、组合和教学 Skill |
| `src/agent.ts`、`src/teaching-policy.ts` | 模式行为与教学策略 |
| `src/ingest/`、`src/topic-vault.ts` | 材料解析、学习库和锚点基础设施 |
| `src/learner-state*`、`src/concept-*` | 会话状态、概念卡和确认流程 |
| `src/client/` | 对话内学习 UI、学习库和工具结果渲染 |
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

任意可执行 widget、模型驱动的文件写入、隐式跨会话画像、自动知识图谱，以及把所有学习回答静默转成卡片。
