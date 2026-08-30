# DCode UI 界面设计规范审查 — 概览

**日期**：2026-08-29 · **范围**：`apps/dcode-ui/src`（24 tsx + 25 CSS Module + tokens）

## 做了什么

对 DCode 工作台做三向审查，未修改任何代码：

1. **界面设计规范** — WCAG 2.1 AA / 2.2、WAI-ARIA APG 逐条比对，含对比度手算
2. **交互逻辑一致性** — 焦点管理、ARIA 语义、四态覆盖、交互模式、动效、触摸目标
3. **DSH 官方 WebUI 对齐** — 与 `vendor/deepseek-harness/packages/client/ui-*`（38 个包）交叉比对

## 结果

共 **143 条**问题：🔴 关键 25 · 🟡 重要 65 · 🔵 建议 53

**底座是健康的**：`--zx-*` 令牌体系严格口径令牌化率 ≈90%，字体族 8/8、字号阶梯 189/189 零逃逸，明暗派生色做了系统性重写。

**四类真 bug**（已逐条核验）：

| 问题 | 位置 |
|---|---|
| `--zx-warning` 令牌名拼错（正确为 `--zx-warn`），浅色下对比度 2.25:1 | `SettingsSurface.module.css:408/409/805/807` |
| `.catch(() => {})` 缺 `setLoading(false)`，网络异常时插件面板永久转圈 | `PluginsHome.tsx:93` |
| 错误态与空态条件可同时成立，渲染两个空态 | `SettingsSurface.tsx:1097-1099` |
| z-index `20` 被 scrim 与浮层卡片共用，叠放退化为 DOM 顺序 | `Workbench.module.css:189` / `SummaryCard.module.css:11` |

**三个系统性短板**：z-index 与字重 0% 令牌化、三个 `aria-modal` 浮层无焦点管理、卡片头部 9 处实现不一致且 `ui.card` 零使用。

**对齐 WebUI 的主要缺口**：上下文占用计量（ContextMeter）、消息级操作条（复制/分支/重生成）、消息反馈（点赞点踩）、图片灯箱、拖拽上传。

## 交付物

- `docs/ui-review-2026-08-29.md` — 完整审查报告，含每条问题的 `文件:行号` 定位、WCAG 条款引用、可操作修复代码，以及 P0（1~2 天）/ P1（3~5 天）/ P2（1 周）/ P3（排期）四阶段优化方案

## 下一步

建议从 P0 的 8 项单行级修复开始（含 4 个真 bug），合计约 1.5 小时即可完成，无回归风险。
